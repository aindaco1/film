import type { BackupPlanningRecord, BackupSnapshot, OperationRecord, WorkspaceData } from "@film/schema";
import type { RestorePreviewSummary } from "@film/backup";
import type { RestoreApplicationDryRunResult, RestoreAttachmentObjectPlanDryRunResult, RestoreAttachmentObjectCommitPreflightResult, RestoreAttachmentObjectCommitResult, RestorePlanningDryRunResult, RestorePlanningTableSummary, RestorePlanningPreviewDetail, RestorePlanningCommitResult } from "./restore-client";

export type BackupDryRunState = {
  checkedAt: string;
  persistence: string;
  storagePersistence: string | null;
  retentionPolicy: string;
  restorePointId: string;
  restorePointLabel: string;
  snapshotRef: string;
  objectKey: string | null;
  sizeBytes: number | null;
};

export type BackupExportState = {
  rowCount: number;
  truncated: boolean;
  persistence: string;
  checkedAt: string;
};

export type RestoreGateState = {
  checkedAt: string;
  commitStatus: string;
  restoreMode: string;
  destructiveWrite: boolean;
  preRestoreBackupRequired: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  authorizationPolicy: string;
  auditPersistence: string | null;
};

export type RestoreApprovalState = {
  checkedAt: string;
  approvalId: string | null;
  approvalStatus: string;
  approvalPersistence: string;
  approvalBlockers: string[];
  commitStatus: string;
  destructiveWrite: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  auditPersistence: string | null;
};

export type RestoreCommitAttemptState = {
  checkedAt: string;
  approvalId: string;
  approvalStatus: string;
  approvalPersistence: string;
  commitAttemptId: string | null;
  commitAttemptStatus: string;
  commitAttemptPersistence: string;
  commitStatus: string;
  restoreMode: string;
  destructiveWrite: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  auditPersistence: string | null;
};

export type RestoreApplicationPreflightState = {
  checkedAt: string;
  approvalId: string;
  approvalStatus: string;
  approvalPersistence: string;
  commitAttemptId: string | null;
  commitAttemptStatus: string;
  commitAttemptPersistence: string;
  applicationPreflightId: string | null;
  applicationPreflightStatus: string;
  applicationPreflightPersistence: string;
  commitStatus: string;
  restoreMode: string;
  destructiveWrite: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  rollbackGuidance: {
    blockers?: string[];
    requiredBeforeApply?: string[];
    previewCounts?: Record<string, number>;
    applicationTablePlan?: RestoreApplicationDryRunResult["rollbackGuidance"]["applicationTablePlan"];
  };
  auditPersistence: string | null;
};

export type RestoreApplicationCommitState = {
  checkedAt: string;
  applicationCommitId: string;
  applicationCommitStatus: string;
  applicationCommitPersistence: string;
  restoreMode: string;
  commitStatus: string;
  destructiveWrite: boolean;
  recordSummary: Record<string, number>;
  result: Record<string, unknown>;
  unsupportedRestoreDomains: string[];
  auditPersistence: string | null;
};

export type RestoreAttachmentPackagePreflightState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  authorizationPolicy: string;
  attachmentPackagePreflightId: string | null;
  attachmentPackagePreflightStatus: string;
  attachmentPackagePreflightPersistence: string;
  metadataRecordCount: number;
  totalSourceBytes: number;
  blockers: string[];
  auditPersistence: string | null;
};

export type RestoreAttachmentPackageVerificationState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  authorizationPolicy: string;
  attachmentPackagePreflightId: string;
  attachmentPackagePreflightPersistence: string;
  attachmentPackageVerificationId: string | null;
  attachmentPackageVerificationStatus: string;
  attachmentPackageVerificationPersistence: string;
  packageSha256: string;
  manifestSha256: string;
  packageManifest: {
    workspaceId: string;
    objectCount: number;
    totalSourceBytes: number;
  };
  blockers: string[];
  auditPersistence: string | null;
};

export type RestoreAttachmentObjectPlanState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  authorizationPolicy: string;
  attachmentPackageVerificationId: string;
  attachmentPackageVerificationPersistence: string;
  attachmentObjectPlanId: string | null;
  attachmentObjectPlanStatus: string;
  attachmentObjectPlanPersistence: string;
  objectCount: number;
  totalSourceBytes: number;
  blockedDestinationCount: number;
  destinationPolicy: string;
  overwritePolicy: string;
  byteSourcePolicy: string;
  sourceVerificationStatus: string;
  objects: RestoreAttachmentObjectPlanDryRunResult["result"]["objects"];
  blockers: string[];
  auditPersistence: string | null;
};

export type RestoreAttachmentObjectCommitPreflightState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  readyForByteCommit: boolean;
  authorizationPolicy: string;
  attachmentPackageVerificationId: string;
  attachmentPackageVerificationPersistence: string;
  attachmentObjectPlanId: string;
  attachmentObjectPlanStatus: string;
  attachmentObjectPlanPersistence: string;
  attachmentObjectCommitPreflightId: string | null;
  attachmentObjectCommitPreflightStatus: string;
  attachmentObjectCommitPreflightPersistence: string;
  packageSha256: string;
  manifestSha256: string;
  objectCount: number;
  totalSourceBytes: number;
  readyDestinationCount: number;
  blockedDestinationCount: number;
  destinationPolicy: string;
  overwritePolicy: string;
  byteSourcePolicy: string;
  sourceVerificationStatus: string;
  objects: RestoreAttachmentObjectCommitPreflightResult["result"]["objects"];
  blockers: string[];
  auditPersistence: string | null;
};

export type RestoreAttachmentObjectCommitState = {
  checkedAt: string;
  committedCount: number;
  idempotentCount: number;
  failedCount: number;
  totalBytes: number;
  commits: RestoreAttachmentObjectCommitResult["commit"][];
};

export type RestorePlanningDryRunState = {
  checkedAt: string;
  ok: boolean;
  persistence: string;
  auditPersistence: string | null;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  authorizationPolicy: string;
  planningPreviewId: string | null;
  planningPreviewStatus: string;
  planningPreviewPersistence: string;
  acceptedCount: number;
  rejectedCount: number;
  createPreviewCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  accepted: RestorePlanningDryRunResult["accepted"];
  createPreview: string[];
  idempotent: string[];
  updatePreview: string[];
  tableSummary: RestorePlanningTableSummary[];
  updatePreviewDetails: RestorePlanningPreviewDetail[];
  rejected: RestorePlanningDryRunResult["rejected"];
};

export type RestorePlanningCommitState = {
  checkedAt: string;
  planningPreviewId: string;
  planningCommitId: string;
  planningCommitStatus: string;
  planningCommitPersistence: string;
  restoreMode: string;
  commitStatus: string;
  destructiveWrite: boolean;
  result: RestorePlanningCommitResult["result"];
  unsupportedRestoreDomains: string[];
  auditPersistence: string | null;
};

export type BackupWorkspaceState = {
  workspace: Pick<WorkspaceData, "restorePoints">;
  operations: OperationRecord[];
  backupDryRun: BackupDryRunState | null;
  backupExport: BackupExportState | null;
  restorePreview: RestorePreviewSummary | null;
  restoreSnapshot: BackupSnapshot | null;
  restorePlanningRecords: BackupPlanningRecord[];
  restoreGate: RestoreGateState | null;
  restoreApproval: RestoreApprovalState | null;
  restoreCommitAttempt: RestoreCommitAttemptState | null;
  restoreApplicationPreflight: RestoreApplicationPreflightState | null;
  restoreApplicationCommit: RestoreApplicationCommitState | null;
  restoreAttachmentPackagePreflight: RestoreAttachmentPackagePreflightState | null;
  restoreAttachmentPackageVerification: RestoreAttachmentPackageVerificationState | null;
  restoreAttachmentObjectPlan: RestoreAttachmentObjectPlanState | null;
  restoreAttachmentObjectCommitPreflight: RestoreAttachmentObjectCommitPreflightState | null;
  restoreAttachmentObjectCommit: RestoreAttachmentObjectCommitState | null;
  restorePlanningDryRun: RestorePlanningDryRunState | null;
  restorePlanningCommit: RestorePlanningCommitState | null;
  attachmentExport: { packageDownload: { sha256: string | null; blob: Blob } | null } | null;
};
