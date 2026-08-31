import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "production-auth-smoke.mjs");

test("production auth smoke skips without the explicit send gate", async () => {
  const result = await runScript([]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /skipped/);
});

test("production project creation requires the explicit project apply gate", async () => {
  const result = await runScript(["--create-project-title", "Big Sword"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /ready for Big Sword \(Feature Film\)/);
});

test("production auth smoke consumes a delivered message without printing sensitive values", async (context) => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "film-production-auth-smoke-"));
  context.after(() => rmSync(tempDir, { recursive: true, force: true }));
  const email = "approved-owner@example.test";
  const apiKey = "resend_sensitive_test_key";
  const token = `magic_${"sensitive_token_".repeat(3)}`;
  const cookie = "film_session=sensitive_cookie";
  const csrfValue = "csrf_sensitive_value";
  const devVarsPath = path.join(tempDir, ".dev.vars");
  writeFileSync(devVarsPath, `ADMIN_BOOTSTRAP_EMAILS=${email}\nRESEND_API_KEY=${apiKey}\n`);
  const notionSourceDir = path.join(tempDir, "notion-source");
  mkdirSync(path.join(notionSourceDir, "Big Sword"), { recursive: true });
  writeFileSync(path.join(notionSourceDir, "Projects.csv"), "Name,Phase\nBig Sword,Development\n");
  writeFileSync(path.join(notionSourceDir, "Tasks.csv"), "Name,Project,Due Date,Status\nLock picture,Big Sword,Jul 30,Todo\n");
  writeFileSync(path.join(notionSourceDir, "Locations.csv"), "Name,Project,Type\nDesert Motel,Big Sword,Exterior\n");
  writeFileSync(path.join(notionSourceDir, "Big Sword", "Treatment.md"), "# Sensitive treatment fixture\n\nPrivate production notes.");

  let serverOrigin = "";
  let loggedOut = false;
  let projects = [];
  let importedTasks = [];
  let importedDocuments = [];
  let googleConnectionAttempts = 0;
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", serverOrigin);
    const json = (status, value, headers = {}) => {
      response.writeHead(status, { "content-type": "application/json", ...headers });
      response.end(JSON.stringify(value));
    };

    if (request.method === "GET" && url.pathname === "/health") {
      json(200, { ok: true, service: "film-worker", mode: "production", authMode: "live_member_only" });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/magic-link/request") {
      json(202, { ok: true, dryRun: false, delivery: "email_if_eligible", emailHash: null, devOnlyToken: null });
      return;
    }
    if (request.method === "GET" && url.pathname === "/resend/emails") {
      json(200, { data: [{ id: "message_test", to: [email], subject: "Sign in to Film", created_at: new Date().toISOString() }] });
      return;
    }
    if (request.method === "GET" && url.pathname === "/resend/emails/message_test") {
      json(200, {
        id: "message_test",
        to: [email],
        subject: "Sign in to Film",
        created_at: new Date().toISOString(),
        last_event: "delivered",
        html: `<a href="${serverOrigin}#magicLinkToken=${token}">Sign in</a>`,
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/magic-link/verify") {
      json(200, { ok: true, dryRun: false, session: { id: "session_test", role: "owner", csrfToken: csrfValue, expiresAt: new Date(Date.now() + 60_000).toISOString() } }, { "set-cookie": `${cookie}; HttpOnly; Path=/` });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      json(loggedOut ? 401 : 200, loggedOut ? { error: "invalid_session" } : { ok: true, dryRun: false, session: { id: "session_test", role: "owner" } });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/workspaces/current/snapshot") {
      json(200, {
        ok: true,
        snapshot: {
          schemaVersion: 1,
          persistence: "d1_canonical_workspace_snapshot",
          workspace: { id: "workspace_acme", name: "Canonical Films" },
          projects,
          tasks: importedTasks,
          documents: importedDocuments,
          people: [],
          equipment: [],
          expenses: [],
          truncatedCollections: [],
        },
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/operations/dry-run-sync") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const operation = JSON.parse(body).operations[0];
      projects = [{
        id: operation.entityId,
        title: operation.payload.title,
        projectType: operation.payload.projectType,
      }];
      json(200, {
        ok: true,
        dryRun: true,
        persistence: "d1_operation_log",
        accepted: [operation.id],
        rejected: [],
        replayed: [operation.id],
        idempotent: [],
        canonicalApplied: [operation.id],
        metadataOnly: [],
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/providers/runtime-readiness") {
      json(200, {
        dryRun: true,
        readiness: {
          secretValuesExposed: false,
          liveCount: 2,
          partialLiveCount: 0,
          blockedCount: 5,
          providers: [
            ...["resend", "google"].map((key) => ({ key, status: "live" })),
            ...["pool", "store", "stripe", "social", "sms"].map((key) => ({ key, status: "blocked" })),
          ],
        },
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/providers/sms/send") {
      json(503, { error: "telnyx_sms_send_disabled" });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/providers/google/connection") {
      googleConnectionAttempts += 1;
      if (googleConnectionAttempts === 1) {
        json(503, { error: "rate_limit_unavailable", persistence: "kv_unavailable_dry_run" });
        return;
      }
      json(200, {
        persistence: "d1_provider_connections",
        readiness: {
          liveOAuthAllowed: true,
          configured: {
            clientId: true,
            clientSecret: true,
            redirectUri: true,
            tokenEncryptionKey: true,
            appOrigin: true,
            d1: true,
            kv: true,
            liveMode: true,
          },
        },
        connection: {
          provider: "google",
          status: "active",
          scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
          hasRefreshToken: true,
          rootFolderId: null,
          connectedAt: new Date().toISOString(),
          disconnectedAt: null,
          tokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/providers/google/oauth/start") {
      const scope = "https://www.googleapis.com/auth/drive.metadata.readonly";
      const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizationUrl.searchParams.set("client_id", "production-smoke.apps.googleusercontent.com");
      authorizationUrl.searchParams.set("redirect_uri", `${serverOrigin}/api/providers/google/oauth/callback`);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", scope);
      authorizationUrl.searchParams.set("state", "production_smoke_state_value");
      authorizationUrl.searchParams.set("code_challenge", "p".repeat(43));
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
      authorizationUrl.searchParams.set("access_type", "offline");
      authorizationUrl.searchParams.set("include_granted_scopes", "true");
      authorizationUrl.searchParams.set("enable_granular_consent", "true");
      authorizationUrl.searchParams.set("prompt", "consent");
      json(200, {
        dryRun: false,
        provider: "google",
        authorizationUrl: authorizationUrl.toString(),
        scopes: [scope],
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/imports/notion/dry-run") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const files = JSON.parse(body).files;
      json(200, {
        preview: { warnings: [] },
        candidates: files.map((file) => ({ path: file.path })),
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/imports/notion/core/commit") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const coreRecords = JSON.parse(body).records;
      const accepted = coreRecords.map((record, index) => ({ id: `notion_${record.kind}_${index}`, kind: record.kind }));
      importedTasks = accepted.filter((record) => record.kind === "task").map((record) => ({ id: record.id, projectId: "project_big_sword" }));
      importedDocuments = accepted.filter((record) => record.kind === "document").map((record) => ({ id: record.id, projectId: "project_big_sword" }));
      json(200, {
        accepted,
        committed: accepted,
        idempotent: [],
        updatePreview: [],
        rejected: [],
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/imports/notion/planning/commit") {
      json(200, {
        committed: ["notion_location_test"],
        idempotent: [],
        updatePreview: [],
        rejected: [],
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      loggedOut = true;
      json(200, { ok: true, dryRun: false });
      return;
    }
    json(404, { error: "not_found" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  serverOrigin = `http://127.0.0.1:${address.port}`;

  const result = await runScript([
    "--allow-send",
    "--require",
    "--check-runtime-readiness",
    "--create-project-title", "Big Sword",
    "--project-type", "Feature Film",
    "--apply-project",
    "--notion-source-dir", notionSourceDir,
    "--apply-notion-import",
    "--origin", serverOrigin,
    "--app-origin", serverOrigin,
    "--resend-api-origin", `${serverOrigin}/resend`,
    "--source-dev-vars", devVarsPath,
    "--poll-timeout-ms", "1000",
    "--poll-interval-ms", "10",
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Production auth smoke passed/);
  assert.match(result.stdout, /provider runtime gates/);
  assert.match(result.stdout, /live Google readiness/);
  assert.match(result.stdout, /metadata-only authorization start/);
  assert.match(result.stdout, /canonical project created: Big Sword \(Feature Film\)/);
  assert.match(result.stdout, /Notion import 2 core committed\/0 idempotent and 1 planning committed\/0 idempotent/);
  assert.equal(googleConnectionAttempts, 2);
  for (const sensitiveValue of [email, apiKey, token, cookie, csrfValue, "message_test", "Private production notes"]) {
    assert.equal(`${result.stdout}\n${result.stderr}`.includes(sensitiveValue), false);
  }
});

test("production auth smoke retries cleanup after a post-session failure", async (context) => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "film-production-auth-cleanup-"));
  context.after(() => rmSync(tempDir, { recursive: true, force: true }));
  const email = "approved-cleanup@example.test";
  const apiKey = "resend_cleanup_sensitive_key";
  const token = `magic_${"cleanup_sensitive_token_".repeat(3)}`;
  const cookie = "film_session=cleanup_sensitive_cookie";
  const csrfValue = "csrf_cleanup_sensitive_value";
  const devVarsPath = path.join(tempDir, ".dev.vars");
  writeFileSync(devVarsPath, `ADMIN_BOOTSTRAP_EMAILS=${email}\nRESEND_API_KEY=${apiKey}\n`);

  let serverOrigin = "";
  let logoutAttempts = 0;
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", serverOrigin);
    const json = (status, value, headers = {}) => {
      response.writeHead(status, { "content-type": "application/json", ...headers });
      response.end(JSON.stringify(value));
    };
    if (request.method === "GET" && url.pathname === "/health") {
      json(200, { authMode: "live_member_only" });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/magic-link/request") {
      json(202, { dryRun: false, delivery: "email_if_eligible", emailHash: null, devOnlyToken: null });
      return;
    }
    if (request.method === "GET" && url.pathname === "/resend/emails") {
      json(200, { data: [{ id: "cleanup_message", to: [email], subject: "Sign in to Film", created_at: new Date().toISOString() }] });
      return;
    }
    if (request.method === "GET" && url.pathname === "/resend/emails/cleanup_message") {
      json(200, {
        to: [email],
        subject: "Sign in to Film",
        created_at: new Date().toISOString(),
        last_event: "delivered",
        html: `<a href="${serverOrigin}#magicLinkToken=${token}">Sign in</a>`,
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/magic-link/verify") {
      json(200, {
        dryRun: false,
        session: { role: "owner", csrfToken: csrfValue },
      }, { "set-cookie": `${cookie}; HttpOnly; Path=/` });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      json(200, { dryRun: false, session: { role: "owner" } });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/workspaces/current/snapshot") {
      json(503, { error: "snapshot_unavailable" });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      logoutAttempts += 1;
      json(logoutAttempts < 3 ? 503 : 200, logoutAttempts < 3 ? { error: "logout_unavailable" } : { dryRun: false });
      return;
    }
    json(404, { error: "not_found" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  serverOrigin = `http://127.0.0.1:${address.port}`;

  const result = await runScript([
    "--allow-send",
    "--require",
    "--origin", serverOrigin,
    "--app-origin", serverOrigin,
    "--resend-api-origin", `${serverOrigin}/resend`,
    "--source-dev-vars", devVarsPath,
    "--poll-timeout-ms", "1000",
    "--poll-interval-ms", "10",
  ]);

  assert.equal(result.code, 1);
  assert.equal(logoutAttempts, 3);
  assert.match(result.stderr, /canonical workspace snapshot returned unexpected status 503/i);
  for (const sensitiveValue of [email, apiKey, token, cookie, csrfValue, "cleanup_message"]) {
    assert.equal(`${result.stdout}\n${result.stderr}`.includes(sensitiveValue), false);
  }
});

function runScript(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      env: { ...process.env, FILM_PRODUCTION_AUTH_SMOKE_ALLOW_SEND: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
