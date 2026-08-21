import type { WorkspaceRole } from "@film/schema";

type Fetcher = typeof fetch;

type MembershipResponseError = {
  error?: string;
};

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
  return parseJsonResponse<ProjectMembershipAssignResult>(
    await fetcher(`${workerUrl}/api/projects/memberships/assign-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Project assignment failed",
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
  return parseJsonResponse<RecordPermissionAssignResult>(
    await fetcher(`${workerUrl}/api/records/permissions/assign-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record permission assignment failed",
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
  return parseJsonResponse<RecordCommentIntentResult>(
    await fetcher(`${workerUrl}/api/records/comments/dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record comment intent failed",
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
  return parseJsonResponse<RecordCommentManifestResult>(
    await fetcher(`${workerUrl}/api/records/comments/manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record comment manifest failed",
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
  return parseJsonResponse<RecordMutationPreflightResult>(
    await fetcher(`${workerUrl}/api/records/mutations/preflight`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation preflight failed",
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
  return parseJsonResponse<RecordMutationRequestResult>(
    await fetcher(`${workerUrl}/api/records/mutations/request-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation request failed",
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
  return parseJsonResponse<RecordMutationRequestManifestResult>(
    await fetcher(`${workerUrl}/api/records/mutations/requests/manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation request manifest failed",
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
  return parseJsonResponse<RecordMutationResolutionResult>(
    await fetcher(`${workerUrl}/api/records/mutations/requests/resolve-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation resolution failed",
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
  return parseJsonResponse<RecordMutationDiffPreviewResult>(
    await fetcher(`${workerUrl}/api/records/mutations/diff-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation diff preview failed",
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
  return parseJsonResponse<RecordMutationRollbackRequestResult>(
    await fetcher(`${workerUrl}/api/records/mutations/requests/rollback-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation rollback request failed",
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
  return parseJsonResponse<RecordMutationDeleteRecoveryPlanResult>(
    await fetcher(`${workerUrl}/api/records/mutations/requests/delete-recovery-plan`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation delete recovery plan failed",
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
  return parseJsonResponse<RecordMutationApplyResult>(
    await fetcher(`${workerUrl}/api/records/mutations/apply`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation apply failed",
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
  return parseJsonResponse<FilmProfileMutationRequestResult>(
    await fetcher(`${workerUrl}/api/projects/film-profile/mutations/request-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Film profile mutation request failed",
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
  return parseJsonResponse<FilmProfileMutationRequestManifestResult>(
    await fetcher(`${workerUrl}/api/projects/film-profile/mutations/requests/manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Film profile mutation request manifest failed",
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
  return parseJsonResponse<FilmProfileMutationResolutionResult>(
    await fetcher(`${workerUrl}/api/projects/film-profile/mutations/requests/resolve-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Film profile mutation resolution failed",
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
  return parseJsonResponse<FilmProfileMutationDiffPreviewResult>(
    await fetcher(`${workerUrl}/api/projects/film-profile/mutations/diff-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Film profile mutation diff preview failed",
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
  return parseJsonResponse<FilmProfileMutationApplyResult>(
    await fetcher(`${workerUrl}/api/projects/film-profile/mutations/apply`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Film profile mutation apply failed",
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
  return parseJsonResponse<RecordMutationAuditManifestResult>(
    await fetcher(`${workerUrl}/api/records/mutations/requests/audit-manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record mutation audit manifest failed",
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
  return parseJsonResponse<ProjectMembershipManifestResult>(
    await fetcher(`${workerUrl}/api/projects/memberships/manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Project membership manifest failed",
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
  return parseJsonResponse<ProjectMembershipHistoryResult>(
    await fetcher(`${workerUrl}/api/projects/memberships/history`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Project membership history failed",
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
  return parseJsonResponse<ProjectMembershipRevokeResult>(
    await fetcher(`${workerUrl}/api/projects/memberships/revoke-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Project membership revoke failed",
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
  return parseJsonResponse<WorkspaceMemberStatusUpdateResult>(
    await fetcher(`${workerUrl}/api/members/status/dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Member status update failed",
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
  return parseJsonResponse<RecordPermissionRevokeResult>(
    await fetcher(`${workerUrl}/api/records/permissions/revoke-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record permission revoke failed",
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
  return parseJsonResponse<RecordOwnerTransferResult>(
    await fetcher(`${workerUrl}/api/records/owners/transfer-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record owner transfer failed",
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
  return parseJsonResponse<RecordOwnerManifestResult>(
    await fetcher(`${workerUrl}/api/records/owners/manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record owner manifest failed",
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
  return parseJsonResponse<RecordOwnerHistoryResult>(
    await fetcher(`${workerUrl}/api/records/owners/history`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record owner history failed",
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
  return parseJsonResponse<RecordPermissionManifestResult>(
    await fetcher(`${workerUrl}/api/records/permissions/manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record permission manifest failed",
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
  return parseJsonResponse<RecordPermissionHistoryResult>(
    await fetcher(`${workerUrl}/api/records/permissions/history`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Record permission history failed",
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
  return parseJsonResponse<RecordPermissionManifestResult>(
    await fetcher(`${workerUrl}/api/records/permissions/expired-manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Expired record permission manifest failed",
  );
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = (await response.json()) as T & MembershipResponseError;
  if (!response.ok) {
    throw new Error(body.error ?? fallbackMessage);
  }
  return body;
}
