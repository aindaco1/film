import type { WorkspaceRole } from "@film/schema";
import { postWorkerJson, type Fetcher } from "./worker-client";

export type ProjectMembershipAssignResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  membership: {
    workspaceId: string;
    projectId: string;
    memberId: string;
    role: WorkspaceRole;
    department: string | null;
  };
};

export type ProjectMembershipManifestResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  projectId: string;
  manifestPolicy: "active_project_memberships_only";
  rowCount: number;
  truncated: boolean;
  memberships: Array<{
    workspaceId: string;
    projectId: string;
    memberId: string;
    role: WorkspaceRole;
    department: string | null;
  }>;
};

export type ProjectMembershipHistoryResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  historyPolicy: "project_membership_audit_history";
  workspaceId: string;
  projectId: string;
  rowCount: number;
  truncated: boolean;
  entries: Array<{
    id: string;
    action: "project_membership.assigned" | "project_membership.revoked";
    actorMemberId: string | null;
    memberId: string;
    role: WorkspaceRole;
    department: string | null;
    createdAt: string;
  }>;
};

export type ProjectMembershipRevokeResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  revokePolicy: "exact_project_membership_match_only";
  membership: {
    workspaceId: string;
    projectId: string;
    memberId: string;
    role: WorkspaceRole;
    department: string | null;
  };
};

export type RecordPermissionEntityType = "workspace" | "project" | "task" | "document" | "person" | "equipment" | "expense" | "planning";
export type RecordPermissionLevel = "read" | "comment" | "write" | "admin";
export type CoreRecordOwnerEntityType = "project" | "document" | "task" | "person" | "equipment" | "expense";
export type RecordCommentEntityType = Extract<CoreRecordOwnerEntityType, "project" | "task" | "document">;
export type RecordPermissionHistoryEntityType = Extract<CoreRecordOwnerEntityType, "project" | "task" | "document">;
export type RecordMutationKind = "update" | "delete";
export type RecordMutationRequestStatus =
  | "pending_owner_producer_review"
  | "approved_pending_apply"
  | "rejected"
  | "applied"
  | "stale_record_blocked";
export type RecordMutationFieldValue = string | number | boolean | null;
export type RecordMutationFieldDiff = {
  key: string;
  before: RecordMutationFieldValue;
  after: RecordMutationFieldValue;
  changed: boolean;
};
export type RecordMutationRollbackGuidance = {
  strategy: "apply_inverse_update_request" | "restore_from_backup_or_recreate";
  fieldKeys: string[];
  requiresApproval: true;
  requiresFreshRecord: boolean;
  notes: string[];
};
export type RecordMutationApplicationSummary = {
  action: RecordMutationKind;
  applied: boolean;
  idempotent: boolean;
  fieldKeys: string[];
  previousUpdatedAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  fieldDiffs: RecordMutationFieldDiff[];
  rollbackGuidance: RecordMutationRollbackGuidance;
};
export type FilmProfileMutationFieldKey = "runtimeMinutes" | "format" | "shootStart" | "shootEnd" | "budgetCents" | "spentCents";

export type RecordPermissionAssignResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  permission: {
    id: string;
    workspaceId: string;
    entityType: RecordPermissionEntityType;
    entityId: string;
    memberId: string;
    permission: RecordPermissionLevel;
    department: string | null;
    expiresAt: string | null;
  };
};

export type RecordCommentIntentResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  commentPolicy: "metadata_only_comment_intent";
  comment: {
    id: string;
    workspaceId: string;
    entityType: RecordCommentEntityType;
    entityId: string;
    authorMemberId: string | null;
    bodyPreview: string;
    bodySha256: string;
    createdAt: string;
  };
};

export type RecordCommentManifestResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  manifestPolicy: "metadata_only_comment_intent_manifest";
  workspaceId: string;
  entityType: RecordCommentEntityType;
  entityId: string;
  rowCount: number;
  truncated: boolean;
  comments: Array<{
    id: string;
    workspaceId: string;
    entityType: RecordCommentEntityType;
    entityId: string;
    authorMemberId: string | null;
    bodyPreview: string;
    bodySha256: string;
    createdAt: string;
  }>;
};

export type RecordMutationPreflightResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  mutationPolicy: "core_record_mutation_authorization_preflight";
  preflight: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    mutation: RecordMutationKind;
    allowedBy: "owner_producer" | "record_owner" | "write_permission" | "dry_run_memoryless";
  };
};

export type RecordMutationRequestResult = {
  dryRun: boolean;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  requestPolicy: "record_mutation_request_metadata_only";
  request: {
    id: string;
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    mutation: RecordMutationKind;
    actorMemberId: string | null;
    allowedBy: "owner_producer" | "record_owner" | "write_permission" | "dry_run_memoryless";
    status: RecordMutationRequestStatus;
    summaryPreview: string;
    summarySha256: string;
    fieldKeys: string[];
    expectedUpdatedAt: string | null;
    resolvedByMemberId: string | null;
    resolvedAt: string | null;
    resolutionNotePreview: string | null;
    resolutionNoteSha256: string | null;
    appliedByMemberId: string | null;
    appliedAt: string | null;
    application: RecordMutationApplicationSummary | null;
    destructiveWrite: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

export type RecordMutationRequestManifestResult = {
  dryRun: boolean;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  manifestPolicy: "record_mutation_request_manifest";
  rowCount: number;
  truncated: boolean;
  requests: RecordMutationRequestResult["request"][];
};

export type RecordMutationResolutionResult = {
  dryRun: true;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  resolutionPolicy: "record_mutation_owner_producer_resolution";
  request: RecordMutationRequestResult["request"];
};

export type RecordMutationApplyResult = {
  dryRun: false;
  destructiveWrite: true;
  persistence: string;
  auditPersistence?: string;
  applicationPolicy: "approved_record_mutation_stale_checked";
  request: RecordMutationRequestResult["request"];
  application: RecordMutationApplicationSummary;
};

export type RecordMutationDiffPreviewResult = {
  dryRun: true;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  diffPolicy: "approved_record_mutation_diff_preview";
  request: RecordMutationRequestResult["request"];
  stale: boolean;
  currentUpdatedAt: string | null;
  expectedUpdatedAt: string | null;
  fieldDiffs: RecordMutationFieldDiff[];
  rollbackGuidance: RecordMutationRollbackGuidance;
};

export type RecordMutationAuditManifestResult = {
  dryRun: true;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  requestId: string;
  manifestPolicy: "record_mutation_request_audit_manifest";
  metadataPolicy: "keys_only";
  request: RecordMutationRequestResult["request"] | null;
  rowCount: number;
  truncated: boolean;
  rollbackGuidance: RecordMutationRollbackGuidance;
  events: Array<{
    id: string;
    action: string;
    projectId: string | null;
    actorMemberId: string | null;
    createdAt: string;
    metadataKeys: string[];
    metadataKeyCount: number;
  }>;
};

export type FilmProfileMutationRequest = {
  id: string;
  workspaceId: string;
  projectId: string;
  mutation: "update";
  actorMemberId: string | null;
  allowedBy: "owner_producer" | "dry_run_memoryless";
  status: RecordMutationRequestStatus;
  summaryPreview: string;
  summarySha256: string;
  fieldKeys: FilmProfileMutationFieldKey[];
  expectedUpdatedAt: string | null;
  resolvedByMemberId: string | null;
  resolvedAt: string | null;
  resolutionNotePreview: string | null;
  resolutionNoteSha256: string | null;
  appliedByMemberId: string | null;
  appliedAt: string | null;
  application: RecordMutationApplicationSummary | null;
  destructiveWrite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FilmProfileMutationRequestResult = {
  dryRun: boolean;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  requestPolicy: "film_profile_mutation_request_metadata_only";
  request: FilmProfileMutationRequest;
};

export type FilmProfileMutationRequestManifestResult = {
  dryRun: boolean;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  manifestPolicy: "film_profile_mutation_request_manifest";
  workspaceId: string;
  projectId: string;
  rowCount: number;
  truncated: boolean;
  requests: FilmProfileMutationRequest[];
};

export type FilmProfileMutationResolutionResult = {
  dryRun: true;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  resolutionPolicy: "film_profile_mutation_owner_producer_resolution";
  request: FilmProfileMutationRequest;
};

export type FilmProfileMutationDiffPreviewResult = {
  dryRun: true;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  diffPolicy: "approved_film_profile_mutation_diff_preview";
  request: FilmProfileMutationRequest;
  stale: boolean;
  currentUpdatedAt: string | null;
  expectedUpdatedAt: string | null;
  fieldDiffs: RecordMutationFieldDiff[];
  rollbackGuidance: RecordMutationRollbackGuidance;
};

export type FilmProfileMutationApplyResult = {
  dryRun: false;
  destructiveWrite: true;
  persistence: string;
  auditPersistence?: string;
  applicationPolicy: "approved_film_profile_mutation_stale_checked";
  request: FilmProfileMutationRequest;
  application: RecordMutationApplicationSummary;
};

export type RecordMutationRollbackRequestResult = {
  dryRun: true;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  rollbackPolicy: "applied_update_inverse_mutation_request";
  sourceRequest: RecordMutationRequestResult["request"];
  request: RecordMutationRequestResult["request"];
  suggestedUpdates: Record<string, RecordMutationFieldValue>;
};

export type RecordMutationDeleteRecoveryPlanResult = {
  dryRun: true;
  destructiveWrite: false;
  persistence: string;
  auditPersistence?: string;
  recoveryPolicy: "deleted_record_backup_or_recreate_plan";
  sourceRequest: RecordMutationRequestResult["request"];
  recoveryPlan: {
    strategy: "restore_from_backup_or_recreate";
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    deletedAt: string | null;
    requiresBackupRestore: true;
    requiresNewRecordApproval: true;
    blockers: string[];
    suggestedSteps: string[];
  };
};

export type RecordPermissionManifestResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  entityType: RecordPermissionEntityType;
  entityId: string;
  manifestPolicy: "active_record_permissions_only" | "expired_record_permissions_only";
  rowCount: number;
  truncated: boolean;
  permissions: Array<{
    id: string;
    workspaceId: string;
    entityType: RecordPermissionEntityType;
    entityId: string;
    memberId: string;
    permission: RecordPermissionLevel;
    department: string | null;
    expiresAt: string | null;
  }>;
};

export type RecordPermissionHistoryResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  historyPolicy: "record_permission_audit_history";
  workspaceId: string;
  entityType: RecordPermissionHistoryEntityType;
  entityId: string;
  rowCount: number;
  truncated: boolean;
  entries: Array<{
    id: string;
    action: "record_permission.assigned" | "record_permission.revoked";
    actorMemberId: string | null;
    memberId: string;
    permission: RecordPermissionLevel;
    department: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
};

export type RecordPermissionRevokeResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  revokePolicy: "exact_permission_match_only";
  permission: {
    id: string;
    workspaceId: string;
    entityType: RecordPermissionEntityType;
    entityId: string;
    memberId: string;
    permission: RecordPermissionLevel;
    department: string | null;
    expiresAt: string | null;
  };
};

export type RecordOwnerTransferResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  transferPolicy: "core_record_owner_update";
  owner: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    ownerMemberId: string;
    previousOwnerMemberId: string | null;
  };
};

export type RecordOwnerManifestResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  manifestPolicy: "core_record_owner_metadata_only";
  owner: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    ownerMemberId: string | null;
  };
};

export type RecordOwnerHistoryResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  historyPolicy: "record_owner_transfer_audit_only";
  workspaceId: string;
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  rowCount: number;
  truncated: boolean;
  entries: Array<{
    id: string;
    actorMemberId: string | null;
    ownerMemberId: string;
    previousOwnerMemberId: string | null;
    createdAt: string;
  }>;
};

export type WorkspaceMemberManagedStatus = "active" | "disabled";

export type WorkspaceMemberStatusUpdateResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  sessionPolicy: "target_sessions_revoked" | "no_session_revocation_required";
  member: {
    workspaceId: string;
    memberId: string;
    role: WorkspaceRole;
    status: WorkspaceMemberManagedStatus;
  };
};

export async function assignProjectMembership(
  workerUrl: string,
  request: {
    workspaceId: string;
    projectId: string;
    projectTitle: string;
    memberId: string;
    role: WorkspaceRole;
    department: string | null;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<ProjectMembershipAssignResult> {
  return postWorkerJson<ProjectMembershipAssignResult>(
    workerUrl,
    "/api/projects/memberships/assign-dry-run",
    request,
    csrfToken,
    "Project assignment failed",
    fetcher,
  );
}
export async function assignRecordPermission(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: RecordPermissionEntityType;
    entityId: string;
    memberId: string;
    permission: RecordPermissionLevel;
    department: string | null;
    expiresAt: string | null;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordPermissionAssignResult> {
  return postWorkerJson<RecordPermissionAssignResult>(
    workerUrl,
    "/api/records/permissions/assign-dry-run",
    request,
    csrfToken,
    "Record permission assignment failed",
    fetcher,
  );
}

export async function createRecordCommentIntent(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: RecordCommentEntityType;
    entityId: string;
    body: string;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordCommentIntentResult> {
  return postWorkerJson<RecordCommentIntentResult>(
    workerUrl,
    "/api/records/comments/dry-run",
    request,
    csrfToken,
    "Record comment intent failed",
    fetcher,
  );
}

export async function exportRecordCommentManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: RecordCommentEntityType;
    entityId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordCommentManifestResult> {
  return postWorkerJson<RecordCommentManifestResult>(
    workerUrl,
    "/api/records/comments/manifest",
    request,
    csrfToken,
    "Record comment manifest failed",
    fetcher,
  );
}

export async function preflightRecordMutation(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    mutation: RecordMutationKind;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationPreflightResult> {
  return postWorkerJson<RecordMutationPreflightResult>(
    workerUrl,
    "/api/records/mutations/preflight",
    request,
    csrfToken,
    "Record mutation preflight failed",
    fetcher,
  );
}

export async function createRecordMutationRequest(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    mutation: RecordMutationKind;
    summary: string;
    fieldKeys?: string[];
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationRequestResult> {
  return postWorkerJson<RecordMutationRequestResult>(
    workerUrl,
    "/api/records/mutations/request-dry-run",
    request,
    csrfToken,
    "Record mutation request failed",
    fetcher,
  );
}

export async function exportRecordMutationRequestManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationRequestManifestResult> {
  return postWorkerJson<RecordMutationRequestManifestResult>(
    workerUrl,
    "/api/records/mutations/requests/manifest",
    request,
    csrfToken,
    "Record mutation request manifest failed",
    fetcher,
  );
}

export async function resolveRecordMutationRequest(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    decision: "approve" | "reject";
    note?: string;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationResolutionResult> {
  return postWorkerJson<RecordMutationResolutionResult>(
    workerUrl,
    "/api/records/mutations/requests/resolve-dry-run",
    request,
    csrfToken,
    "Record mutation resolution failed",
    fetcher,
  );
}

export async function previewRecordMutationDiff(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    updates?: Record<string, string | number | boolean | null | string[]>;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationDiffPreviewResult> {
  return postWorkerJson<RecordMutationDiffPreviewResult>(
    workerUrl,
    "/api/records/mutations/diff-dry-run",
    request,
    csrfToken,
    "Record mutation diff preview failed",
    fetcher,
  );
}

export async function createRecordMutationRollbackRequest(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    summary?: string;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationRollbackRequestResult> {
  return postWorkerJson<RecordMutationRollbackRequestResult>(
    workerUrl,
    "/api/records/mutations/requests/rollback-dry-run",
    request,
    csrfToken,
    "Record mutation rollback request failed",
    fetcher,
  );
}

export async function previewRecordMutationDeleteRecoveryPlan(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationDeleteRecoveryPlanResult> {
  return postWorkerJson<RecordMutationDeleteRecoveryPlanResult>(
    workerUrl,
    "/api/records/mutations/requests/delete-recovery-plan",
    request,
    csrfToken,
    "Record mutation delete recovery plan failed",
    fetcher,
  );
}

export async function applyRecordMutationRequest(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    confirmation: string;
    updates?: Record<string, string | number | boolean | null | string[]>;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationApplyResult> {
  return postWorkerJson<RecordMutationApplyResult>(
    workerUrl,
    "/api/records/mutations/apply",
    request,
    csrfToken,
    "Record mutation apply failed",
    fetcher,
  );
}

export async function createFilmProfileMutationRequest(
  workerUrl: string,
  request: {
    workspaceId: string;
    projectId: string;
    summary: string;
    fieldKeys: FilmProfileMutationFieldKey[];
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<FilmProfileMutationRequestResult> {
  return postWorkerJson<FilmProfileMutationRequestResult>(
    workerUrl,
    "/api/projects/film-profile/mutations/request-dry-run",
    request,
    csrfToken,
    "Film profile mutation request failed",
    fetcher,
  );
}

export async function exportFilmProfileMutationRequestManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    projectId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<FilmProfileMutationRequestManifestResult> {
  return postWorkerJson<FilmProfileMutationRequestManifestResult>(
    workerUrl,
    "/api/projects/film-profile/mutations/requests/manifest",
    request,
    csrfToken,
    "Film profile mutation request manifest failed",
    fetcher,
  );
}

export async function resolveFilmProfileMutationRequest(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    decision: "approve" | "reject";
    note?: string;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<FilmProfileMutationResolutionResult> {
  return postWorkerJson<FilmProfileMutationResolutionResult>(
    workerUrl,
    "/api/projects/film-profile/mutations/requests/resolve-dry-run",
    request,
    csrfToken,
    "Film profile mutation resolution failed",
    fetcher,
  );
}

export async function previewFilmProfileMutationDiff(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    updates?: Record<string, string | number | null>;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<FilmProfileMutationDiffPreviewResult> {
  return postWorkerJson<FilmProfileMutationDiffPreviewResult>(
    workerUrl,
    "/api/projects/film-profile/mutations/diff-dry-run",
    request,
    csrfToken,
    "Film profile mutation diff preview failed",
    fetcher,
  );
}

export async function applyFilmProfileMutationRequest(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    confirmation: string;
    updates?: Record<string, string | number | null>;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<FilmProfileMutationApplyResult> {
  return postWorkerJson<FilmProfileMutationApplyResult>(
    workerUrl,
    "/api/projects/film-profile/mutations/apply",
    request,
    csrfToken,
    "Film profile mutation apply failed",
    fetcher,
  );
}

export async function exportRecordMutationAuditManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    requestId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordMutationAuditManifestResult> {
  return postWorkerJson<RecordMutationAuditManifestResult>(
    workerUrl,
    "/api/records/mutations/requests/audit-manifest",
    request,
    csrfToken,
    "Record mutation audit manifest failed",
    fetcher,
  );
}

export async function exportProjectMembershipManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    projectId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<ProjectMembershipManifestResult> {
  return postWorkerJson<ProjectMembershipManifestResult>(
    workerUrl,
    "/api/projects/memberships/manifest",
    request,
    csrfToken,
    "Project membership manifest failed",
    fetcher,
  );
}

export async function exportProjectMembershipHistory(
  workerUrl: string,
  request: {
    workspaceId: string;
    projectId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<ProjectMembershipHistoryResult> {
  return postWorkerJson<ProjectMembershipHistoryResult>(
    workerUrl,
    "/api/projects/memberships/history",
    request,
    csrfToken,
    "Project membership history failed",
    fetcher,
  );
}

export async function revokeProjectMembership(
  workerUrl: string,
  request: {
    workspaceId: string;
    projectId: string;
    memberId: string;
    role: WorkspaceRole;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<ProjectMembershipRevokeResult> {
  return postWorkerJson<ProjectMembershipRevokeResult>(
    workerUrl,
    "/api/projects/memberships/revoke-dry-run",
    request,
    csrfToken,
    "Project membership revoke failed",
    fetcher,
  );
}

export async function updateWorkspaceMemberStatus(
  workerUrl: string,
  request: {
    workspaceId: string;
    memberId: string;
    status: WorkspaceMemberManagedStatus;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<WorkspaceMemberStatusUpdateResult> {
  return postWorkerJson<WorkspaceMemberStatusUpdateResult>(
    workerUrl,
    "/api/members/status/dry-run",
    request,
    csrfToken,
    "Member status update failed",
    fetcher,
  );
}

export async function revokeRecordPermission(
  workerUrl: string,
  request: {
    workspaceId: string;
    permissionId: string;
    entityType: RecordPermissionEntityType;
    entityId: string;
    memberId: string;
    permission: RecordPermissionLevel;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordPermissionRevokeResult> {
  return postWorkerJson<RecordPermissionRevokeResult>(
    workerUrl,
    "/api/records/permissions/revoke-dry-run",
    request,
    csrfToken,
    "Record permission revoke failed",
    fetcher,
  );
}

export async function transferRecordOwner(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    memberId: string;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordOwnerTransferResult> {
  return postWorkerJson<RecordOwnerTransferResult>(
    workerUrl,
    "/api/records/owners/transfer-dry-run",
    request,
    csrfToken,
    "Record owner transfer failed",
    fetcher,
  );
}

export async function exportRecordOwnerManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordOwnerManifestResult> {
  return postWorkerJson<RecordOwnerManifestResult>(
    workerUrl,
    "/api/records/owners/manifest",
    request,
    csrfToken,
    "Record owner manifest failed",
    fetcher,
  );
}

export async function exportRecordOwnerHistory(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordOwnerHistoryResult> {
  return postWorkerJson<RecordOwnerHistoryResult>(
    workerUrl,
    "/api/records/owners/history",
    request,
    csrfToken,
    "Record owner history failed",
    fetcher,
  );
}

export async function exportRecordPermissionManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: RecordPermissionEntityType;
    entityId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordPermissionManifestResult> {
  return postWorkerJson<RecordPermissionManifestResult>(
    workerUrl,
    "/api/records/permissions/manifest",
    request,
    csrfToken,
    "Record permission manifest failed",
    fetcher,
  );
}

export async function exportRecordPermissionHistory(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: RecordPermissionHistoryEntityType;
    entityId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordPermissionHistoryResult> {
  return postWorkerJson<RecordPermissionHistoryResult>(
    workerUrl,
    "/api/records/permissions/history",
    request,
    csrfToken,
    "Record permission history failed",
    fetcher,
  );
}

export async function exportExpiredRecordPermissionManifest(
  workerUrl: string,
  request: {
    workspaceId: string;
    entityType: RecordPermissionEntityType;
    entityId: string;
    limit?: number;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<RecordPermissionManifestResult> {
  return postWorkerJson<RecordPermissionManifestResult>(
    workerUrl,
    "/api/records/permissions/expired-manifest",
    request,
    csrfToken,
    "Expired record permission manifest failed",
    fetcher,
  );
}
