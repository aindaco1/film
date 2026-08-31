#!/usr/bin/env node
import assert from "node:assert/strict";
import { checkedOpaqueId, createLocalWorkerProofClient } from "./local-worker-proof-client.mjs";

const localWorker = createLocalWorkerProofClient();
const { executeLocalD1, requestJson } = localWorker;
const restorePointId = "restore_local_atomic_proof";
const snapshotRef = "r2://film-backups/workspaces/workspace_acme/backups/20260709T020000000Z-localproof.filmbackup.zip";
let planningPreviewId = null;
let ownerSession = null;
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

  ownerSession = await localWorker.createOwnerSession("restore_probe");
  const headers = ownerSession.headers;

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
  planningPreviewId = checkedOpaqueId(planningPreview.planningPreviewId, /^restore_planning_preview_/);
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
  if (ownerSession) {
    try {
      await localWorker.disposeOwnerSession(ownerSession);
    } catch (error) {
      console.error(`Local restore-proof owner cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
  try {
    executeLocalD1(cleanupSql());
  } catch (error) {
    console.error(`Local restore-proof smoke cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
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
