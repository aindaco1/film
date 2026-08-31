#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createLocalWorkerProofClient } from "./local-worker-proof-client.mjs";

const localWorker = createLocalWorkerProofClient();
const { executeLocalD1, requestJson } = localWorker;
const memberId = "member_local_collaboration_probe";
const projectId = "proj_local_collaboration_probe";
const acceptedInviteEmail = "film-local-accepted-invite-probe@example.invalid";
const revokedInviteEmail = "film-local-revoked-invite-probe@example.invalid";
const acceptedInviteEmailHash = sha256Hex(acceptedInviteEmail);
const revokedInviteEmailHash = sha256Hex(revokedInviteEmail);
let authHeaders = null;
let ownerSession = null;

try {
  executeLocalD1(cleanupSql());
  executeLocalD1(`
    INSERT INTO workspaces (id, name) VALUES ('workspace_acme', 'Film local smoke')
      ON CONFLICT(id) DO NOTHING;
    INSERT INTO workspace_members (id, workspace_id, email_hash, role)
      VALUES ('${memberId}', 'workspace_acme', 'hash_local_collaboration_probe', 'contributor');
    INSERT INTO workspace_member_statuses (member_id, workspace_id, status, updated_at)
      VALUES ('${memberId}', 'workspace_acme', 'active', CURRENT_TIMESTAMP);
  `);

  ownerSession = await localWorker.createOwnerSession("collaboration_probe");
  authHeaders = ownerSession.headers;
  const acceptedInvite = await post("/api/invites/create-dry-run", {
    workspaceId: "workspace_acme",
    email: acceptedInviteEmail,
    role: "reviewer",
  });
  assert.equal(acceptedInvite.delivery, "queued_dry_run");
  const acceptedMember = await postPublic("/api/invites/accept-dry-run", {
    token: acceptedInvite.invite?.devOnlyInviteToken,
    displayName: "Local accepted invite probe",
  });
  assert.equal(acceptedMember.persistence, "d1_invite_records");
  assert.equal(acceptedMember.auditPersistence, "d1_audit_events");

  const revokedInvite = await post("/api/invites/create-dry-run", {
    workspaceId: "workspace_acme",
    email: revokedInviteEmail,
    role: "reviewer",
  });
  const revoked = await post("/api/invites/revoke-dry-run", {
    workspaceId: "workspace_acme",
    inviteId: revokedInvite.invite?.id,
    emailHash: revokedInvite.invite?.emailHash,
    role: "reviewer",
  });
  assert.equal(revoked.persistence, "d1_invite_records");
  assert.equal(revoked.auditPersistence, "d1_audit_events");

  const assignment = await post("/api/projects/memberships/assign-dry-run", {
    workspaceId: "workspace_acme",
    projectId,
    projectTitle: "Local collaboration probe",
    memberId,
    role: "contributor",
    department: "Camera",
  });
  assert.equal(assignment.persistence, "d1_project_membership");
  assert.equal(assignment.auditPersistence, "d1_audit_events");

  const comment = await post("/api/records/comments/dry-run", {
    workspaceId: "workspace_acme",
    entityType: "project",
    entityId: projectId,
    body: "Local metadata-only collaboration probe.",
  });
  assert.equal(comment.persistence, "d1_record_comment_intents");
  assert.equal(comment.auditPersistence, "d1_audit_events");

  const firstGrant = await post("/api/records/permissions/assign-dry-run", {
    workspaceId: "workspace_acme",
    entityType: "project",
    entityId: projectId,
    memberId,
    permission: "write",
    department: "Camera",
  });
  const permissionId = firstGrant.permission?.id;
  assert.match(permissionId, /^record_permission_/);

  const updatedGrant = await post("/api/records/permissions/assign-dry-run", {
    workspaceId: "workspace_acme",
    entityType: "project",
    entityId: projectId,
    memberId,
    permission: "write",
    department: "Lighting",
  });
  assert.equal(updatedGrant.permission?.id, permissionId);
  assert.equal(updatedGrant.permission?.department, "Lighting");

  const transfer = await post("/api/records/owners/transfer-dry-run", {
    workspaceId: "workspace_acme",
    entityType: "project",
    entityId: projectId,
    memberId,
  });
  assert.equal(transfer.persistence, "d1_record_owner");
  assert.equal(transfer.owner?.previousOwnerMemberId, null);

  const permissionRevoke = await post("/api/records/permissions/revoke-dry-run", {
    workspaceId: "workspace_acme",
    permissionId,
    entityType: "project",
    entityId: projectId,
    memberId,
    permission: "write",
  });
  assert.equal(permissionRevoke.persistence, "d1_record_permissions");

  const membershipRevoke = await post("/api/projects/memberships/revoke-dry-run", {
    workspaceId: "workspace_acme",
    projectId,
    memberId,
    role: "contributor",
  });
  assert.equal(membershipRevoke.persistence, "d1_project_membership");

  const evidence = executeLocalD1(`
    SELECT
      (SELECT owner_member_id FROM projects WHERE id = '${projectId}') AS owner_member_id,
      (SELECT COUNT(*) FROM project_memberships WHERE project_id = '${projectId}' AND member_id = '${memberId}') AS membership_count,
      (SELECT COUNT(*) FROM record_permissions WHERE entity_id = '${projectId}' AND member_id = '${memberId}') AS permission_count,
      (SELECT COUNT(*) FROM record_comment_intents WHERE entity_type = 'project' AND entity_id = '${projectId}') AS comment_count,
      (SELECT status FROM workspace_invites WHERE email_hash = '${acceptedInviteEmailHash}') AS accepted_invite_status,
      (SELECT status FROM workspace_invites WHERE email_hash = '${revokedInviteEmailHash}') AS revoked_invite_status,
      (SELECT COUNT(*) FROM workspace_members WHERE email_hash = '${acceptedInviteEmailHash}') AS accepted_member_count,
      (SELECT COUNT(*) FROM audit_events WHERE project_id = '${projectId}') AS audit_count;
  `, true);
  const row = evidence[0]?.results?.[0];
  assert.equal(row?.owner_member_id, memberId);
  assert.equal(row?.membership_count, 0);
  assert.equal(row?.permission_count, 0);
  assert.equal(row?.comment_count, 1);
  assert.equal(row?.accepted_invite_status, "accepted");
  assert.equal(row?.revoked_invite_status, "revoked");
  assert.equal(row?.accepted_member_count, 1);
  assert.equal(row?.audit_count, 7);

  console.log("Local collaboration smoke passed: atomic invites, comment, memberships, stable permission IDs, owner transfer, exact revocations");
} catch (error) {
  console.error(`Local collaboration smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (ownerSession) {
    try {
      await localWorker.disposeOwnerSession(ownerSession);
    } catch {
      process.exitCode = 1;
    }
  }
  try {
    executeLocalD1(cleanupSql());
  } catch (error) {
    console.error(`Local collaboration smoke cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

async function post(pathname, body) {
  return requestJson("POST", pathname, body, false, authHeaders ?? {});
}

async function postPublic(pathname, body) {
  return requestJson("POST", pathname, body);
}

function cleanupSql() {
  return `
    DELETE FROM audit_events
      WHERE project_id = '${projectId}'
        OR json_extract(metadata_json, '$.memberId') = '${memberId}'
        OR json_extract(metadata_json, '$.emailHash') IN ('${acceptedInviteEmailHash}', '${revokedInviteEmailHash}');
    DELETE FROM record_comment_intents WHERE entity_type = 'project' AND entity_id = '${projectId}';
    DELETE FROM record_permissions WHERE entity_id = '${projectId}' OR member_id = '${memberId}';
    DELETE FROM project_memberships WHERE project_id = '${projectId}' OR member_id = '${memberId}';
    DELETE FROM projects WHERE id = '${projectId}';
    DELETE FROM workspace_member_statuses WHERE member_id = '${memberId}';
    DELETE FROM workspace_members WHERE id = '${memberId}';
    DELETE FROM invite_delivery_attempts
      WHERE target_hash IN ('${acceptedInviteEmailHash}', '${revokedInviteEmailHash}');
    DELETE FROM workspace_member_statuses
      WHERE member_id IN (SELECT id FROM workspace_members WHERE email_hash = '${acceptedInviteEmailHash}');
    DELETE FROM workspace_members WHERE email_hash = '${acceptedInviteEmailHash}';
    DELETE FROM workspace_invites
      WHERE email_hash IN ('${acceptedInviteEmailHash}', '${revokedInviteEmailHash}');
  `;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}
