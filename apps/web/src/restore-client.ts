import type { BackupPlanningRecord } from "@film/schema";
import type { Fetcher } from "./worker-client";

export type RestoreCommitPreviewRequest = {
  incomingRecordCount: number;
  changedRecordCount: number;
  newRecordCount: number;
  fieldConflictCount: number;
  warnings: string[];
};

export type RestoreCommitDryRunRequest = {
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt?: string;
  preRestoreBackupId?: string;
  confirmation: string;
  preview: RestoreCommitPreviewRequest;
  applicationTablePlan?: RestoreApplicationTablePlanRequest[];
};

export type RestoreCommitDryRunResult = {
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt: string | null;
  confirmationAccepted: boolean;
  confirmationPhrase: string;
  restoreMode: string;
  destructiveWrite: boolean;
  preRestoreBackupRequired: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  commitStatus: string;
  authorizationPolicy: string;
  auditPersistence?: string;
  preview: RestoreCommitPreviewRequest;
};

export type RestoreApprovalDryRunRequest = RestoreCommitDryRunRequest;

export type RestoreApprovalDryRunResult = RestoreCommitDryRunResult & {
  approvalId: string | null;
  approvalStatus: string;
  approvalPersistence: string;
  approvalBlockers: string[];
};

export type RestoreCommitStorageDryRunRequest = RestoreCommitDryRunRequest & {
  approvalId: string;
};

export type RestoreApplicationDryRunRequest = RestoreCommitStorageDryRunRequest & {
  commitAttemptId: string;
};

export type RestoreApplicationCommitRequest = RestoreApplicationDryRunRequest & {
  applicationPreflightId: string;
  records: RestoreCoreRecordRequest[];
};

export type RestoreCoreRecordRequest = {
  entityType: "workspace" | "project" | "task" | "document" | "person" | "equipment" | "expense";
  entityId: string;
  action: "create" | "update" | "skip";
  projectId?: string | null;
  title?: string;
  name?: string;
  category?: string;
  phase?: string;
  status?: string;
  statusTone?: string;
  priority?: string;
  dueAt?: string | null;
  documentType?: string;
  markdownSnapshot?: string | null;
  sensitive?: boolean;
  archivedProjectCount?: number;
  backupPolicy?: string;
  nextBackup?: string;
  role?: string;
  initials?: string;
  spent?: number;
  budget?: number;
  percent?: number;
};

export type RestoreAttachmentPackageDryRunRequest = {
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt?: string;
  attachmentPackagePlan: RestoreAttachmentPackagePlanRequest;
};

export type RestoreAttachmentPackageVerificationDryRunRequest = RestoreAttachmentPackageDryRunRequest & {
  attachmentPackagePreflightId: string;
  packageSha256: string;
  manifestSha256?: string;
  packageManifest: RestoreAttachmentPackageManifestRequest;
};

export type RestoreAttachmentObjectPlanDryRunRequest = {
  workspaceId: string;
  attachmentPackageVerificationId: string;
  packageSha256: string;
  manifestSha256?: string;
  packageManifest: RestoreAttachmentPackageManifestRequest;
};

export type RestoreAttachmentObjectCommitPreflightRequest = RestoreAttachmentObjectPlanDryRunRequest & {
  attachmentObjectPlanId: string;
  confirmation: string;
};

export type RestoreAttachmentObjectCommitRequest = {
  workspaceId: string;
  attachmentPackageVerificationId: string;
  attachmentObjectPlanId: string;
  attachmentObjectCommitPreflightId: string;
  docId: string;
  destinationObjectKey: string;
  sizeBytes: number;
  contentType: string;
  sha256: string;
  packageSha256: string;
  manifestSha256: string;
  confirmation: string;
};

export type RestoreApplicationTablePlanRequest = {
  tableName: string;
  source: string;
  entityType: string;
  operationCount: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  previewOnlyCount: number;
  fieldConflictCount: number;
  restoreSupport: string;
  blockers: string[];
};

export type RestoreAttachmentPackagePlanRequest = {
  policy: string;
  packageRequired: boolean;
  byteRestoreSupport: string;
  metadataRecordCount: number;
  stagedLocalRecordCount: number;
  r2DryRunRecordCount: number;
  storedR2RecordCount: number;
  totalSourceBytes: number;
  blockers: string[];
};

export type RestoreAttachmentPackageManifestRequest = {
  format: "film.attachment-package";
  version: 1;
  workspaceId: string;
  createdAt?: string;
  objectCount: number;
  totalSourceBytes: number;
  objects: RestoreAttachmentPackageManifestObjectRequest[];
};

export type RestoreAttachmentPackageManifestObjectRequest = {
  path: string;
  docId: string;
  objectKey: string;
  name: string;
  sourcePath?: string | null;
  sizeBytes: number;
  contentType?: string | null;
  sha256: string;
  committedAt?: string | null;
};

export type RestoreCommitStorageDryRunResult = RestoreCommitDryRunResult & {
  approvalId: string;
  approvalStatus: string;
  approvalPersistence: string;
  commitAttemptId: string | null;
  commitAttemptStatus: string;
  commitAttemptPersistence: string;
};

export type RestoreApplicationDryRunResult = RestoreCommitStorageDryRunResult & {
  applicationPreflightId: string | null;
  applicationPreflightStatus: string;
  applicationPreflightPersistence: string;
  rollbackGuidance: {
    rollbackMode?: string;
    preRestoreBackupId?: string | null;
    destructiveWrite?: boolean;
    requiredBeforeApply?: string[];
    blockers?: string[];
    previewCounts?: Record<string, number>;
    applicationTablePlan?: RestoreApplicationTablePlanRequest[];
  };
};

export type RestoreApplicationCommitResult = RestoreApplicationDryRunResult & {
  dryRun: false;
  applicationCommitId: string;
  applicationCommitStatus: string;
  applicationCommitPersistence: string;
  recordSummary: Record<string, number>;
  result: Record<string, unknown>;
  unsupportedRestoreDomains: string[];
};

export type RestorePlanningDryRunRequest = {
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt?: string;
  records: BackupPlanningRecord[];
};

export type RestorePlanningCommitRequest = RestoreApplicationDryRunRequest & {
  applicationPreflightId: string;
  planningPreviewId: string;
  records: BackupPlanningRecord[];
};

export type RestorePlanningTableSummary = {
  kind: string;
  tableName: string;
  acceptedCount: number;
  createPreviewCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  rejectedCount: number;
};

export type RestorePlanningPreviewDetail = {
  id: string;
  kind: string;
  tableName: string;
  title: string;
  fieldChangeCount: number;
  fieldChanges: Array<{
    field: string;
    currentValue: string;
    incomingValue: string;
  }>;
};

export type RestorePlanningDryRunResult = {
  ok: boolean;
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt: string | null;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  authorizationPolicy: string;
  planningPreviewId: string | null;
  planningPreviewStatus: string;
  planningPreviewPersistence: string;
  persistence: string;
  auditPersistence?: string;
  accepted: Array<{ id: string; kind: string; title: string }>;
  rejected: Array<{ index: number; reason: string }>;
  createPreview: string[];
  idempotent: string[];
  updatePreview: string[];
  updatePreviewDetails: RestorePlanningPreviewDetail[];
  tableSummary: RestorePlanningTableSummary[];
};

export type RestorePlanningCommitResult = RestoreApplicationDryRunResult & {
  dryRun: false;
  planningPreviewId: string;
  planningPreviewStatus: string;
  planningPreviewPersistence: string;
  planningCommitId: string;
  planningCommitStatus: string;
  planningCommitPersistence: string;
  result: {
    applied: string[];
    skipped: string[];
    appliedCount: number;
    skippedCount: number;
    createCount: number;
    updateCount: number;
    idempotentCount: number;
    tableSummary: Array<RestorePlanningTableSummary & {
      appliedCount: number;
      skippedCount: number;
    }>;
  };
  unsupportedRestoreDomains: string[];
};

export type RestoreAttachmentPackageDryRunResult = {
  ok: boolean;
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt: string | null;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  authorizationPolicy: string;
  attachmentPackagePreflightId: string | null;
  attachmentPackagePreflightStatus: string;
  attachmentPackagePreflightPersistence: string;
  auditPersistence?: string;
  attachmentPackagePlan: RestoreAttachmentPackagePlanRequest;
  blockers: string[];
};

export type RestoreAttachmentPackageVerificationDryRunResult = {
  ok: boolean;
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt: string | null;
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
  auditPersistence?: string;
  packageSha256: string;
  manifestSha256: string;
  packageManifest: {
    format: "film.attachment-package";
    version: 1;
    workspaceId: string;
    objectCount: number;
    totalSourceBytes: number;
  };
  blockers: string[];
};

export type RestoreAttachmentObjectPlanDryRunResult = {
  ok: boolean;
  workspaceId: string;
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
  auditPersistence?: string;
  result: {
    objectCount: number;
    totalSourceBytes: number;
    blockedDestinationCount: number;
    destinationPolicy: "workspace_scoped_deterministic_object_keys";
    overwritePolicy: "blocked_until_explicit_overwrite_rules";
    byteSourcePolicy: "verified_package_manifest_only";
    sourceVerificationStatus: "metadata_hash_verified_without_bytes";
    objects: Array<{
      docId: string;
      name: string;
      sourceObjectKey: string;
      destinationObjectKey: string;
      sizeBytes: number;
      sha256: string;
      destinationStatus: "candidate_workspace_key";
      overwriteStatus: "blocked_until_overwrite_policy";
      byteSourceStatus: "requires_package_object_bytes_at_commit";
      sourceVerificationStatus: "sha256_declared_in_verified_manifest";
      action: "blocked_destination_write_rules";
      blocker: string;
    }>;
  };
  blockers: string[];
};

export type RestoreAttachmentObjectCommitPreflightResult = {
  ok: boolean;
  workspaceId: string;
  confirmationAccepted: boolean;
  confirmationPhrase: string;
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
  auditPersistence?: string;
  packageSha256: string;
  manifestSha256: string;
  result: {
    objectCount: number;
    totalSourceBytes: number;
    readyDestinationCount: number;
    blockedDestinationCount: number;
    destinationPolicy: "workspace_scoped_new_object_keys_only";
    overwritePolicy: "overwrite_blocked_existing_destinations";
    byteSourcePolicy: "package_object_bytes_required_at_commit";
    sourceVerificationStatus: "metadata_hash_verified_without_bytes";
    objects: Array<{
      docId: string;
      name: string;
      sourceObjectKey: string;
      destinationObjectKey: string;
      sizeBytes: number;
      sha256: string;
      destinationStatus: "destination_absent" | "destination_exists" | "r2_binding_missing" | "destination_check_failed";
      overwriteStatus: "new_object_allowed" | "overwrite_blocked_existing_destination" | "overwrite_unknown_without_r2" | "overwrite_check_failed";
      byteSourceStatus: "requires_package_object_bytes_at_commit";
      sourceVerificationStatus: "sha256_declared_in_verified_manifest";
      action: "ready_for_explicit_byte_commit" | "blocked_existing_destination" | "blocked_missing_r2_binding" | "blocked_destination_check";
      existingR2Object: boolean | null;
      existingStoredRecord: boolean;
      blocker: string | null;
    }>;
    blockers: string[];
  };
  blockers: string[];
};

export type RestoreAttachmentObjectCommitResult = {
  ok: boolean;
  dryRun: false;
  restoreMode: "attachment_object_byte_commit";
  destructiveWrite: true;
  idempotent: boolean;
  persistence: string;
  auditPersistence?: string;
  commit: {
    id: string;
    workspaceId: string;
    attachmentPackageVerificationId: string;
    attachmentObjectPlanId: string;
    attachmentObjectCommitPreflightId: string;
    docId: string;
    sourceObjectKey: string;
    destinationObjectKey: string;
    sizeBytes: number;
    contentType: string;
    sha256: string;
    status: "stored_r2";
    destructiveWrite: true;
    createdAt: string;
  };
};

type RestoreCommitDryRunResponse = RestoreCommitDryRunResult & {
  dryRun: boolean;
  error?: string;
  expectedConfirmation?: string;
};

type RestoreApprovalDryRunResponse = RestoreApprovalDryRunResult & {
  dryRun: boolean;
  error?: string;
  expectedConfirmation?: string;
};

type RestoreCommitStorageDryRunResponse = RestoreCommitStorageDryRunResult & {
  dryRun: boolean;
  error?: string;
  expectedConfirmation?: string;
};

type RestoreApplicationDryRunResponse = RestoreApplicationDryRunResult & {
  dryRun: boolean;
  error?: string;
  expectedConfirmation?: string;
};

type RestoreApplicationCommitResponse = RestoreApplicationCommitResult & {
  error?: string;
  expectedConfirmation?: string;
};

type RestorePlanningDryRunResponse = Partial<RestorePlanningDryRunResult> & {
  dryRun?: boolean;
  error?: string;
};

type RestorePlanningCommitResponse = Partial<RestorePlanningCommitResult> & {
  dryRun?: boolean;
  error?: string;
  expectedConfirmation?: string;
};

type RestoreAttachmentPackageDryRunResponse = Partial<RestoreAttachmentPackageDryRunResult> & {
  dryRun?: boolean;
  error?: string;
};

type RestoreAttachmentPackageVerificationDryRunResponse = Partial<RestoreAttachmentPackageVerificationDryRunResult> & {
  dryRun?: boolean;
  error?: string;
};

type RestoreAttachmentObjectPlanDryRunResponse = Partial<RestoreAttachmentObjectPlanDryRunResult> & {
  dryRun?: boolean;
  error?: string;
};

type RestoreAttachmentObjectCommitPreflightResponse = Partial<RestoreAttachmentObjectCommitPreflightResult> & {
  dryRun?: boolean;
  error?: string;
  expectedConfirmation?: string;
};

export async function runRestoreCommitDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestoreCommitDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreCommitDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/commit-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreCommitDryRunResponse;
  if (!response.ok) {
    throw new Error(body.expectedConfirmation ?? body.error ?? `Restore commit dry run failed with ${response.status}`);
  }
  return body;
}

export async function runRestoreApprovalDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestoreApprovalDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreApprovalDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/approval-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreApprovalDryRunResponse;
  if (!response.ok) {
    throw new Error(body.expectedConfirmation ?? body.error ?? `Restore approval dry run failed with ${response.status}`);
  }
  return body;
}

export async function runRestoreCommitStorageDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestoreCommitStorageDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreCommitStorageDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/commit-storage-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreCommitStorageDryRunResponse;
  if (!response.ok) {
    throw new Error(body.expectedConfirmation ?? body.error ?? `Restore commit storage dry run failed with ${response.status}`);
  }
  return body;
}

export async function runRestoreApplicationDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestoreApplicationDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreApplicationDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/application-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreApplicationDryRunResponse;
  if (!response.ok) {
    throw new Error(body.expectedConfirmation ?? body.error ?? `Restore application dry run failed with ${response.status}`);
  }
  return body;
}

export async function runRestoreApplicationCommit(
  workerUrl: string,
  csrfToken: string,
  request: RestoreApplicationCommitRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreApplicationCommitResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/application-commit", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreApplicationCommitResponse;
  if (!response.ok) {
    throw new Error(body.expectedConfirmation ?? body.error ?? `Restore application commit failed with ${response.status}`);
  }
  return body;
}

export async function runRestorePlanningDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestorePlanningDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestorePlanningDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/planning-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestorePlanningDryRunResponse;
  if (!response.ok && body.error) {
    throw new Error(body.error);
  }
  if (!Array.isArray(body.accepted) || !Array.isArray(body.rejected)) {
    throw new Error(`Restore planning dry run failed with ${response.status}`);
  }
  return body as RestorePlanningDryRunResult;
}

export async function runRestorePlanningCommit(
  workerUrl: string,
  csrfToken: string,
  request: RestorePlanningCommitRequest,
  fetcher: Fetcher = fetch,
): Promise<RestorePlanningCommitResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/planning-commit", csrfToken, request, fetcher);
  const body = (await response.json()) as RestorePlanningCommitResponse;
  if (!response.ok) {
    throw new Error(body.expectedConfirmation ?? body.error ?? `Restore planning commit failed with ${response.status}`);
  }
  if (!body.result || !body.planningCommitId) {
    throw new Error(`Restore planning commit failed with ${response.status}`);
  }
  return body as RestorePlanningCommitResult;
}

export async function runRestoreAttachmentPackageDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestoreAttachmentPackageDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreAttachmentPackageDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/attachment-package-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreAttachmentPackageDryRunResponse;
  if (!response.ok && body.error) {
    throw new Error(body.error);
  }
  if (!body.attachmentPackagePlan) {
    throw new Error(`Restore attachment package dry run failed with ${response.status}`);
  }
  return body as RestoreAttachmentPackageDryRunResult;
}

export async function runRestoreAttachmentPackageVerificationDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestoreAttachmentPackageVerificationDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreAttachmentPackageVerificationDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/attachment-package-verify-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreAttachmentPackageVerificationDryRunResponse;
  if (!response.ok && body.error) {
    throw new Error(body.error);
  }
  if (!body.packageManifest || !body.manifestSha256) {
    throw new Error(`Restore attachment package verification failed with ${response.status}`);
  }
  return body as RestoreAttachmentPackageVerificationDryRunResult;
}

export async function runRestoreAttachmentObjectPlanDryRun(
  workerUrl: string,
  csrfToken: string,
  request: RestoreAttachmentObjectPlanDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreAttachmentObjectPlanDryRunResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/attachment-objects-plan-dry-run", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreAttachmentObjectPlanDryRunResponse;
  if (!response.ok && body.error) {
    throw new Error(body.error);
  }
  if (!body.result || !body.attachmentObjectPlanStatus) {
    throw new Error(`Restore attachment object plan failed with ${response.status}`);
  }
  return body as RestoreAttachmentObjectPlanDryRunResult;
}

export async function runRestoreAttachmentObjectCommitPreflight(
  workerUrl: string,
  csrfToken: string,
  request: RestoreAttachmentObjectCommitPreflightRequest,
  fetcher: Fetcher = fetch,
): Promise<RestoreAttachmentObjectCommitPreflightResult> {
  const response = await postRestoreRequest(workerUrl, "/api/restores/attachment-objects-commit-preflight", csrfToken, request, fetcher);
  const body = (await response.json()) as RestoreAttachmentObjectCommitPreflightResponse;
  if (!response.ok) {
    throw new Error(body.expectedConfirmation ?? body.error ?? `Restore attachment object commit preflight failed with ${response.status}`);
  }
  if (!body.result || !body.attachmentObjectCommitPreflightStatus) {
    throw new Error(`Restore attachment object commit preflight failed with ${response.status}`);
  }
  return body as RestoreAttachmentObjectCommitPreflightResult;
}

export async function commitRestoreAttachmentObject(
  workerUrl: string,
  csrfToken: string,
  request: RestoreAttachmentObjectCommitRequest,
  bytes: Blob,
  fetcher: Fetcher = fetch,
): Promise<RestoreAttachmentObjectCommitResult> {
  const response = await fetcher(`${workerUrl}/api/restores/attachment-object-commit`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "content-type": request.contentType,
      "x-film-csrf": csrfToken,
      "x-film-workspace-id": request.workspaceId,
      "x-film-attachment-package-verification-id": request.attachmentPackageVerificationId,
      "x-film-attachment-object-plan-id": request.attachmentObjectPlanId,
      "x-film-attachment-object-commit-preflight-id": request.attachmentObjectCommitPreflightId,
      "x-film-doc-id": request.docId,
      "x-film-destination-object-key": request.destinationObjectKey,
      "x-film-size-bytes": String(request.sizeBytes),
      "x-film-sha256": request.sha256,
      "x-film-package-sha256": request.packageSha256,
      "x-film-manifest-sha256": request.manifestSha256,
      "x-film-storage-confirmation": request.confirmation,
    },
    body: bytes,
  });
  const body = (await response.json()) as Partial<RestoreAttachmentObjectCommitResult> & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Restore attachment object commit failed with ${response.status}`);
  if (!body.commit || body.destructiveWrite !== true) {
    throw new Error(`Restore attachment object commit failed with ${response.status}`);
  }
  return body as RestoreAttachmentObjectCommitResult;
}

function postRestoreRequest(
  workerUrl: string,
  path: string,
  csrfToken: string,
  request:
    | RestoreCommitDryRunRequest
    | RestoreCommitStorageDryRunRequest
    | RestoreApplicationDryRunRequest
	    | RestoreApplicationCommitRequest
	    | RestorePlanningDryRunRequest
		    | RestoreAttachmentPackageDryRunRequest
		    | RestoreAttachmentPackageVerificationDryRunRequest
		    | RestoreAttachmentObjectPlanDryRunRequest
		    | RestoreAttachmentObjectCommitPreflightRequest,
  fetcher: Fetcher,
): Promise<Response> {
  return fetcher(`${workerUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify(request),
  });
}
