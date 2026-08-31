#!/usr/bin/env node
import assert from "node:assert/strict";
import { createLocalWorkerProofClient } from "./local-worker-proof-client.mjs";

const localWorker = createLocalWorkerProofClient();
const { executeLocalD1, requestJson } = localWorker;
const memberId = "member_local_status_probe";
const sessionId = "sess_local_status_probe";
const auditAction = "workspace_member.status_updated";
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
let ownerSession = null;

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

  ownerSession = await localWorker.createOwnerSession("member_status_probe");
  const { cookie, "x-film-csrf": csrfToken } = ownerSession.headers;

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
  if (ownerSession) {
    try {
      await localWorker.disposeOwnerSession(ownerSession);
    } catch (error) {
      console.error(`Local member-status owner cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
  try {
    executeLocalD1(cleanupSql());
  } catch (error) {
    console.error(`Local member-status smoke cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
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
