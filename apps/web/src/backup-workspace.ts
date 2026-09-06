import type { BackupPlanningRecord, BackupSnapshot } from "@film/schema";
import type { RestorePreviewSummary } from "@film/backup";
import type { BackupWorkspaceState, RestorePlanningDryRunState, RestoreAttachmentPackageVerificationState, RestoreAttachmentObjectPlanState, RestoreAttachmentObjectCommitPreflightState } from "./backup-state";
import type { RestorePlanningTableSummary, RestorePlanningPreviewDetail, RestorePlanningDryRunResult, RestoreCoreRecordRequest } from "./restore-client";
import { escapeHtml, formatBytes, formatShortDateTime, shortHash } from "./presentation-format";
import { localBackupSummary } from "./project-summary";
import { countQueuedOperations } from "./local-mirror";
import { icon } from "./icons";
import { createRestoreSnapshotRecords, formatRestoreRecordSummary, formatRestorePlanningCommitSummary } from "./restore-records";

function renderBackupRestoreWorkflow(state: BackupWorkspaceState): string {
  return `
    <section class="panel backup-restore-workflow" aria-labelledby="backup-restore-workflow-title">
                <div class="section-head row"><div><h2 id="backup-restore-workflow-title">Restore Workflow</h2><p>Preview, verify, and apply one restore in order.</p></div></div>
                ${
                  state.backupDryRun
                    ? `
                      <div class="provider-preview" role="status">
                        <strong>Worker restore point</strong>
                        <span>${escapeHtml(state.backupDryRun.persistence.replaceAll("_", " "))}</span>
                        ${
                          state.backupDryRun.storagePersistence
                            ? `<span>${escapeHtml(state.backupDryRun.storagePersistence.replaceAll("_", " "))}${state.backupDryRun.sizeBytes ? ` - ${formatBytes(state.backupDryRun.sizeBytes)}` : ""}</span>`
                            : ""
                        }
                        <span>${escapeHtml(state.backupDryRun.retentionPolicy.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.backupDryRun.restorePointLabel)}</small>
                      </div>
                    `
                    : ""
                }
                ${
                  state.backupExport
                    ? `
                      <div class="provider-preview" role="status">
                        <strong>Stored backup manifest</strong>
                        <span>${state.backupExport.rowCount} stored restore points - ${state.backupExport.truncated ? "truncated" : "complete"}</span>
                        <small>${escapeHtml(state.backupExport.persistence.replaceAll("_", " "))}</small>
                      </div>
                    `
                    : ""
                }
                <div class="backup-workflow-actions">
                <label class="restore-row">
                  <span>Restore point</span>
                  <select data-action="restore-select">
                    ${state.workspace.restorePoints
                      .map((point) => `<option value="${point.id}">${escapeHtml(point.label)}</option>`)
                      .join("")}
                  </select>
                  <button type="button" data-action="restore">Restore</button>
                </label>
                <button class="secondary-button full-width" type="button" data-action="backup-r2-manifest">${icon("backup")} Stored backups</button>
                <button class="secondary-button full-width" type="button" data-action="backup-r2-preview">${icon("backup")} Preview stored backup</button>
                <button class="secondary-button full-width" type="button" data-action="restore-file-preview">${icon("backup")} Preview encrypted backup</button>
                </div>
                <div class="restore-stage-actions">
                ${
                  state.restorePreview
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-gate-check">${icon("check")} Check restore gate</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restoreGate
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-approval-record">${icon("check")} Record approval</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restoreApproval?.approvalId && state.restoreApproval.approvalStatus === "approved_pending_commit"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-commit-storage-check">${icon("check")} Check commit storage</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restoreCommitAttempt?.commitAttemptId && state.restoreCommitAttempt.commitAttemptStatus === "blocked_until_restore_apply"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-application-preflight-check">${icon("check")} Check application preflight</button>`
                    : ""
                }
                ${
                  state.restoreSnapshot
                    && state.restorePreview
                    && state.restoreApplicationPreflight?.applicationPreflightId
                    && state.restoreApplicationPreflight.applicationPreflightStatus === "blocked_until_restore_apply_implementation"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-application-commit">${icon("check")} Apply snapshot records</button>`
                    : ""
                }
                ${
                  state.restorePreview?.applicationPlan.attachmentPackagePlan.packageRequired
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-package-check">${icon("check")} Check attachment package</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentPackagePreflight?.attachmentPackagePreflightId
                    && state.attachmentExport?.packageDownload?.sha256
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-package-verify">${icon("check")} Verify package manifest</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentPackagePreflight?.attachmentPackagePreflightId
                    && !state.attachmentExport?.packageDownload
                    ? `<small class="restore-action-note">Download package in Imports before package verification.</small>`
                    : ""
                }
                ${
                  state.restoreAttachmentPackageVerification?.attachmentPackageVerificationId
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-objects-plan">${icon("check")} Plan attachment object restore</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentObjectPlan?.attachmentObjectPlanId
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-objects-commit-preflight">${icon("check")} Check attachment commit preflight</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentObjectCommitPreflight?.readyForByteCommit
                    && state.restoreAttachmentObjectCommitPreflight.attachmentObjectCommitPreflightId
                    && state.attachmentExport?.packageDownload?.blob
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-objects-commit">${icon("backup")} Restore attachment bytes</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restorePlanningRecords.length > 0
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-planning-check">${icon("check")} Check planning restore</button>`
                    : ""
                }
                ${
                  state.restorePlanningRecords.length > 0
                    && state.restorePlanningDryRun?.planningPreviewId
                    && state.restorePlanningDryRun.planningPreviewStatus === "preview_only"
                    && state.restorePlanningDryRun.rejectedCount === 0
                    && state.restoreApplicationPreflight?.applicationPreflightId
                    && state.restoreApplicationPreflight.applicationPreflightStatus === "blocked_until_restore_apply_implementation"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-planning-commit">${icon("check")} Apply planning rows</button>`
                    : ""
                }
                </div>
                <div class="restore-workflow-results">
                ${
                  state.restorePreview
                    ? renderRestorePreview(state.restorePreview)
                    : ""
                }
                ${
                  state.restorePlanningDryRun
                    ? renderRestorePlanningDryRun(state.restorePlanningDryRun, state.restorePlanningRecords)
                    : ""
                }
                ${
                  state.restorePlanningCommit
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Planning commit</strong>
                        <span>${escapeHtml(state.restorePlanningCommit.planningCommitStatus.replaceAll("_", " "))}</span>
                        <span>${state.restorePlanningCommit.destructiveWrite ? "Destructive writes applied" : "No destructive writes"} - ${escapeHtml(state.restorePlanningCommit.commitStatus.replaceAll("_", " "))}</span>
                        <span>${escapeHtml(formatRestorePlanningCommitSummary(state.restorePlanningCommit.result))}</span>
                        <small>${escapeHtml(state.restorePlanningCommit.restoreMode.replaceAll("_", " "))} - ${escapeHtml(state.restorePlanningCommit.planningCommitPersistence.replaceAll("_", " "))}${state.restorePlanningCommit.auditPersistence ? ` - ${escapeHtml(state.restorePlanningCommit.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        <small>${escapeHtml(shortHash(state.restorePlanningCommit.planningCommitId))}</small>
                        ${
                          state.restorePlanningCommit.unsupportedRestoreDomains.length
                            ? `<small>Still blocked: ${escapeHtml(state.restorePlanningCommit.unsupportedRestoreDomains.join(", ").replaceAll("_", " "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreAttachmentPackagePreflight
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Attachment package preflight</strong>
                        <span>${state.restoreAttachmentPackagePreflight.metadataRecordCount} metadata records - ${formatBytes(state.restoreAttachmentPackagePreflight.totalSourceBytes)}</span>
                        <span>${state.restoreAttachmentPackagePreflight.canRestoreBytes ? "Byte restore ready" : "Byte restore blocked"} - ${escapeHtml(state.restoreAttachmentPackagePreflight.attachmentPackagePreflightStatus.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreAttachmentPackagePreflight.attachmentPackagePreflightPersistence.replaceAll("_", " "))}${state.restoreAttachmentPackagePreflight.auditPersistence ? ` - ${escapeHtml(state.restoreAttachmentPackagePreflight.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreAttachmentPackagePreflight.attachmentPackagePreflightId
                            ? `<small>${escapeHtml(shortHash(state.restoreAttachmentPackagePreflight.attachmentPackagePreflightId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreAttachmentPackagePreflight.blockers.length
                            ? `<small>${escapeHtml(state.restoreAttachmentPackagePreflight.blockers.slice(0, 2).join(" "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreAttachmentPackageVerification
                    ? renderRestoreAttachmentPackageVerification(state.restoreAttachmentPackageVerification)
                    : ""
                }
                ${
                  state.restoreAttachmentObjectPlan
                    ? renderRestoreAttachmentObjectPlan(state.restoreAttachmentObjectPlan)
                    : ""
                }
                ${
                  state.restoreAttachmentObjectCommitPreflight
                    ? renderRestoreAttachmentObjectCommitPreflight(state.restoreAttachmentObjectCommitPreflight)
                    : ""
                }
                ${
                  state.restoreAttachmentObjectCommit
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Attachment byte restore</strong>
                        <span>${state.restoreAttachmentObjectCommit.committedCount} stored - ${state.restoreAttachmentObjectCommit.idempotentCount} idempotent - ${state.restoreAttachmentObjectCommit.failedCount} failed</span>
                        <span>${formatBytes(state.restoreAttachmentObjectCommit.totalBytes)} committed through verified package objects</span>
                        <small>New R2 objects only - destructive writes audited</small>
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreGate
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Restore gate</strong>
                        <span>${escapeHtml(state.restoreGate.commitStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreGate.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${state.restoreGate.preRestoreBackupRequired ? "pre-restore backup required" : "pre-restore backup not required"}</span>
                        <span>Pre-restore backup: ${state.restoreGate.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreGate.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreGate.authorizationPolicy.replaceAll("_", " "))}${state.restoreGate.auditPersistence ? ` - ${escapeHtml(state.restoreGate.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreGate.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreGate.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreApproval
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Restore approval</strong>
                        <span>${escapeHtml(state.restoreApproval.approvalStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreApproval.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(state.restoreApproval.commitStatus.replaceAll("_", " "))}</span>
                        <span>Pre-restore backup: ${state.restoreApproval.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreApproval.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreApproval.approvalPersistence.replaceAll("_", " "))}${state.restoreApproval.auditPersistence ? ` - ${escapeHtml(state.restoreApproval.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreApproval.approvalId
                            ? `<small>${escapeHtml(shortHash(state.restoreApproval.approvalId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApproval.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreApproval.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                        ${
                          state.restoreApproval.approvalBlockers.length
                            ? `<small>${escapeHtml(state.restoreApproval.approvalBlockers.join(" "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreCommitAttempt
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Commit storage</strong>
                        <span>${escapeHtml(state.restoreCommitAttempt.commitAttemptStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreCommitAttempt.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(state.restoreCommitAttempt.commitStatus.replaceAll("_", " "))}</span>
                        <span>Pre-restore backup: ${state.restoreCommitAttempt.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreCommitAttempt.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreCommitAttempt.commitAttemptPersistence.replaceAll("_", " "))}${state.restoreCommitAttempt.auditPersistence ? ` - ${escapeHtml(state.restoreCommitAttempt.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreCommitAttempt.commitAttemptId
                            ? `<small>${escapeHtml(shortHash(state.restoreCommitAttempt.commitAttemptId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreCommitAttempt.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreCommitAttempt.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreApplicationPreflight
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Application preflight</strong>
                        <span>${escapeHtml(state.restoreApplicationPreflight.applicationPreflightStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreApplicationPreflight.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(state.restoreApplicationPreflight.commitStatus.replaceAll("_", " "))}</span>
                        <span>Pre-restore backup: ${state.restoreApplicationPreflight.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreApplicationPreflight.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreApplicationPreflight.applicationPreflightPersistence.replaceAll("_", " "))}${state.restoreApplicationPreflight.auditPersistence ? ` - ${escapeHtml(state.restoreApplicationPreflight.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreApplicationPreflight.applicationPreflightId
                            ? `<small>${escapeHtml(shortHash(state.restoreApplicationPreflight.applicationPreflightId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.rollbackGuidance.blockers?.length
                            ? `<small>${escapeHtml(state.restoreApplicationPreflight.rollbackGuidance.blockers.join(" "))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.rollbackGuidance.requiredBeforeApply?.length
                            ? `<small>Before apply: ${escapeHtml(state.restoreApplicationPreflight.rollbackGuidance.requiredBeforeApply.join(", ").replaceAll("_", " "))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.rollbackGuidance.applicationTablePlan?.length
                            ? `<small>Preflight table plan: ${state.restoreApplicationPreflight.rollbackGuidance.applicationTablePlan.length} tables</small>`
                            : ""
                        }
                        ${
                          state.restoreSnapshot && state.restorePreview
                            ? renderRestoreSnapshotReviewTable(state.restoreSnapshot, state.restorePreview)
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreApplicationPreflight.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreApplicationCommit
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Application commit</strong>
                        <span>${escapeHtml(state.restoreApplicationCommit.applicationCommitStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreApplicationCommit.destructiveWrite ? "Destructive writes applied" : "No destructive writes"} - ${escapeHtml(state.restoreApplicationCommit.commitStatus.replaceAll("_", " "))}</span>
                        <span>${escapeHtml(formatRestoreRecordSummary(state.restoreApplicationCommit.recordSummary))}</span>
                        <small>${escapeHtml(state.restoreApplicationCommit.restoreMode.replaceAll("_", " "))} - ${escapeHtml(state.restoreApplicationCommit.applicationCommitPersistence.replaceAll("_", " "))}${state.restoreApplicationCommit.auditPersistence ? ` - ${escapeHtml(state.restoreApplicationCommit.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        <small>${escapeHtml(shortHash(state.restoreApplicationCommit.applicationCommitId))}</small>
                        ${
                          state.restoreApplicationCommit.unsupportedRestoreDomains.length
                            ? `<small>Still blocked: ${escapeHtml(state.restoreApplicationCommit.unsupportedRestoreDomains.join(", ").replaceAll("_", " "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                </div>
              </section>
  `;
}

export function renderBackupsWorkspace(state: BackupWorkspaceState): string {
  const backup = localBackupSummary(state.operations);
  const restorePoints = state.workspace.restorePoints.slice(0, 8);
  const latestBackup = restorePoints[0];
  const backupStatus = state.backupDryRun
    ? `${state.backupDryRun.persistence.replaceAll("_", " ")} - ${state.backupDryRun.retentionPolicy.replaceAll("_", " ")}`
    : "No Worker backup check in this session";
  const manifestStatus = state.backupExport
    ? `${state.backupExport.rowCount} stored restore points - ${state.backupExport.truncated ? "truncated" : "complete"}`
    : "Stored backup manifest not loaded";
  const restoreStatus = state.restorePreview
    ? `${state.restorePreview.matchingProjectCount} matching projects - ${state.restorePreview.changedRecordCount} changed records`
    : "No encrypted backup preview loaded";

  return `
    <div class="slate-head backups-workspace-head">
      <div>
        <h1>Backups</h1>
        <p>Encrypted local exports and stored backup records</p>
      </div>
      <div class="view-controls" aria-label="Backup controls">
        <button type="button" data-action="backup">${icon("backup")} Backup now</button>
      </div>
    </div>
    <section class="backup-workspace-grid" aria-label="Backup workspace">
      <section class="panel backup-workspace-panel" aria-labelledby="backup-restore-points-title">
        <div class="section-head row">
          <div>
            <h2 id="backup-restore-points-title">Recorded restore points</h2>
            <p>${latestBackup ? "Metadata only; verify the stored backup before restore." : "No stored backup records loaded."}</p>
          </div>
        </div>
        <div class="backup-table" aria-label="Restore points" tabindex="0">
          <div class="backup-table-row backup-table-head">
            <span>Label</span>
            <span>Created</span>
            <span>Restore ID</span>
          </div>
          ${
            restorePoints.length
              ? restorePoints
                .map(
                  (point) => `
                    <div class="backup-table-row">
                      <span>${escapeHtml(point.label)}</span>
                      <span>${escapeHtml(formatShortDateTime(point.createdAt))}</span>
                      <span>${escapeHtml(shortHash(point.id))}</span>
                    </div>
                  `,
                )
                .join("")
              : `<div class="empty-inline">No restore points yet.</div>`
          }
        </div>
      </section>
      <section class="panel backup-workspace-panel" aria-labelledby="backup-safety-title">
        <div class="section-head row">
          <div>
            <h2 id="backup-safety-title">Safety State</h2>
            <p>${countQueuedOperations(state.operations)} local operations queued</p>
          </div>
        </div>
        <dl class="detail-list compact backup-safety-list">
          <div><dt>Last local export</dt><dd>${backup.exportedAt ? escapeHtml(formatShortDateTime(backup.exportedAt)) : "None recorded"}</dd></div>
          <div><dt>Automatic backups</dt><dd>${backup.automatic}</dd></div>
          <div><dt>Worker backup</dt><dd>${escapeHtml(backupStatus)}</dd></div>
          <div><dt>Stored manifest</dt><dd>${escapeHtml(manifestStatus)}</dd></div>
          <div><dt>Restore preview</dt><dd>${escapeHtml(restoreStatus)}</dd></div>
        </dl>
      </section>
    </section>
    ${renderBackupRestoreWorkflow(state)}
  `;
}

function renderRestorePreview(preview: RestorePreviewSummary): string {
  const changedRecords = preview.records.filter((record) => record.status === "changed").slice(0, 3);
  const newRecords = preview.records.filter((record) => record.status === "new").slice(0, 2);
  const visibleRecords = [...changedRecords, ...newRecords].slice(0, 4);

  return `
    <div class="restore-preview" role="status">
      <strong>Restore preview</strong>
      <span>${preview.incomingProjectCount} incoming projects - ${preview.currentProjectCount} current</span>
      <span>${preview.matchingProjectCount} matching projects - ${preview.newProjectCount} new projects</span>
      <span>${preview.changedRecordCount} changed records - ${preview.newRecordCount} new records - ${preview.fieldConflictCount} field conflicts</span>
      ${renderRestoreApplicationPlan(preview.applicationPlan)}
      ${
        preview.planningRecordCount > 0
          ? `<span>${preview.planningRecordCount} planning rows in encrypted backup - restore preview only</span>`
          : ""
      }
      ${
        preview.planningKindCounts.length
          ? `<span>Planning kind coverage: ${escapeHtml(formatPlanningKindCounts(preview.planningKindCounts))}</span>`
          : ""
      }
      ${
        preview.planningRecordCount > 0
          ? `<span>Planning table coverage: ${escapeHtml(formatPlanningTableCoverage(preview.planningTableCoverage))}</span>`
          : ""
      }
      ${
        preview.planningRecords.length
          ? `
            <ul class="restore-preview-records planning-preview-records">
              ${preview.planningRecords.slice(0, 3).map((record) => renderPlanningPreviewRecord(record)).join("")}
            </ul>
          `
          : ""
      }
      ${
        visibleRecords.length
          ? `
            <ul class="restore-preview-records">
              ${visibleRecords.map((record) => renderRestorePreviewRecord(record)).join("")}
            </ul>
          `
          : `<small>${escapeHtml(preview.firstProjectTitle)} has no record conflicts.</small>`
      }
      ${
        preview.warnings.length
          ? `<small>${escapeHtml(preview.warnings.join(" "))}</small>`
          : "<small>No restore warnings.</small>"
      }
    </div>
  `;
}

function renderRestorePlanningDryRun(preview: RestorePlanningDryRunState, records: BackupPlanningRecord[]): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Planning restore preview</strong>
      <span>${preview.createPreviewCount} creates - ${preview.updatePreviewCount} updates - ${preview.idempotentCount} idempotent - ${preview.rejectedCount} rejected</span>
      <span>${preview.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(preview.commitPolicy.replaceAll("_", " "))}</span>
      ${
        preview.tableSummary.length
          ? `<span>Planning D1 tables: ${escapeHtml(formatRestorePlanningTableSummary(preview.tableSummary))}</span>`
          : ""
      }
      ${
        preview.updatePreviewDetails.length
          ? `<span>Planning update preview: ${escapeHtml(formatRestorePlanningUpdatePreview(preview.updatePreviewDetails))}</span>`
          : ""
      }
      ${
        preview.rejected.length
          ? `<span>Rejected records: ${escapeHtml(formatRestorePlanningRejected(preview.rejected))}</span>`
          : ""
      }
      ${renderRestorePlanningReviewTable(preview, records)}
      ${
        preview.planningPreviewId
          ? `<small>${escapeHtml(shortHash(preview.planningPreviewId))} - ${escapeHtml(preview.planningPreviewStatus.replaceAll("_", " "))}</small>`
          : ""
      }
      <small>${escapeHtml(preview.restoreMode.replaceAll("_", " "))} - ${escapeHtml(preview.persistence.replaceAll("_", " "))} - ${escapeHtml(preview.planningPreviewPersistence.replaceAll("_", " "))}${preview.auditPersistence ? ` - ${escapeHtml(preview.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderRestoreAttachmentPackageVerification(preview: RestoreAttachmentPackageVerificationState): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Attachment package verification</strong>
      <span>${preview.packageManifest.objectCount} manifest objects - ${formatBytes(preview.packageManifest.totalSourceBytes)} source bytes</span>
      <span>${preview.canRestoreBytes ? "Byte restore ready" : "Byte restore blocked"} - ${escapeHtml(preview.attachmentPackageVerificationStatus.replaceAll("_", " "))}</span>
      <span>${preview.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(preview.commitPolicy.replaceAll("_", " "))}</span>
      <small>Package ${escapeHtml(preview.packageSha256.slice(0, 12))} - manifest ${escapeHtml(preview.manifestSha256.slice(0, 12))}</small>
      <small>${escapeHtml(preview.attachmentPackageVerificationPersistence.replaceAll("_", " "))}${preview.auditPersistence ? ` - ${escapeHtml(preview.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        preview.attachmentPackageVerificationId
          ? `<small>${escapeHtml(shortHash(preview.attachmentPackageVerificationId))}</small>`
          : ""
      }
      ${
        preview.blockers.length
          ? `<small>${escapeHtml(preview.blockers.slice(0, 2).join(" "))}</small>`
          : ""
      }
    </div>
  `;
}

function renderRestoreAttachmentObjectPlan(plan: RestoreAttachmentObjectPlanState): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Attachment object plan</strong>
      <span>${plan.objectCount} objects - ${formatBytes(plan.totalSourceBytes)} source bytes - ${plan.blockedDestinationCount} destination writes blocked</span>
      <span>${plan.canRestoreBytes ? "Byte restore ready" : "Byte restore blocked"} - ${escapeHtml(plan.attachmentObjectPlanStatus.replaceAll("_", " "))}</span>
      <span>${plan.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(plan.commitPolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(plan.destinationPolicy.replaceAll("_", " "))} - ${escapeHtml(plan.overwritePolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(plan.byteSourcePolicy.replaceAll("_", " "))} - ${escapeHtml(plan.sourceVerificationStatus.replaceAll("_", " "))}</span>
      ${
        plan.objects.length
          ? `
            <ul class="restore-preview-records application-preview-records">
              ${plan.objects.slice(0, 4).map((object) => `
                <li>
                  <b>${escapeHtml(object.name)}</b>
                  <small>${escapeHtml(object.action.replaceAll("_", " "))} - ${formatBytes(object.sizeBytes)}</small>
                  <small>${escapeHtml(object.destinationStatus.replaceAll("_", " "))} - ${escapeHtml(object.overwriteStatus.replaceAll("_", " "))}</small>
                  <small>${escapeHtml(object.byteSourceStatus.replaceAll("_", " "))} - ${escapeHtml(object.sourceVerificationStatus.replaceAll("_", " "))}</small>
                </li>
              `).join("")}
            </ul>
          `
          : ""
      }
      <small>${escapeHtml(plan.attachmentObjectPlanPersistence.replaceAll("_", " "))}${plan.auditPersistence ? ` - ${escapeHtml(plan.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        plan.attachmentObjectPlanId
          ? `<small>${escapeHtml(shortHash(plan.attachmentObjectPlanId))}</small>`
          : ""
      }
      ${
        plan.blockers.length
          ? `<small>${escapeHtml(plan.blockers.slice(0, 2).join(" "))}</small>`
          : ""
      }
    </div>
  `;
}

function renderRestoreAttachmentObjectCommitPreflight(preflight: RestoreAttachmentObjectCommitPreflightState): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Attachment commit preflight</strong>
      <span>${preflight.objectCount} objects - ${formatBytes(preflight.totalSourceBytes)} source bytes</span>
      <span>${preflight.readyDestinationCount} destinations ready - ${preflight.blockedDestinationCount} blocked</span>
      <span>${preflight.readyForByteCommit ? "Byte commit handoff ready" : "Byte commit handoff blocked"} - ${escapeHtml(preflight.attachmentObjectCommitPreflightStatus.replaceAll("_", " "))}</span>
      <span>${preflight.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(preflight.commitPolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(preflight.destinationPolicy.replaceAll("_", " "))} - ${escapeHtml(preflight.overwritePolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(preflight.byteSourcePolicy.replaceAll("_", " "))} - ${escapeHtml(preflight.sourceVerificationStatus.replaceAll("_", " "))}</span>
      ${
        preflight.objects.length
          ? `
            <ul class="restore-preview-records application-preview-records">
              ${preflight.objects.slice(0, 4).map((object) => `
                <li>
                  <b>${escapeHtml(object.name)}</b>
                  <small>${escapeHtml(object.action.replaceAll("_", " "))} - ${formatBytes(object.sizeBytes)}</small>
                  <small>${escapeHtml(object.destinationStatus.replaceAll("_", " "))} - ${escapeHtml(object.overwriteStatus.replaceAll("_", " "))}</small>
                  <small>${object.existingR2Object === null ? "R2 unchecked" : object.existingR2Object ? "R2 exists" : "R2 clear"} - ${object.existingStoredRecord ? "stored record exists" : "no stored record"}</small>
                  ${object.blocker ? `<small>${escapeHtml(object.blocker)}</small>` : ""}
                </li>
              `).join("")}
            </ul>
          `
          : ""
      }
      <small>${escapeHtml(preflight.attachmentObjectCommitPreflightPersistence.replaceAll("_", " "))}${preflight.auditPersistence ? ` - ${escapeHtml(preflight.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        preflight.attachmentObjectCommitPreflightId
          ? `<small>${escapeHtml(shortHash(preflight.attachmentObjectCommitPreflightId))}</small>`
          : ""
      }
      ${
        preflight.blockers.length
          ? `<small>${escapeHtml(preflight.blockers.slice(0, 2).join(" "))}</small>`
          : ""
      }
    </div>
  `;
}

function renderRestorePlanningReviewTable(preview: RestorePlanningDryRunState, records: BackupPlanningRecord[]): string {
  if (records.length === 0) return "";

  const tableByKind = new Map(preview.tableSummary.map((row) => [row.kind, row.tableName]));
  const createIds = new Set(preview.createPreview);
  const updateIds = new Set(preview.updatePreview);
  const idempotentIds = new Set(preview.idempotent);
  const rejectedByIndex = new Map(preview.rejected.map((item) => [item.index, item.reason]));
  return `
    <div class="planning-review" aria-label="Planning restore rows" tabindex="0">
      <div class="planning-review-row planning-review-head">
        <span>Action</span>
        <span>Kind</span>
        <span>Title</span>
        <span>Project</span>
        <span>Fields</span>
      </div>
      ${records.map((record, index) => {
        const rejectedReason = rejectedByIndex.get(index);
        const action = rejectedReason
          ? `rejected: ${rejectedReason.replaceAll("_", " ")}`
          : createIds.has(record.id)
            ? "create"
            : updateIds.has(record.id)
              ? "update"
              : idempotentIds.has(record.id)
                ? "idempotent"
                : "accepted";
        const fieldKeys = Object.keys(record.fields)
          .filter((key) => record.fields[key] !== null && record.fields[key] !== "")
          .slice(0, 4);
        return `
          <div class="planning-review-row">
            <span>${escapeHtml(action)}</span>
            <span>${escapeHtml((tableByKind.get(record.kind) ?? record.kind).replaceAll("_", " "))}</span>
            <span>${escapeHtml(record.title)}</span>
            <span>${escapeHtml(record.projectId ?? "workspace")}</span>
            <span>${escapeHtml(fieldKeys.length ? fieldKeys.join(", ") : "none")}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function formatPlanningKindCounts(counts: RestorePreviewSummary["planningKindCounts"]): string {
  return counts
    .slice(0, 6)
    .map((item) => `${item.count} ${item.kind.replaceAll("_", " ")}`)
    .join(", ");
}

function formatPlanningTableCoverage(coverage: RestorePreviewSummary["planningTableCoverage"]): string {
  return coverage
    .map((item) => `${item.tableName.replaceAll("_", " ")} ${item.recordCount}`)
    .join(", ");
}

function formatRestorePlanningTableSummary(summary: RestorePlanningTableSummary[]): string {
  return summary
    .slice(0, 5)
    .map((row) => {
      const table = row.tableName.replaceAll("_", " ");
      return `${table} ${row.createPreviewCount} create/${row.idempotentCount} same/${row.updatePreviewCount} update/${row.rejectedCount} rejected`;
    })
    .join(", ");
}

function formatRestorePlanningUpdatePreview(details: RestorePlanningPreviewDetail[]): string {
  return details
    .slice(0, 3)
    .map((detail) => {
      const firstChange = detail.fieldChanges[0];
      const field = firstChange ? ` - ${firstChange.field}` : "";
      return `${detail.tableName.replaceAll("_", " ")} ${detail.title} (${detail.fieldChangeCount} changes${field})`;
    })
    .join(", ");
}

function formatRestorePlanningRejected(rejected: RestorePlanningDryRunResult["rejected"]): string {
  return rejected
    .slice(0, 3)
    .map((item) => `row ${item.index + 1} ${item.reason.replaceAll("_", " ")}`)
    .join(", ");
}

function renderRestoreApplicationPlan(plan: RestorePreviewSummary["applicationPlan"]): string {
  return `
    <span>${plan.updateRecordCount} updates planned - ${plan.createRecordCount} creates planned - ${plan.unchangedRecordCount} unchanged</span>
    <span>Application operations: ${plan.operationCount} total - ${escapeHtml(plan.operationPolicy.replaceAll("_", " "))}</span>
    <span>Application table plan: ${plan.tablePlan.length} tables</span>
    ${
      plan.attachmentPackagePlan.packageRequired
        ? `<span>Attachment restore package: ${plan.attachmentPackagePlan.metadataRecordCount} metadata records - ${formatBytes(plan.attachmentPackagePlan.totalSourceBytes)} source bytes - ${escapeHtml(plan.attachmentPackagePlan.byteRestoreSupport.replaceAll("_", " "))}</span>`
        : ""
    }
    <span>${plan.destructiveWrite ? "Destructive restore enabled" : "Restore application blocked"} - ${escapeHtml(plan.mode.replaceAll("_", " "))}</span>
    ${
      plan.tablePlan.length
        ? `
          <ul class="restore-preview-records application-preview-records">
            ${plan.tablePlan.slice(0, 4).map((table) => renderRestoreApplicationTablePlan(table)).join("")}
          </ul>
        `
        : ""
    }
    ${
      plan.operationSamples.length
        ? `
          <ul class="restore-preview-records application-preview-records">
            ${plan.operationSamples.slice(0, 4).map((operation) => renderRestoreApplicationOperation(operation)).join("")}
          </ul>
        `
        : ""
    }
    ${
      plan.blockers.length
        ? `<small>${escapeHtml(plan.blockers.slice(0, 3).join(" "))}</small>`
        : ""
    }
  `;
}

function renderRestoreApplicationTablePlan(table: RestorePreviewSummary["applicationPlan"]["tablePlan"][number]): string {
  const detail = `${table.operationCount} ops - ${table.createCount} creates - ${table.updateCount} updates - ${table.skipCount} skips${table.previewOnlyCount ? ` - ${table.previewOnlyCount} preview only` : ""}`;
  const blocker = table.blockers.length ? ` - ${table.blockers[0]}` : "";

  return `
    <li>
      <b>${escapeHtml(table.tableName.replaceAll("_", " "))}</b>
      <small>${escapeHtml(`${detail}${blocker}`)}</small>
    </li>
  `;
}

function renderRestoreApplicationOperation(operation: RestorePreviewSummary["applicationPlan"]["operationSamples"][number]): string {
  const fieldDetail = operation.fieldConflictCount > 0
    ? ` - ${operation.fieldConflictCount} field conflicts`
    : "";
  const blockerDetail = operation.blockers.length ? ` - ${operation.blockers[0]}` : "";
  const detail = `${operation.action} ${operation.status.replaceAll("_", " ")}${fieldDetail}${blockerDetail}`;

  return `
    <li>
      <b>${escapeHtml(operation.label)}</b>
      <small>${escapeHtml(detail)}</small>
    </li>
  `;
}

function renderPlanningPreviewRecord(record: RestorePreviewSummary["planningRecords"][number]): string {
  const fieldDetail = record.fieldKeys.length
    ? ` - ${record.fieldCount} fields: ${record.fieldKeys.join(", ")}`
    : " - 0 fields";
  const detail = `${record.kind.replaceAll("_", " ")}${record.sourcePath ? ` - ${record.sourcePath}` : ""}${fieldDetail}`;

  return `
    <li>
      <b>${escapeHtml(record.title)}</b>
      <small>${escapeHtml(detail)}</small>
    </li>
  `;
}

function renderRestorePreviewRecord(record: RestorePreviewSummary["records"][number]): string {
  const changeLabels = record.fieldChanges
    .slice(0, 2)
    .map((change) => `${change.field}: ${change.currentValue} -> ${change.incomingValue}`);
  const overflowCount = record.fieldChanges.length - changeLabels.length;
  const detail = record.status === "new"
    ? "New record in backup"
    : `${changeLabels.join("; ")}${overflowCount > 0 ? `; +${overflowCount} more` : ""}`;

  return `
    <li>
      <b>${escapeHtml(record.label)}</b>
      <small>${escapeHtml(detail)}</small>
    </li>
  `;
}

function renderRestoreSnapshotReviewTable(snapshot: BackupSnapshot, preview: RestorePreviewSummary): string {
  const records = createRestoreSnapshotRecords(snapshot, preview);
  if (records.length === 0) return "";
  const writeCount = records.filter((record) => record.action !== "skip").length;

  return `
    <div class="restore-record-review" aria-label="Workspace snapshot restore rows" tabindex="0">
      <div class="restore-record-review-row restore-record-review-head">
        <span>Action</span>
        <span>Type</span>
        <span>Title</span>
        <span>Project</span>
        <span>Detail</span>
      </div>
      ${records.map((record) => `
        <div class="restore-record-review-row">
          <span>${escapeHtml(record.action)}</span>
          <span>${escapeHtml(record.entityType.replaceAll("_", " "))}</span>
          <span>${escapeHtml(restoreSnapshotRecordLabel(record))}</span>
          <span>${escapeHtml(record.projectId ?? "workspace")}</span>
          <span>${escapeHtml(restoreSnapshotRecordDetail(record))}</span>
        </div>
      `).join("")}
    </div>
    <small>Snapshot row review: ${writeCount} writes - ${records.length - writeCount} skips - ${records.length} total</small>
  `;
}

function restoreSnapshotRecordLabel(record: RestoreCoreRecordRequest): string {
  return record.title ?? record.name ?? record.category ?? record.entityId;
}

function restoreSnapshotRecordDetail(record: RestoreCoreRecordRequest): string {
  if (record.entityType === "workspace") {
    return [record.backupPolicy, record.nextBackup].filter(Boolean).join(" - ") || "metadata";
  }
  if (record.entityType === "project") {
    return record.phase ?? "project";
  }
  if (record.entityType === "task") {
    return [record.status, record.dueAt].filter(Boolean).join(" - ") || "task";
  }
  if (record.entityType === "document") {
    return record.documentType ?? "document";
  }
  if (record.entityType === "person") {
    return record.role ?? "person";
  }
  if (record.entityType === "equipment") {
    return [record.status, record.statusTone].filter(Boolean).join(" - ") || "equipment";
  }
  if (record.entityType === "expense") {
    return `${record.spent ?? 0} spent / ${record.budget ?? 0} budget`;
  }
  return record.entityId;
}
