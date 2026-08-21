#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = path.join(root, "apps", "worker");
const origin = normalizeOrigin(process.env.FILM_WORKER_SMOKE_ORIGIN ?? "http://127.0.0.1:8787");
const memberId = "member_local_status_probe";
const sessionId = "sess_local_status_probe";
const auditAction = "workspace_member.status_updated";
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

try {
  executeLocalD1(cleanupSql());
  executeLocalD1(`
    INSERT INTO workspaces (id, name) VALUES ('workspace_acme', 'Film local smoke')
      ON CONFLICT(id) DO NOTHING;
    INSERT INTO workspace_members (id, workspace_id, email_hash, role)
      VALUES ('${memberId}', 'workspace_acme', 'hash_local_status_probe', 'contributor');
    INSERT INTO workspace_member_statuses (member_id, workspace_id, status, updated_at)
      VALUES ('${memberId}', 'workspace_acme', 'active', CURRENT_TIMESTAMP);
    INSERT INTO sessions (id, workspace_id, member_id, csrf_hash, expires_at)
      VALUES ('${sessionId}', 'workspace_acme', '${memberId}', 'local_probe_hash', '${expiresAt}');
  `);

  const magic = await requestJson("POST", "/api/auth/magic-link/request", {
    email: `film-member-status-smoke+${Date.now()}@example.invalid`,
  });
  assert.match(magic.devOnlyToken, /^dry_/);
  const verification = await requestJson("POST", "/api/auth/magic-link/verify", {
    token: magic.devOnlyToken,
  }, true);
  const cookie = sessionCookieFrom(verification.headers.get("set-cookie"));
  const csrfToken = verification.body.session?.csrfToken;
  assert.equal(typeof csrfToken, "string");

  const disabled = await requestJson("POST", "/api/members/status/dry-run", {
    workspaceId: "workspace_acme",
    memberId,
    status: "disabled",
  }, false, { cookie, "x-film-csrf": csrfToken });
  assert.equal(disabled.persistence, "d1_workspace_member_status");
  assert.equal(disabled.auditPersistence, "d1_audit_events");
  assert.equal(disabled.sessionPolicy, "target_sessions_revoked");

  const reactivated = await requestJson("POST", "/api/members/status/dry-run", {
    workspaceId: "workspace_acme",
    memberId,
    status: "active",
  }, false, { cookie, "x-film-csrf": csrfToken });
  assert.equal(reactivated.persistence, "d1_workspace_member_status");
  assert.equal(reactivated.auditPersistence, "d1_audit_events");
  assert.equal(reactivated.sessionPolicy, "no_session_revocation_required");

  const evidence = executeLocalD1(`
    SELECT
      (SELECT status FROM workspace_member_statuses WHERE member_id = '${memberId}') AS member_status,
      (SELECT CASE WHEN revoked_at IS NOT NULL THEN 1 ELSE 0 END FROM sessions WHERE id = '${sessionId}') AS session_revoked,
      (SELECT COUNT(*) FROM audit_events
        WHERE action = '${auditAction}'
          AND metadata_json LIKE '%${memberId}%') AS audit_count;
  `, true);
  const row = evidence[0]?.results?.[0];
  assert.equal(row?.member_status, "active");
  assert.equal(row?.session_revoked, 1);
  assert.equal(row?.audit_count, 2);

  console.log("Local member-status smoke passed: atomic status updates, persistent session revocation, audit evidence");
} catch (error) {
  console.error(`Local member-status smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  try {
    executeLocalD1(cleanupSql());
  } catch (error) {
    console.error(`Local member-status smoke cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
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
    DELETE FROM audit_events
      WHERE action = '${auditAction}'
        AND metadata_json LIKE '%${memberId}%';
    DELETE FROM sessions WHERE id = '${sessionId}';
    DELETE FROM workspace_member_statuses WHERE member_id = '${memberId}';
    DELETE FROM workspace_members WHERE id = '${memberId}';
  `;
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
