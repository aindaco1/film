#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = path.join(root, "apps", "worker");
const origin = normalizeOrigin(process.env.FILM_WORKER_SMOKE_ORIGIN ?? "http://127.0.0.1:8787");
const proofIds = {
  downloadPackagePlan: null,
  packagePreflight: null,
  verification: null,
  objectPlan: null,
  commitPreflight: null,
};
const packageIntentId = "attachment_local_package_plan_probe";
const packageIntentObjectKey = `workspaces/workspace_acme/attachments/doc_local_package_plan/${"d".repeat(64)}-package-plan.pdf`;
const attachmentPackagePlan = {
  policy: "metadata_only",
  packageRequired: true,
  byteRestoreSupport: "blocked",
  metadataRecordCount: 1,
  stagedLocalRecordCount: 0,
  r2DryRunRecordCount: 0,
  storedR2RecordCount: 1,
  totalSourceBytes: 1024,
  blockers: ["Attachment byte restore requires a verified package."],
};
const packageManifest = {
  format: "film.attachment-package",
  version: 1,
  workspaceId: "workspace_acme",
  createdAt: "2026-07-09T02:30:00.000Z",
  objectCount: 1,
  totalSourceBytes: 1024,
  objects: [{
    path: "attachments/001-doc_local-proof.pdf",
    docId: "doc_local_attachment_proof",
    objectKey: `workspaces/workspace_acme/attachments/doc_local_attachment_proof/${"a".repeat(64)}-proof.pdf`,
    name: "proof.pdf",
    sourcePath: "Files/proof.pdf",
    sizeBytes: 1024,
    contentType: "application/pdf",
    sha256: "a".repeat(64),
    committedAt: "2026-07-09T02:30:00.000Z",
  }],
};

try {
  executeLocalD1(`
    DELETE FROM attachment_package_plans WHERE instr(object_keys_json, '${packageIntentObjectKey}') > 0;
    DELETE FROM attachment_upload_intents WHERE id = '${packageIntentId}';
    INSERT INTO attachment_upload_intents (
      id, workspace_id, doc_id, object_key, name, source_path, size_bytes, content_type,
      sha256, storage_key, commit_token_hash, status, prepared_at, expires_at, committed_at, updated_at
    ) VALUES (
      '${packageIntentId}',
      'workspace_acme',
      'doc_local_package_plan',
      '${packageIntentObjectKey}',
      'package-plan.pdf',
      NULL,
      1024,
      'application/pdf',
      '${"d".repeat(64)}',
      NULL,
      '${"e".repeat(64)}',
      'stored_r2',
      '2026-07-09T02:30:00.000Z',
      '2026-07-10T02:30:00.000Z',
      '2026-07-09T02:30:00.000Z',
      '2026-07-09T02:30:00.000Z'
    );
  `);

  const magic = await requestJson("POST", "/api/auth/magic-link/request", {
    email: `film-attachment-proof-smoke+${Date.now()}@example.invalid`,
  });
  assert.match(magic.devOnlyToken, /^dry_/);
  const verification = await requestJson("POST", "/api/auth/magic-link/verify", {
    token: magic.devOnlyToken,
  }, true);
  const cookie = sessionCookieFrom(verification.headers.get("set-cookie"));
  const csrfToken = verification.body.session?.csrfToken;
  assert.equal(typeof csrfToken, "string");
  const headers = { cookie, "x-film-csrf": csrfToken };
  const packageSha256 = "c".repeat(64);
  const manifestSha256 = await sha256Hex(JSON.stringify(packageManifest));

  const downloadPackagePlan = await requestJson("POST", "/api/attachments/r2/export-package-dry-run", {
    workspaceId: "workspace_acme",
    limit: 10,
    objectKeys: [packageIntentObjectKey],
  }, false, headers);
  proofIds.downloadPackagePlan = checkedId(downloadPackagePlan.packagePlanId, /^attachment_package_/);
  assert.match(downloadPackagePlan.packageToken, /^pkg_/);
  assert.equal(downloadPackagePlan.packagePlanPersistence, "d1_attachment_package_plans");
  assert.equal(downloadPackagePlan.auditPersistence, "d1_audit_events");
  assert.equal(downloadPackagePlan.canPackage, true);

  const preflight = await requestJson("POST", "/api/restores/attachment-package-dry-run", {
    workspaceId: "workspace_acme",
    snapshotWorkspaceId: "workspace_acme",
    backupCreatedAt: "2026-07-09T02:00:00.000Z",
    attachmentPackagePlan,
  }, false, headers);
  proofIds.packagePreflight = checkedId(preflight.attachmentPackagePreflightId, /^restore_attachment_package_preflight_/);
  assert.equal(preflight.attachmentPackagePreflightPersistence, "d1_restore_attachment_package_preflights");
  assert.equal(preflight.auditPersistence, "d1_audit_events");

  const packageVerification = await requestJson("POST", "/api/restores/attachment-package-verify-dry-run", {
    workspaceId: "workspace_acme",
    snapshotWorkspaceId: "workspace_acme",
    backupCreatedAt: "2026-07-09T02:00:00.000Z",
    attachmentPackagePreflightId: proofIds.packagePreflight,
    attachmentPackagePlan,
    packageSha256,
    manifestSha256,
    packageManifest,
  }, false, headers);
  proofIds.verification = checkedId(packageVerification.attachmentPackageVerificationId, /^restore_attachment_package_verification_/);
  assert.equal(packageVerification.attachmentPackageVerificationPersistence, "d1_restore_attachment_package_verifications");
  assert.equal(packageVerification.auditPersistence, "d1_audit_events");

  const objectPlan = await requestJson("POST", "/api/restores/attachment-objects-plan-dry-run", {
    workspaceId: "workspace_acme",
    attachmentPackageVerificationId: proofIds.verification,
    packageSha256,
    manifestSha256,
    packageManifest,
  }, false, headers);
  proofIds.objectPlan = checkedId(objectPlan.attachmentObjectPlanId, /^restore_attachment_object_plan_/);
  assert.equal(objectPlan.attachmentObjectPlanPersistence, "d1_restore_attachment_object_plans");
  assert.equal(objectPlan.auditPersistence, "d1_audit_events");

  const commitPreflight = await requestJson("POST", "/api/restores/attachment-objects-commit-preflight", {
    workspaceId: "workspace_acme",
    attachmentPackageVerificationId: proofIds.verification,
    attachmentObjectPlanId: proofIds.objectPlan,
    packageSha256,
    manifestSha256,
    packageManifest,
    confirmation: "RESTORE workspace_acme",
  }, false, headers);
  proofIds.commitPreflight = checkedId(
    commitPreflight.attachmentObjectCommitPreflightId,
    /^restore_attachment_object_commit_preflight_/,
  );
  assert.equal(commitPreflight.attachmentObjectCommitPreflightPersistence, "d1_restore_attachment_object_commit_preflights");
  assert.equal(commitPreflight.auditPersistence, "d1_audit_events");
  assert.equal(commitPreflight.destructiveWrite, false);

  const evidence = executeLocalD1(`
    SELECT
      (SELECT COUNT(*) FROM restore_attachment_package_preflights
        WHERE id = '${proofIds.packagePreflight}') AS package_preflight_count,
      (SELECT COUNT(*) FROM attachment_package_plans
        WHERE id = '${proofIds.downloadPackagePlan}'
          AND instr(object_keys_json, '${packageIntentObjectKey}') > 0) AS download_package_plan_count,
      (SELECT COUNT(*) FROM restore_attachment_package_verifications
        WHERE id = '${proofIds.verification}'
          AND attachment_package_preflight_id = '${proofIds.packagePreflight}') AS verification_count,
      (SELECT COUNT(*) FROM restore_attachment_object_plans
        WHERE id = '${proofIds.objectPlan}'
          AND attachment_package_verification_id = '${proofIds.verification}') AS object_plan_count,
      (SELECT COUNT(*) FROM restore_attachment_object_commit_preflights
        WHERE id = '${proofIds.commitPreflight}'
          AND attachment_package_verification_id = '${proofIds.verification}'
          AND attachment_object_plan_id = '${proofIds.objectPlan}'
          AND destructive_write = 0) AS commit_preflight_count,
      (SELECT COUNT(*) FROM audit_events
        WHERE action IN (
          'restore.attachment_package_dry_run_created',
          'restore.attachment_package_verification_created',
          'restore.attachment_object_plan_created',
          'restore.attachment_object_commit_preflight_created'
        )
          AND (
            instr(metadata_json, '${proofIds.packagePreflight}') > 0
            OR instr(metadata_json, '${proofIds.verification}') > 0
            OR instr(metadata_json, '${proofIds.objectPlan}') > 0
            OR instr(metadata_json, '${proofIds.commitPreflight}') > 0
          )) AS audit_count,
      (SELECT COUNT(*) FROM audit_events
        WHERE action = 'attachment.export_package_dry_run_created'
          AND instr(metadata_json, '${proofIds.downloadPackagePlan}') > 0) AS download_package_audit_count;
  `, true);
  const row = evidence[0]?.results?.[0];
  assert.equal(row?.package_preflight_count, 1);
  assert.equal(row?.download_package_plan_count, 1);
  assert.equal(row?.verification_count, 1);
  assert.equal(row?.object_plan_count, 1);
  assert.equal(row?.commit_preflight_count, 1);
  assert.equal(row?.audit_count, 4);
  assert.equal(row?.download_package_audit_count, 1);

  console.log("Local attachment-proof smoke passed: package download plan, restore package, verification, object-plan, commit-preflight, and audit evidence persisted together");
} catch (error) {
  console.error(`Local attachment-proof smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  try {
    executeLocalD1(cleanupSql());
  } catch (error) {
    console.error(`Local attachment-proof smoke cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function requestJson(method, pathname, body, includeHeaders = false, extraHeaders = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers: { accept: "application/json", "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${pathname} returned non-JSON`);
  }
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}: ${parsed.error ?? "unknown_error"}`);
  return includeHeaders ? { body: parsed, headers: response.headers } : parsed;
}

function executeLocalD1(command, json = false) {
  if (!command.trim()) return null;
  const result = spawnSync("npx", [
    "wrangler", "d1", "execute", "DB", "--local", "--yes",
    ...(json ? ["--json"] : []),
    "--command", command,
  ], {
    cwd: workerDir,
    env: { ...process.env, NO_COLOR: "1" },
    encoding: "utf8",
    timeout: 60_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`local D1 command exited with ${result.status}: ${result.error?.message ?? tail(result.stderr || result.stdout)}`);
  }
  if (!json) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`local D1 command returned non-JSON: ${tail(result.stdout)}`);
  }
}

function cleanupSql() {
  const ids = Object.values(proofIds).filter(Boolean);
  const auditPredicates = ids.length > 0
    ? ids.map((id) => `instr(metadata_json, '${id}') > 0`).join(" OR ")
    : "0";
  return `
    DELETE FROM audit_events WHERE ${auditPredicates};
    ${proofIds.downloadPackagePlan ? `DELETE FROM attachment_package_plans WHERE id = '${proofIds.downloadPackagePlan}';` : ""}
    ${proofIds.commitPreflight ? `DELETE FROM restore_attachment_object_commit_preflights WHERE id = '${proofIds.commitPreflight}';` : ""}
    ${proofIds.objectPlan ? `DELETE FROM restore_attachment_object_plans WHERE id = '${proofIds.objectPlan}';` : ""}
    ${proofIds.verification ? `DELETE FROM restore_attachment_package_verifications WHERE id = '${proofIds.verification}';` : ""}
    ${proofIds.packagePreflight ? `DELETE FROM restore_attachment_package_preflights WHERE id = '${proofIds.packagePreflight}';` : ""}
    DELETE FROM attachment_upload_intents WHERE id = '${packageIntentId}';
  `;
}

function checkedId(value, prefix) {
  assert.equal(typeof value, "string");
  assert.match(value, prefix);
  assert.match(value, /^[A-Za-z0-9_-]+$/);
  return value;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sessionCookieFrom(setCookie) {
  const cookie = setCookie?.split(";")[0]?.trim() ?? "";
  if (!cookie.startsWith("film_session=")) throw new Error("Magic-link verification did not return a Film session cookie");
  return cookie;
}

function normalizeOrigin(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("FILM_WORKER_SMOKE_ORIGIN must be an HTTP(S) URL");
  }
  return parsed.origin;
}

function tail(value) {
  return value.split(/\r?\n/).slice(-12).join("\n");
}
