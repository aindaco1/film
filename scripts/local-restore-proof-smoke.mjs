#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = path.join(root, "apps", "worker");
const origin = normalizeOrigin(process.env.FILM_WORKER_SMOKE_ORIGIN ?? "http://127.0.0.1:8787");
const restorePointId = "restore_local_atomic_proof";
const snapshotRef = "r2://film-backups/workspaces/workspace_acme/backups/20260709T020000000Z-localproof.filmbackup.zip";
let planningPreviewId = null;
const preview = {
  incomingRecordCount: 4,
  changedRecordCount: 1,
  newRecordCount: 3,
  fieldConflictCount: 0,
  warnings: [],
};

try {
  executeLocalD1(cleanupSql());
  executeLocalD1(`
    INSERT INTO workspaces (id, name) VALUES ('workspace_acme', 'Film local smoke')
      ON CONFLICT(id) DO NOTHING;
    INSERT INTO restore_points (id, workspace_id, label, snapshot_ref, created_at)
      VALUES (
        '${restorePointId}',
        'workspace_acme',
        'Local atomic restore proof',
        '${snapshotRef}',
        '2026-07-09T02:00:00.000Z'
      );
  `);

  const magic = await requestJson("POST", "/api/auth/magic-link/request", {
    email: `film-restore-proof-smoke+${Date.now()}@example.invalid`,
  });
  assert.match(magic.devOnlyToken, /^dry_/);
  const verification = await requestJson("POST", "/api/auth/magic-link/verify", {
    token: magic.devOnlyToken,
  }, true);
  const cookie = sessionCookieFrom(verification.headers.get("set-cookie"));
  const csrfToken = verification.body.session?.csrfToken;
  assert.equal(typeof csrfToken, "string");
  const headers = { cookie, "x-film-csrf": csrfToken };

  const approval = await requestJson("POST", "/api/restores/approval-dry-run", {
    workspaceId: "workspace_acme",
    snapshotWorkspaceId: "workspace_acme",
    backupCreatedAt: "2026-07-08T00:00:00.000Z",
    preRestoreBackupId: restorePointId,
    confirmation: "RESTORE workspace_acme",
    preview,
  }, false, headers);
  assert.match(approval.approvalId, /^restore_approval_/);
  assert.equal(approval.preRestoreBackupVerified, true, JSON.stringify(approval));
  assert.equal(approval.approvalStatus, "approved_pending_commit");
  assert.equal(approval.approvalPersistence, "d1_restore_approvals");
  assert.equal(approval.auditPersistence, "d1_audit_events");

  const commitAttempt = await requestJson("POST", "/api/restores/commit-storage-dry-run", {
    workspaceId: "workspace_acme",
    snapshotWorkspaceId: "workspace_acme",
    backupCreatedAt: "2026-07-08T00:00:00.000Z",
    preRestoreBackupId: restorePointId,
    approvalId: approval.approvalId,
    confirmation: "RESTORE workspace_acme",
    preview,
  }, false, headers);
  assert.match(commitAttempt.commitAttemptId, /^restore_commit_attempt_/);
  assert.equal(commitAttempt.commitAttemptPersistence, "d1_restore_commit_attempts");
  assert.equal(commitAttempt.auditPersistence, "d1_audit_events");

  const preflight = await requestJson("POST", "/api/restores/application-dry-run", {
    workspaceId: "workspace_acme",
    snapshotWorkspaceId: "workspace_acme",
    backupCreatedAt: "2026-07-08T00:00:00.000Z",
    preRestoreBackupId: restorePointId,
    approvalId: approval.approvalId,
    commitAttemptId: commitAttempt.commitAttemptId,
    confirmation: "RESTORE workspace_acme",
    preview,
    applicationTablePlan: [],
  }, false, headers);
  assert.match(preflight.applicationPreflightId, /^restore_application_preflight_/);
  assert.equal(preflight.applicationPreflightPersistence, "d1_restore_application_preflights");
  assert.equal(preflight.auditPersistence, "d1_audit_events");

  const planningPreview = await requestJson("POST", "/api/restores/planning-dry-run", {
    workspaceId: "workspace_acme",
    snapshotWorkspaceId: "workspace_acme",
    backupCreatedAt: "2026-07-09T02:00:00.000Z",
    records: [{
      kind: "location",
      id: "restore_local_planning_preview",
      workspaceId: "workspace_acme",
      projectId: null,
      title: "Local planning preview",
      fields: { locationType: "Interior" },
    }],
  }, false, headers);
  planningPreviewId = checkedId(planningPreview.planningPreviewId, /^restore_planning_preview_/);
  assert.equal(planningPreview.planningPreviewPersistence, "d1_restore_planning_previews");
  assert.equal(planningPreview.auditPersistence, "d1_audit_events");
  assert.equal(planningPreview.destructiveWrite, false);

  const evidence = executeLocalD1(`
    SELECT
      (SELECT COUNT(*) FROM restore_approvals
        WHERE id = '${approval.approvalId}'
          AND pre_restore_backup_id = '${restorePointId}') AS approval_count,
      (SELECT COUNT(*) FROM restore_commit_attempts
        WHERE id = '${commitAttempt.commitAttemptId}'
          AND approval_id = '${approval.approvalId}'
          AND pre_restore_backup_id = '${restorePointId}') AS commit_attempt_count,
      (SELECT COUNT(*) FROM restore_application_preflights
        WHERE id = '${preflight.applicationPreflightId}'
          AND approval_id = '${approval.approvalId}'
          AND commit_attempt_id = '${commitAttempt.commitAttemptId}'
          AND pre_restore_backup_id = '${restorePointId}') AS application_preflight_count,
      (SELECT COUNT(*) FROM restore_planning_previews
        WHERE id = '${planningPreviewId}'
          AND status = 'preview_only'
          AND destructive_write = 0) AS planning_preview_count,
      (SELECT COUNT(*) FROM audit_events
        WHERE action IN (
          'restore.approval_dry_run_created',
          'restore.commit_storage_dry_run_created',
          'restore.application_dry_run_created'
        )
          AND instr(metadata_json, '${restorePointId}') > 0) AS audit_count,
      (SELECT COUNT(*) FROM audit_events
        WHERE action = 'restore.planning_dry_run_created'
          AND instr(metadata_json, '${planningPreviewId}') > 0) AS planning_audit_count;
  `, true);
  const row = evidence[0]?.results?.[0];
  assert.equal(row?.approval_count, 1);
  assert.equal(row?.commit_attempt_count, 1);
  assert.equal(row?.application_preflight_count, 1);
  assert.equal(row?.planning_preview_count, 1);
  assert.equal(row?.audit_count, 3);
  assert.equal(row?.planning_audit_count, 1);

  console.log("Local restore-proof smoke passed: guarded approval, commit-attempt, application preflight, planning preview, and audit evidence persisted together");
} catch (error) {
  console.error(`Local restore-proof smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  try {
    executeLocalD1(cleanupSql());
  } catch (error) {
    console.error(`Local restore-proof smoke cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function requestJson(method, pathname, body, includeHeaders = false, extraHeaders = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${pathname} returned non-JSON`);
  }
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}: ${parsed.error ?? "unknown_error"}`);
  }
  return includeHeaders ? { body: parsed, headers: response.headers } : parsed;
}

function executeLocalD1(command, json = false) {
  const result = spawnSync("npx", [
    "wrangler",
    "d1",
    "execute",
    "DB",
    "--local",
    "--yes",
    ...(json ? ["--json"] : []),
    "--command",
    command,
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
  return `
    ${planningPreviewId ? `DELETE FROM audit_events WHERE action = 'restore.planning_dry_run_created' AND instr(metadata_json, '${planningPreviewId}') > 0;` : ""}
    ${planningPreviewId ? `DELETE FROM restore_planning_previews WHERE id = '${planningPreviewId}';` : ""}
    DELETE FROM audit_events
      WHERE action IN (
        'restore.approval_dry_run_created',
        'restore.commit_storage_dry_run_created',
        'restore.application_dry_run_created'
      )
        AND instr(metadata_json, '${restorePointId}') > 0;
    DELETE FROM restore_application_preflights
      WHERE pre_restore_backup_id = '${restorePointId}';
    DELETE FROM restore_commit_attempts
      WHERE pre_restore_backup_id = '${restorePointId}';
    DELETE FROM restore_approvals
      WHERE pre_restore_backup_id = '${restorePointId}';
    DELETE FROM restore_points WHERE id = '${restorePointId}';
  `;
}

function checkedId(value, prefix) {
  assert.equal(typeof value, "string");
  assert.match(value, prefix);
  assert.match(value, /^[A-Za-z0-9_-]+$/);
  return value;
}

function sessionCookieFrom(setCookie) {
  const cookie = setCookie?.split(";")[0]?.trim() ?? "";
  if (!cookie.startsWith("film_session=")) {
    throw new Error("Magic-link verification did not return a Film session cookie");
  }
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
