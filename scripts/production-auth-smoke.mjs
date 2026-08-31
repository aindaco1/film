#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyNotionImport } from "@film/importers";
import { createFilmProjectFromTemplate, seedWorkspace } from "@film/schema";
import {
  boundedInteger,
  normalizeSecureHttpBaseUrl,
  parseCliArgs,
  parseEnvFile,
} from "./script-input.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseCliArgs(process.argv.slice(2), {
  booleans: ["--allow-send", "--require", "--check-runtime-readiness", "--apply-project", "--apply-notion-import"],
  values: [
    "--origin", "--app-origin", "--resend-api-origin", "--source-dev-vars", "--email-key", "--resend-key",
    "--request-timeout-ms", "--poll-timeout-ms", "--poll-interval-ms", "--workspace", "--create-project-title",
    "--project-type", "--project-id", "--notion-source-dir",
  ],
});
const required = Boolean(args.require || process.env.FILM_PRODUCTION_AUTH_SMOKE_REQUIRED === "1");
const allowSend = Boolean(args["allow-send"] || process.env.FILM_PRODUCTION_AUTH_SMOKE_ALLOW_SEND === "1");
const projectTitle = optionalLabel(args["create-project-title"], "project title", 180);
const projectType = optionalLabel(args["project-type"], "project type", 80) || "Feature Film";
const projectId = projectTitle
  ? safeIdentifier(args["project-id"] ?? projectIdentifier(projectTitle), "project")
  : "";
const applyProject = Boolean(args["apply-project"]);
const notionSourceDir = args["notion-source-dir"] ? path.resolve(args["notion-source-dir"]) : "";
const applyNotionSource = Boolean(args["apply-notion-import"]);

if (applyProject && !projectTitle) {
  fail("--apply-project requires --create-project-title");
}
if (projectTitle && !applyProject) {
  console.log(`Production project creation is ready for ${projectTitle} (${projectType}). Re-run with --apply-project to create or verify it.`);
  process.exit(required ? 1 : 0);
}
if (applyNotionSource && (!notionSourceDir || !projectTitle || !applyProject)) {
  fail("--apply-notion-import requires --notion-source-dir, --create-project-title, and --apply-project");
}
if (notionSourceDir && !applyNotionSource) {
  console.log("Production Notion import is ready. Re-run with --apply-notion-import to commit bounded create-only records.");
  process.exit(required ? 1 : 0);
}

if (!allowSend) {
  console.log("Production auth smoke skipped: pass --allow-send after approving one owner magic-link email.");
  process.exit(required ? 1 : 0);
}

const sourcePath = path.resolve(args["source-dev-vars"] ?? path.join(root, "..", "pool", "worker", ".dev.vars"));
const sourceVars = parseEnvFile(readFileSync(sourcePath, "utf8"));
const email = firstEmail(process.env.FILM_PRODUCTION_AUTH_SMOKE_EMAIL?.trim() || sourceVars.get(args["email-key"] ?? "ADMIN_BOOTSTRAP_EMAILS") || "");
const resendApiKey = process.env.RESEND_API_KEY?.trim() || sourceVars.get(args["resend-key"] ?? "RESEND_API_KEY") || "";
const workerOrigin = normalizeSecureHttpBaseUrl(args.origin ?? process.env.FILM_PRODUCTION_AUTH_SMOKE_ORIGIN ?? "https://api.film.dustwave.xyz", "Worker origin");
const appOrigin = normalizeSecureHttpBaseUrl(args["app-origin"] ?? process.env.FILM_PRODUCTION_AUTH_SMOKE_APP_ORIGIN ?? "https://film.dustwave.xyz", "app origin");
const resendApiOrigin = normalizeSecureHttpBaseUrl(args["resend-api-origin"] ?? process.env.FILM_PRODUCTION_AUTH_SMOKE_RESEND_API_ORIGIN ?? "https://api.resend.com", "Resend API origin");
const requestTimeoutMs = boundedInteger(args["request-timeout-ms"] ?? process.env.FILM_PRODUCTION_AUTH_SMOKE_REQUEST_TIMEOUT_MS, 10_000, 1_000, 60_000, "request timeout");
const pollTimeoutMs = boundedInteger(args["poll-timeout-ms"] ?? process.env.FILM_PRODUCTION_AUTH_SMOKE_POLL_TIMEOUT_MS, 90_000, 1_000, 300_000, "poll timeout");
const pollIntervalMs = boundedInteger(args["poll-interval-ms"] ?? process.env.FILM_PRODUCTION_AUTH_SMOKE_POLL_INTERVAL_MS, 2_000, 10, 10_000, "poll interval");
const workspaceId = args.workspace ?? "workspace_acme";

if (!email || !resendApiKey.trim()) {
  fail("approved recipient or Resend API key is unavailable");
}

let activeSession = null;
try {
  const health = await requestJson(`${workerOrigin}/health`, { method: "GET" }, [200]);
  assert.equal(health.body.authMode, "live_member_only", "Worker auth mode is not live member-only");

  const requestedAt = Date.now();
  const requestResult = await requestJson(`${workerOrigin}/api/auth/magic-link/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  }, [202]);
  assert.equal(requestResult.body.dryRun, false, "magic-link request incorrectly reported dry-run mode");
  assert.equal(requestResult.body.delivery, "email_if_eligible", "magic-link response did not use the generic delivery contract");
  assert.equal(requestResult.body.devOnlyToken, null, "magic-link response exposed a development token");
  assert.equal(requestResult.body.emailHash, null, "magic-link response exposed an email hash");

  const message = await waitForDeliveredMessage(requestedAt);
  const token = tokenFromMessage(message);

  const verify = await requestJson(`${workerOrigin}/api/auth/magic-link/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  }, [200]);
  assert.equal(verify.body.dryRun, false, "magic-link verification incorrectly reported dry-run mode");
  const cookie = sessionCookieFrom(verify.response.headers.get("set-cookie"));
  const csrfToken = verify.body.session?.csrfToken;
  assert.equal(typeof csrfToken, "string", "verification did not return CSRF metadata");
  assert(csrfToken.length >= 12, "verification returned invalid CSRF metadata");
  assert.equal(typeof verify.body.session?.role, "string", "verification did not return a member role");
  activeSession = { cookie, csrfToken };

  const session = await requestJson(`${workerOrigin}/api/auth/session`, {
    method: "GET",
    headers: { cookie },
  }, [200]);
  assert.equal(session.body.dryRun, false, "session metadata incorrectly reported dry-run mode");
  assert.equal(session.body.session?.role, verify.body.session.role, "session role changed after verification");

  const snapshot = await requestJsonEventually(`${workerOrigin}/api/workspaces/current/snapshot`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  }, [200]);
  assert.equal(snapshot.body.snapshot?.schemaVersion, 1, "canonical workspace snapshot schema changed");
  assert.equal(snapshot.body.snapshot?.persistence, "d1_canonical_workspace_snapshot", "canonical workspace snapshot did not use D1");
  assert.equal(snapshot.body.snapshot?.workspace?.id, workspaceId, "canonical workspace snapshot changed workspace scope");
  assert(Array.isArray(snapshot.body.snapshot?.projects), "canonical workspace snapshot omitted projects");
  assert(Array.isArray(snapshot.body.snapshot?.truncatedCollections), "canonical workspace snapshot omitted truncation state");

  let projectResult = "";
  if (projectTitle) {
    projectResult = await createOrVerifyProject({
      snapshot: snapshot.body.snapshot,
      cookie,
      csrfToken,
    });
  }
  let notionResult = "";
  if (applyNotionSource) {
    notionResult = await importNotionSourceDirectory({
      sourceDir: notionSourceDir,
      snapshot: snapshot.body.snapshot,
      cookie,
      csrfToken,
    });
  }

  if (args["check-runtime-readiness"]) {
    const runtime = await requestJsonEventually(`${workerOrigin}/api/providers/runtime-readiness`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId }),
    }, [200]);
    assert.equal(runtime.body.readiness?.secretValuesExposed, false, "runtime readiness did not enforce redaction");
    assert.equal(runtime.body.readiness?.liveCount, 2, "runtime readiness live count changed");
    assert.equal(runtime.body.readiness?.partialLiveCount, 0, "runtime readiness partial-live count changed");
    assert.equal(runtime.body.readiness?.blockedCount, 5, "runtime readiness blocked count changed");
    const statuses = new Map((runtime.body.readiness?.providers ?? []).map((provider) => [provider.key, provider.status]));
    for (const key of ["resend", "google"]) assert.equal(statuses.get(key), "live", `${key} runtime gate is not live`);
    for (const key of ["pool", "store", "stripe", "social", "sms"]) assert.equal(statuses.get(key), "blocked", `${key} runtime gate is not blocked`);

    const smsProbeContent = "production_sms_disabled_probe_content";
    const smsProbeRecipient = "sms_recipient_0123456789abcdef0123456789abcdef";
    const sms = await requestJsonEventually(`${workerOrigin}/api/providers/sms/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({
        workspaceId,
        projectId: snapshot.body.snapshot?.projects?.[0]?.id ?? "proj_disabled_probe",
        recipientIds: [smsProbeRecipient],
        category: "call_sheet",
        messageBody: smsProbeContent,
        requestKey: "production_sms_disabled_probe_0001",
      }),
    }, [503]);
    assert.equal(sms.body.error, "telnyx_sms_send_disabled", "production SMS send gate is not closed");
    const smsResponse = JSON.stringify(sms.body);
    assert.equal(smsResponse.includes(smsProbeContent), false, "disabled SMS response reflected message content");
    assert.equal(smsResponse.includes(smsProbeRecipient), false, "disabled SMS response reflected recipient metadata");

    const google = await requestJsonEventually(`${workerOrigin}/api/providers/google/connection`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId }),
    }, [200]);
    assert.equal(google.body.readiness?.liveOAuthAllowed, true, "Google OAuth did not report live readiness");
    for (const key of ["clientId", "clientSecret", "redirectUri", "tokenEncryptionKey", "appOrigin", "d1", "kv", "liveMode"]) {
      assert.equal(google.body.readiness?.configured?.[key], true, `Google OAuth configuration is unavailable: ${key}`);
    }
    assert.equal(google.body.connection, null, "production smoke workspace unexpectedly has a Google connection");
    const googleResponse = JSON.stringify(google.body);
    for (const forbidden of ["access_token", "refresh_token", "accessTokenCiphertext", "refreshTokenCiphertext"]) {
      assert.equal(googleResponse.includes(forbidden), false, `Google connection response exposed ${forbidden}`);
    }

    const googleStart = await requestJsonEventually(`${workerOrigin}/api/providers/google/oauth/start`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, includeDocsExport: false, includeCalendarSync: false }),
    }, [200]);
    const expectedGoogleScope = "https://www.googleapis.com/auth/drive.metadata.readonly";
    assert.equal(googleStart.body.dryRun, false, "Google OAuth start incorrectly reported dry-run mode");
    assert.equal(googleStart.body.provider, "google", "Google OAuth start returned the wrong provider");
    assert.deepEqual(googleStart.body.scopes, [expectedGoogleScope], "Google OAuth start requested broader scopes");
    const authorizationUrl = new URL(googleStart.body.authorizationUrl);
    assert.equal(authorizationUrl.origin, "https://accounts.google.com", "Google OAuth start returned an unexpected origin");
    assert.equal(authorizationUrl.pathname, "/o/oauth2/v2/auth", "Google OAuth start returned an unexpected path");
    assert.equal(authorizationUrl.searchParams.get("redirect_uri"), `${workerOrigin}/api/providers/google/oauth/callback`, "Google OAuth callback changed");
    assert.equal(authorizationUrl.searchParams.get("response_type"), "code", "Google OAuth response type changed");
    assert.equal(authorizationUrl.searchParams.get("scope"), expectedGoogleScope, "Google OAuth authorization URL requested broader scopes");
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256", "Google OAuth PKCE method changed");
    assert.equal(authorizationUrl.searchParams.get("access_type"), "offline", "Google OAuth offline access changed");
    assert.equal(authorizationUrl.searchParams.get("include_granted_scopes"), "true", "Google incremental authorization changed");
    assert.equal(authorizationUrl.searchParams.get("enable_granular_consent"), "true", "Google granular consent changed");
    assert.equal(authorizationUrl.searchParams.get("prompt"), "consent", "Google consent prompt changed");
    assert((authorizationUrl.searchParams.get("client_id") ?? "").endsWith(".apps.googleusercontent.com"), "Google OAuth client ID is malformed");
    assert((authorizationUrl.searchParams.get("state") ?? "").length >= 20, "Google OAuth state is missing");
    assert((authorizationUrl.searchParams.get("code_challenge") ?? "").length >= 43, "Google OAuth PKCE challenge is missing");
    assert(Date.parse(googleStart.body.expiresAt) > Date.now(), "Google OAuth state did not receive a future expiry");
  }

  const logout = await requestJsonEventually(`${workerOrigin}/api/auth/logout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-film-csrf": csrfToken,
    },
  }, [200]);
  assert.equal(logout.body.dryRun, false, "logout incorrectly reported dry-run mode");
  activeSession = null;
  await requestJson(`${workerOrigin}/api/auth/session`, {
    method: "GET",
    headers: { cookie },
  }, [401]);

  console.log(`Production auth smoke passed: live member-only mode, generic request, delivered approved message, member session, canonical workspace snapshot${projectResult}${notionResult}${args["check-runtime-readiness"] ? ", provider runtime gates, disabled SMS send boundary, live Google readiness, and metadata-only authorization start" : ""}, logout, revoked session.`);
} catch (error) {
  await bestEffortLogout(activeSession);
  fail(error instanceof Error ? error.message : "unknown failure");
}

async function createOrVerifyProject({ snapshot, cookie, csrfToken }) {
  const projects = Array.isArray(snapshot.projects) ? snapshot.projects : [];
  const byId = projects.find((project) => project?.id === projectId);
  const byTitle = projects.find((project) => typeof project?.title === "string" && project.title.trim().toLowerCase() === projectTitle.toLowerCase());
  const existing = byId ?? byTitle;
  if (existing) {
    assert.equal(existing.id, projectId, "an existing project title uses a different stable identifier");
    assert.equal(existing.title, projectTitle, "the stable project identifier belongs to a different title");
    assert.equal(existing.projectType, projectType, "the existing project uses a different project type");
    return `, existing canonical project verified: ${projectTitle} (${projectType})`;
  }

  const operationId = `op_operator_project_${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const operation = {
    id: operationId,
    workspaceId,
    kind: "project.created",
    entityType: "project",
    entityId: projectId,
    summary: `Project created: ${projectTitle}`,
    payload: { title: projectTitle, projectType, template: "film" },
    createdAt,
    status: "queued",
  };
  const sync = await requestJson(`${workerOrigin}/api/operations/dry-run-sync`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ operations: [operation] }),
  }, [200]);
  assert.equal(sync.body.persistence, "d1_operation_log", "project operation did not use the canonical operation log");
  assert(sync.body.accepted?.includes(operationId), "project operation was not accepted");
  assert(sync.body.canonicalApplied?.includes(operationId), "project operation was not applied to canonical tables");
  assert.equal(sync.body.rejected?.length, 0, "project operation was rejected");

  await delay(1_100);
  const verification = await requestJsonEventually(`${workerOrigin}/api/workspaces/current/snapshot`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  }, [200]);
  const created = verification.body.snapshot?.projects?.find((project) => project?.id === projectId);
  assert(created, "canonical project was absent after operation replay");
  assert.equal(created.title, projectTitle, "canonical project title changed after replay");
  assert.equal(created.projectType, projectType, "canonical project type changed after replay");
  return `, canonical project created: ${projectTitle} (${projectType})`;
}

async function importNotionSourceDirectory({ sourceDir, snapshot, cookie, csrfToken }) {
  const source = await readNotionDirectory(sourceDir);
  const preflight = await requestJsonEventually(`${workerOrigin}/api/imports/notion/dry-run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ files: source.manifest }),
  }, [200]);
  const candidates = Array.isArray(preflight.body.candidates) ? preflight.body.candidates : [];
  const candidatePaths = new Set(candidates.flatMap((candidate) => typeof candidate?.path === "string" ? [candidate.path] : []));
  const importFiles = [];
  for (const file of source.files) {
    if (!candidatePaths.has(file.path)) continue;
    const extension = path.posix.extname(file.path).toLowerCase();
    importFiles.push({
      path: file.path,
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
      ...((extension === ".md" || extension === ".csv") ? { text: await readFile(file.absolutePath, "utf8") } : {}),
    });
  }
  assert(importFiles.length > 0, "Notion preflight returned no readable import files");

  const localProject = createFilmProjectFromTemplate(projectTitle, projectType);
  localProject.id = projectId;
  localProject.openTasks = [];
  localProject.docs = [];
  localProject.people = [];
  localProject.equipment = [];
  localProject.expenses = [];
  localProject.tasks = { done: 0, total: 0 };
  const localWorkspace = structuredClone(seedWorkspace);
  localWorkspace.id = workspaceId;
  localWorkspace.name = snapshot.workspace?.name ?? localWorkspace.name;
  localWorkspace.projects = [localProject];
  const applied = applyNotionImport(localWorkspace, importFiles, projectId);
  const coreRecords = applied.coreRecords.filter((record) => normalizedLabel(record.projectTitle) === normalizedLabel(projectTitle));
  assert(coreRecords.length > 0, "Notion import produced no core records for the target project");
  assert.equal(coreRecords.length, applied.coreRecords.length, "Notion import produced records for another project");

  const core = await requestJsonEventually(`${workerOrigin}/api/imports/notion/core/commit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId, projectId, records: coreRecords }),
  }, [200, 422]);
  assert.equal(core.body.error, undefined, "Notion core import returned an error");
  assert.equal(core.body.rejected?.length ?? 0, 0, "Notion core import rejected records");
  assert.equal(core.body.updatePreview?.length ?? 0, 0, "Notion core import requires update review");
  const coreCommitted = core.body.committed?.length ?? 0;
  const coreIdempotent = core.body.idempotent?.length ?? 0;
  assert.equal(coreCommitted + coreIdempotent, coreRecords.length, "Notion core import did not account for every record");

  let planningCommitted = 0;
  let planningIdempotent = 0;
  if (applied.planningRecords.length > 0) {
    const planning = await requestJsonEventually(`${workerOrigin}/api/imports/notion/planning/commit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, records: applied.planningRecords.slice(0, 200) }),
    }, [200, 422]);
    assert.equal(planning.body.error, undefined, "Notion planning import returned an error");
    assert.equal(planning.body.rejected?.length ?? 0, 0, "Notion planning import rejected records");
    assert.equal(planning.body.updatePreview?.length ?? 0, 0, "Notion planning import requires update review");
    planningCommitted = planning.body.committed?.length ?? 0;
    planningIdempotent = planning.body.idempotent?.length ?? 0;
    assert.equal(planningCommitted + planningIdempotent, applied.planningRecords.length, "Notion planning import did not account for every record");
  }

  await delay(1_100);
  const verification = await requestJsonEventually(`${workerOrigin}/api/workspaces/current/snapshot`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  }, [200]);
  const accepted = Array.isArray(core.body.accepted) ? core.body.accepted : [];
  const canonicalIds = new Set([
    ...(verification.body.snapshot?.tasks ?? []).map((record) => record.id),
    ...(verification.body.snapshot?.documents ?? []).map((record) => record.id),
    ...(verification.body.snapshot?.people ?? []).map((record) => record.id),
    ...(verification.body.snapshot?.equipment ?? []).map((record) => record.id),
    ...(verification.body.snapshot?.expenses ?? []).map((record) => record.id),
  ]);
  assert(accepted.every((record) => canonicalIds.has(record.id)), "canonical snapshot omitted imported core records");
  return `, Notion import ${coreCommitted} core committed/${coreIdempotent} idempotent and ${planningCommitted} planning committed/${planningIdempotent} idempotent`;
}

async function readNotionDirectory(sourceDir) {
  const rootStat = await stat(sourceDir);
  assert(rootStat.isDirectory(), "Notion source is not a directory");
  const files = [];
  async function visit(currentDir, relativeDir = "") {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isSymbolicLink()) continue;
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        const fileStat = await stat(absolutePath);
        files.push({
          absolutePath,
          path: relativePath.split(path.sep).join("/"),
          sizeBytes: fileStat.size,
          contentType: notionContentType(relativePath),
        });
      }
      assert(files.length <= 2_000, "Notion source exceeds the file limit");
    }
  }
  await visit(sourceDir);
  const totalBytes = files.reduce((total, file) => total + file.sizeBytes, 0);
  assert(totalBytes <= 512 * 1024 * 1024, "Notion source exceeds the aggregate byte limit");
  return {
    files,
    manifest: files.map(({ path: filePath, sizeBytes, contentType }) => ({ path: filePath, sizeBytes, contentType })),
  };
}

function notionContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".md") return "text/markdown";
  if (extension === ".csv") return "text/csv";
  if (extension === ".json") return "application/json";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function normalizedLabel(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

async function requestJsonEventually(url, init, expectedStatuses, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestJson(url, init, expectedStatuses);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const rateLimitUnavailable = error instanceof Error && error.message.includes("(rate_limit_unavailable)");
        await delay(rateLimitUnavailable ? 1_100 : Math.min(1_000, attempt * 250));
      }
    }
  }
  throw lastError;
}

async function bestEffortLogout(session) {
  if (!session) return;
  try {
    await requestJsonEventually(`${workerOrigin}/api/auth/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: session.cookie,
        "x-film-csrf": session.csrfToken,
      },
    }, [200, 401], 5);
  } catch {
    // A failed operator run must not conceal its primary error behind cleanup.
  }
}

async function waitForDeliveredMessage(requestedAt) {
  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    const listUrl = new URL(`${resendApiOrigin}/emails`);
    listUrl.searchParams.set("limit", "100");
    const list = await requestJson(listUrl.toString(), {
      method: "GET",
      headers: { authorization: `Bearer ${resendApiKey}` },
    }, [200]);
    const candidates = Array.isArray(list.body.data) ? list.body.data : [];
    const summary = candidates.find((item) => isMatchingMessageSummary(item, requestedAt));
    if (summary?.id && typeof summary.id === "string") {
      const detail = await requestJson(`${resendApiOrigin}/emails/${encodeURIComponent(summary.id)}`, {
        method: "GET",
        headers: { authorization: `Bearer ${resendApiKey}` },
      }, [200]);
      if (isMatchingMessageSummary(detail.body, requestedAt) && messageDeliveryStatus(detail.body) === "delivered") {
        return detail.body;
      }
    }
    await delay(pollIntervalMs);
  }
  throw new Error("approved message was not delivered before the poll timeout");
}

function isMatchingMessageSummary(value, requestedAt) {
  if (!value || typeof value !== "object" || value.subject !== "Sign in to Film") return false;
  const recipients = Array.isArray(value.to) ? value.to : typeof value.to === "string" ? [value.to] : [];
  if (!recipients.some((recipient) => typeof recipient === "string" && recipient.trim().toLowerCase() === email)) return false;
  const createdAt = Date.parse(value.created_at ?? value.createdAt ?? "");
  return Number.isFinite(createdAt) && createdAt >= requestedAt - 5_000;
}

function messageDeliveryStatus(value) {
  return String(value.last_event ?? value.lastEvent ?? value.status ?? "").trim().toLowerCase();
}

function tokenFromMessage(message) {
  const content = [message.html, message.text].filter((value) => typeof value === "string").join("\n");
  const links = content.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  for (const rawLink of links) {
    try {
      const link = new URL(rawLink.replaceAll("&amp;", "&"));
      if (link.origin !== appOrigin) continue;
      const queryToken = link.searchParams.get("magicLinkToken")?.trim() ?? "";
      if (queryToken) throw new Error("delivered message exposed the Film sign-in token in the HTTP query");
      const token = (
        new URLSearchParams(link.hash.startsWith("#") ? link.hash.slice(1) : link.hash).get("magicLinkToken")
        ?? ""
      ).trim();
      if (token.startsWith("magic_") && token.length >= 20 && token.length <= 180) return token;
    } catch {
      // Ignore non-URL fragments from provider-rendered content.
    }
  }
  throw new Error("delivered message did not contain a valid Film sign-in link");
}

async function requestJson(url, init, expectedStatuses) {
  const endpointLabel = safeEndpointLabel(url);
  let response;
  try {
    response = await fetchWithTimeout(url, init);
  } catch {
    throw new Error(`${endpointLabel} request failed`);
  }
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${endpointLabel} returned non-JSON content`);
  }
  if (!expectedStatuses.includes(response.status)) {
    const errorCode = typeof body.error === "string" && /^[a-z0-9_]{1,80}$/.test(body.error)
      ? ` (${body.error})`
      : "";
    throw new Error(`${endpointLabel} returned unexpected status ${response.status}${errorCode}`);
  }
  return { response, body };
}

function safeEndpointLabel(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "api.resend.com") {
      return url.pathname === "/emails" ? "Resend email list" : "Resend email detail";
    }
    const labels = new Map([
      ["/health", "Worker health"],
      ["/api/auth/magic-link/request", "Worker magic-link request"],
      ["/api/auth/magic-link/verify", "Worker magic-link verification"],
      ["/api/auth/session", "Worker session check"],
      ["/api/workspaces/current/snapshot", "Worker canonical workspace snapshot"],
      ["/api/providers/runtime-readiness", "Worker runtime readiness"],
      ["/api/providers/google/connection", "Worker Google connection status"],
      ["/api/providers/google/oauth/start", "Worker Google authorization start"],
      ["/api/imports/notion/dry-run", "Worker Notion import preflight"],
      ["/api/imports/notion/core/commit", "Worker Notion core import"],
      ["/api/imports/notion/planning/commit", "Worker Notion planning import"],
      ["/api/auth/logout", "Worker logout"],
    ]);
    return labels.get(url.pathname) ?? "Auth smoke endpoint";
  } catch {
    return "Auth smoke endpoint";
  }
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sessionCookieFrom(setCookie) {
  const cookie = setCookie?.split(";")[0]?.trim() ?? "";
  if (!cookie.startsWith("film_session=")) throw new Error("verification did not return a Film session cookie");
  return cookie;
}

function firstEmail(value) {
  const emailValue = value.split(",")[0]?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) ? emailValue : "";
}

function optionalLabel(value, label, maxLength) {
  if (value === undefined || value === null || value === "") return "";
  const normalized = String(value).trim();
  if (!normalized || normalized.length > maxLength || /[\r\n]/.test(normalized)) {
    throw new Error(`Invalid ${label}.`);
  }
  return normalized;
}

function safeIdentifier(value, label) {
  const normalized = String(value).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,119}$/.test(normalized)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return normalized;
}

function projectIdentifier(title) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
  if (!slug) throw new Error("Project title cannot produce a stable identifier.");
  return `project_${slug}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(`Production auth smoke failed: ${message}`);
  process.exit(1);
}
