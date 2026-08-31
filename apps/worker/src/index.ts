import { planNotionImport, type NotionExportFile } from "@film/importers";
import {
  createGoogleDriveSyncDryRunStatus,
  createTelnyxSmsSendDryRunPlan,
  getProviderDryRunStatus,
  isTelnyxSmsCategory,
  listProviderDryRunStatuses,
} from "@film/providers";
import {
  createBackupSnapshot,
  getFilmProfileMutationFieldDefinitions,
  isRecordMutationFieldKeyForEntity,
  isFilmProfileMutationFieldKey,
  normalizeFilmProfileMutationFieldKeys,
  seedWorkspace,
  validateOperationBatchForSync,
  type CanonicalDocument,
  type CanonicalEquipment,
  type CanonicalExpense,
  type CanonicalFilmProfile,
  type CanonicalPerson,
  type CanonicalProject,
  type CanonicalProjectPerson,
  type CanonicalTask,
  type CanonicalWorkspaceCollection,
  type CanonicalWorkspaceMember,
  type CanonicalWorkspaceSnapshot,
  type FilmProfileMutationFieldKey,
  type OperationRecord,
} from "@film/schema";
import {
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
  GOOGLE_TOKEN_KEY_VERSION,
  createGoogleOAuthAuthorization,
  decryptGoogleToken,
  encryptGoogleToken,
  exchangeGoogleAuthorizationCode,
  hasValidGoogleTokenEncryptionKey,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from "./google-oauth";
import { listGoogleDriveFolder } from "./google-drive";
import {
  META_OAUTH_STATE_TTL_SECONDS,
  META_TOKEN_KEY_VERSION,
  META_REQUIRED_SCOPES,
  createMetaOAuthAuthorization,
  decryptMetaToken,
  encryptMetaToken,
  exchangeMetaAuthorizationCode,
  hasValidMetaOAuthConfiguration,
  hasValidMetaTokenEncryptionKey,
  isMetaId,
  listMetaPageCandidates,
  metaTokenAdditionalData,
  readMetaPageSelection,
  revokeMetaPermissions,
  type MetaOAuthConfiguration,
} from "./meta-oauth";
import { isValidMetaAnalyticsDateRange, readMetaAnalytics } from "./meta-insights";
import {
  META_SIGNED_REQUEST_MAX_BYTES,
  createMetaDeletionConfirmationCode,
  metaUserIdSha256,
  verifyMetaSignedRequest,
} from "./meta-signed-request";
import {
  NOTION_CORE_IMPORT_MAX_RECORDS,
  commitNotionCoreImport,
} from "./notion-core-import";
import {
  hasValidSmsRecipientEncryptionKey,
  hasValidSmsRecipientHashKey,
} from "./sms-identity";
import {
  SMS_CONSENT_MANIFEST_MAX_ROWS,
  commitSmsConsent,
  listSmsConsentManifest,
  revokeSmsConsent,
} from "./sms-consent";
import {
  TELNYX_WEBHOOK_MAX_BYTES,
  applyTelnyxComplianceEvent,
  parseTelnyxInboundNumberMappings,
} from "./telnyx-compliance";
import {
  isValidTelnyxWebhookPublicKey,
  normalizeTelnyxMessagingWebhookEvent,
  verifyTelnyxWebhookSignature,
} from "./telnyx-webhook";
import {
  isEmergencyReasonCode,
  isValidQuietHoursConfiguration,
  isValidTelnyxMessagingProfileId,
  parseTelnyxOutboundNumber,
  sendTelnyxSmsBatch,
} from "./telnyx-send";
import { checkTelnyxProviderReadiness } from "./telnyx-readiness";
import { applySmsRetention, parseSmsRetentionDays } from "./sms-retention";

export interface Env {
  DB?: D1Database;
  SESSIONS?: KVNamespace;
  BACKUPS?: R2Bucket;
  ATTACHMENTS?: R2Bucket;
  ALLOWED_ORIGINS?: string;
  RESEND_API_KEY?: string;
  INVITE_FROM_EMAIL?: string;
  INVITE_APP_ORIGIN?: string;
  INVITE_DELIVERY_WEBHOOK_SECRET?: string;
  INVITE_DELIVERY_MODE?: string;
  AUTH_MAGIC_LINK_MODE?: string;
  POOL_STRIPE_SUMMARY_ADAPTER_URL?: string;
  STORE_STRIPE_SUMMARY_ADAPTER_URL?: string;
  STRIPE_PROJECT_MAPPINGS?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_REDACTED_AUDIT?: string;
  STRIPE_SUMMARY_ADAPTER_SECRET?: string;
  STRIPE_SUMMARY_MODE?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_REDIRECT_URI?: string;
  GOOGLE_OAUTH_MODE?: string;
  GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
  META_OAUTH_CLIENT_ID?: string;
  META_OAUTH_CLIENT_SECRET?: string;
  META_OAUTH_REDIRECT_URI?: string;
  META_GRAPH_API_VERSION?: string;
  META_LOGIN_CONFIGURATION_ID?: string;
  META_TOKEN_ENCRYPTION_KEY?: string;
  META_OAUTH_MODE?: string;
  SMS_RECIPIENT_ENCRYPTION_KEY?: string;
  SMS_RECIPIENT_HASH_KEY?: string;
  TELNYX_WEBHOOK_PUBLIC_KEY?: string;
  TELNYX_INBOUND_NUMBER_MAPPINGS?: string;
  TELNYX_WEBHOOK_MODE?: string;
  TELNYX_API_KEY?: string;
  TELNYX_MESSAGING_PROFILE_ID?: string;
  TELNYX_CAMPAIGN_ID?: string;
  SMS_MODE?: string;
  SMS_QUIET_HOURS_TIME_ZONE?: string;
  SMS_QUIET_HOURS_START?: string;
  SMS_QUIET_HOURS_END?: string;
  SMS_DELIVERY_RETENTION_DAYS?: string;
  RATE_LIMIT_OVERRIDES?: string;
}

type JsonValue = Record<string, unknown> | Array<unknown>;
type MagicLinkRequest = {
  email?: string;
};
type MagicLinkVerifyRequest = {
  token?: string;
};
type AuthPersistence = "dry_run_memoryless" | "d1_kv_auth_records" | "d1_unavailable_dry_run";
type RateLimitPersistence = "dry_run_memoryless" | "kv_rate_limit" | "kv_unavailable_dry_run";
type RateLimitPolicy = {
  bucket: string;
  limit: number;
  windowSeconds: number;
};
type RateLimitBucket = {
  count: number;
  resetAt: number;
};
type RateLimitResult =
  | {
    ok: true;
    persistence: RateLimitPersistence;
  }
  | {
    ok: false;
    error: "rate_limited";
    status: 429;
    persistence: "kv_rate_limit";
    limit: number;
    windowSeconds: number;
    retryAfterSeconds: number;
  }
  | {
    ok: false;
    error: "rate_limit_unavailable";
    status: 503;
    persistence: "kv_unavailable_dry_run";
  };
type MagicLinkRow = {
  id: string;
  email_hash: string;
  consumed_at: string | null;
  expires_at: string;
};
type SessionRow = {
  id: string;
  workspace_id: string | null;
  member_id: string | null;
  csrf_hash: string;
  revoked_at: string | null;
  expires_at: string;
};
type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  role: string;
  status: string;
};
type WorkspaceSnapshotWorkspaceRow = {
  id: string;
  name: string;
  updated_at: string;
};
type WorkspaceSnapshotMemberRow = {
  id: string;
  display_name: string | null;
  email_hash: string;
  role: string;
  status: string;
  last_seen_at: string | null;
};
type WorkspaceSnapshotProjectRow = {
  id: string;
  title: string;
  project_type: string;
  status: string;
  phase: string;
  logline: string | null;
  owner_member_id: string | null;
  created_at: string;
  updated_at: string;
};
type WorkspaceSnapshotFilmProfileRow = {
  project_id: string;
  runtime_minutes: number | null;
  format: string | null;
  shoot_start: string | null;
  shoot_end: string | null;
  budget_cents: number;
  spent_cents: number;
  updated_at: string;
};
type WorkspaceSnapshotTaskRow = {
  id: string;
  project_id: string | null;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  assignee_member_id: string | null;
  owner_member_id: string | null;
  created_at: string;
  updated_at: string;
};
type WorkspaceSnapshotDocumentRow = {
  id: string;
  project_id: string | null;
  title: string;
  document_type: string;
  markdown_snapshot: string | null;
  markdown_truncated: number;
  external_url: string | null;
  sensitive: number;
  owner_member_id: string | null;
  created_at: string;
  updated_at: string;
};
type WorkspaceSnapshotPersonRow = {
  id: string;
  display_name: string;
  role_tags: string;
  sensitive: number;
  owner_member_id: string | null;
  updated_at: string | null;
};
type WorkspaceSnapshotProjectPersonRow = {
  project_id: string;
  person_id: string;
  project_role: string | null;
};
type WorkspaceSnapshotEquipmentRow = {
  id: string;
  project_id: string | null;
  name: string;
  equipment_type: string | null;
  status: string;
  owner_member_id: string | null;
  updated_at: string | null;
};
type WorkspaceSnapshotExpenseRow = {
  id: string;
  project_id: string | null;
  category: string;
  amount_cents: number;
  purchased_at: string | null;
  comment: string | null;
  owner_member_id: string | null;
  updated_at: string | null;
};
type WorkspaceSnapshotAccessRow = {
  entity_type: string;
  entity_id: string;
};
type WorkspaceMemberStatus = "active" | "invited" | "disabled";
type SessionMembership = {
  role: AuthRole;
  status: WorkspaceMemberStatus | "missing";
};
type WorkspaceInviteRow = {
  id: string;
  workspace_id: string;
  email_hash: string;
  invited_role: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
};
type SessionMetadata = {
  id: string;
  role: AuthRole;
  expiresAt: string;
};
type SessionMetadataResult =
  | {
    ok: true;
    persistence: AuthPersistence;
    session: SessionMetadata | null;
  }
  | {
    ok: false;
    error: string;
    status: number;
    persistence: AuthPersistence;
  };
type AuthRole = "owner" | "producer" | "director" | "department_lead" | "contributor" | "reviewer";
type MutationAuthResult =
  | {
    ok: true;
    role: AuthRole;
    workspaceId: string | null;
    memberId: string | null;
    csrfToken: string;
    persistence: AuthPersistence;
  }
  | {
    ok: false;
    error: string;
    status: number;
    persistence?: AuthPersistence;
  };
type OperationSyncRequest = {
  operations?: OperationRecord[];
};
type GoogleDriveSyncDryRunRequest = {
  workspaceId?: string;
  rootFolderId?: string;
  includeDocsExport?: boolean;
  includeCalendarSync?: boolean;
};
type GoogleOAuthConnectionRequest = {
  workspaceId?: string;
};
type GoogleOAuthStartRequest = GoogleOAuthConnectionRequest & {
  includeDocsExport?: boolean;
  includeCalendarSync?: boolean;
};
type GoogleDriveManifestRequest = GoogleOAuthConnectionRequest & {
  rootFolderId?: string;
  pageToken?: string;
};
type GoogleOAuthStateRecord = {
  workspaceId: string;
  memberId: string;
  sessionHash: string;
  codeVerifier: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
};
type GoogleProviderConnectionRow = {
  id: string;
  workspace_id: string;
  provider: "google";
  status: "active" | "disconnected" | "error";
  scopes_json: string;
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
  token_type: string | null;
  token_key_version: string;
  root_folder_id: string | null;
  last_error_code: string | null;
  connected_at: string;
  disconnected_at: string | null;
  updated_at: string;
};
type GoogleProviderConnection = {
  provider: "google";
  status: "active" | "disconnected" | "error";
  scopes: string[];
  hasRefreshToken: boolean;
  tokenExpiresAt: string | null;
  rootFolderId: string | null;
  connectedAt: string;
  disconnectedAt: string | null;
  updatedAt: string;
};
type GoogleOAuthRuntimeReadiness = {
  provider: "google";
  mode: "oauth_connection";
  status: "live_oauth_enabled" | "blocked_oauth";
  liveOAuthAllowed: boolean;
  configured: {
    clientId: boolean;
    clientSecret: boolean;
    redirectUri: boolean;
    tokenEncryptionKey: boolean;
    appOrigin: boolean;
    d1: boolean;
    kv: boolean;
    liveMode: boolean;
  };
  requiredConfiguration: string[];
  blockers: string[];
  dataBoundary: "drive_metadata_and_explicit_file_content";
};
type MetaConnectionRequest = {
  workspaceId?: string;
};
type MetaPageSelectionRequest = MetaConnectionRequest & {
  pageId?: string;
};
type MetaAnalyticsRequest = MetaConnectionRequest & {
  since?: string;
  until?: string;
};
type MetaOAuthStateRecord = {
  workspaceId: string;
  memberId: string;
  sessionHash: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
};
type MetaProviderConnectionStatus = "pending_page_selection" | "active" | "disconnected" | "error";
type MetaProviderConnectionRow = {
  id: string;
  workspace_id: string;
  connected_by_member_id: string | null;
  status: MetaProviderConnectionStatus;
  scopes_json: string;
  user_access_token_ciphertext: string | null;
  page_access_token_ciphertext: string | null;
  token_expires_at: string | null;
  token_key_version: string;
  meta_user_id: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_account_id: string | null;
  instagram_username: string | null;
  last_error_code: string | null;
  connected_at: string;
  disconnected_at: string | null;
  updated_at: string;
};
type MetaProviderConnection = {
  provider: "meta";
  status: MetaProviderConnectionStatus;
  scopes: string[];
  tokenExpiresAt: string | null;
  page: { id: string; name: string } | null;
  instagramAccount: { id: string; username: string | null } | null;
  connectedAt: string;
  disconnectedAt: string | null;
  updatedAt: string;
};
type MetaOAuthRuntimeReadiness = {
  provider: "meta";
  mode: "read_only_oauth_connection";
  status: "live_oauth_enabled" | "blocked_oauth";
  liveOAuthAllowed: boolean;
  configured: {
    clientId: boolean;
    clientSecret: boolean;
    redirectUri: boolean;
    graphVersion: boolean;
    loginConfigurationId: boolean;
    tokenEncryptionKey: boolean;
    appOrigin: boolean;
    d1: boolean;
    kv: boolean;
    liveMode: boolean;
  };
  requiredConfiguration: string[];
  blockers: string[];
  dataBoundary: "meta_page_and_instagram_read_only_analytics_and_calendar_metadata";
};
type MetaDataDeletionRequestRow = {
  confirmation_code: string;
  status: "completed" | "failed";
  deleted_connection_count: number;
  requested_at: string;
  completed_at: string | null;
};
type MetaConnectionWorkspaceRow = {
  workspace_id: string;
};
type DocumentMarkdownUpdateRequest = {
  workspaceId?: string;
  projectId?: string;
  documentId?: string;
  markdownSnapshot?: string;
  expectedUpdatedAt?: string;
};
type DocumentMarkdownRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  document_type: string;
  sensitive: number;
  owner_member_id: string | null;
  updated_at: string;
};
type InvitePersistence = "dry_run_memoryless" | "d1_invite_records" | "d1_unavailable_dry_run";
type InviteDeliveryPersistence = "dry_run_memoryless" | "d1_invite_delivery_attempts" | "d1_unavailable_dry_run";
type InviteDeliveryWebhookPersistence = "dry_run_memoryless" | "d1_invite_delivery_webhook_events" | "d1_unavailable_dry_run";
type InviteDeliverySuppressionManifestPersistence = "dry_run_memoryless" | "d1_invite_delivery_suppressions" | "d1_unavailable_dry_run";
type InviteDeliverySuppressionCheckPersistence = InviteDeliverySuppressionManifestPersistence;
type InviteDeliveryMode = "dry_run_outbox" | "live_resend";
type InviteDeliveryStatus = "queued_dry_run" | "blocked_provider_not_configured" | "queued_live" | "sent_live" | "failed_live_delivery";
type InviteDeliveryWebhookStatus =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed"
  | "opened"
  | "clicked";
type ResendInviteDeliveryWebhookEvent = {
  id: string;
  svixId: string;
  eventType: string;
  providerMessageId: string | null;
  deliveryStatus: InviteDeliveryWebhookStatus;
  receivedAt: string;
  eventCreatedAt: string | null;
  metadataKeys: string[];
  deliveryAttemptTag: string | null;
};
type InviteDeliveryAttemptLookupRow = {
  id: string;
  workspace_id: string;
  invite_id: string;
  target_hash: string;
};
type WorkspaceInviteCreateRequest = {
  workspaceId?: string;
  email?: string;
  role?: string;
  expiresInDays?: number;
};
type WorkspaceInviteDeliveryReadinessRequest = {
  workspaceId?: string;
};
type WorkspaceInviteManifestRequest = {
  workspaceId?: string;
  limit?: number;
};
type InviteDeliverySuppressionManifestRequest = {
  workspaceId?: string;
  limit?: number;
};
type WorkspaceInviteRevokeRequest = {
  workspaceId?: string;
  inviteId?: string;
  emailHash?: string;
  role?: string;
};
type StripeSummaryReadinessRequest = {
  workspaceId?: string;
};
type StripeSummaryRequest = {
  workspaceId?: string;
  projectId?: string;
};
type WorkspaceInviteAcceptRequest = {
  token?: string;
  displayName?: string;
};
type WorkspaceMemberStatusUpdateRequest = {
  workspaceId?: string;
  memberId?: string;
  status?: string;
};
type WorkspaceMemberStatusUpdatePersistence = "dry_run_memoryless" | "d1_workspace_member_status" | "d1_unavailable_dry_run";
type WorkspaceMemberStatusUpdateSummary = {
  workspaceId: string;
  memberId: string;
  role: AuthRole;
  status: Extract<WorkspaceMemberStatus, "active" | "disabled">;
};
type WorkspaceInviteSummary = {
  id: string;
  workspaceId: string;
  emailHash: string;
  role: AuthRole;
  expiresAt: string;
  devOnlyInviteToken: string | null;
};
type WorkspaceInviteManifestRow = {
  id: string;
  workspace_id: string;
  email_hash: string;
  invited_role: string;
  status: string;
  expires_at: string;
  created_at: string;
};
type WorkspaceInviteManifestEntry = {
  id: string;
  workspaceId: string;
  emailHash: string;
  role: AuthRole;
  status: "pending";
  expiresAt: string;
  createdAt: string;
};
type WorkspaceInviteManifestResult = {
  persistence: InvitePersistence;
  invites: WorkspaceInviteManifestEntry[];
  rowCount: number;
  truncated: boolean;
};
type InviteDeliverySuppressionManifestRow = {
  id: string;
  provider: string;
  target_hash: string;
  suppression_reason: string;
  workspace_id: string | null;
  invite_id: string | null;
  delivery_attempt_id: string | null;
  provider_message_id: string | null;
  source_webhook_event_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
};
type InviteDeliverySuppressionManifestEntry = {
  id: string;
  provider: "resend";
  targetHash: string;
  reason: "bounced" | "complained" | "suppressed";
  workspaceId: string | null;
  inviteId: string | null;
  deliveryAttemptId: string | null;
  providerMessageId: string | null;
  sourceWebhookEventId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};
type InviteDeliverySuppressionManifestResult = {
  persistence: InviteDeliverySuppressionManifestPersistence;
  suppressions: InviteDeliverySuppressionManifestEntry[];
  rowCount: number;
  truncated: boolean;
};
type InviteDeliverySuppressionCheckResult = {
  persistence: InviteDeliverySuppressionCheckPersistence;
  suppression: InviteDeliverySuppressionManifestEntry | null;
};
type WorkspaceInviteDeliverySummary = {
  id: string | null;
  provider: "resend";
  channel: "email";
  targetHash: string;
  templateKey: "workspace_invite";
  deliveryMode: InviteDeliveryMode;
  status: InviteDeliveryStatus;
  providerMessageId: string | null;
  errorCode: string | null;
};
type WorkspaceInviteDeliveryReadiness = {
  provider: "resend";
  channel: "email";
  mode: "readiness_only";
  status: "dry_run_outbox_ready" | "ready_for_live_adapter" | "live_delivery_enabled" | "blocked_live_delivery";
  dryRunOutboxAllowed: boolean;
  liveDeliveryAllowed: boolean;
  configured: {
    resendApiKey: boolean;
    fromEmail: boolean;
    appOrigin: boolean;
    webhookSecret: boolean;
    productionOrigin: boolean;
    liveMode: boolean;
  };
  requiredConfiguration: string[];
  blockers: string[];
  complianceNotes: string[];
};
type StripeSummaryReadiness = {
  provider: "stripe";
  source: "pool_store_summary_adapter";
  mode: "readiness_only";
  status: "live_summary_enabled" | "ready_for_summary_adapter" | "blocked_summary_adapter";
  dataBoundary: "summary_only";
  directStripeReadAllowed: false;
  liveSummaryReadAllowed: boolean;
  configured: {
    poolAdapter: boolean;
    storeAdapter: boolean;
    projectMappings: boolean;
    webhookSecret: boolean;
    redactedAudit: boolean;
    adapterSecret: boolean;
    liveMode: boolean;
  };
  requiredConfiguration: string[];
  blockers: string[];
  complianceNotes: string[];
};
type ProviderRuntimeReadinessItem = {
  key: "pool" | "store" | "stripe" | "resend" | "google" | "social" | "sms";
  label: string;
  status: "live" | "partial_live" | "blocked";
  runtimeMode: "live_summary_only" | "live_transactional_email" | "live_transactional_sms" | "live_oauth" | "dry_run_only";
  liveCapabilities: string[];
  blockers: string[];
  requiredDecisions: string[];
  dataBoundary: string;
};
type ProviderRuntimeReadinessResult = {
  policy: "explicit_provider_live_gates";
  secretValuesExposed: false;
  liveCount: number;
  partialLiveCount: number;
  blockedCount: number;
  providers: ProviderRuntimeReadinessItem[];
};
type ProviderRuntimeReadinessRequest = {
  workspaceId?: string;
};
type TelnyxSmsSendDryRunRequest = {
  workspaceId?: string;
  projectId?: string;
  category?: string;
  recipientCount?: number;
  consentedRecipientCount?: number;
  estimatedSegments?: number;
  emergencyOverride?: boolean;
  recipients?: unknown;
  messageBody?: unknown;
};
type TelnyxSmsSendRequest = {
  workspaceId?: string;
  projectId?: string;
  recipientIds?: string[];
  category?: string;
  messageBody?: string;
  requestKey?: string;
  emergencyOverride?: boolean;
  emergencyReasonCode?: string | null;
};
type SmsConsentCommitRequest = {
  workspaceId?: string;
  memberId?: string | null;
  recipientE164?: string;
  evidenceId?: string;
  disclosureVersion?: string;
  categories?: string[];
  source?: "workspace_form" | "operator";
  disclosureAcknowledged?: boolean;
};
type SmsConsentRevokeRequest = {
  workspaceId?: string;
  recipientId?: string;
  evidenceId?: string;
};
type SmsConsentManifestRequest = {
  workspaceId?: string;
  limit?: number;
};
type StripeSummaryAdapterSource = "pool" | "store";
type StripeSummaryAdapterStatus = "available" | "empty" | "blocked_not_mapped" | "failed" | "invalid_response";
type StripeSummaryTotals = {
  grossAmountCents: number;
  feeAmountCents: number;
  netAmountCents: number;
  pledgedAmountCents: number;
  chargedAmountCents: number;
  orderRevenueCents: number;
  paymentFailedAmountCents: number;
  refundedAmountCents: number;
  disputedAmountCents: number;
};
type StripeSummaryCounts = {
  paymentCount: number;
  paymentFailedCount: number;
  refundCount: number;
  disputeCount: number;
  invoiceCount: number;
  payoutCount: number;
};
type StripeSummaryAdapterSummary = {
  source: StripeSummaryAdapterSource;
  status: StripeSummaryAdapterStatus;
  mappedRefCount: number;
  generatedAt: string | null;
  currency: string;
  totals: StripeSummaryTotals;
  counts: StripeSummaryCounts;
  errorCode: string | null;
};
type StripeProjectMapping = {
  projectId: string;
  poolRefs: string[];
  storeRefs: string[];
};
type StripeSummaryResult = {
  provider: "stripe";
  source: "pool_store_summary_adapter";
  mode: "live_summary_adapter";
  status: "complete_summary" | "partial_summary" | "unavailable_summary";
  workspaceId: string;
  projectId: string;
  dataBoundary: "summary_only";
  directStripeReadAllowed: false;
  liveSummaryReadAllowed: true;
  adapters: StripeSummaryAdapterSummary[];
  totals: StripeSummaryTotals;
  counts: StripeSummaryCounts;
  warnings: string[];
};
type WorkspaceInviteMemberSummary = {
  id: string;
  workspaceId: string;
  emailHash: string;
  role: AuthRole;
  status: "active";
};
type BackupPersistence = "dry_run_memoryless" | "d1_restore_point_metadata" | "d1_unavailable_dry_run";
type BackupObjectStorePersistence = "r2_backup_object" | "r2_backup_metadata_pending";
type BackupObjectDownloadPlanPersistence = "d1_backup_object_download_plans" | "d1_unavailable_dry_run";
type AuditPersistence = "dry_run_memoryless" | "d1_audit_events" | "d1_unavailable_dry_run";
type PreRestoreBackupPersistence = "not_provided" | "d1_restore_point_metadata" | "d1_unavailable_dry_run";
type BackupRestorePointMetadata = {
  id: string;
  label: string;
  snapshotRef: string;
  createdAt: string;
};
type BackupObjectStoreResult = {
  ok: true;
  workspaceId: string;
  createdAt: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  idempotent: boolean;
  restorePoint: BackupRestorePointMetadata;
} | {
  ok: false;
  error: "backup_object_check_unavailable" | "backup_object_state_mismatch" | "backup_object_upload_failed";
  status: 409 | 503;
};
type AuditEventManifestRequest = {
  workspaceId?: string;
  limit?: number;
  offset?: number;
  actionPrefix?: string;
};
type AuditEventManifestPersistence = "dry_run_memoryless" | "d1_audit_events" | "d1_unavailable_dry_run";
type AuditEventManifestRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  actor_member_id: string | null;
  action: string;
  metadata_json: string;
  created_at: string;
};
type AuditEventManifestEntry = {
  id: string;
  action: string;
  projectId: string | null;
  actorMemberId: string | null;
  createdAt: string;
  metadataKeys: string[];
  metadataKeyCount: number;
};
type AuditEventManifestResult = {
  persistence: AuditEventManifestPersistence;
  events: AuditEventManifestEntry[];
  rowCount: number;
  truncated: boolean;
  offset: number;
  nextOffset: number | null;
  actionPrefix: string | null;
};
type StoredBackupObjectRow = {
  id: string;
  workspace_id: string;
  label: string;
  snapshot_ref: string;
  created_at: string;
};
type BackupObjectDownloadPlanRequest = {
  workspaceId?: string;
  restorePointId?: string;
};
type BackupObjectDownloadPlanRow = {
  id: string;
  workspace_id: string;
  restore_point_id: string;
  actor_member_id: string | null;
  object_key: string;
  download_token_hash: string;
  expires_at: string;
  created_at: string;
};
type StoredBackupExportObject = {
  restorePointId: string;
  label: string;
  snapshotRef: string;
  objectKey: string;
  createdAt: string;
};
type OperationReplayPersistence = "dry_run_memoryless" | "d1_operation_log" | "d1_unavailable_dry_run";
type OperationReplayResult = {
  persistence: OperationReplayPersistence;
  accepted: string[];
  rejected: Array<{ id: string; reason: string }>;
  replayed: string[];
  idempotent: string[];
  canonicalApplied: string[];
  metadataOnly: string[];
};
type PlannedOperationReplay = {
  operation: OperationRecord;
  payloadJson: string;
  appliedAt: string;
  projectId: string | null;
  canonicalApplication: "applied" | "metadata_only";
};
type PlannedTaskState = {
  workspaceId: string;
  projectId: string | null;
  status: "pending" | "ready" | "overdue" | "completed";
};
type OperationLogRow = {
  id: string;
  workspace_id: string;
  kind: string;
  entity_type: string;
  entity_id: string;
  payload_json: string;
  status: "queued" | "applied" | "rejected";
  created_at: string;
  applied_at: string | null;
};
type ProjectMembershipRow = {
  project_id: string;
  member_id: string;
  project_role: string;
  department: string | null;
};
type ProjectMembershipPersistence = "dry_run_memoryless" | "d1_project_membership" | "d1_unavailable_dry_run";
type ProjectMembershipAssignRequest = {
  workspaceId?: string;
  projectId?: string;
  projectTitle?: string;
  memberId?: string;
  role?: string;
  department?: string;
};
type ProjectMembershipManifestRequest = {
  workspaceId?: string;
  projectId?: string;
  limit?: number;
};
type ProjectMembershipHistoryRequest = {
  workspaceId?: string;
  projectId?: string;
  limit?: number;
};
type ProjectMembershipRevokeRequest = {
  workspaceId?: string;
  projectId?: string;
  memberId?: string;
  role?: string;
};
type ProjectMembershipSummary = {
  workspaceId: string;
  projectId: string;
  memberId: string;
  role: AuthRole;
  department: string | null;
};
type ProjectMembershipManifestResult = {
  persistence: ProjectMembershipPersistence;
  memberships: ProjectMembershipSummary[];
  rowCount: number;
  truncated: boolean;
};
type ProjectMembershipHistoryPersistence = "dry_run_memoryless" | "d1_audit_events" | "d1_unavailable_dry_run";
type ProjectMembershipHistoryRow = {
  id: string;
  actor_member_id: string | null;
  action: string;
  metadata_json: string;
  created_at: string;
};
type ProjectMembershipHistoryEntry = {
  id: string;
  action: "project_membership.assigned" | "project_membership.revoked";
  actorMemberId: string | null;
  memberId: string;
  role: AuthRole;
  department: string | null;
  createdAt: string;
};
type ProjectMembershipHistoryResult = {
  persistence: ProjectMembershipHistoryPersistence;
  entries: ProjectMembershipHistoryEntry[];
  rowCount: number;
  truncated: boolean;
};
type RecordPermissionEntityType = "workspace" | "project" | "task" | "document" | "person" | "equipment" | "expense" | "planning";
type RecordPermissionLevel = "read" | "comment" | "write" | "admin";
type RecordPermissionRow = {
  id: string;
  workspace_id: string;
  entity_type: RecordPermissionEntityType;
  entity_id: string;
  member_id: string;
  permission: RecordPermissionLevel;
  department: string | null;
  expires_at: string | null;
  updated_at?: string;
};
type RecordPermissionPersistence = "dry_run_memoryless" | "d1_record_permissions" | "d1_unavailable_dry_run";
type RecordPermissionManifestMode = "active" | "expired";
type RecordPermissionManifestPolicy = "active_record_permissions_only" | "expired_record_permissions_only";
type RecordPermissionAssignRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  memberId?: string;
  permission?: string;
  department?: string | null;
  expiresAt?: string | null;
};
type RecordPermissionRevokeRequest = {
  workspaceId?: string;
  permissionId?: string;
  entityType?: string;
  entityId?: string;
  memberId?: string;
  permission?: string;
};
type RecordPermissionManifestRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};
type RecordPermissionSummary = {
  id: string;
  workspaceId: string;
  entityType: RecordPermissionEntityType;
  entityId: string;
  memberId: string;
  permission: RecordPermissionLevel;
  department: string | null;
  expiresAt: string | null;
};
type RecordPermissionManifestResult = {
  persistence: RecordPermissionPersistence;
  permissions: RecordPermissionSummary[];
  rowCount: number;
  truncated: boolean;
};
type RecordPermissionHistoryEntityType = "project" | "task" | "document";
type RecordPermissionHistoryRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};
type RecordPermissionHistoryPersistence = "dry_run_memoryless" | "d1_audit_events" | "d1_unavailable_dry_run";
type RecordPermissionHistoryRow = {
  id: string;
  actor_member_id: string | null;
  action: string;
  metadata_json: string;
  created_at: string;
};
type RecordPermissionHistoryEntry = {
  id: string;
  action: "record_permission.assigned" | "record_permission.revoked";
  actorMemberId: string | null;
  memberId: string;
  permission: RecordPermissionLevel;
  department: string | null;
  expiresAt: string | null;
  createdAt: string;
};
type RecordPermissionHistoryResult = {
  persistence: RecordPermissionHistoryPersistence;
  entries: RecordPermissionHistoryEntry[];
  rowCount: number;
  truncated: boolean;
};
type RecordCommentEntityType = "project" | "task" | "document";
type RecordCommentIntentRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  body?: string;
};
type RecordCommentManifestRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};
type RecordCommentPersistence = "dry_run_memoryless" | "d1_record_comment_intents" | "d1_unavailable_dry_run";
type RecordCommentManifestPolicy = "metadata_only_comment_intent_manifest";
type RecordCommentRow = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  author_member_id: string | null;
  body_preview: string;
  body_sha256: string;
  created_at: string;
};
type RecordCommentSummary = {
  id: string;
  workspaceId: string;
  entityType: RecordCommentEntityType;
  entityId: string;
  authorMemberId: string | null;
  bodyPreview: string;
  bodySha256: string;
  createdAt: string;
};
type RecordCommentManifestResult = {
  persistence: RecordCommentPersistence;
  comments: RecordCommentSummary[];
  rowCount: number;
  truncated: boolean;
};
type RecordMutationKind = "update" | "delete";
type RecordMutationPreflightRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  mutation?: string;
};
type RecordMutationPreflightPersistence = "dry_run_memoryless" | "d1_record_mutation_authorization" | "d1_unavailable_dry_run";
type RecordMutationAllowedBy = "owner_producer" | "record_owner" | "write_permission" | "dry_run_memoryless";
type RecordMutationRequestPersistence = "dry_run_memoryless" | "d1_record_mutation_requests" | "d1_unavailable_dry_run";
type RecordMutationRequestPolicy = "record_mutation_request_metadata_only";
type RecordMutationRequestStatus =
  | "pending_owner_producer_review"
  | "approved_pending_apply"
  | "rejected"
  | "applied"
  | "stale_record_blocked";
type RecordMutationResolutionDecision = "approve" | "reject";
type RecordMutationPreflightSummary = {
  workspaceId: string;
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  mutation: RecordMutationKind;
  allowedBy: RecordMutationAllowedBy;
};
type RecordMutationRequestCreateRequest = RecordMutationPreflightRequest & {
  summary?: string;
  fieldKeys?: unknown[];
};
type RecordMutationRequestManifestRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};
type RecordMutationRequestResolveRequest = {
  workspaceId?: string;
  requestId?: string;
  decision?: string;
  note?: string;
};
type RecordMutationRequestApplyRequest = {
  workspaceId?: string;
  requestId?: string;
  confirmation?: string;
  updates?: unknown;
};
type RecordMutationRollbackRequestCreateRequest = {
  workspaceId?: string;
  requestId?: string;
  summary?: string;
};
type RecordMutationDeleteRecoveryPlanRequest = {
  workspaceId?: string;
  requestId?: string;
};
type RecordMutationDiffPreviewRequest = {
  workspaceId?: string;
  requestId?: string;
  updates?: unknown;
};
type RecordMutationAuditManifestRequest = {
  workspaceId?: string;
  requestId?: string;
  limit?: number;
};
type FilmProfileMutationPreflightRequest = {
  workspaceId?: string;
  projectId?: string;
  fieldKeys?: unknown[];
};
type FilmProfileMutationPreflightPersistence = "dry_run_memoryless" | "d1_film_profile_stale_check" | "d1_unavailable_dry_run";
type FilmProfileMutationRequestPersistence = "dry_run_memoryless" | "d1_film_profile_mutation_requests" | "d1_unavailable_dry_run";
type FilmProfileMutationSnapshot = {
  projectId: string;
  projectTitle: string;
  runtimeMinutes: number | null;
  format: string | null;
  shootStart: string | null;
  shootEnd: string | null;
  budgetCents: number;
  spentCents: number;
  expectedUpdatedAt: string | null;
};
type FilmProfileMutationRequestCreateRequest = {
  workspaceId?: string;
  projectId?: string;
  summary?: string;
  fieldKeys?: unknown[];
};
type FilmProfileMutationRequestManifestRequest = {
  workspaceId?: string;
  projectId?: string;
  limit?: number;
};
type FilmProfileMutationRequestResolveRequest = {
  workspaceId?: string;
  requestId?: string;
  decision?: string;
  note?: string;
};
type FilmProfileMutationDiffPreviewRequest = {
  workspaceId?: string;
  requestId?: string;
  updates?: unknown;
};
type FilmProfileMutationApplyRequest = {
  workspaceId?: string;
  requestId?: string;
  confirmation?: string;
  updates?: unknown;
};
type FilmProfileMutationRequestRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  actor_member_id: string | null;
  status: string;
  summary_preview: string;
  summary_sha256: string;
  field_keys_json: string;
  expected_updated_at: string | null;
  resolved_by_member_id: string | null;
  resolved_at: string | null;
  resolution_note_preview: string | null;
  resolution_note_sha256: string | null;
  applied_by_member_id: string | null;
  applied_at: string | null;
  application_json: string | null;
  destructive_write: number;
  created_at: string;
  updated_at: string;
};
type FilmProfileMutationRequestSummary = {
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
type FilmProfileMutationRequestManifestResult = {
  persistence: FilmProfileMutationRequestPersistence;
  requests: FilmProfileMutationRequestSummary[];
  rowCount: number;
  truncated: boolean;
};
type FilmProfileMutationDiffPreviewSummary = {
  request: FilmProfileMutationRequestSummary;
  stale: boolean;
  currentUpdatedAt: string | null;
  expectedUpdatedAt: string | null;
  fieldDiffs: RecordMutationFieldDiff[];
  rollbackGuidance: RecordMutationRollbackGuidance;
};
type RecordMutationRequestRow = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  mutation: string;
  actor_member_id: string | null;
  allowed_by: string;
  status: string;
  summary_preview: string;
  summary_sha256: string;
  field_keys_json: string;
  expected_updated_at: string | null;
  resolved_by_member_id: string | null;
  resolved_at: string | null;
  resolution_note_preview: string | null;
  resolution_note_sha256: string | null;
  applied_by_member_id: string | null;
  applied_at: string | null;
  application_json: string | null;
  destructive_write: number;
  created_at: string;
  updated_at: string;
};
type RecordMutationRequestSummary = {
  id: string;
  workspaceId: string;
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  mutation: RecordMutationKind;
  actorMemberId: string | null;
  allowedBy: RecordMutationAllowedBy;
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
type RecordMutationRequestManifestResult = {
  persistence: RecordMutationRequestPersistence;
  requests: RecordMutationRequestSummary[];
  rowCount: number;
  truncated: boolean;
};
type CoreRecordMutationSnapshot = {
  workspaceId: string;
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  updatedAt: string | null;
};
type RecordMutationFieldUpdate = {
  key: string;
  column: string;
  value: string | number | null;
};
type RecordMutationFieldValue = string | number | boolean | null;
type RecordMutationFieldDiff = {
  key: string;
  before: RecordMutationFieldValue;
  after: RecordMutationFieldValue;
  changed: boolean;
};
type RecordMutationRollbackGuidance = {
  strategy: "apply_inverse_update_request" | "restore_from_backup_or_recreate";
  fieldKeys: string[];
  requiresApproval: true;
  requiresFreshRecord: boolean;
  notes: string[];
};
type RecordMutationApplicationSummary = {
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
type RecordMutationDiffPreviewSummary = {
  request: RecordMutationRequestSummary;
  stale: boolean;
  currentUpdatedAt: string | null;
  expectedUpdatedAt: string | null;
  fieldDiffs: RecordMutationFieldDiff[];
  rollbackGuidance: RecordMutationRollbackGuidance;
};
type RecordMutationRollbackRequestSummary = {
  sourceRequest: RecordMutationRequestSummary;
  rollbackRequest: RecordMutationRequestSummary;
  suggestedUpdates: Record<string, RecordMutationFieldValue>;
};
type RecordMutationDeleteRecoveryPlan = {
  strategy: "restore_from_backup_or_recreate";
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  deletedAt: string | null;
  requiresBackupRestore: true;
  requiresNewRecordApproval: true;
  blockers: string[];
  suggestedSteps: string[];
};
type RecordMutationAuditManifestEntry = AuditEventManifestEntry;
type RecordMutationAuditManifestResult = {
  persistence: AuditEventManifestPersistence;
  request: RecordMutationRequestSummary | null;
  events: RecordMutationAuditManifestEntry[];
  rowCount: number;
  truncated: boolean;
  rollbackGuidance: RecordMutationRollbackGuidance;
};
type CoreRecordOwnerEntityType = "project" | "document" | "task" | "person" | "equipment" | "expense";
type RecordOwnerTransferRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  memberId?: string;
};
type RecordOwnerManifestRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
};
type RecordOwnerHistoryRequest = {
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};
type RecordOwnerPersistence = "dry_run_memoryless" | "d1_record_owner" | "d1_unavailable_dry_run";
type CoreRecordOwnerRow = {
  id: string;
  workspace_id: string;
  owner_member_id: string | null;
};
type RecordOwnerSummary = {
  workspaceId: string;
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  ownerMemberId: string;
  previousOwnerMemberId: string | null;
};
type RecordOwnerManifestEntry = {
  workspaceId: string;
  entityType: CoreRecordOwnerEntityType;
  entityId: string;
  ownerMemberId: string | null;
};
type RecordOwnerHistoryPersistence = "dry_run_memoryless" | "d1_audit_events" | "d1_unavailable_dry_run";
type RecordOwnerHistoryRow = {
  id: string;
  actor_member_id: string | null;
  metadata_json: string;
  created_at: string;
};
type RecordOwnerHistoryEntry = {
  id: string;
  actorMemberId: string | null;
  ownerMemberId: string;
  previousOwnerMemberId: string | null;
  createdAt: string;
};
type RecordOwnerHistoryResult = {
  persistence: RecordOwnerHistoryPersistence;
  entries: RecordOwnerHistoryEntry[];
  rowCount: number;
  truncated: boolean;
};
type NotionDryRunImportRequest = {
  files?: NotionExportFile[];
};
type NotionCoreImportRequest = {
  workspaceId?: string;
  projectId?: string;
  records?: unknown[];
};
type NotionPlanningImportPersistence =
  | "dry_run_memoryless"
  | "d1_planning_import"
  | "d1_unavailable_import_blocked";
type NotionPlanningRecordKind =
  | "location"
  | "opportunity"
  | "meeting_note"
  | "equipment_request"
  | "show"
  | "merch"
  | "media"
  | "role";
type NotionPlanningImportRecord = {
  kind: NotionPlanningRecordKind;
  title: string;
  sourcePath: string;
  projectTitle: string | null;
  projectTitles: string[];
  fields: Record<string, string>;
};
type NotionPlanningImportRequest = {
  workspaceId?: string;
  records?: unknown[];
};
type NotionPlanningImportAcceptance = {
  id: string;
  kind: NotionPlanningRecordKind;
  title: string;
};
type NotionPlanningImportTableSummary = {
  kind: NotionPlanningRecordKind;
  tableName: string;
  acceptedCount: number;
  committedCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  rejectedCount: number;
};
type NotionPlanningUpdatePreview = {
  id: string;
  kind: NotionPlanningRecordKind;
  tableName: string;
  title: string;
  fieldChangeCount: number;
  fieldChanges: Array<{
    field: string;
    currentValue: string;
    incomingValue: string;
  }>;
};
type NotionPlanningImportResult = {
  persistence: NotionPlanningImportPersistence;
  auditPersistence: AuditPersistence;
  destructiveWrite: boolean;
  accepted: NotionPlanningImportAcceptance[];
  rejected: Array<{ index: number; reason: string }>;
  committed: string[];
  idempotent: string[];
  updatePreview: string[];
  updatePreviewDetails: NotionPlanningUpdatePreview[];
  tableSummary: NotionPlanningImportTableSummary[];
  error?: "planning_import_storage_required" | "planning_import_storage_unavailable" | "planning_import_batch_too_large";
  errorStatus?: 422 | 503;
};
type NotionPlanningExistingRow = Record<string, string | number | null>;
type PlanningExportPersistence = "dry_run_memoryless" | "d1_planning_export" | "d1_unavailable_dry_run";
type PlanningExportDryRunRequest = {
  workspaceId?: string;
  limit?: number;
};
type BackupExportManifestRequest = {
  workspaceId?: string;
  limit?: number;
};
type PlanningExportRecord = {
  kind: NotionPlanningRecordKind;
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  sourcePath?: string;
  fields: Record<string, string | number | boolean | null | string[]>;
  createdAt?: string | null;
  updatedAt?: string | null;
};
type PlanningExportResult = {
  policy: "d1_planning_rows";
  persistence: PlanningExportPersistence;
  exportedAt: string;
  rowCount: number;
  truncated: boolean;
  records: PlanningExportRecord[];
};
type RestorePlanningDryRunRequest = {
  workspaceId?: string;
  snapshotWorkspaceId?: string;
  backupCreatedAt?: string;
  records?: unknown[];
};
type RestorePlanningCommitRequest = RestoreApplicationDryRunRequest & {
  applicationPreflightId?: string;
  planningPreviewId?: string;
  records?: unknown[];
};
type RestorePlanningDryRunPersistence = "dry_run_memoryless" | "d1_planning_restore_preview" | "d1_unavailable_dry_run";
type RestorePlanningDryRunRecord = PlanningExportRecord;
type RestorePlanningTableSummary = {
  kind: NotionPlanningRecordKind;
  tableName: string;
  acceptedCount: number;
  createPreviewCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  rejectedCount: number;
};
type RestorePlanningPreviewDetail = {
  id: string;
  kind: NotionPlanningRecordKind;
  tableName: string;
  title: string;
  fieldChangeCount: number;
  fieldChanges: Array<{
    field: string;
    currentValue: string;
    incomingValue: string;
  }>;
};
type RestorePlanningDryRunResult = {
  persistence: RestorePlanningDryRunPersistence;
  accepted: Array<{ id: string; kind: NotionPlanningRecordKind; title: string }>;
  rejected: Array<{ index: number; reason: string }>;
  createPreview: string[];
  idempotent: string[];
  updatePreview: string[];
  updatePreviewDetails: RestorePlanningPreviewDetail[];
  tableSummary: RestorePlanningTableSummary[];
};
type RestorePlanningCommitResult = {
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
type PlanningExportSourceRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  location_type?: string | null;
  opportunity_type?: string | null;
  due_at?: string | null;
  website_url?: string | null;
  tags_json?: string | null;
  meeting_type?: string | null;
  meeting_at?: string | null;
  participants_json?: string | null;
  status?: string | null;
  checkout_start?: string | null;
  checkout_end?: string | null;
  show_type?: string | null;
  channels_json?: string | null;
  category?: string | null;
  quantity_on_hand?: number | null;
  media_type?: string | null;
  url?: string | null;
  department?: string | null;
};
type RestoreCommitDryRunRequest = {
  workspaceId?: string;
  snapshotWorkspaceId?: string;
  backupCreatedAt?: string;
  preRestoreBackupId?: string;
  confirmation?: string;
  preview?: RestoreCommitPreviewRequest;
};
type RestoreApprovalDryRunRequest = RestoreCommitDryRunRequest;
type RestoreCommitStorageDryRunRequest = RestoreCommitDryRunRequest & {
  approvalId?: string;
};
type RestoreApplicationDryRunRequest = RestoreCommitStorageDryRunRequest & {
  commitAttemptId?: string;
  applicationTablePlan?: RestoreApplicationTablePlanRequest[];
};
type RestoreApplicationCommitRequest = RestoreApplicationDryRunRequest & {
  applicationPreflightId?: string;
  records?: RestoreCoreRecordRequest[];
};
type RestoreAttachmentPackageDryRunRequest = {
  workspaceId?: string;
  snapshotWorkspaceId?: string;
  backupCreatedAt?: string;
  attachmentPackagePlan?: RestoreAttachmentPackagePlanRequest;
};
type RestoreAttachmentPackageVerificationDryRunRequest = RestoreAttachmentPackageDryRunRequest & {
  attachmentPackagePreflightId?: string;
  packageSha256?: string;
  manifestSha256?: string;
  packageManifest?: RestoreAttachmentPackageManifestRequest;
};
type RestoreAttachmentObjectPlanDryRunRequest = {
  workspaceId?: string;
  attachmentPackageVerificationId?: string;
  packageSha256?: string;
  manifestSha256?: string;
  packageManifest?: RestoreAttachmentPackageManifestRequest;
};
type RestoreAttachmentObjectCommitPreflightRequest = RestoreAttachmentObjectPlanDryRunRequest & {
  attachmentObjectPlanId?: string;
  confirmation?: string;
};
type RestoreCommitPreviewRequest = {
  incomingRecordCount?: number;
  changedRecordCount?: number;
  newRecordCount?: number;
  fieldConflictCount?: number;
  warnings?: string[];
};
type RestoreCommitPreview = {
  incomingRecordCount: number;
  changedRecordCount: number;
  newRecordCount: number;
  fieldConflictCount: number;
  warnings: string[];
};
type RestoreApplicationTablePlanRequest = {
  tableName?: string;
  source?: string;
  entityType?: string;
  operationCount?: number;
  createCount?: number;
  updateCount?: number;
  skipCount?: number;
  previewOnlyCount?: number;
  fieldConflictCount?: number;
  restoreSupport?: string;
  blockers?: string[];
};
type RestoreApplicationTablePlan = {
  tableName: string;
  source: "workspace_snapshot" | "d1_planning_export";
  entityType: "workspace" | "project" | "task" | "document" | "person" | "equipment" | "expense" | "planning";
  operationCount: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  previewOnlyCount: number;
  fieldConflictCount: number;
  restoreSupport: "blocked" | "preview_only" | "commit_supported";
  blockers: string[];
};
type RestoreCoreRecordRequest = {
  entityType?: string;
  entityId?: string;
  action?: string;
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
type RestoreCoreRecord = {
  entityType: "workspace" | "project" | "task" | "document" | "person" | "equipment" | "expense";
  entityId: string;
  action: "create" | "update" | "skip";
  projectId: string | null;
  title: string;
  phase: string | null;
  status: string | null;
  statusTone: string | null;
  priority: string | null;
  dueAt: string | null;
  documentType: string | null;
  markdownSnapshot: string | null;
  sensitive: boolean;
  archivedProjectCount: number | null;
  backupPolicy: string | null;
  nextBackup: string | null;
  role: string | null;
  initials: string | null;
  spent: number | null;
  budget: number | null;
  percent: number | null;
};
type RestoreAttachmentPackagePlanRequest = {
  policy?: string;
  packageRequired?: boolean;
  byteRestoreSupport?: string;
  metadataRecordCount?: number;
  stagedLocalRecordCount?: number;
  r2DryRunRecordCount?: number;
  storedR2RecordCount?: number;
  totalSourceBytes?: number;
  blockers?: string[];
};
type RestoreAttachmentPackagePlan = {
  policy: "metadata_only" | "not_included";
  packageRequired: boolean;
  byteRestoreSupport: "blocked" | "not_included";
  metadataRecordCount: number;
  stagedLocalRecordCount: number;
  r2DryRunRecordCount: number;
  storedR2RecordCount: number;
  totalSourceBytes: number;
  blockers: string[];
};
type RestoreAttachmentPackageManifestRequest = {
  format?: string;
  version?: number;
  workspaceId?: string;
  createdAt?: string;
  objectCount?: number;
  totalSourceBytes?: number;
  objects?: RestoreAttachmentPackageManifestObjectRequest[];
};
type RestoreAttachmentPackageManifestObjectRequest = {
  path?: string;
  docId?: string;
  objectKey?: string;
  name?: string;
  sourcePath?: string | null;
  sizeBytes?: number;
  contentType?: string | null;
  sha256?: string;
  committedAt?: string | null;
};
type RestoreAttachmentPackageManifest = {
  format: "film.attachment-package";
  version: 1;
  workspaceId: string;
  createdAt: string | null;
  objectCount: number;
  totalSourceBytes: number;
  objects: RestoreAttachmentPackageManifestObject[];
};
type RestoreAttachmentPackageManifestObject = {
  path: string;
  docId: string;
  objectKey: string;
  name: string;
  sourcePath: string | null;
  sizeBytes: number;
  contentType: string | null;
  sha256: string;
  committedAt: string | null;
};
type PreRestoreBackupProof = {
  restorePointId: string | null;
  verified: boolean;
  persistence: PreRestoreBackupPersistence;
  blocker: string | null;
};
type RestoreApprovalRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  pre_restore_backup_id: string | null;
  preview_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreApprovalPersistence = "dry_run_memoryless" | "d1_restore_approvals" | "d1_unavailable_dry_run";
type RestoreCommitAttemptPersistence = "dry_run_memoryless" | "d1_restore_commit_attempts" | "d1_unavailable_dry_run";
type RestoreCommitAttemptRow = {
  id: string;
  workspace_id: string;
  approval_id: string;
  actor_member_id: string | null;
  pre_restore_backup_id: string | null;
  preview_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreApplicationPreflightPersistence =
  | "dry_run_memoryless"
  | "d1_restore_application_preflights"
  | "d1_unavailable_dry_run";
type RestoreApplicationPreflightRow = {
  id: string;
  workspace_id: string;
  approval_id: string;
  commit_attempt_id: string;
  actor_member_id: string | null;
  pre_restore_backup_id: string | null;
  preview_json: string;
  rollback_guidance_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreProofIdentity = {
  workspaceId: string;
  snapshotWorkspaceId: string;
  backupCreatedAt: string;
  preRestoreBackupId: string;
  preview: RestoreCommitPreview;
};
type RestoreApprovalProof =
  | { ok: true; preRestoreBackup: PreRestoreBackupProof; approval: RestoreApprovalRow }
  | { ok: false; response: Response };
type RestoreCommitAttemptProof =
  | { ok: true; commitAttempt: RestoreCommitAttemptRow }
  | { ok: false; response: Response };
type RestoreApplicationPreflightProof =
  | { ok: true; applicationPreflight: RestoreApplicationPreflightRow }
  | { ok: false; response: Response };
type RestorePlanningPreviewPersistence =
  | "dry_run_memoryless"
  | "d1_restore_planning_previews"
  | "d1_unavailable_dry_run";
type RestorePlanningPreviewRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  persistence: string;
  accepted_count: number;
  create_preview_count: number;
  idempotent_count: number;
  update_preview_count: number;
  rejected_count: number;
  table_summary_json: string;
  update_preview_json: string;
  rejected_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreAttachmentPackagePreflightPersistence =
  | "dry_run_memoryless"
  | "d1_restore_attachment_package_preflights"
  | "d1_unavailable_dry_run";
type RestoreAttachmentPackageVerificationPersistence =
  | "dry_run_memoryless"
  | "d1_restore_attachment_package_verifications"
  | "d1_unavailable_dry_run";
type RestoreAttachmentObjectPlanPersistence =
  | "dry_run_memoryless"
  | "d1_restore_attachment_object_plans"
  | "d1_unavailable_dry_run";
type RestoreAttachmentObjectCommitPreflightPersistence =
  | "d1_restore_attachment_object_commit_preflights"
  | "d1_unavailable_dry_run";
type RestoreAttachmentObjectCommitPersistence =
  | "r2_restore_attachment_object"
  | "r2_restore_compensation_pending"
  | "d1_restore_attachment_object_commits"
  | "d1_unavailable_restore_blocked";
type RestoreAttachmentObjectCommitPreflightStatus =
  | "ready_for_attachment_byte_commit"
  | "blocked_by_missing_attachment_bucket"
  | "blocked_by_existing_attachment_destination"
  | "blocked_by_attachment_destination_check";
type RestoreAttachmentPackagePreflightRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  metadata_record_count: number;
  staged_local_count: number;
  r2_dry_run_count: number;
  stored_r2_count: number;
  total_source_bytes: number;
  package_plan_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreAttachmentPackageVerificationRow = {
  id: string;
  workspace_id: string;
  attachment_package_preflight_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  metadata_record_count: number;
  total_source_bytes: number;
  package_object_count: number;
  package_total_source_bytes: number;
  package_sha256: string;
  manifest_sha256: string;
  package_manifest_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreAttachmentObjectPlanRow = {
  id: string;
  workspace_id: string;
  attachment_package_verification_id: string;
  actor_member_id: string | null;
  object_count: number;
  total_source_bytes: number;
  blocked_destination_count: number;
  plan_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreAttachmentObjectPlan = {
  objectCount: number;
  totalSourceBytes: number;
  blockedDestinationCount: number;
  destinationPolicy: "workspace_scoped_deterministic_object_keys";
  overwritePolicy: "blocked_until_explicit_overwrite_rules";
  byteSourcePolicy: "verified_package_manifest_only";
  sourceVerificationStatus: "metadata_hash_verified_without_bytes";
  objects: RestoreAttachmentObjectPlanItem[];
};
type RestoreAttachmentObjectPlanItem = {
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
};
type RestoreAttachmentObjectCommitPreflight = {
  objectCount: number;
  totalSourceBytes: number;
  readyDestinationCount: number;
  blockedDestinationCount: number;
  destinationPolicy: "workspace_scoped_new_object_keys_only";
  overwritePolicy: "overwrite_blocked_existing_destinations";
  byteSourcePolicy: "package_object_bytes_required_at_commit";
  sourceVerificationStatus: "metadata_hash_verified_without_bytes";
  objects: RestoreAttachmentObjectCommitPreflightItem[];
  blockers: string[];
};
type RestoreAttachmentObjectCommitPreflightItem = {
  docId: string;
  name: string;
  sourceObjectKey: string;
  destinationObjectKey: string;
  sizeBytes: number;
  sha256: string;
  destinationStatus:
    | "destination_absent"
    | "destination_exists"
    | "r2_binding_missing"
    | "destination_check_failed";
  overwriteStatus:
    | "new_object_allowed"
    | "overwrite_blocked_existing_destination"
    | "overwrite_unknown_without_r2"
    | "overwrite_check_failed";
  byteSourceStatus: "requires_package_object_bytes_at_commit";
  sourceVerificationStatus: "sha256_declared_in_verified_manifest";
  action:
    | "ready_for_explicit_byte_commit"
    | "blocked_existing_destination"
    | "blocked_missing_r2_binding"
    | "blocked_destination_check";
  existingR2Object: boolean | null;
  existingStoredRecord: boolean;
  blocker: string | null;
};
type RestoreAttachmentObjectCommitPreflightRow = {
  id: string;
  workspace_id: string;
  attachment_package_verification_id: string;
  attachment_object_plan_id: string;
  actor_member_id: string | null;
  object_count: number;
  total_source_bytes: number;
  ready_destination_count: number;
  blocked_destination_count: number;
  package_sha256: string;
  manifest_sha256: string;
  preflight_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type RestoreAttachmentObjectCommitRow = {
  id: string;
  workspace_id: string;
  attachment_package_verification_id: string;
  attachment_object_plan_id: string;
  attachment_object_commit_preflight_id: string;
  actor_member_id: string | null;
  doc_id: string;
  source_object_key: string;
  destination_object_key: string;
  size_bytes: number;
  content_type: string;
  sha256: string;
  package_sha256: string;
  manifest_sha256: string;
  status: string;
  destructive_write: number;
  created_at: string;
};
type AttachmentStorageDryRunRequest = {
  workspaceId?: string;
  attachments?: AttachmentStorageCandidate[];
};
type AttachmentExportManifestRequest = {
  workspaceId?: string;
  limit?: number;
  offset?: number;
};
type AttachmentPackageDryRunRequest = AttachmentExportManifestRequest & {
  objectKeys?: string[];
};
type AttachmentPackageDownloadRequest = AttachmentExportManifestRequest & {
  objectKeys?: string[];
  packagePlanId?: string;
  packageToken?: string;
};
type AttachmentUploadPrepareRequest = AttachmentStorageDryRunRequest;
type AttachmentUploadCommitRequest = {
  workspaceId?: string;
  commits?: AttachmentUploadCommit[];
};
type AttachmentStorageCandidate = {
  docId?: string;
  name?: string;
  sourcePath?: string;
  sizeBytes?: number;
  contentType?: string;
  sha256?: string;
  storageKey?: string;
  bytes?: unknown;
  blob?: unknown;
  payload?: unknown;
};
type AttachmentUploadCommit = {
  docId?: string;
  objectKey?: string;
  sizeBytes?: number;
  sha256?: string;
  commitToken?: string;
  bytes?: unknown;
  blob?: unknown;
  payload?: unknown;
};
type AttachmentPersistence = "dry_run_memoryless" | "d1_attachment_intents" | "d1_unavailable_dry_run";
type AttachmentPackagePlanPersistence = "not_created" | "d1_attachment_package_plans" | "d1_unavailable_dry_run";
type AttachmentUploadIntent = {
  docId?: string;
  objectKey: string;
  sizeBytes?: number;
  contentType: string;
  uploadMethod: "PUT";
  uploadUrl: null;
  signedUrlStatus: "not_configured";
  expiresAt: string;
  requiredHeaders: Record<string, string>;
  commitToken: string;
  idempotencyKey: string;
};
type AttachmentCommitAcceptance = {
  docId?: string;
  objectKey?: string;
  status: "r2_dry_run";
  committedAt: string;
  idempotencyKey?: string;
  idempotent: boolean;
};
type AttachmentObjectStorePersistence =
  | "r2_attachment_object"
  | "r2_attachment_metadata_pending"
  | "d1_attachment_intents"
  | "d1_unavailable_dry_run"
  | "r2_unavailable_dry_run";
type AttachmentObjectStoreAcceptance = {
  docId?: string;
  objectKey?: string;
  status: "stored_r2";
  committedAt: string;
  idempotencyKey?: string;
  idempotent: boolean;
  sizeBytes: number;
};
type AttachmentObjectStoreResult =
  | {
    accepted: AttachmentObjectStoreAcceptance;
    persistence: AttachmentObjectStorePersistence;
  }
  | {
    rejected: { docId: string; reason: string };
    persistence: AttachmentObjectStorePersistence;
    status: number;
  };
type AttachmentCommitPersistenceResult =
  | {
    accepted: AttachmentCommitAcceptance;
    persistence: AttachmentPersistence;
  }
  | {
    rejected: { docId: string; reason: string };
    persistence: AttachmentPersistence;
  };
type AttachmentUploadIntentRow = {
  id: string;
  content_type?: string;
  status: string;
  expires_at: string;
  committed_at: string | null;
};
type StoredAttachmentObjectRow = {
  id: string;
  workspace_id: string;
  doc_id: string;
  object_key: string;
  name: string;
  source_path: string | null;
  size_bytes: number;
  content_type: string;
  sha256: string;
  status: string;
  committed_at: string | null;
  updated_at: string;
};
type RestoreAttachmentReservationRow = StoredAttachmentObjectRow & {
  storage_key: string | null;
  commit_token_hash: string;
  prepared_at: string;
  expires_at: string;
};
type RestoreAttachmentReservationIdentity = {
  intentId: string;
  commitId: string;
  commitTokenHash: string;
  storageKey: string;
};
type AttachmentPackagePlanRow = {
  id: string;
  workspace_id: string;
  object_keys_json: string;
  object_count: number;
  total_size_bytes: number;
  package_token_hash: string;
  expires_at: string;
};

const securityHeaders = {
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

const defaultAllowedOrigins = [
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

const MAGIC_LINK_TTL_SECONDS = 15 * 60;
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const RESTORE_PREVIEW_MAX_RECORDS = 100_000;
const RESTORE_TABLE_PLAN_MAX_ROWS = 20;
const RESTORE_TABLE_PLAN_MAX_BLOCKERS = 3;
const RESTORE_CORE_RECORD_MAX_RECORDS = 150;
const RESTORE_CORE_MARKDOWN_MAX_CHARS = 1_000_000;
const RESTORE_CORE_BATCH_MAX_STATEMENTS = 700;
const RESTORE_PLANNING_COMMIT_MAX_RECORDS = 150;
const RESTORE_PLANNING_BATCH_MAX_STATEMENTS = 700;
const NOTION_PLANNING_COMMIT_MAX_RECORDS = 200;
const NOTION_PLANNING_BATCH_MAX_STATEMENTS = 700;
const OPERATION_REPLAY_BATCH_MAX_STATEMENTS = 700;
const WORKSPACE_SNAPSHOT_MEMBER_LIMIT = 200;
const WORKSPACE_SNAPSHOT_PROJECT_LIMIT = 100;
const WORKSPACE_SNAPSHOT_PROFILE_LIMIT = 100;
const WORKSPACE_SNAPSHOT_TASK_LIMIT = 1_000;
const WORKSPACE_SNAPSHOT_DOCUMENT_LIMIT = 100;
const WORKSPACE_SNAPSHOT_PERSON_LIMIT = 500;
const WORKSPACE_SNAPSHOT_PROJECT_PERSON_LIMIT = 1_000;
const WORKSPACE_SNAPSHOT_EQUIPMENT_LIMIT = 500;
const WORKSPACE_SNAPSHOT_EXPENSE_LIMIT = 500;
const WORKSPACE_SNAPSHOT_RESTORE_POINT_LIMIT = 5;
const WORKSPACE_SNAPSHOT_MARKDOWN_MAX_CHARS = 64 * 1024;
const DOCUMENT_MARKDOWN_REQUEST_MAX_BYTES = 256 * 1024;
const DOCUMENT_MARKDOWN_MAX_BYTES = 64 * 1024;
const DOCUMENT_MARKDOWN_MAX_CHARS = 64 * 1024;
const NOTION_IMPORT_MANIFEST_MAX_FILES = 2_000;
const NOTION_IMPORT_MANIFEST_MAX_BYTES = 512 * 1024 * 1024;
const NOTION_IMPORT_PATH_MAX_CHARS = 1_024;
const NOTION_IMPORT_CONTENT_TYPE_MAX_CHARS = 255;
const BACKUP_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const BACKUP_OBJECT_DOWNLOAD_TOKEN_TTL_SECONDS = 15 * 60;
const RESEND_WEBHOOK_MAX_BYTES = 64 * 1024;
const RESEND_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
const ATTACHMENT_PACKAGE_MAX_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_PACKAGE_TOKEN_TTL_SECONDS = 15 * 60;
const ATTACHMENT_PACKAGE_RANGE_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_OBJECT_RANGE_MAX_BYTES = 5 * 1024 * 1024;
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const RATE_LIMIT_PREFIX = "rl";
const RATE_LIMIT_OVERRIDE_MAX_LIMIT = 1000;
const RATE_LIMIT_OVERRIDE_MIN_WINDOW_SECONDS = 10;
const RATE_LIMIT_OVERRIDE_MAX_WINDOW_SECONDS = 60 * 60;
const ALL_AUTHENTICATED_ROLES: AuthRole[] = ["owner", "producer", "director", "department_lead", "contributor", "reviewer"];
const OPERATOR_ROLES: AuthRole[] = ["owner", "producer", "director"];
const OWNER_PRODUCER_ROLES: AuthRole[] = ["owner", "producer"];
const NOTION_PLANNING_TABLES: Record<NotionPlanningRecordKind, string> = {
  location: "locations",
  opportunity: "opportunities",
  meeting_note: "meeting_notes",
  equipment_request: "equipment_requests",
  show: "shows",
  merch: "merch_items",
  media: "media_items",
  role: "production_roles",
};
const OPERATION_REPLAY_ROLES: Record<OperationRecord["kind"], AuthRole[]> = {
  "workspace.seeded": ["owner"],
  "project.created": OPERATOR_ROLES,
  "task.created": ["owner", "producer", "director", "department_lead", "contributor"],
  "task.updated": ["owner", "producer", "director", "department_lead", "contributor"],
  "task.completed": ["owner", "producer", "director", "department_lead", "contributor"],
  "document.created": ["owner", "producer", "director", "department_lead", "contributor"],
  "document.updated": ["owner", "producer", "director", "department_lead", "contributor"],
  "person.created": OPERATOR_ROLES,
  "equipment.created": ["owner", "producer", "director", "department_lead", "contributor"],
  "expense.created": OWNER_PRODUCER_ROLES,
  "backup.exported": OWNER_PRODUCER_ROLES,
  "restore.dry_run": OWNER_PRODUCER_ROLES,
  "import.notion_applied": OPERATOR_ROLES,
};
const RECORD_AUTHORIZATION_POLICY = "canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available";

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    return withResponseHeaders(await routeRequest(request, env), request, env);
  },
  async scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    const retentionDays = parseSmsRetentionDays(env.SMS_DELIVERY_RETENTION_DAYS?.trim() ?? "");
    if (!env.DB || retentionDays === null) return;
    context.waitUntil(applySmsRetention(env.DB, retentionDays));
  },
};

export default worker;

async function routeRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const url = new URL(request.url);
  const rateLimit = await requireMutationRateLimit(request, env, url);
  if (!rateLimit.ok) {
    return rateLimitError(rateLimit);
  }

  if (url.pathname === "/health" && request.method === "GET") {
    const authMode = isLiveMagicLinkDelivery(env) ? "live_member_only" : "dry_run";
    const inviteDeliveryMode = env.INVITE_DELIVERY_MODE?.trim().toLowerCase() === "live" ? "live" : "dry_run";
    const stripeSummaryMode = env.STRIPE_SUMMARY_MODE?.trim().toLowerCase() === "live" ? "live_summary_only" : "dry_run";
    return json({
      ok: true,
      service: "film-worker",
      mode: authMode === "live_member_only" ? "production" : "dry-run",
      authMode,
      inviteDeliveryMode,
      stripeSummaryMode,
    });
  }

  if (url.pathname === "/api/webhooks/meta/data-deletion" && request.method === "POST") {
    const appSecret = env.META_OAUTH_CLIENT_SECRET?.trim() ?? "";
    if (!appSecret || !env.DB) return json({ error: "not_found" }, 404);
    const signedRequest = await readMetaCallbackSignedRequest(request);
    if (!signedRequest) return json({ error: "invalid_meta_data_deletion_request" }, 400);
    try {
      const verified = await verifyMetaSignedRequest(signedRequest, appSecret);
      const deletion = await completeMetaDataDeletion(env.DB, verified.userId, verified.requestFingerprint);
      const statusUrl = new URL("/api/providers/meta/data-deletion/status", request.url);
      statusUrl.searchParams.set("code", deletion.confirmationCode);
      return json({
        url: statusUrl.toString(),
        confirmation_code: deletion.confirmationCode,
      });
    } catch {
      return json({ error: "invalid_meta_data_deletion_request" }, 403);
    }
  }

  if (url.pathname === "/api/webhooks/meta/deauthorize" && request.method === "POST") {
    const appSecret = env.META_OAUTH_CLIENT_SECRET?.trim() ?? "";
    if (!appSecret || !env.DB) return json({ error: "not_found" }, 404);
    const signedRequest = await readMetaCallbackSignedRequest(request);
    if (!signedRequest) return json({ error: "invalid_meta_deauthorization_request" }, 400);
    try {
      const verified = await verifyMetaSignedRequest(signedRequest, appSecret);
      const deletedConnectionCount = await clearMetaConnectionsForUser(
        env.DB,
        verified.userId,
        "provider.meta_deauthorized",
      );
      return json({ ok: true, deletedConnectionCount, secretValuesExposed: false });
    } catch {
      return json({ error: "invalid_meta_deauthorization_request" }, 403);
    }
  }

  if (url.pathname === "/api/providers/meta/data-deletion/status" && request.method === "GET") {
    const confirmationCode = url.searchParams.get("code")?.trim() ?? "";
    if (!env.DB || !/^[a-f0-9]{32}$/.test(confirmationCode)) return json({ error: "not_found" }, 404);
    try {
      const row = await env.DB.prepare(`
        SELECT confirmation_code, status, deleted_connection_count, requested_at, completed_at
        FROM meta_data_deletion_requests
        WHERE confirmation_code = ?
        LIMIT 1
      `).bind(confirmationCode).first<MetaDataDeletionRequestRow>();
      if (!row) return json({ error: "not_found" }, 404);
      return json({
        provider: "meta",
        status: row.status,
        confirmationCode: row.confirmation_code,
        deletedConnectionCount: row.deleted_connection_count,
        requestedAt: row.requested_at,
        completedAt: row.completed_at,
        secretValuesExposed: false,
      });
    } catch {
      return json({ error: "not_found" }, 404);
    }
  }

  if (url.pathname === "/api/webhooks/resend/invite-delivery" && request.method === "POST") {
    const webhookSecret = env.INVITE_DELIVERY_WEBHOOK_SECRET?.trim() ?? "";
    if (!webhookSecret) {
      return json({ error: "resend_webhook_secret_required" }, 503);
    }

    const rawBody = await readBoundedText(request, RESEND_WEBHOOK_MAX_BYTES);
    if (rawBody === null) {
      return json({ error: "resend_webhook_body_too_large" }, 413);
    }
    const verification = await verifySvixSignature(
      rawBody,
      request.headers.get("svix-id"),
      request.headers.get("svix-timestamp"),
      request.headers.get("svix-signature"),
      webhookSecret,
    );
    if (!verification.ok) {
      return json({ error: verification.error }, verification.status);
    }

    const event = normalizeResendInviteDeliveryWebhookEvent(rawBody, verification.svixId);
    if (!event) {
      return json({ error: "invalid_resend_webhook_payload" }, 400);
    }

    const record = await recordInviteDeliveryWebhookEvent(env.DB, event);
    if (
      record.persistence !== "d1_invite_delivery_webhook_events"
      && (Boolean(env.DB) || env.INVITE_DELIVERY_MODE?.trim().toLowerCase() === "live")
    ) {
      return json({
        error: "resend_webhook_persistence_unavailable",
        persistence: record.persistence,
      }, 503);
    }
    return json({
      ok: true,
      webhook: "resend_invite_delivery",
      provider: "resend",
      eventType: event.eventType,
      svixId: event.svixId,
      deliveryStatus: event.deliveryStatus,
      providerMessageId: event.providerMessageId,
      persistence: record.persistence,
      duplicate: record.duplicate,
      deliveryAttemptId: record.deliveryAttemptId,
      workspaceId: record.workspaceId,
      inviteId: record.inviteId,
      attemptEventStatusUpdated: record.attemptEventStatusUpdated,
      suppressionRecorded: record.suppressionRecorded,
    });
  }

  if (url.pathname === "/api/webhooks/telnyx/messaging" && request.method === "POST") {
    if (env.TELNYX_WEBHOOK_MODE?.trim().toLowerCase() !== "live") {
      return json({ error: "not_found" }, 404);
    }
    const publicKey = env.TELNYX_WEBHOOK_PUBLIC_KEY?.trim() ?? "";
    const mappings = env.TELNYX_INBOUND_NUMBER_MAPPINGS?.trim() ?? "";
    const recipientHashKey = env.SMS_RECIPIENT_HASH_KEY?.trim() ?? "";
    if (!publicKey || !mappings || !hasValidSmsRecipientHashKey(recipientHashKey) || !env.DB) {
      return json({ error: "telnyx_webhook_configuration_required" }, 503);
    }
    const rawBody = await readBoundedText(request, TELNYX_WEBHOOK_MAX_BYTES);
    if (rawBody === null) return json({ error: "telnyx_webhook_body_too_large" }, 413);
    const verification = await verifyTelnyxWebhookSignature(
      rawBody,
      request.headers.get("telnyx-signature-ed25519"),
      request.headers.get("telnyx-timestamp"),
      publicKey,
    );
    if (!verification.ok) return json({ error: verification.error }, verification.status);
    const event = normalizeTelnyxMessagingWebhookEvent(rawBody);
    if (!event) return json({ error: "invalid_telnyx_webhook_payload" }, 400);
    const result = await applyTelnyxComplianceEvent({
      db: env.DB,
      rawBody,
      event,
      recipientHashKey,
      inboundNumberMappings: mappings,
    });
    return json({
      ok: !result.error,
      webhook: "telnyx_messaging",
      provider: "telnyx",
      persistence: result.persistence,
      duplicate: result.duplicate,
      eventType: result.eventType,
      autoresponseType: result.autoresponseType,
      recipientMatched: result.recipientMatched,
      recipientRevoked: result.recipientRevoked,
      pendingAttemptsSuppressed: result.pendingAttemptsSuppressed,
      secretValuesExposed: result.secretValuesExposed,
      ...(result.error ? { error: result.error } : {}),
    }, result.errorStatus ?? 200);
  }

    if (url.pathname === "/api/workspaces/demo" && request.method === "GET") {
      if (isLiveMagicLinkDelivery(env)) {
        return json({ error: "not_found" }, 404);
      }
      return json({ workspace: seedWorkspace, bindings: bindingStatus(env) });
    }

    if (url.pathname === "/api/workspaces/current/snapshot" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<{ workspaceId?: string }>(request);
      const requestedWorkspaceId = body.workspaceId?.trim() ?? "";
      const workspaceId = auth.workspaceId
        ?? (!isLiveMagicLinkDelivery(env) && isValidWorkspaceId(requestedWorkspaceId) ? requestedWorkspaceId : null);
      const memberId = auth.memberId ?? seedWorkspace.members[0]?.id ?? "member_owner";

      if (!workspaceId || !env.DB) {
        if (isLiveMagicLinkDelivery(env)) {
          return json({ error: "workspace_snapshot_unavailable", persistence: auth.persistence }, 503);
        }
        return json({
          ok: true,
          snapshot: seedCanonicalWorkspaceSnapshot(auth.role, auth.memberId),
        });
      }

      const snapshot = await readCanonicalWorkspaceSnapshot(
        env.DB,
        workspaceId,
        memberId,
        auth.role,
      );
      if (!snapshot) {
        if (!isLiveMagicLinkDelivery(env) && !auth.workspaceId) {
          return json({ ok: true, snapshot: seedCanonicalWorkspaceSnapshot(auth.role, auth.memberId) });
        }
        return json({ error: "workspace_snapshot_unavailable", persistence: "d1_canonical_workspace_snapshot" }, 503);
      }
      if (
        !isLiveMagicLinkDelivery(env)
        && !auth.workspaceId
        && snapshot.members.length === 0
      ) {
        return json({ ok: true, snapshot: seedCanonicalWorkspaceSnapshot(auth.role, auth.memberId) });
      }
      return json({ ok: true, snapshot });
    }

    if (url.pathname === "/api/documents/markdown" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const rawBody = await readBoundedText(request, DOCUMENT_MARKDOWN_REQUEST_MAX_BYTES);
      if (rawBody === null) return json({ error: "document_request_too_large" }, 413);
      const body = parseJsonObject<DocumentMarkdownUpdateRequest>(rawBody);
      const workspaceId = body?.workspaceId?.trim() ?? "";
      const projectId = body?.projectId?.trim() ?? "";
      const documentId = body?.documentId?.trim() ?? "";
      const markdownSnapshot = typeof body?.markdownSnapshot === "string" ? body.markdownSnapshot : "";
      const expectedUpdatedAt = body?.expectedUpdatedAt?.trim() ?? "";
      const markdownBytes = new TextEncoder().encode(markdownSnapshot).byteLength;
      if (
        !body
        || !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(projectId)
        || !isValidRecordId(documentId)
        || markdownSnapshot.length > DOCUMENT_MARKDOWN_MAX_CHARS
        || markdownBytes > DOCUMENT_MARKDOWN_MAX_BYTES
        || !expectedUpdatedAt
        || Number.isNaN(Date.parse(expectedUpdatedAt))
      ) {
        return json({ error: "invalid_document_markdown_update" }, 422);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.workspaceId || !auth.memberId) {
        if (isLiveMagicLinkDelivery(env)) {
          return json({ error: "document_storage_unavailable", persistence: auth.persistence }, 503);
        }
        return json({
          ok: true,
          dryRun: true,
          destructiveWrite: false,
          persistence: "dry_run_memoryless",
          document: {
            id: documentId,
            projectId,
            markdownLength: markdownSnapshot.length,
            markdownBytes,
            updatedAt: expectedUpdatedAt,
          },
        });
      }

      const result = await updateCanonicalDocumentMarkdown(
        env.DB,
        workspaceId,
        projectId,
        documentId,
        markdownSnapshot,
        markdownBytes,
        expectedUpdatedAt,
        auth.role,
        auth.memberId,
      );
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }
      return json({ dryRun: false, ...result });
    }

    if (url.pathname === "/api/provider-status" && request.method === "GET") {
      return json({ integrations: listProviderDryRunStatuses(), mode: "dry-run" });
    }

    const providerMatch = url.pathname.match(/^\/api\/providers\/([^/]+)\/dry-run$/);
    if (providerMatch && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const status = getProviderDryRunStatus(providerMatch[1] ?? "");
      if (!status) {
        return json({ error: "unknown_provider" }, 404);
      }
      const auditPersistence = await recordAuditEvent(
        env.DB,
        auth.workspaceId ?? seedWorkspace.id,
        null,
        auth.memberId,
        "provider.dry_run_checked",
        {
          provider: status.key,
          status: status.status,
          capabilityCount: status.capabilities.length,
          requiredScopeCount: status.requiredScopes.length,
          complianceNoteCount: status.complianceNotes.length,
          productionReadPolicy: status.productionReadPolicy?.mode ?? "not_applicable",
          liveReadAllowed: status.productionReadPolicy?.liveReadAllowed ?? false,
          blockerCount: status.productionReadPolicy?.blockers.length ?? 0,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        auditPersistence,
        provider: status,
      });
    }

    if (url.pathname === "/api/providers/runtime-readiness" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<ProviderRuntimeReadinessRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const readiness = providerRuntimeReadiness(env, workspaceId);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "provider.runtime_readiness_checked",
        {
          policy: readiness.policy,
          liveCount: readiness.liveCount,
          partialLiveCount: readiness.partialLiveCount,
          blockedCount: readiness.blockedCount,
          providerCount: readiness.providers.length,
          secretValuesExposed: false,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: auth.persistence,
        auditPersistence,
        readiness,
      });
    }

    if (url.pathname === "/api/providers/sms/provider-readiness" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<ProviderRuntimeReadinessRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const rawMappings = env.TELNYX_INBOUND_NUMBER_MAPPINGS?.trim() ?? "";
      const senderNumber = parseTelnyxOutboundNumber(rawMappings, workspaceId) ?? "";
      const retentionDays = parseSmsRetentionDays(env.SMS_DELIVERY_RETENTION_DAYS?.trim() ?? "");
      const quietHoursConfigured = isValidQuietHoursConfiguration(
        env.SMS_QUIET_HOURS_TIME_ZONE?.trim() ?? "",
        env.SMS_QUIET_HOURS_START?.trim() ?? "",
        env.SMS_QUIET_HOURS_END?.trim() ?? "",
      );
      const configured = {
        apiKey: (env.TELNYX_API_KEY?.trim().length ?? 0) >= 16,
        messagingProfile: isValidTelnyxMessagingProfileId(env.TELNYX_MESSAGING_PROFILE_ID?.trim() ?? ""),
        campaign: /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/.test(env.TELNYX_CAMPAIGN_ID?.trim() ?? ""),
        senderMapping: Boolean(parseTelnyxInboundNumberMappings(rawMappings) && senderNumber),
        webhookPublicKey: isValidTelnyxWebhookPublicKey(env.TELNYX_WEBHOOK_PUBLIC_KEY?.trim() ?? ""),
        recipientEncryptionKey: hasValidSmsRecipientEncryptionKey(env.SMS_RECIPIENT_ENCRYPTION_KEY?.trim() ?? ""),
        recipientHashKey: hasValidSmsRecipientHashKey(env.SMS_RECIPIENT_HASH_KEY?.trim() ?? ""),
        quietHours: quietHoursConfigured,
        retention: retentionDays !== null,
        d1: Boolean(env.DB),
      };
      const readiness = await checkTelnyxProviderReadiness({
        apiKey: env.TELNYX_API_KEY?.trim() ?? "",
        messagingProfileId: env.TELNYX_MESSAGING_PROFILE_ID?.trim() ?? "",
        campaignId: env.TELNYX_CAMPAIGN_ID?.trim() ?? "",
        fromNumber: senderNumber,
        expectedProfileName: "Film",
        expectedWebhookUrl: `${url.origin}/api/webhooks/telnyx/messaging`,
      });
      const localBlockers = [
        ...(!configured.webhookPublicKey ? ["The Telnyx Ed25519 webhook public key is not configured."] : []),
        ...(!configured.recipientEncryptionKey ? ["The SMS recipient encryption key is not configured."] : []),
        ...(!configured.recipientHashKey ? ["The SMS recipient HMAC key is not configured."] : []),
        ...(!configured.quietHours ? ["The SMS quiet-hours policy is not configured."] : []),
        ...(!configured.retention ? ["The SMS terminal metadata retention period is not configured."] : []),
        ...(!configured.d1 ? ["The SMS compliance database is unavailable."] : []),
      ];
      const blockers = [...new Set([...readiness.blockers, ...localBlockers])].slice(0, 16);
      const providerStatus = readiness.status === "ready_for_owned_number_smoke" && localBlockers.length > 0
        ? "blocked_configuration"
        : readiness.status;
      const activationGates = {
        webhookLive: env.TELNYX_WEBHOOK_MODE?.trim().toLowerCase() === "live",
        sendLive: env.SMS_MODE?.trim().toLowerCase() === "live",
      };
      const readyForOwnedNumberSmoke = providerStatus === "ready_for_owned_number_smoke"
        && blockers.length === 0
        && !activationGates.sendLive;
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "provider.telnyx_readiness_checked",
        {
          providerStatus,
          providerApiChecked: readiness.providerApiChecked,
          campaignActive: readiness.campaign.active,
          mnoApprovedCount: readiness.campaign.mno.approved,
          mnoReviewCount: readiness.campaign.mno.review,
          mnoRejectedCount: readiness.campaign.mno.rejected,
          numberCampaignAssigned: readiness.number.campaignAssigned,
          configurationReady: Object.values(configured).every(Boolean),
          readyForOwnedNumberSmoke,
          blockerCount: blockers.length,
          webhookLive: activationGates.webhookLive,
          sendLive: activationGates.sendLive,
          secretValuesExposed: false,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: auth.persistence,
        auditPersistence,
        readiness: {
          ...readiness,
          status: providerStatus,
          configured,
          activationGates,
          readyForOwnedNumberSmoke,
          blockers,
        },
      });
    }

    if (url.pathname === "/api/providers/sms/send" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      if (env.SMS_MODE?.trim().toLowerCase() !== "live") {
        return json({ error: "telnyx_sms_send_disabled" }, 503);
      }
      if (!env.DB || !auth.memberId) return json({ error: "sms_attempt_storage_unavailable" }, 503);

      const body = await readJson<TelnyxSmsSendRequest>(request);
      const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
      const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
      const category = typeof body.category === "string" ? body.category.trim() : "";
      const emergencyReasonCode = typeof body.emergencyReasonCode === "string"
        ? body.emergencyReasonCode.trim()
        : body.emergencyReasonCode == null ? null : "invalid";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(projectId)
        || !isTelnyxSmsCategory(category)
        || !Array.isArray(body.recipientIds)
        || typeof body.messageBody !== "string"
        || typeof body.requestKey !== "string"
        || (body.emergencyOverride !== undefined && typeof body.emergencyOverride !== "boolean")
        || (emergencyReasonCode !== null && !isEmergencyReasonCode(emergencyReasonCode))
      ) return json({ error: "invalid_telnyx_sms_send_request" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const result = await sendTelnyxSmsBatch(env.DB, {
        workspaceId,
        projectId,
        recipientIds: body.recipientIds,
        category,
        messageBody: body.messageBody,
        requestKey: body.requestKey,
        emergencyOverride: body.emergencyOverride === true,
        emergencyReasonCode,
        actorMemberId: auth.memberId,
      }, {
        apiKey: env.TELNYX_API_KEY?.trim() ?? "",
        messagingProfileId: env.TELNYX_MESSAGING_PROFILE_ID?.trim() ?? "",
        fromNumber: parseTelnyxOutboundNumber(
          env.TELNYX_INBOUND_NUMBER_MAPPINGS?.trim() ?? "",
          workspaceId,
        ) ?? "",
        recipientEncryptionKey: env.SMS_RECIPIENT_ENCRYPTION_KEY?.trim() ?? "",
        quietHoursTimeZone: env.SMS_QUIET_HOURS_TIME_ZONE?.trim() ?? "",
        quietHoursStart: env.SMS_QUIET_HOURS_START?.trim() ?? "",
        quietHoursEnd: env.SMS_QUIET_HOURS_END?.trim() ?? "",
      });
      if ("error" in result) return json({ error: result.error }, result.errorStatus);
      return json({ ok: result.status !== "blocked", provider: result }, result.status === "blocked" ? 502 : 200);
    }

    if (url.pathname === "/api/providers/sms/send-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<TelnyxSmsSendDryRunRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const category = body.category?.trim() ?? "";
      const recipientCount = body.recipientCount;
      const consentedRecipientCount = body.consentedRecipientCount;
      const estimatedSegments = body.estimatedSegments;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(projectId)
        || !isTelnyxSmsCategory(category)
        || !Number.isSafeInteger(recipientCount)
        || (recipientCount ?? -1) < 0
        || (recipientCount ?? 0) > 10_000
        || !Number.isSafeInteger(consentedRecipientCount)
        || (consentedRecipientCount ?? -1) < 0
        || (consentedRecipientCount ?? 0) > (recipientCount ?? -1)
        || !Number.isSafeInteger(estimatedSegments)
        || (estimatedSegments ?? -1) < 0
        || (estimatedSegments ?? 0) > 100_000
        || (body.emergencyOverride !== undefined && typeof body.emergencyOverride !== "boolean")
        || body.recipients !== undefined
        || body.messageBody !== undefined
      ) {
        return json({ error: "invalid_telnyx_sms_send_dry_run" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const plan = createTelnyxSmsSendDryRunPlan({
        workspaceId,
        projectId,
        category,
        recipientCount: recipientCount as number,
        consentedRecipientCount: consentedRecipientCount as number,
        estimatedSegments: estimatedSegments as number,
        emergencyOverride: body.emergencyOverride,
      });
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        projectId,
        auth.memberId,
        "provider.telnyx_sms_send_dry_run_checked",
        {
          category: plan.category,
          recipientCount: plan.recipientCount,
          consentedRecipientCount: plan.consentedRecipientCount,
          estimatedSegments: plan.estimatedSegments,
          policyEligible: plan.policyEligible,
          emergencyOverrideRequested: plan.emergencyOverrideRequested,
          liveSendAllowed: plan.liveSendAllowed,
          blockerCount: plan.blockers.length,
          recipientValuesAccepted: false,
          messageBodyAccepted: false,
        },
      );
      return json({
        ok: true,
        dryRun: true,
        auditPersistence,
        provider: plan,
      });
    }

    if (url.pathname === "/api/providers/sms/consent/commit" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<SmsConsentCommitRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const selfEnrollment = body.source === "workspace_form";
      if (
        (body.source !== "workspace_form" && body.source !== "operator")
        || !isValidWorkspaceId(workspaceId)
        || (selfEnrollment && body.disclosureAcknowledged !== true)
        || (selfEnrollment && body.memberId != null)
      ) {
        return json({ error: "invalid_sms_consent_request" }, 400);
      }
      if (!selfEnrollment && !OWNER_PRODUCER_ROLES.includes(auth.role)) {
        return json({ error: "insufficient_role" }, 403);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.memberId || !auth.workspaceId) {
        return json({ error: "sms_consent_storage_unavailable", persistence: auth.persistence }, 503);
      }
      const result = await commitSmsConsent(env.DB, {
        workspaceId,
        memberId: selfEnrollment
          ? auth.memberId
          : typeof body.memberId === "string" ? body.memberId.trim() : null,
        recipientE164: body.recipientE164 ?? "",
        evidenceId: body.evidenceId ?? "",
        disclosureVersion: body.disclosureVersion ?? "",
        categories: Array.isArray(body.categories) ? body.categories : [],
        source: body.source,
        actorMemberId: auth.memberId,
        encryptionKey: env.SMS_RECIPIENT_ENCRYPTION_KEY?.trim() ?? "",
        hashKey: env.SMS_RECIPIENT_HASH_KEY?.trim() ?? "",
      });
      return json({
        ok: !result.error,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        destructiveWrite: result.destructiveWrite,
        idempotent: result.idempotent,
        recipient: result.recipient,
        eventType: result.eventType,
        pendingAttemptsSuppressed: result.pendingAttemptsSuppressed,
        secretValuesExposed: false,
        ...(result.error ? { error: result.error } : {}),
      }, result.errorStatus ?? 200);
    }

    if (url.pathname === "/api/providers/sms/consent/revoke" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<SmsConsentRevokeRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !hasWorkspaceAccess(auth, workspaceId)) {
        return isValidWorkspaceId(workspaceId) ? workspaceAccessError(auth) : json({ error: "invalid_sms_revocation_request" }, 400);
      }
      if (!env.DB || !auth.memberId || !auth.workspaceId) {
        return json({ error: "sms_consent_storage_unavailable", persistence: auth.persistence }, 503);
      }
      const result = await revokeSmsConsent(env.DB, {
        workspaceId,
        recipientId: body.recipientId?.trim() ?? "",
        evidenceId: body.evidenceId?.trim() ?? "",
        source: "operator",
        actorMemberId: auth.memberId,
      });
      return json({
        ok: !result.error,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        destructiveWrite: result.destructiveWrite,
        idempotent: result.idempotent,
        recipient: result.recipient,
        eventType: result.eventType,
        pendingAttemptsSuppressed: result.pendingAttemptsSuppressed,
        secretValuesExposed: false,
        ...(result.error ? { error: result.error } : {}),
      }, result.errorStatus ?? 200);
    }

    if (url.pathname === "/api/providers/sms/consent/manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<SmsConsentManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit ?? SMS_CONSENT_MANIFEST_MAX_ROWS;
      if (!isValidWorkspaceId(workspaceId) || !Number.isSafeInteger(limit) || limit < 1 || limit > SMS_CONSENT_MANIFEST_MAX_ROWS) {
        return json({ error: "invalid_sms_consent_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      const manifest = await listSmsConsentManifest(env.DB, workspaceId, limit);
      if (manifest.persistence !== "d1_sms_compliance" && isLiveMagicLinkDelivery(env)) {
        return json({ error: "sms_consent_storage_unavailable", persistence: manifest.persistence }, 503);
      }
      return json({ ok: true, dryRun: true, ...manifest });
    }

    if (url.pathname === "/api/providers/stripe/summary-readiness" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<StripeSummaryReadinessRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) {
        return json({ error: "invalid_workspace" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }
      const readiness = stripeSummaryReadiness(env);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "provider.stripe_summary_readiness_checked",
        {
          status: readiness.status,
          configured: readiness.configured,
          blockerCount: readiness.blockers.length,
          directStripeReadAllowed: readiness.directStripeReadAllowed,
          liveSummaryReadAllowed: readiness.liveSummaryReadAllowed,
          dataBoundary: readiness.dataBoundary,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: auth.persistence,
        auditPersistence,
        readiness,
      });
    }

    if (url.pathname === "/api/providers/stripe/summary" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<StripeSummaryRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(projectId)) {
        return json({ error: "invalid_workspace_or_project" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const readiness = stripeSummaryReadiness(env);
      if (!readiness.liveSummaryReadAllowed) {
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          projectId,
          auth.memberId,
          "provider.stripe_summary_blocked",
          {
            reason: "live_summary_not_enabled",
            readinessStatus: readiness.status,
            blockerCount: readiness.blockers.length,
            directStripeReadAllowed: readiness.directStripeReadAllowed,
            liveSummaryReadAllowed: readiness.liveSummaryReadAllowed,
          },
        );
        return json({
          error: "stripe_summary_not_live_enabled",
          persistence: auth.persistence,
          auditPersistence,
          readiness,
        }, 409);
      }

      const mapping = stripeProjectMappingFor(env.STRIPE_PROJECT_MAPPINGS, workspaceId, projectId);
      if (!mapping) {
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          projectId,
          auth.memberId,
          "provider.stripe_summary_blocked",
          {
            reason: "project_mapping_not_found",
            readinessStatus: readiness.status,
            directStripeReadAllowed: readiness.directStripeReadAllowed,
            liveSummaryReadAllowed: readiness.liveSummaryReadAllowed,
          },
        );
        return json({
          error: "stripe_project_mapping_not_found",
          persistence: auth.persistence,
          auditPersistence,
          readiness,
        }, 422);
      }

      const summary = await fetchStripeSummary(env, workspaceId, mapping);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        projectId,
        auth.memberId,
        "provider.stripe_summary_checked",
        {
          status: summary.status,
          adapterCount: summary.adapters.length,
          availableAdapterCount: summary.adapters.filter((adapter) => adapter.status === "available" || adapter.status === "empty").length,
          warningCount: summary.warnings.length,
          poolMappedRefCount: mapping.poolRefs.length,
          storeMappedRefCount: mapping.storeRefs.length,
          dataBoundary: summary.dataBoundary,
          directStripeReadAllowed: summary.directStripeReadAllowed,
          liveSummaryReadAllowed: summary.liveSummaryReadAllowed,
        },
      );

      return json({
        ok: true,
        dryRun: false,
        persistence: auth.persistence,
        auditPersistence,
        summary,
      });
    }

    if (url.pathname === "/api/providers/google/connection" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<GoogleOAuthConnectionRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const readiness = googleOAuthReadiness(env);
      const stored = await readGoogleProviderConnection(env.DB, workspaceId);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "provider.google_connection_checked",
        {
          status: stored.connection?.status ?? "not_connected",
          scopeCount: stored.connection?.scopes.length ?? 0,
          hasRefreshToken: stored.connection?.hasRefreshToken ?? false,
          liveOAuthAllowed: readiness.liveOAuthAllowed,
          blockerCount: readiness.blockers.length,
        },
      );
      return json({
        ok: true,
        dryRun: !readiness.liveOAuthAllowed,
        persistence: stored.persistence,
        auditPersistence,
        readiness,
        connection: stored.connection,
      });
    }

    if (url.pathname === "/api/providers/google/oauth/start" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<GoogleOAuthStartRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || (body.includeDocsExport !== undefined && typeof body.includeDocsExport !== "boolean")
        || (body.includeCalendarSync !== undefined && typeof body.includeCalendarSync !== "boolean")
      ) {
        return json({ error: "invalid_google_oauth_start" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const readiness = googleOAuthReadiness(env);
      const configuration = googleOAuthConfiguration(env);
      const sessionId = getCookie(request.headers.get("cookie"), "film_session");
      if (
        !readiness.liveOAuthAllowed
        || !configuration
        || !env.DB
        || !env.SESSIONS
        || !auth.workspaceId
        || !auth.memberId
        || !sessionId
      ) {
        return json({
          error: "google_oauth_not_enabled",
          persistence: auth.persistence,
          readiness,
        }, 409);
      }

      try {
        const authorization = await createGoogleOAuthAuthorization(configuration, {
          includeDocsExport: body.includeDocsExport,
          includeCalendarSync: body.includeCalendarSync,
        });
        const now = new Date();
        const stateRecord: GoogleOAuthStateRecord = {
          workspaceId,
          memberId: auth.memberId,
          sessionHash: await sha256Hex(sessionId),
          codeVerifier: authorization.codeVerifier,
          scopes: authorization.scopes,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000).toISOString(),
        };
        await env.SESSIONS.put(
          await googleOAuthStateKey(authorization.state),
          JSON.stringify(stateRecord),
          { expirationTtl: GOOGLE_OAUTH_STATE_TTL_SECONDS },
        );
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "provider.google_oauth_started",
          {
            scopeCount: authorization.scopes.length,
            driveContentReadRequested: authorization.scopes.some((scope) => scope.endsWith("/drive.readonly")),
            calendarReadRequested: authorization.scopes.some((scope) => scope.endsWith("/calendar.events.readonly")),
            stateTtlSeconds: GOOGLE_OAUTH_STATE_TTL_SECONDS,
          },
        );
        return json({
          ok: true,
          dryRun: false,
          persistence: "kv_oauth_state",
          auditPersistence,
          provider: "google",
          authorizationUrl: authorization.authorizationUrl,
          scopes: authorization.scopes,
          expiresAt: stateRecord.expiresAt,
        });
      } catch {
        return json({ error: "google_oauth_start_failed", persistence: auth.persistence }, 503);
      }
    }

    if (url.pathname === "/api/providers/google/oauth/callback" && request.method === "GET") {
      const readiness = googleOAuthReadiness(env);
      const configuration = googleOAuthConfiguration(env);
      const state = url.searchParams.get("state")?.trim() ?? "";
      if (
        !readiness.liveOAuthAllowed
        || !configuration
        || !env.DB
        || !env.SESSIONS
        || !isValidGoogleOAuthState(state)
      ) {
        return googleOAuthCallbackRedirect(env, "error", "oauth_not_available");
      }

      const stateKey = await googleOAuthStateKey(state);
      const rawState = await env.SESSIONS.get(stateKey);
      await env.SESSIONS.delete(stateKey);
      const stateRecord = parseGoogleOAuthStateRecord(rawState);
      if (!stateRecord || Date.parse(stateRecord.expiresAt) < Date.now()) {
        return googleOAuthCallbackRedirect(env, "error", "state_expired");
      }

      const sessionId = getCookie(request.headers.get("cookie"), "film_session");
      if (!sessionId || !timingSafeEqualText(await sha256Hex(sessionId), stateRecord.sessionHash)) {
        return googleOAuthCallbackRedirect(env, "error", "session_mismatch");
      }
      const callbackAuth = await requireGoogleOAuthCallbackAuth(env, sessionId, stateRecord);
      if (!callbackAuth) {
        return googleOAuthCallbackRedirect(env, "error", "session_invalid");
      }

      try {
        const tokens = await exchangeGoogleAuthorizationCode(
          configuration,
          url,
          state,
          stateRecord.codeVerifier,
          stateRecord.scopes,
        );
        const accessTokenCiphertext = await encryptGoogleToken(
          tokens.accessToken,
          env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "",
          googleTokenAdditionalData(stateRecord.workspaceId, "access"),
        );
        const refreshTokenCiphertext = tokens.refreshToken
          ? await encryptGoogleToken(
              tokens.refreshToken,
              env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "",
              googleTokenAdditionalData(stateRecord.workspaceId, "refresh"),
            )
          : null;
        const now = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO provider_connections (
              id,
              workspace_id,
              provider,
              connected_by_member_id,
              status,
              scopes_json,
              access_token_ciphertext,
              refresh_token_ciphertext,
              token_expires_at,
              token_type,
              token_key_version,
              connected_at,
              disconnected_at,
              last_error_code,
              updated_at
            )
            VALUES (?, ?, 'google', ?, 'active', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
            ON CONFLICT(workspace_id, provider) DO UPDATE SET
              connected_by_member_id = excluded.connected_by_member_id,
              status = 'active',
              scopes_json = excluded.scopes_json,
              access_token_ciphertext = excluded.access_token_ciphertext,
              refresh_token_ciphertext = COALESCE(excluded.refresh_token_ciphertext, provider_connections.refresh_token_ciphertext),
              token_expires_at = excluded.token_expires_at,
              token_type = excluded.token_type,
              token_key_version = excluded.token_key_version,
              connected_at = excluded.connected_at,
              disconnected_at = NULL,
              last_error_code = NULL,
              updated_at = excluded.updated_at
          `).bind(
            `provider_google_${stateRecord.workspaceId}`,
            stateRecord.workspaceId,
            stateRecord.memberId,
            JSON.stringify(tokens.scopes),
            accessTokenCiphertext,
            refreshTokenCiphertext,
            tokens.expiresAt,
            tokens.tokenType,
            GOOGLE_TOKEN_KEY_VERSION,
            now,
            now,
          ),
          auditEventInsertStatement(
            env.DB,
            `audit_${crypto.randomUUID()}`,
            stateRecord.workspaceId,
            null,
            stateRecord.memberId,
            "provider.google_oauth_connected",
            {
              scopeCount: tokens.scopes.length,
              hasRefreshToken: Boolean(tokens.refreshToken),
              tokenExpiresAt: tokens.expiresAt,
              tokenKeyVersion: GOOGLE_TOKEN_KEY_VERSION,
            },
            now,
          ),
        ]);
        return googleOAuthCallbackRedirect(env, "connected");
      } catch {
        await recordAuditEvent(
          env.DB,
          stateRecord.workspaceId,
          null,
          stateRecord.memberId,
          "provider.google_oauth_failed",
          { errorCode: "authorization_exchange_failed", stateConsumed: true },
        );
        return googleOAuthCallbackRedirect(env, "error", "exchange_failed");
      }
    }

    if (url.pathname === "/api/providers/google/drive-manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<GoogleDriveManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestedRootFolderId = body.rootFolderId?.trim() ?? "";
      const pageToken = body.pageToken?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || (requestedRootFolderId && !isValidGoogleDriveId(requestedRootFolderId))
        || (pageToken && !isValidGooglePageToken(pageToken))
      ) {
        return json({ error: "invalid_google_drive_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.workspaceId || !auth.memberId) {
        return json({ error: "google_connection_storage_unavailable", persistence: auth.persistence }, 503);
      }

      const connection = await readGoogleProviderConnectionRow(env.DB, workspaceId);
      if (!connection || connection.status !== "active") {
        return json({ error: "google_connection_not_active", persistence: "d1_provider_connections" }, 409);
      }
      const rootFolderId = requestedRootFolderId || connection.root_folder_id || "";
      if (!rootFolderId || !isValidGoogleDriveId(rootFolderId)) {
        return json({ error: "google_drive_root_folder_required", persistence: "d1_provider_connections" }, 422);
      }
      const scopes = parseGoogleScopes(connection.scopes_json);
      if (!scopes.some((scope) => scope.endsWith("/drive.readonly") || scope.endsWith("/drive.metadata.readonly"))) {
        return json({ error: "google_drive_scope_required", persistence: "d1_provider_connections" }, 403);
      }

      const access = await usableGoogleAccessToken(env, connection);
      if (!access.ok) {
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "provider.google_token_unavailable",
          { errorCode: access.error },
        );
        return json({ error: access.error, persistence: "d1_provider_connections", auditPersistence }, access.status);
      }
      try {
        const manifest = await listGoogleDriveFolder(
          access.accessToken,
          rootFolderId,
          pageToken || null,
        );
        const now = new Date().toISOString();
        const folderCount = manifest.files.filter((file) => file.mimeType === "application/vnd.google-apps.folder").length;
        const googleDocCount = manifest.files.filter((file) => file.mimeType === "application/vnd.google-apps.document").length;
        await env.DB.batch([
          env.DB.prepare(`
            UPDATE provider_connections
            SET root_folder_id = ?, updated_at = ?
            WHERE workspace_id = ? AND provider = 'google' AND status = 'active'
          `).bind(rootFolderId, now, workspaceId),
          auditEventInsertStatement(
            env.DB,
            `audit_${crypto.randomUUID()}`,
            workspaceId,
            null,
            auth.memberId,
            "provider.google_drive_manifest_read",
            {
              fileCount: manifest.files.length,
              folderCount,
              googleDocCount,
              truncated: manifest.truncated,
              pageTokenUsed: Boolean(pageToken),
              tokenRefreshed: access.refreshed,
            },
            now,
          ),
        ]);
        return json({
          ok: true,
          dryRun: false,
          persistence: "google_drive_api",
          connectionPersistence: "d1_provider_connections",
          auditPersistence: "d1_audit_events",
          tokenRefreshed: access.refreshed,
          manifest,
        });
      } catch (error) {
        const errorCode = error instanceof Error && (
          error.message === "google_drive_access_denied"
          || error.message === "google_drive_invalid_response"
        ) ? error.message : "google_drive_request_failed";
        await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "provider.google_drive_manifest_failed",
          { errorCode, tokenRefreshed: access.refreshed },
        );
        return json({ error: errorCode, persistence: "d1_provider_connections" }, errorCode === "google_drive_access_denied" ? 403 : 502);
      }
    }

    if (url.pathname === "/api/providers/google/disconnect" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<GoogleOAuthConnectionRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.workspaceId || !auth.memberId) {
        return json({ error: "google_connection_storage_unavailable", persistence: auth.persistence }, 503);
      }

      const row = await readGoogleProviderConnectionRow(env.DB, workspaceId);
      if (!row || row.status !== "active") {
        return json({ error: "google_connection_not_active", persistence: "d1_provider_connections" }, 404);
      }
      let providerRevoked = false;
      const encryptedToken = row.refresh_token_ciphertext ?? row.access_token_ciphertext;
      const tokenKind = row.refresh_token_ciphertext ? "refresh" : "access";
      if (encryptedToken && env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
        try {
          const token = await decryptGoogleToken(
            encryptedToken,
            env.GOOGLE_TOKEN_ENCRYPTION_KEY,
            googleTokenAdditionalData(workspaceId, tokenKind),
          );
          providerRevoked = await revokeGoogleToken(token);
        } catch {
          providerRevoked = false;
        }
      }
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE provider_connections
          SET status = 'disconnected',
              access_token_ciphertext = NULL,
              refresh_token_ciphertext = NULL,
              token_expires_at = NULL,
              token_type = NULL,
              disconnected_at = ?,
              updated_at = ?
          WHERE workspace_id = ? AND provider = 'google'
        `).bind(now, now, workspaceId),
        auditEventInsertStatement(
          env.DB,
          `audit_${crypto.randomUUID()}`,
          workspaceId,
          null,
          auth.memberId,
          "provider.google_disconnected",
          { providerRevoked, localTokensDeleted: true },
          now,
        ),
      ]);
      return json({
        ok: true,
        dryRun: false,
        persistence: "d1_provider_connections",
        auditPersistence: "d1_audit_events",
        providerRevoked,
        connection: googleProviderConnectionFromRow({
          ...row,
          status: "disconnected",
          access_token_ciphertext: null,
          refresh_token_ciphertext: null,
          token_expires_at: null,
          token_type: null,
          disconnected_at: now,
          updated_at: now,
        }),
      });
    }

    if (url.pathname === "/api/providers/meta/connection" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<MetaConnectionRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const readiness = metaOAuthReadiness(env);
      const stored = await readMetaProviderConnection(env.DB, workspaceId);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "provider.meta_connection_checked",
        {
          status: stored.connection?.status ?? "not_connected",
          scopeCount: stored.connection?.scopes.length ?? 0,
          pageSelected: Boolean(stored.connection?.page),
          instagramLinked: Boolean(stored.connection?.instagramAccount),
          liveOAuthAllowed: readiness.liveOAuthAllowed,
          blockerCount: readiness.blockers.length,
        },
      );
      return json({
        ok: true,
        dryRun: !readiness.liveOAuthAllowed,
        persistence: stored.persistence,
        auditPersistence,
        readiness,
        connection: stored.connection,
      });
    }

    if (url.pathname === "/api/providers/meta/oauth/start" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<MetaConnectionRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const readiness = metaOAuthReadiness(env);
      const configuration = metaOAuthConfiguration(env);
      const sessionId = getCookie(request.headers.get("cookie"), "film_session");
      if (
        !readiness.liveOAuthAllowed
        || !configuration
        || !env.DB
        || !env.SESSIONS
        || !auth.workspaceId
        || !auth.memberId
        || !sessionId
      ) {
        return json({ error: "meta_oauth_not_enabled", persistence: auth.persistence, readiness }, 409);
      }

      try {
        const authorization = createMetaOAuthAuthorization(configuration);
        const now = new Date();
        const stateRecord: MetaOAuthStateRecord = {
          workspaceId,
          memberId: auth.memberId,
          sessionHash: await sha256Hex(sessionId),
          scopes: authorization.scopes,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + META_OAUTH_STATE_TTL_SECONDS * 1000).toISOString(),
        };
        await env.SESSIONS.put(
          await metaOAuthStateKey(authorization.state),
          JSON.stringify(stateRecord),
          { expirationTtl: META_OAUTH_STATE_TTL_SECONDS },
        );
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "provider.meta_oauth_started",
          {
            scopeCount: authorization.scopes.length,
            readOnlyScopePolicy: true,
            publishingScopeRequested: false,
            messagingScopeRequested: false,
            stateTtlSeconds: META_OAUTH_STATE_TTL_SECONDS,
          },
        );
        return json({
          ok: true,
          dryRun: false,
          persistence: "kv_oauth_state",
          auditPersistence,
          provider: "meta",
          authorizationUrl: authorization.authorizationUrl,
          scopes: authorization.scopes,
          expiresAt: stateRecord.expiresAt,
        });
      } catch {
        return json({ error: "meta_oauth_start_failed", persistence: auth.persistence }, 503);
      }
    }

    if (url.pathname === "/api/providers/meta/oauth/callback" && request.method === "GET") {
      const readiness = metaOAuthReadiness(env);
      const configuration = metaOAuthConfiguration(env);
      const state = url.searchParams.get("state")?.trim() ?? "";
      if (
        !readiness.liveOAuthAllowed
        || !configuration
        || !env.DB
        || !env.SESSIONS
        || !isValidMetaOAuthState(state)
      ) {
        return metaOAuthCallbackRedirect(env, "error", "oauth_not_available");
      }

      const stateKey = await metaOAuthStateKey(state);
      const rawState = await env.SESSIONS.get(stateKey);
      await env.SESSIONS.delete(stateKey);
      const stateRecord = parseMetaOAuthStateRecord(rawState);
      if (!stateRecord || Date.parse(stateRecord.expiresAt) < Date.now()) {
        return metaOAuthCallbackRedirect(env, "error", "state_expired");
      }
      const sessionId = getCookie(request.headers.get("cookie"), "film_session");
      if (!sessionId || !timingSafeEqualText(await sha256Hex(sessionId), stateRecord.sessionHash)) {
        return metaOAuthCallbackRedirect(env, "error", "session_mismatch");
      }
      if (!await requireMetaOAuthCallbackAuth(env, sessionId, stateRecord)) {
        return metaOAuthCallbackRedirect(env, "error", "session_invalid");
      }

      try {
        const tokens = await exchangeMetaAuthorizationCode(configuration, url, state);
        const userAccessTokenCiphertext = await encryptMetaToken(
          tokens.userAccessToken,
          env.META_TOKEN_ENCRYPTION_KEY ?? "",
          metaTokenAdditionalData(stateRecord.workspaceId, "user"),
        );
        const now = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO meta_provider_connections (
              id,
              workspace_id,
              connected_by_member_id,
              status,
              scopes_json,
              user_access_token_ciphertext,
              page_access_token_ciphertext,
              token_expires_at,
              token_key_version,
              meta_user_id,
              page_id,
              page_name,
              instagram_account_id,
              instagram_username,
              last_error_code,
              connected_at,
              disconnected_at,
              updated_at
            )
            VALUES (?, ?, ?, 'pending_page_selection', ?, ?, NULL, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?)
            ON CONFLICT(workspace_id) DO UPDATE SET
              connected_by_member_id = excluded.connected_by_member_id,
              status = 'pending_page_selection',
              scopes_json = excluded.scopes_json,
              user_access_token_ciphertext = excluded.user_access_token_ciphertext,
              page_access_token_ciphertext = NULL,
              token_expires_at = excluded.token_expires_at,
              token_key_version = excluded.token_key_version,
              meta_user_id = excluded.meta_user_id,
              page_id = NULL,
              page_name = NULL,
              instagram_account_id = NULL,
              instagram_username = NULL,
              last_error_code = NULL,
              connected_at = excluded.connected_at,
              disconnected_at = NULL,
              updated_at = excluded.updated_at
          `).bind(
            `provider_meta_${stateRecord.workspaceId}`,
            stateRecord.workspaceId,
            stateRecord.memberId,
            JSON.stringify(tokens.scopes),
            userAccessTokenCiphertext,
            tokens.expiresAt,
            META_TOKEN_KEY_VERSION,
            tokens.userId,
            now,
            now,
          ),
          auditEventInsertStatement(
            env.DB,
            `audit_${crypto.randomUUID()}`,
            stateRecord.workspaceId,
            null,
            stateRecord.memberId,
            "provider.meta_oauth_connected",
            {
              scopeCount: tokens.scopes.length,
              tokenExpiresAt: tokens.expiresAt,
              tokenKeyVersion: META_TOKEN_KEY_VERSION,
              pageSelectionRequired: true,
            },
            now,
          ),
        ]);
        return metaOAuthCallbackRedirect(env, "connected");
      } catch {
        await recordAuditEvent(
          env.DB,
          stateRecord.workspaceId,
          null,
          stateRecord.memberId,
          "provider.meta_oauth_failed",
          { errorCode: "authorization_exchange_failed", stateConsumed: true },
        );
        return metaOAuthCallbackRedirect(env, "error", "exchange_failed");
      }
    }

    if (url.pathname === "/api/providers/meta/pages" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<MetaConnectionRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.memberId) return json({ error: "meta_connection_storage_unavailable" }, 503);
      const configuration = metaOAuthConfiguration(env);
      const row = await readMetaProviderConnectionRow(env.DB, workspaceId);
      if (!configuration || !row || !["pending_page_selection", "active"].includes(row.status)) {
        return json({ error: "meta_connection_not_ready", persistence: "d1_meta_provider_connections" }, 409);
      }
      const userAccessToken = await usableMetaToken(env, row, "user");
      if (!userAccessToken.ok) return json({ error: userAccessToken.error, persistence: "d1_meta_provider_connections" }, userAccessToken.status);
      try {
        const pages = await listMetaPageCandidates(configuration, userAccessToken.token);
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "provider.meta_page_candidates_read",
          {
            candidateCount: pages.length,
            analyzableCount: pages.filter((page) => page.tasks.includes("ANALYZE")).length,
            linkedInstagramCount: pages.filter((page) => Boolean(page.instagramAccount)).length,
          },
        );
        return json({
          ok: true,
          dryRun: false,
          persistence: "meta_graph_api",
          connectionPersistence: "d1_meta_provider_connections",
          auditPersistence,
          pages,
          selectionPolicy: "analyze_task_and_linked_instagram_required",
          secretValuesExposed: false,
        });
      } catch {
        await recordAuditEvent(env.DB, workspaceId, null, auth.memberId, "provider.meta_page_candidates_failed", {
          errorCode: "meta_page_candidates_failed",
        });
        return json({ error: "meta_page_candidates_failed", persistence: "d1_meta_provider_connections" }, 502);
      }
    }

    if (url.pathname === "/api/providers/meta/select-page" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<MetaPageSelectionRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const pageId = body.pageId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isMetaId(pageId)) return json({ error: "invalid_meta_page_selection" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.memberId) return json({ error: "meta_connection_storage_unavailable" }, 503);
      const configuration = metaOAuthConfiguration(env);
      const row = await readMetaProviderConnectionRow(env.DB, workspaceId);
      if (!configuration || !row || !["pending_page_selection", "active"].includes(row.status)) {
        return json({ error: "meta_connection_not_ready", persistence: "d1_meta_provider_connections" }, 409);
      }
      const userAccessToken = await usableMetaToken(env, row, "user");
      if (!userAccessToken.ok) return json({ error: userAccessToken.error, persistence: "d1_meta_provider_connections" }, userAccessToken.status);
      try {
        const selection = await readMetaPageSelection(configuration, userAccessToken.token, pageId);
        const pageAccessTokenCiphertext = await encryptMetaToken(
          selection.pageAccessToken,
          env.META_TOKEN_ENCRYPTION_KEY ?? "",
          metaTokenAdditionalData(workspaceId, "page"),
        );
        const now = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare(`
            UPDATE meta_provider_connections
            SET status = 'active',
                page_access_token_ciphertext = ?,
                page_id = ?,
                page_name = ?,
                instagram_account_id = ?,
                instagram_username = ?,
                last_error_code = NULL,
                disconnected_at = NULL,
                updated_at = ?
            WHERE workspace_id = ? AND status IN ('pending_page_selection', 'active')
          `).bind(
            pageAccessTokenCiphertext,
            selection.id,
            selection.name,
            selection.instagramAccount?.id ?? null,
            selection.instagramAccount?.username ?? null,
            now,
            workspaceId,
          ),
          auditEventInsertStatement(
            env.DB,
            `audit_${crypto.randomUUID()}`,
            workspaceId,
            null,
            auth.memberId,
            "provider.meta_page_selected",
            { analyzable: true, instagramLinked: true, tokenKeyVersion: META_TOKEN_KEY_VERSION },
            now,
          ),
        ]);
        const updated = await readMetaProviderConnectionRow(env.DB, workspaceId);
        return json({
          ok: true,
          dryRun: false,
          persistence: "d1_meta_provider_connections",
          auditPersistence: "d1_audit_events",
          connection: updated ? metaProviderConnectionFromRow(updated) : null,
          secretValuesExposed: false,
        });
      } catch (error) {
        const errorCode = error instanceof Error && [
          "meta_page_analyze_task_required",
          "meta_linked_instagram_account_required",
        ].includes(error.message) ? error.message : "meta_page_selection_failed";
        await recordAuditEvent(env.DB, workspaceId, null, auth.memberId, "provider.meta_page_selection_failed", { errorCode });
        return json({ error: errorCode, persistence: "d1_meta_provider_connections" }, errorCode === "meta_page_selection_failed" ? 502 : 422);
      }
    }

    if (url.pathname === "/api/providers/meta/analytics" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<MetaAnalyticsRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const since = body.since?.trim() ?? "";
      const until = body.until?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidMetaAnalyticsDateRange(since, until)) {
        return json({ error: "invalid_meta_analytics_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.memberId) return json({ error: "meta_connection_storage_unavailable" }, 503);
      const configuration = metaOAuthConfiguration(env);
      const row = await readMetaProviderConnectionRow(env.DB, workspaceId);
      if (
        !configuration
        || !row
        || row.status !== "active"
        || !row.page_id
        || !row.instagram_account_id
      ) {
        return json({ error: "meta_connection_not_active", persistence: "d1_meta_provider_connections" }, 409);
      }
      const pageAccessToken = await usableMetaToken(env, row, "page");
      if (!pageAccessToken.ok) return json({ error: pageAccessToken.error, persistence: "d1_meta_provider_connections" }, pageAccessToken.status);
      try {
        const analytics = await readMetaAnalytics({
          graphVersion: configuration.graphVersion,
          pageId: row.page_id,
          instagramAccountId: row.instagram_account_id,
          pageAccessToken: pageAccessToken.token,
          since,
          until,
        });
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "provider.meta_analytics_read",
          {
            status: analytics.status,
            calendarItemCount: analytics.calendar.length,
            insightSeriesCount: analytics.insights.length,
            warningCount: analytics.warnings.length,
            since,
            until,
          },
        );
        return json({
          ok: analytics.status !== "unavailable",
          dryRun: false,
          persistence: "meta_graph_api",
          connectionPersistence: "d1_meta_provider_connections",
          auditPersistence,
          analytics,
        }, analytics.status === "unavailable" ? 502 : 200);
      } catch {
        await recordAuditEvent(env.DB, workspaceId, null, auth.memberId, "provider.meta_analytics_failed", {
          errorCode: "meta_analytics_failed",
          since,
          until,
        });
        return json({ error: "meta_analytics_failed", persistence: "d1_meta_provider_connections" }, 502);
      }
    }

    if (url.pathname === "/api/providers/meta/disconnect" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);
      const body = await readJson<MetaConnectionRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (!env.DB || !auth.memberId) return json({ error: "meta_connection_storage_unavailable" }, 503);
      const row = await readMetaProviderConnectionRow(env.DB, workspaceId);
      if (!row || !["pending_page_selection", "active", "error"].includes(row.status)) {
        return json({ error: "meta_connection_not_active", persistence: "d1_meta_provider_connections" }, 404);
      }
      let providerRevoked = false;
      const configuration = metaOAuthConfiguration(env);
      if (configuration && row.user_access_token_ciphertext && env.META_TOKEN_ENCRYPTION_KEY) {
        try {
          const token = await decryptMetaToken(
            row.user_access_token_ciphertext,
            env.META_TOKEN_ENCRYPTION_KEY,
            metaTokenAdditionalData(workspaceId, "user"),
          );
          providerRevoked = await revokeMetaPermissions(configuration, token);
        } catch {
          providerRevoked = false;
        }
      }
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE meta_provider_connections
          SET status = 'disconnected',
              scopes_json = '[]',
              user_access_token_ciphertext = NULL,
              page_access_token_ciphertext = NULL,
              token_expires_at = NULL,
              meta_user_id = NULL,
              page_id = NULL,
              page_name = NULL,
              instagram_account_id = NULL,
              instagram_username = NULL,
              last_error_code = NULL,
              disconnected_at = ?,
              updated_at = ?
          WHERE workspace_id = ?
        `).bind(now, now, workspaceId),
        auditEventInsertStatement(
          env.DB,
          `audit_${crypto.randomUUID()}`,
          workspaceId,
          null,
          auth.memberId,
          "provider.meta_disconnected",
          { providerRevoked, localTokensDeleted: true, localMappingDeleted: true },
          now,
        ),
      ]);
      return json({
        ok: true,
        dryRun: false,
        persistence: "d1_meta_provider_connections",
        auditPersistence: "d1_audit_events",
        providerRevoked,
        connection: metaProviderConnectionFromRow({
          ...row,
          status: "disconnected",
          scopes_json: "[]",
          user_access_token_ciphertext: null,
          page_access_token_ciphertext: null,
          token_expires_at: null,
          meta_user_id: null,
          page_id: null,
          page_name: null,
          instagram_account_id: null,
          instagram_username: null,
          disconnected_at: now,
          updated_at: now,
        }),
      });
    }

    if (url.pathname === "/api/providers/google/drive-sync-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<GoogleDriveSyncDryRunRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const rootFolderId = body.rootFolderId?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || (rootFolderId && !isValidGoogleDriveId(rootFolderId))
        || (body.includeDocsExport !== undefined && typeof body.includeDocsExport !== "boolean")
        || (body.includeCalendarSync !== undefined && typeof body.includeCalendarSync !== "boolean")
      ) {
        return json({ error: "invalid_google_drive_sync_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const plan = createGoogleDriveSyncDryRunStatus({
        workspaceId,
        rootFolderId: rootFolderId || null,
        includeDocsExport: body.includeDocsExport,
        includeCalendarSync: body.includeCalendarSync,
      });
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "provider.google_drive_sync_dry_run_checked",
        {
          rootFolderConfigured: plan.rootFolderConfigured,
          plannedActionCount: plan.plannedActions.length,
          blockerCount: plan.blockers.length,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        auditPersistence,
        provider: plan,
      });
    }

    if (url.pathname === "/api/imports/notion/dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OPERATOR_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<NotionDryRunImportRequest>(request);
      const files = body.files ?? [];
      if (
        !Array.isArray(files)
        || files.length > NOTION_IMPORT_MANIFEST_MAX_FILES
        || !files.every(isValidImportFile)
        || !isNotionImportManifestWithinBounds(files)
      ) {
        return json({ error: "invalid_import_manifest" }, 400);
      }

      const importPlan = planNotionImport(files);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        auth.workspaceId ?? seedWorkspace.id,
        null,
        auth.memberId,
        "import.notion_preflight_checked",
        {
          totalFiles: importPlan.preview.totalFiles,
          acceptedFiles: importPlan.preview.acceptedFiles,
          markdownDocuments: importPlan.preview.markdownDocuments,
          csvDatabases: importPlan.preview.csvDatabases,
          assets: importPlan.preview.assets,
          unsafeFileCount: importPlan.preview.unsafeFiles.length,
          oversizedFileCount: importPlan.preview.oversizedFiles.length,
          candidateCount: importPlan.candidates.length,
          warningCount: importPlan.preview.warnings.length,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        auditPersistence,
        preview: importPlan.preview,
        candidates: importPlan.candidates,
      });
    }

    if (url.pathname === "/api/imports/notion/planning/commit" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OPERATOR_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<NotionPlanningImportRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const rawRecords = body.records ?? [];
      if (
        !isValidWorkspaceId(workspaceId)
        || !Array.isArray(rawRecords)
        || rawRecords.length === 0
        || rawRecords.length > NOTION_PLANNING_COMMIT_MAX_RECORDS
      ) {
        return json({ error: "invalid_planning_import_batch" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await commitNotionPlanningImport(env.DB, workspaceId, auth.memberId, rawRecords);

      return json({
        ok: !result.error && result.rejected.length === 0,
        dryRun: !result.destructiveWrite,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        accepted: result.accepted,
        rejected: result.rejected,
        committed: result.committed,
        idempotent: result.idempotent,
        updatePreview: result.updatePreview,
        updatePreviewDetails: result.updatePreviewDetails,
        tableSummary: result.tableSummary,
        commitPolicy: "atomic_create_only_planning_rows",
        destructiveWrite: result.destructiveWrite,
        ...(result.error ? { error: result.error } : {}),
      }, result.errorStatus ?? (result.rejected.length === 0 ? 200 : 422));
    }

    if (url.pathname === "/api/imports/notion/core/commit" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<NotionCoreImportRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const records = body.records ?? [];
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(projectId)
        || !Array.isArray(records)
        || records.length === 0
        || records.length > NOTION_CORE_IMPORT_MAX_RECORDS
      ) {
        return json({ error: "invalid_notion_core_import_batch" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);

      const result = await commitNotionCoreImport(env.DB, workspaceId, projectId, auth.memberId, records);
      return json({
        ok: !result.error && result.rejected.length === 0,
        dryRun: !result.destructiveWrite,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        destructiveWrite: result.destructiveWrite,
        accepted: result.accepted,
        committed: result.committed,
        idempotent: result.idempotent,
        updatePreview: result.updatePreview,
        rejected: result.rejected,
        commitPolicy: "atomic_create_only_core_records",
        ...(result.error ? { error: result.error } : {}),
      }, result.errorStatus ?? (result.rejected.length === 0 ? 200 : 422));
    }

    if (url.pathname === "/api/planning/export/dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<PlanningExportDryRunRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit === undefined ? 1000 : body.limit;
      if (!isValidWorkspaceId(workspaceId) || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
        return json({ error: "invalid_planning_export_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const planningExport = await exportPlanningRows(env.DB, workspaceId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "planning.export_dry_run_created",
        {
          persistence: planningExport.persistence,
          rowCount: planningExport.rowCount,
          truncated: planningExport.truncated,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        auditPersistence,
        planningExport,
      });
    }

    if (url.pathname === "/api/attachments/r2/dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OPERATOR_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<AttachmentStorageDryRunRequest>(request);
      const workspaceId = body.workspaceId?.trim();
      const attachments = body.attachments ?? [];
      if (!workspaceId || !Array.isArray(attachments) || attachments.length > 100) {
        return json({ error: "invalid_attachment_batch" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const accepted = [];
      const rejected = [];
      for (const attachment of attachments) {
        const rejection = validateAttachmentCandidate(attachment);
        if (rejection) {
          rejected.push({ docId: attachment.docId ?? "unknown", reason: rejection });
        } else {
          accepted.push({
            docId: attachment.docId,
            objectKey: attachmentObjectKey(workspaceId, attachment),
            sizeBytes: attachment.sizeBytes,
            contentType: attachment.contentType,
          });
        }
      }

      const totalBytes = accepted.reduce((total, attachment) => total + (attachment.sizeBytes ?? 0), 0);
      return json({
        ok: rejected.length === 0,
        dryRun: true,
        destination: env.ATTACHMENTS ? "R2 ATTACHMENTS binding" : "R2 placeholder binding",
        accepted,
        rejected,
        totalBytes,
        bytePolicy: "metadata_only_request",
      }, rejected.length === 0 ? 200 : 422);
    }

    if (url.pathname === "/api/attachments/r2/prepare-upload" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OPERATOR_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<AttachmentUploadPrepareRequest>(request);
      const workspaceId = body.workspaceId?.trim();
      const attachments = body.attachments ?? [];
      if (!workspaceId || !Array.isArray(attachments) || attachments.length > 100) {
        return json({ error: "invalid_attachment_batch" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const accepted = [];
      const rejected = [];
      let persistence = attachmentPersistenceMode(env);
      for (const attachment of attachments) {
        const rejection = validateAttachmentCandidate(attachment);
        if (rejection) {
          rejected.push({ docId: attachment.docId ?? "unknown", reason: rejection });
        } else {
          const intent = await createUploadIntent(workspaceId, attachment);
          persistence = combineAttachmentPersistence(
            persistence,
            await recordUploadIntent(env.DB, workspaceId, attachment, intent),
          );
          accepted.push(intent);
        }
      }

      return json({
        ok: rejected.length === 0,
        dryRun: true,
        uploadMode: env.ATTACHMENTS ? "r2_signed_upload_dry_run" : "r2_binding_missing_dry_run",
        persistence,
        bytePolicy: "browser_to_r2_direct_when_live",
        accepted,
        rejected,
      }, rejected.length === 0 ? 200 : 422);
    }

    if (url.pathname === "/api/attachments/r2/commit" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OPERATOR_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<AttachmentUploadCommitRequest>(request);
      const workspaceId = body.workspaceId?.trim();
      const commits = body.commits ?? [];
      if (!workspaceId || !Array.isArray(commits) || commits.length > 100) {
        return json({ error: "invalid_attachment_commit_batch" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const accepted = [];
      const rejected = [];
      let persistence = attachmentPersistenceMode(env);
      for (const commit of commits) {
        const rejection = await validateAttachmentCommit(workspaceId, commit);
        if (rejection) {
          rejected.push({ docId: commit.docId ?? "unknown", reason: rejection });
        } else {
          const result = await recordAttachmentCommit(env.DB, workspaceId, commit, new Date().toISOString());
          persistence = combineAttachmentPersistence(persistence, result.persistence);
          if ("rejected" in result) {
            rejected.push(result.rejected);
          } else {
            accepted.push(result.accepted);
          }
        }
      }

      return json({
        ok: rejected.length === 0,
        dryRun: true,
        persistence,
        accepted,
        rejected,
        commitPolicy: "metadata_only_commit",
      }, rejected.length === 0 ? 200 : 422);
    }

    if (url.pathname === "/api/attachments/r2/upload-object" && request.method === "PUT") {
      const auth = await requireMutationAuth(request, env, OPERATOR_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const workspaceId = request.headers.get("x-film-workspace-id")?.trim() ?? "";
      const commit: AttachmentUploadCommit = {
        docId: request.headers.get("x-film-doc-id")?.trim() ?? "",
        objectKey: request.headers.get("x-film-object-key")?.trim() ?? "",
        sizeBytes: parseIntegerHeader(request.headers.get("x-film-size-bytes")),
        sha256: request.headers.get("x-film-sha256")?.trim() ?? "",
        commitToken: request.headers.get("x-film-commit-token")?.trim() ?? "",
      };
      if (!isValidWorkspaceId(workspaceId)) {
        return json({ error: "invalid_workspace" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }
      if (request.headers.get("x-film-storage-confirmation") !== `STORE ${workspaceId}`) {
        return json({ error: "missing_storage_confirmation" }, 400);
      }
      if (!env.DB) {
        return json({ error: "attachment_intent_storage_required" }, 503);
      }
      if (!env.ATTACHMENTS) {
        return json({ error: "r2_binding_unavailable" }, 503);
      }

      const rejection = await validateAttachmentCommit(workspaceId, commit);
      if (rejection) {
        return json({ error: rejection }, 422);
      }

      const bodyBytes = await readBoundedArrayBuffer(request, commit.sizeBytes ?? 0, ATTACHMENT_PACKAGE_MAX_BYTES);
      if (!bodyBytes.ok) return json({ error: bodyBytes.error }, bodyBytes.status);
      if ((await sha256HexBytes(bodyBytes.bytes)) !== commit.sha256?.toLowerCase()) {
        return json({ error: "sha256_mismatch" }, 422);
      }

      const result = await storeAttachmentObject(
        env.DB,
        env.ATTACHMENTS,
        workspaceId,
        auth.memberId,
        commit,
        request.headers.get("content-type") ?? "application/octet-stream",
        bodyBytes.bytes,
        new Date().toISOString(),
      );
      if ("rejected" in result) {
        return json({ error: result.rejected.reason, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: false,
        uploadMode: "worker_r2_put",
        persistence: result.persistence,
        attachment: result.accepted,
      });
    }

    if (url.pathname === "/api/attachments/r2/export-manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<AttachmentExportManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit === undefined ? 100 : body.limit;
      const offset = body.offset === undefined ? 0 : body.offset;
      if (!isValidWorkspaceId(workspaceId) || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000 || !isValidPaginationOffset(offset)) {
        return json({ error: "invalid_attachment_export_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const exportResult = await listStoredAttachmentObjects(env.DB, workspaceId, limit, offset);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "attachment.export_manifest_created",
        {
          rowCount: exportResult.objects.length,
          truncated: exportResult.truncated,
          offset,
          nextOffset: exportResult.nextOffset,
          persistence: exportResult.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: exportResult.persistence,
        auditPersistence,
        workspaceId,
        exportPolicy: "stored_r2_manifest_only",
        offset,
        nextOffset: exportResult.nextOffset,
        rowCount: exportResult.objects.length,
        truncated: exportResult.truncated,
        objects: exportResult.objects,
      });
    }

    if (url.pathname === "/api/attachments/r2/export-package-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<AttachmentPackageDryRunRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit === undefined ? 1000 : body.limit;
      const offset = body.offset === undefined ? 0 : body.offset;
      const rawObjectKeys = body.objectKeys ?? [];
      const selectedObjectKeys = Array.isArray(rawObjectKeys) ? Array.from(new Set(rawObjectKeys)) : [];
      if (
        !isValidWorkspaceId(workspaceId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 1000
        || !isValidPaginationOffset(offset)
        || !Array.isArray(rawObjectKeys)
        || selectedObjectKeys.length > 1000
        || selectedObjectKeys.some((objectKey) => typeof objectKey !== "string" || !isValidAttachmentObjectKey(workspaceId, objectKey))
      ) {
        return json({ error: "invalid_attachment_package_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const exportResult = selectedObjectKeys.length
        ? await listSelectedStoredAttachmentObjects(env.DB, workspaceId, selectedObjectKeys, limit)
        : await listStoredAttachmentObjects(env.DB, workspaceId, limit, offset);
      if (selectedObjectKeys.length > 0 && exportResult.objects.length !== Math.min(selectedObjectKeys.length, limit)) {
        return json({ error: "attachment_package_selection_not_found" }, 404);
      }
      const totalSizeBytes = exportResult.objects.reduce((total, object) => total + object.sizeBytes, 0);
      const blockers: string[] = [];
      if (exportResult.persistence !== "d1_attachment_intents") {
        blockers.push("D1 stored attachment metadata is required before Worker-owned package bytes can be streamed.");
      }
      if (exportResult.truncated) {
        blockers.push("Stored attachment list was truncated; increase packaging pagination before creating a complete bundle.");
      }
      if (!env.ATTACHMENTS) {
        blockers.push("ATTACHMENTS R2 binding is required before Worker-owned package bytes can be streamed.");
      }
      if (totalSizeBytes > ATTACHMENT_PACKAGE_MAX_BYTES) {
        blockers.push(`Stored attachment bytes exceed the ${ATTACHMENT_PACKAGE_MAX_BYTES} byte package cap.`);
      }
      const packagePlan = blockers.length
        ? {
          packagePlanId: null,
          packageToken: null,
          packageTokenExpiresAt: null,
          persistence: "not_created" satisfies AttachmentPackagePlanPersistence,
          auditPersistence: "dry_run_memoryless" satisfies AuditPersistence,
          blocker: null,
        }
        : await createAttachmentPackagePlan(
          env.DB,
          workspaceId,
          auth.memberId,
          exportResult.objects,
          totalSizeBytes,
          {
            truncated: exportResult.truncated,
            offset,
            nextOffset: exportResult.nextOffset,
            persistence: exportResult.persistence,
          },
        );
      if (packagePlan.blocker) {
        blockers.push(packagePlan.blocker);
      }
      const auditPersistence = packagePlan.packagePlanId
        ? packagePlan.auditPersistence
        : await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "attachment.export_package_dry_run_created",
          {
            objectCount: exportResult.objects.length,
            totalSizeBytes,
            truncated: exportResult.truncated,
            offset,
            nextOffset: exportResult.nextOffset,
            persistence: exportResult.persistence,
            packagePlanId: packagePlan.packagePlanId,
            packagePlanPersistence: packagePlan.persistence,
          },
        );

      return json({
        ok: true,
        dryRun: true,
        persistence: exportResult.persistence,
        auditPersistence,
        workspaceId,
        packagePolicy: "stored_r2_attachment_package_plan",
        packageMode: blockers.length ? "blocked_dry_run" : "zip_download_ready",
        packagePlanId: packagePlan.packagePlanId,
        packageToken: packagePlan.packageToken,
        packageTokenExpiresAt: packagePlan.packageTokenExpiresAt,
        packagePlanPersistence: packagePlan.persistence,
        byteSource: env.ATTACHMENTS ? "r2_binding_available" : "r2_binding_missing",
        offset,
        nextOffset: exportResult.nextOffset,
        objectCount: exportResult.objects.length,
        totalSizeBytes,
        truncated: exportResult.truncated,
        canPackage: blockers.length === 0,
        destructiveWrite: false,
        blockers,
        objects: exportResult.objects.map((object) => ({
          docId: object.docId,
          objectKey: object.objectKey,
          name: object.name,
          sizeBytes: object.sizeBytes,
          sha256: object.sha256,
        })),
      });
    }

    if (url.pathname === "/api/attachments/r2/package" && (request.method === "GET" || request.method === "POST")) {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = request.method === "POST"
        ? await readJson<AttachmentPackageDownloadRequest>(request)
        : null;
      const workspaceId = request.method === "POST"
        ? body?.workspaceId?.trim() ?? ""
        : url.searchParams.get("workspaceId")?.trim() ?? "";
      const limit = request.method === "POST"
        ? body?.limit ?? 1000
        : Number(url.searchParams.get("limit") ?? "1000");
      const rawSelectedObjectKeys = request.method === "POST" ? body?.objectKeys ?? [] : [];
      const selectedObjectKeys = Array.isArray(rawSelectedObjectKeys) ? Array.from(new Set(rawSelectedObjectKeys)) : [];
      const packagePlanId = request.method === "POST"
        ? body?.packagePlanId?.trim() ?? ""
        : url.searchParams.get("packagePlanId")?.trim() ?? "";
      const packageToken = request.method === "POST"
        ? body?.packageToken?.trim() ?? ""
        : url.searchParams.get("packageToken")?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 1000
        || !isValidRecordId(packagePlanId)
        || !isValidAttachmentPackageToken(packageToken)
        || !Array.isArray(rawSelectedObjectKeys)
        || selectedObjectKeys.length > 1000
        || selectedObjectKeys.some((objectKey) => typeof objectKey !== "string" || !isValidAttachmentObjectKey(workspaceId, objectKey))
      ) {
        return json({ error: "invalid_attachment_package_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }
      if (!env.DB) {
        return json({ error: "attachment_manifest_storage_required" }, 503);
      }
      if (!env.ATTACHMENTS) {
        return json({ error: "r2_binding_unavailable" }, 503);
      }

      const verifiedPlan = await verifyAttachmentPackagePlan(env.DB, workspaceId, packagePlanId, packageToken, selectedObjectKeys, limit);
      if (!verifiedPlan.ok) {
        return json({ error: verifiedPlan.error }, verifiedPlan.status);
      }

      const exportResult = await listSelectedStoredAttachmentObjects(env.DB, workspaceId, verifiedPlan.objectKeys, limit);
      const totalSizeBytes = exportResult.objects.reduce((total, object) => total + object.sizeBytes, 0);
      if (exportResult.objects.length !== verifiedPlan.objectKeys.length) {
        return json({ error: "attachment_package_selection_not_found" }, 404);
      }
      if (exportResult.truncated) {
        return json({ error: "attachment_package_truncated" }, 422);
      }
      if (totalSizeBytes !== verifiedPlan.totalSizeBytes) {
        return json({ error: "attachment_package_plan_stale" }, 409);
      }
      if (totalSizeBytes > ATTACHMENT_PACKAGE_MAX_BYTES) {
        return json({ error: "attachment_package_too_large", maxBytes: ATTACHMENT_PACKAGE_MAX_BYTES }, 413);
      }

      const packaged = await createAttachmentPackageZip(env.ATTACHMENTS, workspaceId, exportResult.objects);
      if ("error" in packaged) {
        return json({ error: packaged.error, objectKey: packaged.objectKey }, packaged.status);
      }
      const zipSha256 = await sha256HexBytes(packaged.bytes);
      const packageRange = parseBoundedByteRange(
        request.headers.get("range"),
        packaged.bytes.byteLength,
        ATTACHMENT_PACKAGE_RANGE_MAX_BYTES,
        "attachment_package_range_too_large",
      );
      if (!packageRange.ok) {
        return json({ error: packageRange.error }, 416, {
          "content-range": `bytes */${packaged.bytes.byteLength}`,
          "accept-ranges": "bytes",
        });
      }
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "attachment.package_downloaded",
        {
          objectCount: packaged.objectCount,
          totalSizeBytes: packaged.totalSourceBytes,
          zipSizeBytes: packaged.bytes.byteLength,
          zipSha256,
          packagePlanId,
          rangeStart: packageRange.range?.start ?? null,
          rangeEnd: packageRange.range?.end ?? null,
        },
      );
      const packageBytes = packageRange.range
        ? packaged.bytes.slice(packageRange.range.start, packageRange.range.end + 1)
        : packaged.bytes;

      return new Response(copyArrayBuffer(packageBytes), {
        status: packageRange.range ? 206 : 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${safeAttachmentPackageName(workspaceId)}"`,
          "content-length": String(packageRange.range?.length ?? packaged.bytes.byteLength),
          "accept-ranges": "bytes",
          ...(packageRange.range ? { "content-range": `bytes ${packageRange.range.start}-${packageRange.range.end}/${packaged.bytes.byteLength}` } : {}),
          "x-film-package-object-count": String(packaged.objectCount),
          "x-film-package-total-source-bytes": String(packaged.totalSourceBytes),
          "x-film-package-sha256": zipSha256,
          "x-film-audit-persistence": auditPersistence,
        },
      });
    }

    if (url.pathname === "/api/attachments/r2/object" && request.method === "GET") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const workspaceId = url.searchParams.get("workspaceId")?.trim() ?? "";
      const objectKey = url.searchParams.get("objectKey")?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidAttachmentObjectKey(workspaceId, objectKey)) {
        return json({ error: "invalid_attachment_object_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }
      if (!env.DB) {
        return json({ error: "attachment_manifest_storage_required" }, 503);
      }
      if (!env.ATTACHMENTS) {
        return json({ error: "r2_binding_unavailable" }, 503);
      }

      const row = await findStoredAttachmentObject(env.DB, workspaceId, objectKey);
      if (!row) {
        return json({ error: "attachment_object_not_found" }, 404);
      }
      const range = parseAttachmentObjectRange(request.headers.get("range"), row.size_bytes);
      if (!range.ok) {
        return json({ error: range.error }, 416, {
          "content-range": `bytes */${row.size_bytes}`,
          "accept-ranges": "bytes",
        });
      }
      const object = await env.ATTACHMENTS.get(objectKey);
      if (!object?.body) {
        return json({ error: "attachment_object_bytes_missing" }, 404);
      }
      const responseBody = range.range
        ? (await new Response(object.body).arrayBuffer()).slice(range.range.start, range.range.end + 1)
        : object.body;

      await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "attachment.object_downloaded",
        {
          docId: row.doc_id,
          objectKey,
          sizeBytes: row.size_bytes,
          sha256: row.sha256,
          rangeStart: range.range?.start ?? null,
          rangeEnd: range.range?.end ?? null,
        },
      );

      return new Response(responseBody, {
        status: range.range ? 206 : 200,
        headers: {
          "content-type": row.content_type,
          "content-disposition": `attachment; filename="${safeDownloadName(row.name)}"`,
          "content-length": String(range.range?.length ?? row.size_bytes),
          "accept-ranges": "bytes",
          ...(range.range ? { "content-range": `bytes ${range.range.start}-${range.range.end}/${row.size_bytes}` } : {}),
          "x-film-doc-id": row.doc_id,
          "x-film-sha256": row.sha256,
        },
      });
    }

    if (url.pathname === "/api/auth/magic-link/request" && request.method === "POST") {
      const body = await readJson<MagicLinkRequest>(request);
      const email = body.email?.trim().toLowerCase();
      if (!email || !isValidEmail(email)) {
        return json({ error: "invalid_email" }, 400);
      }

      const emailHash = await sha256Hex(email);
      const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_SECONDS * 1000).toISOString();
      const liveDelivery = isLiveMagicLinkDelivery(env);
      if (liveDelivery) {
        const member = env.DB ? await findWorkspaceMemberByEmailHash(env.DB, emailHash) : null;
        if (!member || normalizeWorkspaceMemberStatus(member.status) !== "active") {
          return json({
            ok: true,
            dryRun: false,
            delivery: "email_if_eligible",
            persistence: "d1_member_required",
            emailHash: null,
            devOnlyToken: null,
            expiresAt,
            expiresInMinutes: MAGIC_LINK_TTL_SECONDS / 60,
          }, 202);
        }

        const token = `magic_${crypto.randomUUID()}_${crypto.randomUUID()}`;
        const record = await recordMagicLinkRequest(env.DB, member.workspace_id, emailHash, token, expiresAt);
        const persistence = record.persistence;
        const delivery = persistence === "d1_kv_auth_records" && record.magicLinkId
          ? await deliverLiveMagicLink(env, email, token, expiresAt, record.magicLinkId)
          : { sent: false, errorCode: "auth_storage_unavailable" };
        await recordAuditEvent(
          env.DB,
          member.workspace_id,
          null,
          null,
          delivery.sent ? "auth.magic_link_sent" : "auth.magic_link_delivery_failed",
          {
            provider: "resend",
            deliveryMode: "live_resend",
            errorCode: delivery.errorCode,
          },
        );
        if (!delivery.sent) {
          await expireMagicLink(env.DB, token);
        }
        return json({
          ok: true,
          dryRun: false,
          delivery: "email_if_eligible",
          persistence,
          emailHash: null,
          devOnlyToken: null,
          expiresAt,
          expiresInMinutes: MAGIC_LINK_TTL_SECONDS / 60,
        }, 202);
      }

      const token = `dry_${crypto.randomUUID()}`;
      const persistence = (await recordMagicLinkRequest(env.DB, null, emailHash, token, expiresAt)).persistence;
      return json({
        ok: true,
        dryRun: true,
        delivery: "not_sent",
        persistence,
        emailHash,
        devOnlyToken: token,
        expiresAt,
        expiresInMinutes: MAGIC_LINK_TTL_SECONDS / 60,
      });
    }

    if (url.pathname === "/api/auth/magic-link/verify" && request.method === "POST") {
      const body = await readJson<MagicLinkVerifyRequest>(request);
      if (!isValidMagicLinkToken(body.token)) {
        return json({ error: "invalid_or_expired_token" }, 401);
      }

      const sessionId = `sess_${crypto.randomUUID()}`;
      const csrfToken = `csrf_${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
      const verification = await verifyMagicLinkAndRecordSession(env, body.token, request, sessionId, csrfToken, expiresAt);
      if (!verification.ok) {
        return json({ error: verification.error }, 401);
      }

      return json(
        {
          ok: true,
          dryRun: !isLiveMagicLinkDelivery(env),
          persistence: verification.persistence,
          session: {
            id: sessionId,
            role: verification.role,
            csrfToken,
            expiresAt,
          },
        },
        200,
        {
          "set-cookie": `film_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`,
        },
      );
    }

    if (url.pathname === "/api/auth/session" && request.method === "GET") {
      const session = await readCurrentSessionMetadata(request, env);
      if (!session.ok) {
        return json({
          error: session.error,
          persistence: session.persistence,
          session: null,
        }, session.status);
      }

      return json({
        ok: true,
        dryRun: !isLiveMagicLinkDelivery(env),
        persistence: session.persistence,
        session: session.session,
      });
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const csrf = request.headers.get("x-film-csrf");
      if (!csrf || csrf.length < 12) {
        return json({ error: "missing_csrf" }, 403);
      }

      const sessionId = getCookie(request.headers.get("cookie"), "film_session");
      const logoutResult = await revokeSession(env, sessionId, csrf);
      if (!logoutResult.ok) {
        return json({ error: logoutResult.error, persistence: logoutResult.persistence }, logoutResult.status);
      }

      return json(
        {
          ok: true,
          dryRun: !isLiveMagicLinkDelivery(env),
          persistence: logoutResult.persistence,
          session: null,
        },
        200,
        {
          "set-cookie": "film_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      );
    }

    if (url.pathname === "/api/invites/delivery-readiness" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<WorkspaceInviteDeliveryReadinessRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId)) {
        return json({ error: "invalid_workspace" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: auth.persistence,
        readiness: inviteDeliveryReadiness(env),
      });
    }

    if (url.pathname === "/api/invites/manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<WorkspaceInviteManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit === undefined ? 50 : body.limit;
      if (!isValidWorkspaceId(workspaceId) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return json({ error: "invalid_invite_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await listWorkspaceInviteManifest(env.DB, workspaceId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "invite.manifest_created",
        {
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: manifest.persistence,
        auditPersistence,
        workspaceId,
        manifestPolicy: "pending_invites_hash_only",
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        invites: manifest.invites,
      });
    }

    if (url.pathname === "/api/invites/delivery-suppressions" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<InviteDeliverySuppressionManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit === undefined ? 50 : body.limit;
      if (!isValidWorkspaceId(workspaceId) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return json({ error: "invalid_invite_delivery_suppression_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await listInviteDeliverySuppressionManifest(env.DB, workspaceId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "invite.delivery_suppression_manifest_created",
        {
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: manifest.persistence,
        auditPersistence,
        workspaceId,
        manifestPolicy: "invite_delivery_suppressions_hash_only",
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        suppressions: manifest.suppressions,
      });
    }

    if (url.pathname === "/api/invites/revoke-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<WorkspaceInviteRevokeRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const inviteId = body.inviteId?.trim() ?? "";
      const emailHash = body.emailHash?.trim() ?? "";
      const role = body.role?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(inviteId) || !isValidSha256Hex(emailHash) || !isAuthRole(role)) {
        return json({ error: "invalid_invite_revoke_request" }, 400);
      }
      if (role === "owner" && auth.role !== "owner") {
        return json({ error: "insufficient_invite_revoke_role", persistence: auth.persistence }, 403);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await revokeWorkspaceInvite(env.DB, workspaceId, inviteId, emailHash, role, auth.memberId);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        revokePolicy: "pending_invite_exact_match_only",
        invite: result.invite,
      });
    }

    if (url.pathname === "/api/invites/create-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<WorkspaceInviteCreateRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const email = body.email?.trim().toLowerCase() ?? "";
      const role = body.role?.trim() ?? "";
      const expiresInDays = body.expiresInDays === undefined ? 7 : body.expiresInDays;
      if (!isValidWorkspaceId(workspaceId) || !isValidEmail(email) || !isAuthRole(role) || !Number.isSafeInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
        return json({ error: "invalid_invite_request" }, 400);
      }
      if (role === "owner" && auth.role !== "owner") {
        return json({ error: "insufficient_invite_role", persistence: auth.persistence }, 403);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const emailHash = await sha256Hex(email);
      const suppression = await findInviteDeliverySuppressionForTarget(env.DB, emailHash);
      if (env.DB && suppression.persistence !== "d1_invite_delivery_suppressions") {
        return json({
          error: "invite_delivery_suppression_check_unavailable",
          persistence: suppression.persistence,
        }, 503);
      }
      if (suppression.suppression) {
        const auditPersistence = await recordAuditEvent(
          env.DB,
          workspaceId,
          null,
          auth.memberId,
          "invite.delivery_suppressed_blocked",
          {
            targetHash: emailHash,
            suppressionId: suppression.suppression.id,
            suppressionReason: suppression.suppression.reason,
            persistence: suppression.persistence,
          },
        );
        return json({
          ok: false,
          dryRun: true,
          error: "invite_delivery_suppressed",
          delivery: "blocked_suppressed",
          persistence: suppression.persistence,
          auditPersistence,
          suppressionPolicy: "invite_delivery_suppression_blocks_invite_creation",
          suppression: {
            id: suppression.suppression.id,
            provider: suppression.suppression.provider,
            targetHash: suppression.suppression.targetHash,
            reason: suppression.suppression.reason,
            lastSeenAt: suppression.suppression.lastSeenAt,
          },
        }, 409);
      }

      const result = await createWorkspaceInvite(env.DB, workspaceId, email, role, expiresInDays, auth.memberId);
      if (env.DB && result.persistence !== "d1_invite_records") {
        return json({
          error: "invite_creation_unavailable",
          persistence: result.persistence,
        }, 503);
      }
      const delivery = await deliverWorkspaceInvite(env, {
        workspaceId,
        inviteId: result.invite.id,
        actorMemberId: auth.memberId,
        targetEmail: email,
        targetHash: result.invite.emailHash,
        role,
        token: result.invite.devOnlyInviteToken ?? "",
        expiresAt: result.invite.expiresAt,
      });
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "invite.dry_run_created",
        {
          inviteId: result.invite.id,
          emailHash: result.invite.emailHash,
          role,
          persistence: result.persistence,
          deliveryStatus: delivery.summary.status,
          deliveryMode: delivery.summary.deliveryMode,
          deliveryPersistence: delivery.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: delivery.summary.deliveryMode === "dry_run_outbox",
        delivery: delivery.summary.status,
        persistence: result.persistence,
        deliveryPersistence: delivery.persistence,
        auditPersistence,
        deliveryAttempt: delivery.summary,
        invite: {
          ...result.invite,
          devOnlyInviteToken: delivery.exposeInviteToken ? result.invite.devOnlyInviteToken : null,
        },
      });
    }

    if (url.pathname === "/api/invites/accept-dry-run" && request.method === "POST") {
      const body = await readJson<WorkspaceInviteAcceptRequest>(request);
      const token = body.token?.trim() ?? "";
      const displayName = body.displayName?.trim().slice(0, 120) ?? "";
      if (!isValidInviteToken(token) || (body.displayName !== undefined && !displayName)) {
        return json({ error: "invalid_invite_acceptance" }, 400);
      }

      const result = await acceptWorkspaceInvite(env.DB, token, displayName);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        member: result.member,
      });
    }

    if (url.pathname === "/api/members/status/dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<WorkspaceMemberStatusUpdateRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const memberId = body.memberId?.trim() ?? "";
      const status = body.status?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(memberId) || !isManagedWorkspaceMemberStatus(status)) {
        return json({ error: "invalid_member_status_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await updateWorkspaceMemberStatus(
        sessionMutationDatabase(env, auth.workspaceId),
        workspaceId,
        memberId,
        status,
        auth.role,
        auth.memberId,
      );
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        sessionPolicy: status === "disabled" ? "target_sessions_revoked" : "no_session_revocation_required",
        member: result.member,
      });
    }

    if (url.pathname === "/api/projects/memberships/assign-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<ProjectMembershipAssignRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const projectTitle = body.projectTitle?.trim().slice(0, 160) ?? "";
      const memberId = body.memberId?.trim() ?? "";
      const role = body.role?.trim() ?? "";
      const department = body.department?.trim().slice(0, 80) || null;
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(projectId) || !isValidRecordId(memberId) || !isAuthRole(role)) {
        return json({ error: "invalid_project_membership_request" }, 400);
      }
      if (role === "owner" && auth.role !== "owner") {
        return json({ error: "insufficient_assignment_role", persistence: auth.persistence }, 403);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await assignProjectMembership(
        sessionMutationDatabase(env, auth.workspaceId),
        workspaceId,
        projectId,
        projectTitle,
        memberId,
        role,
        department,
        auth.memberId,
      );
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        membership: result.membership,
      });
    }

    if (url.pathname === "/api/projects/memberships/manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<ProjectMembershipManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const limit = body.limit === undefined ? 50 : body.limit;
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(projectId) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return json({ error: "invalid_project_membership_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await listProjectMembershipManifest(env.DB, workspaceId, projectId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        projectId,
        auth.memberId,
        "project_membership.manifest_created",
        {
          projectId,
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: manifest.persistence,
        auditPersistence,
        workspaceId,
        projectId,
        manifestPolicy: "active_project_memberships_only",
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        memberships: manifest.memberships,
      });
    }

    if (url.pathname === "/api/projects/memberships/revoke-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<ProjectMembershipRevokeRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const memberId = body.memberId?.trim() ?? "";
      const role = body.role?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(projectId) || !isValidRecordId(memberId) || !isAuthRole(role)) {
        return json({ error: "invalid_project_membership_revoke_request" }, 400);
      }
      if (role === "owner" && auth.role !== "owner") {
        return json({ error: "insufficient_membership_revoke_role", persistence: auth.persistence }, 403);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await revokeProjectMembership(env.DB, workspaceId, projectId, memberId, role, auth.memberId);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        revokePolicy: "exact_project_membership_match_only",
        membership: result.membership,
      });
    }

    if (url.pathname === "/api/projects/memberships/history" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<ProjectMembershipHistoryRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const limit = body.limit === undefined ? 20 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(projectId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 50
      ) {
        return json({ error: "invalid_project_membership_history_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const project = await readRecordOwnerManifest(env.DB, workspaceId, "project", projectId);
      if (!project.ok) {
        return json({ error: project.error, persistence: project.persistence }, project.status);
      }

      const history = await listProjectMembershipHistory(env.DB, workspaceId, projectId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        projectId,
        auth.memberId,
        "project_membership.history_manifest_created",
        {
          projectId,
          rowCount: history.rowCount,
          truncated: history.truncated,
          persistence: history.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: history.persistence,
        auditPersistence,
        historyPolicy: "project_membership_audit_history",
        workspaceId,
        projectId,
        rowCount: history.rowCount,
        truncated: history.truncated,
        entries: history.entries,
      });
    }

    if (url.pathname === "/api/projects/film-profile/mutation-preflight" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<FilmProfileMutationPreflightRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const fieldKeys: FilmProfileMutationFieldKey[] = Array.isArray(body.fieldKeys) && body.fieldKeys.length > 0
        ? normalizeFilmProfileMutationFieldKeys(body.fieldKeys)
        : getFilmProfileMutationFieldDefinitions().map((field) => field.key);
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(projectId) || fieldKeys.length === 0) {
        return json({ error: "invalid_film_profile_mutation_preflight_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const profile = await readFilmProfileMutationSnapshot(env.DB, workspaceId, projectId);
      if (!profile.ok) {
        return json({ error: profile.error, persistence: profile.persistence, destructiveWrite: false }, profile.status);
      }

      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        projectId,
        auth.memberId,
        "film_profile_mutation.preflight_checked",
        {
          projectId,
          fieldKeys,
          expectedUpdatedAt: profile.profile.expectedUpdatedAt,
          destructiveWrite: false,
          persistence: profile.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: profile.persistence,
        auditPersistence,
        profileMutationPolicy: "film_profile_stale_check_preflight",
        fieldDefinitions: getFilmProfileMutationFieldDefinitions().filter((field) => fieldKeys.includes(field.key)),
        fieldKeys,
        profile: profile.profile,
      });
    }

    if (url.pathname === "/api/projects/film-profile/mutations/request-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<FilmProfileMutationRequestCreateRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const summary = body.summary?.trim() ?? "";
      const fieldKeys = normalizeFilmProfileMutationFieldKeys(body.fieldKeys ?? []);
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(projectId)
        || summary.length < 1
        || summary.length > 500
        || fieldKeys.length === 0
      ) {
        return json({ error: "invalid_film_profile_mutation_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await createFilmProfileMutationRequest(env.DB, workspaceId, projectId, auth.memberId, summary, fieldKeys);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence, destructiveWrite: false }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        requestPolicy: "film_profile_mutation_request_metadata_only",
        request: result.request,
      });
    }

    if (url.pathname === "/api/projects/film-profile/mutations/requests/manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<FilmProfileMutationRequestManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const projectId = body.projectId?.trim() ?? "";
      const limit = body.limit === undefined ? 20 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(projectId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 50
      ) {
        return json({ error: "invalid_film_profile_mutation_request_manifest_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const profile = await readFilmProfileMutationSnapshot(env.DB, workspaceId, projectId);
      if (!profile.ok) {
        return json({ error: profile.error, persistence: profile.persistence, destructiveWrite: false }, profile.status);
      }

      const manifest = await listFilmProfileMutationRequests(env.DB, workspaceId, projectId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        projectId,
        auth.memberId,
        "film_profile_mutation.request_manifest_created",
        {
          projectId,
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          destructiveWrite: false,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: manifest.persistence,
        auditPersistence,
        manifestPolicy: "film_profile_mutation_request_manifest",
        workspaceId,
        projectId,
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        requests: manifest.requests,
      });
    }

    if (url.pathname === "/api/projects/film-profile/mutations/requests/resolve-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<FilmProfileMutationRequestResolveRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      const decision = body.decision?.trim() ?? "";
      const note = body.note?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(requestId)
        || !isRecordMutationResolutionDecision(decision)
        || note.length > 500
      ) {
        return json({ error: "invalid_film_profile_mutation_resolution_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await resolveFilmProfileMutationRequest(env.DB, workspaceId, requestId, decision, auth.memberId, note);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence, destructiveWrite: false }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        resolutionPolicy: "film_profile_mutation_owner_producer_resolution",
        request: result.request,
      });
    }

    if (url.pathname === "/api/projects/film-profile/mutations/diff-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<FilmProfileMutationDiffPreviewRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(requestId)) {
        return json({ error: "invalid_film_profile_mutation_diff_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await previewFilmProfileMutationRequestDiff(env.DB, workspaceId, requestId, body.updates);
      if (!result.ok) {
        return json({
          error: result.error,
          persistence: result.persistence,
          destructiveWrite: false,
          request: result.request ?? null,
        }, result.status);
      }

      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        result.preview.request.projectId,
        auth.memberId,
        "film_profile_mutation.diff_previewed",
        {
          requestId,
          projectId: result.preview.request.projectId,
          fieldKeys: result.preview.fieldDiffs.map((diff) => diff.key),
          stale: result.preview.stale,
          destructiveWrite: false,
          persistence: result.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence,
        diffPolicy: "approved_film_profile_mutation_diff_preview",
        request: result.preview.request,
        stale: result.preview.stale,
        currentUpdatedAt: result.preview.currentUpdatedAt,
        expectedUpdatedAt: result.preview.expectedUpdatedAt,
        fieldDiffs: result.preview.fieldDiffs,
        rollbackGuidance: result.preview.rollbackGuidance,
      });
    }

    if (url.pathname === "/api/projects/film-profile/mutations/apply" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<FilmProfileMutationApplyRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      const confirmation = body.confirmation?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(requestId)
        || confirmation !== `APPLY FILM PROFILE MUTATION ${requestId}`
      ) {
        return json({ error: "invalid_film_profile_mutation_apply_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await applyFilmProfileMutationRequest(env.DB, workspaceId, requestId, body.updates, auth.memberId);
      if (!result.ok) {
        return json({
          error: result.error,
          persistence: result.persistence,
          destructiveWrite: false,
          request: result.request ?? null,
        }, result.status);
      }

      return json({
        ok: true,
        dryRun: false,
        destructiveWrite: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        applicationPolicy: "approved_film_profile_mutation_stale_checked",
        request: result.request,
        application: result.application,
      });
    }

    if (url.pathname === "/api/records/permissions/assign-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordPermissionAssignRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const memberId = body.memberId?.trim() ?? "";
      const permission = body.permission?.trim() ?? "";
      const department = body.department?.trim().slice(0, 80) || null;
      const expiresAt = body.expiresAt?.trim() || null;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isRecordPermissionEntityType(entityType)
        || !isValidRecordId(entityId)
        || !isValidRecordId(memberId)
        || !isRecordPermissionLevel(permission)
        || (expiresAt !== null && Number.isNaN(Date.parse(expiresAt)))
      ) {
        return json({ error: "invalid_record_permission_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await assignRecordPermission(
        env.DB,
        workspaceId,
        entityType,
        entityId,
        memberId,
        permission,
        department,
        expiresAt,
        auth.memberId,
      );
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        permission: result.permission,
      });
    }

    if (url.pathname === "/api/records/permissions/revoke-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordPermissionRevokeRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const permissionId = body.permissionId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const memberId = body.memberId?.trim() ?? "";
      const permission = body.permission?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(permissionId)
        || !isRecordPermissionEntityType(entityType)
        || !isValidRecordId(entityId)
        || !isValidRecordId(memberId)
        || !isRecordPermissionLevel(permission)
      ) {
        return json({ error: "invalid_record_permission_revoke_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await revokeRecordPermission(
        env.DB,
        workspaceId,
        permissionId,
        entityType,
        entityId,
        memberId,
        permission,
        auth.memberId,
      );
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        revokePolicy: "exact_permission_match_only",
        permission: result.permission,
      });
    }

    if (url.pathname === "/api/records/owners/transfer-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordOwnerTransferRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const memberId = body.memberId?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isCoreRecordOwnerEntityType(entityType)
        || !isValidRecordId(entityId)
        || !isValidRecordId(memberId)
      ) {
        return json({ error: "invalid_record_owner_transfer_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await transferRecordOwner(env.DB, workspaceId, entityType, entityId, memberId, auth.memberId);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        transferPolicy: "core_record_owner_update",
        owner: result.owner,
      });
    }

    if (url.pathname === "/api/records/owners/manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordOwnerManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isCoreRecordOwnerEntityType(entityType)
        || !isValidRecordId(entityId)
      ) {
        return json({ error: "invalid_record_owner_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        entityType === "project" ? entityId : null,
        auth.memberId,
        "record_owner.manifest_created",
        {
          entityType,
          entityId,
          ownerPresent: Boolean(result.owner.ownerMemberId),
          persistence: result.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence,
        manifestPolicy: "core_record_owner_metadata_only",
        owner: result.owner,
      });
    }

    if (url.pathname === "/api/records/owners/history" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordOwnerHistoryRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const limit = body.limit === undefined ? 20 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isCoreRecordOwnerEntityType(entityType)
        || !isValidRecordId(entityId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 50
      ) {
        return json({ error: "invalid_record_owner_history_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!manifest.ok) {
        return json({ error: manifest.error, persistence: manifest.persistence }, manifest.status);
      }

      const result = await listRecordOwnerHistory(env.DB, workspaceId, entityType, entityId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        entityType === "project" ? entityId : null,
        auth.memberId,
        "record_owner.history_manifest_created",
        {
          entityType,
          entityId,
          rowCount: result.rowCount,
          truncated: result.truncated,
          persistence: result.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence,
        historyPolicy: "record_owner_transfer_audit_only",
        workspaceId,
        entityType,
        entityId,
        rowCount: result.rowCount,
        truncated: result.truncated,
        entries: result.entries,
      });
    }

    if (url.pathname === "/api/records/mutations/preflight" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationPreflightRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const mutation = body.mutation?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isCoreRecordOwnerEntityType(entityType)
        || !isValidRecordId(entityId)
        || !isRecordMutationKind(mutation)
      ) {
        return json({ error: "invalid_record_mutation_preflight_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const record = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!record.ok) {
        return json({ error: record.error, persistence: record.persistence }, record.status);
      }

      const authorization = await authorizeRecordMutationPreflight(env.DB, workspaceId, entityType, entityId, mutation, auth.role, auth.memberId);
      if (!authorization.ok) {
        return json({ error: authorization.error, persistence: authorization.persistence }, authorization.status);
      }

      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        entityType === "project" ? entityId : null,
        auth.memberId,
        "record_mutation.preflight_checked",
        {
          entityType,
          entityId,
          mutation,
          allowedBy: authorization.preflight.allowedBy,
          persistence: authorization.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: authorization.persistence,
        auditPersistence,
        mutationPolicy: "core_record_mutation_authorization_preflight",
        preflight: authorization.preflight,
      });
    }

    if (url.pathname === "/api/records/mutations/request-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationRequestCreateRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const mutation = body.mutation?.trim() ?? "";
      const summary = body.summary?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isCoreRecordOwnerEntityType(entityType)
        || !isValidRecordId(entityId)
        || !isRecordMutationKind(mutation)
        || summary.length < 1
        || summary.length > 500
      ) {
        return json({ error: "invalid_record_mutation_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }
      const fieldKeyRequest = parseRecordMutationFieldKeyRequest(entityType, mutation, body.fieldKeys);
      if (!fieldKeyRequest.ok) {
        return json({ error: fieldKeyRequest.error }, 400);
      }
      const fieldKeys = fieldKeyRequest.fieldKeys;

      const record = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!record.ok) {
        return json({ error: record.error, persistence: record.persistence }, record.status);
      }

      const authorization = await authorizeRecordMutationPreflight(env.DB, workspaceId, entityType, entityId, mutation, auth.role, auth.memberId);
      if (!authorization.ok) {
        return json({ error: authorization.error, persistence: authorization.persistence }, authorization.status);
      }

      const result = await createRecordMutationRequest(
        env.DB,
        workspaceId,
        entityType,
        entityId,
        mutation,
        auth.memberId,
        authorization.preflight.allowedBy,
        summary,
        fieldKeys,
      );
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      const requestPolicy: RecordMutationRequestPolicy = "record_mutation_request_metadata_only";
      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        requestPolicy,
        request: result.request,
      });
    }

    if (url.pathname === "/api/records/mutations/requests/manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationRequestManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const limit = body.limit === undefined ? 20 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isCoreRecordOwnerEntityType(entityType)
        || !isValidRecordId(entityId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 50
      ) {
        return json({ error: "invalid_record_mutation_request_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const record = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!record.ok) {
        return json({ error: record.error, persistence: record.persistence }, record.status);
      }

      const manifest = await listRecordMutationRequests(env.DB, workspaceId, entityType, entityId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        entityType === "project" ? entityId : null,
        auth.memberId,
        "record_mutation.request_manifest_created",
        {
          entityType,
          entityId,
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: manifest.persistence,
        auditPersistence,
        manifestPolicy: "record_mutation_request_manifest",
        workspaceId,
        entityType,
        entityId,
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        requests: manifest.requests,
      });
    }

    if (url.pathname === "/api/records/mutations/requests/resolve-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationRequestResolveRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      const decision = body.decision?.trim() ?? "";
      const note = body.note?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(requestId)
        || !isRecordMutationResolutionDecision(decision)
        || note.length > 500
      ) {
        return json({ error: "invalid_record_mutation_resolution_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await resolveRecordMutationRequest(env.DB, workspaceId, requestId, decision, auth.memberId, note);
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        resolutionPolicy: "record_mutation_owner_producer_resolution",
        request: result.request,
      });
    }

    if (url.pathname === "/api/records/mutations/diff-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationDiffPreviewRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(requestId)) {
        return json({ error: "invalid_record_mutation_diff_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await previewRecordMutationRequestDiff(env.DB, workspaceId, requestId, body.updates);
      if (!result.ok) {
        return json({
          error: result.error,
          persistence: result.persistence,
          destructiveWrite: false,
          request: result.request ?? null,
        }, result.status);
      }

      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        result.preview.request.entityType === "project" ? result.preview.request.entityId : null,
        auth.memberId,
        "record_mutation.diff_previewed",
        {
          requestId,
          entityType: result.preview.request.entityType,
          entityId: result.preview.request.entityId,
          mutation: result.preview.request.mutation,
          fieldKeys: result.preview.fieldDiffs.map((diff) => diff.key),
          stale: result.preview.stale,
          destructiveWrite: false,
          persistence: result.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence,
        diffPolicy: "approved_record_mutation_diff_preview",
        request: result.preview.request,
        stale: result.preview.stale,
        currentUpdatedAt: result.preview.currentUpdatedAt,
        expectedUpdatedAt: result.preview.expectedUpdatedAt,
        fieldDiffs: result.preview.fieldDiffs,
        rollbackGuidance: result.preview.rollbackGuidance,
      });
    }

    if (url.pathname === "/api/records/mutations/requests/rollback-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationRollbackRequestCreateRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      const summary = body.summary?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(requestId)
        || summary.length > 500
      ) {
        return json({ error: "invalid_record_mutation_rollback_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await createRecordMutationRollbackRequest(env.DB, workspaceId, requestId, auth.memberId, summary);
      if (!result.ok) {
        return json({
          error: result.error,
          persistence: result.persistence,
          destructiveWrite: false,
          sourceRequest: result.sourceRequest ?? null,
        }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        rollbackPolicy: "applied_update_inverse_mutation_request",
        sourceRequest: result.rollback.sourceRequest,
        request: result.rollback.rollbackRequest,
        suggestedUpdates: result.rollback.suggestedUpdates,
      });
    }

    if (url.pathname === "/api/records/mutations/requests/delete-recovery-plan" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationDeleteRecoveryPlanRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(requestId)) {
        return json({ error: "invalid_record_mutation_delete_recovery_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await createRecordMutationDeleteRecoveryPlan(env.DB, workspaceId, requestId);
      if (!result.ok) {
        return json({
          error: result.error,
          persistence: result.persistence,
          destructiveWrite: false,
          sourceRequest: result.sourceRequest ?? null,
        }, result.status);
      }

      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        result.sourceRequest.entityType === "project" ? result.sourceRequest.entityId : null,
        auth.memberId,
        "record_mutation.delete_recovery_planned",
        {
          requestId,
          entityType: result.sourceRequest.entityType,
          entityId: result.sourceRequest.entityId,
          deletedAt: result.plan.deletedAt,
          destructiveWrite: false,
          persistence: result.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: result.persistence,
        auditPersistence,
        recoveryPolicy: "deleted_record_backup_or_recreate_plan",
        sourceRequest: result.sourceRequest,
        recoveryPlan: result.plan,
      });
    }

    if (url.pathname === "/api/records/mutations/requests/audit-manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationAuditManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      const limit = body.limit === undefined ? 20 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(requestId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 50
      ) {
        return json({ error: "invalid_record_mutation_audit_manifest_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await listRecordMutationAuditManifest(env.DB, workspaceId, requestId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        manifest.request?.entityType === "project" ? manifest.request.entityId : null,
        auth.memberId,
        "record_mutation.audit_manifest_created",
        {
          requestId,
          entityType: manifest.request?.entityType ?? null,
          entityId: manifest.request?.entityId ?? null,
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          destructiveWrite: false,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        destructiveWrite: false,
        persistence: manifest.persistence,
        auditPersistence,
        manifestPolicy: "record_mutation_request_audit_manifest",
        metadataPolicy: "keys_only",
        workspaceId,
        requestId,
        request: manifest.request,
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        rollbackGuidance: manifest.rollbackGuidance,
        events: manifest.events,
      });
    }

    if (url.pathname === "/api/records/mutations/apply" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordMutationRequestApplyRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const requestId = body.requestId?.trim() ?? "";
      const confirmation = body.confirmation?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isValidRecordId(requestId)
        || confirmation !== `APPLY MUTATION ${requestId}`
      ) {
        return json({ error: "invalid_record_mutation_apply_request", destructiveWrite: false }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const result = await applyRecordMutationRequest(env.DB, workspaceId, requestId, body.updates, auth.memberId);
      if (!result.ok) {
        return json({
          error: result.error,
          persistence: result.persistence,
          destructiveWrite: false,
          request: result.request ?? null,
        }, result.status);
      }

      return json({
        ok: true,
        dryRun: false,
        destructiveWrite: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        applicationPolicy: "approved_record_mutation_stale_checked",
        request: result.request,
        application: result.application,
      });
    }

    if (url.pathname === "/api/records/comments/dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordCommentIntentRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const commentBody = body.body?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !isRecordCommentEntityType(entityType)
        || !isValidRecordId(entityId)
        || commentBody.length < 1
        || commentBody.length > 2000
      ) {
        return json({ error: "invalid_record_comment_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!manifest.ok) {
        return json({ error: manifest.error, persistence: manifest.persistence }, manifest.status);
      }

      const authorization = await authorizeRecordCommentIntent(env.DB, workspaceId, entityType, entityId, auth.role, auth.memberId);
      if (!authorization.ok) {
        return json({ error: authorization.error, persistence: authorization.persistence }, authorization.status);
      }

      const result = await createRecordCommentIntent(
        env.DB,
        workspaceId,
        entityType,
        entityId,
        auth.role,
        auth.memberId,
        commentBody,
      );
      if (!result.ok) {
        return json({ error: result.error, persistence: result.persistence }, result.status);
      }

      return json({
        ok: true,
        dryRun: true,
        persistence: result.persistence,
        auditPersistence: result.auditPersistence,
        commentPolicy: "metadata_only_comment_intent",
        comment: result.comment,
      });
    }

    if (url.pathname === "/api/records/comments/manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordCommentManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const limit = body.limit === undefined ? 20 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isRecordCommentEntityType(entityType)
        || !isValidRecordId(entityId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 50
      ) {
        return json({ error: "invalid_record_comment_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const record = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!record.ok) {
        return json({ error: record.error, persistence: record.persistence }, record.status);
      }

      const authorization = await authorizeRecordCommentIntent(env.DB, workspaceId, entityType, entityId, auth.role, auth.memberId);
      if (!authorization.ok) {
        return json({ error: authorization.error, persistence: authorization.persistence }, authorization.status);
      }

      const manifest = await listRecordCommentIntents(env.DB, workspaceId, entityType, entityId, limit);
      const manifestPolicy: RecordCommentManifestPolicy = "metadata_only_comment_intent_manifest";
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        entityType === "project" ? entityId : null,
        auth.memberId,
        "record_comment.manifest_created",
        {
          entityType,
          entityId,
          manifestPolicy,
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: manifest.persistence,
        auditPersistence,
        manifestPolicy,
        workspaceId,
        entityType,
        entityId,
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        comments: manifest.comments,
      });
    }

    if (url.pathname === "/api/records/permissions/history" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<RecordPermissionHistoryRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const limit = body.limit === undefined ? 20 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isRecordPermissionHistoryEntityType(entityType)
        || !isValidRecordId(entityId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 50
      ) {
        return json({ error: "invalid_record_permission_history_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const record = await readRecordOwnerManifest(env.DB, workspaceId, entityType, entityId);
      if (!record.ok) {
        return json({ error: record.error, persistence: record.persistence }, record.status);
      }

      const history = await listRecordPermissionHistory(env.DB, workspaceId, entityType, entityId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        entityType === "project" ? entityId : null,
        auth.memberId,
        "record_permission.history_manifest_created",
        {
          entityType,
          entityId,
          rowCount: history.rowCount,
          truncated: history.truncated,
          persistence: history.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: history.persistence,
        auditPersistence,
        historyPolicy: "record_permission_audit_history",
        workspaceId,
        entityType,
        entityId,
        rowCount: history.rowCount,
        truncated: history.truncated,
        entries: history.entries,
      });
    }

    if (
      (url.pathname === "/api/records/permissions/manifest"
        || url.pathname === "/api/records/permissions/expired-manifest")
      && request.method === "POST"
    ) {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const manifestMode: RecordPermissionManifestMode = url.pathname === "/api/records/permissions/expired-manifest"
        ? "expired"
        : "active";
      const manifestPolicy: RecordPermissionManifestPolicy = manifestMode === "expired"
        ? "expired_record_permissions_only"
        : "active_record_permissions_only";
      const body = await readJson<RecordPermissionManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const entityType = body.entityType?.trim() ?? "";
      const entityId = body.entityId?.trim() ?? "";
      const limit = body.limit === undefined ? 50 : body.limit;
      if (
        !isValidWorkspaceId(workspaceId)
        || !isRecordPermissionEntityType(entityType)
        || !isValidRecordId(entityId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 100
      ) {
        return json({ error: "invalid_record_permission_manifest_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await listRecordPermissionManifest(env.DB, workspaceId, entityType, entityId, limit, manifestMode);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        entityType === "project" ? entityId : null,
        auth.memberId,
        manifestMode === "expired" ? "record_permission.expired_manifest_created" : "record_permission.manifest_created",
        {
          entityType,
          entityId,
          manifestPolicy,
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          persistence: manifest.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: manifest.persistence,
        auditPersistence,
        workspaceId,
        entityType,
        entityId,
        manifestPolicy,
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        permissions: manifest.permissions,
      });
    }

    if (url.pathname === "/api/backups/dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const snapshot = createBackupSnapshot(seedWorkspace);
      if (!hasWorkspaceAccess(auth, snapshot.workspaceId)) {
        return workspaceAccessError(auth);
      }
      const restorePoint = backupRestorePointMetadata(snapshot.workspaceId, snapshot.createdAt);
      const persistence = await recordBackupRestorePointMetadata(env.DB, snapshot.workspaceId, restorePoint);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        snapshot.workspaceId,
        null,
        auth.memberId,
        "backup.dry_run_created",
        {
          restorePointId: restorePoint.id,
          snapshotRef: restorePoint.snapshotRef,
          retentionPolicy: "last_5_restore_points",
          persistence,
        },
      );
      return json({
        ok: true,
        dryRun: true,
        persistence,
        auditPersistence,
        backup: {
          workspaceId: snapshot.workspaceId,
          createdAt: snapshot.createdAt,
          secretPolicy: snapshot.secretPolicy,
          destination: "R2 placeholder binding",
          restorePoint,
          retentionPolicy: "last_5_restore_points",
        },
      });
    }

    if (url.pathname === "/api/backups/r2/upload-object" && request.method === "PUT") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const workspaceId = request.headers.get("x-film-workspace-id")?.trim() ?? "";
      const createdAt = request.headers.get("x-film-backup-created-at")?.trim() ?? "";
      const sizeBytes = parseIntegerHeader(request.headers.get("x-film-size-bytes"));
      const sha256 = request.headers.get("x-film-sha256")?.trim().toLowerCase() ?? "";
      if (!isValidWorkspaceId(workspaceId)) {
        return json({ error: "invalid_workspace" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }
      if (request.headers.get("x-film-storage-confirmation") !== `STORE BACKUP ${workspaceId}`) {
        return json({ error: "missing_storage_confirmation" }, 400);
      }
      if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
        return json({ error: "invalid_backup_created_at" }, 400);
      }
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > BACKUP_UPLOAD_MAX_BYTES) {
        return json({ error: "invalid_backup_size" }, 400);
      }
      if (!isValidSha256Hex(sha256)) {
        return json({ error: "invalid_sha256" }, 400);
      }
      if (!env.BACKUPS || !env.DB) {
        return json({ error: "backup_object_storage_required" }, 503);
      }

      const bodyBytes = await readBoundedArrayBuffer(request, sizeBytes, BACKUP_UPLOAD_MAX_BYTES);
      if (!bodyBytes.ok) return json({ error: bodyBytes.error }, bodyBytes.status);
      if ((await sha256HexBytes(bodyBytes.bytes)) !== sha256) {
        return json({ error: "sha256_mismatch" }, 422);
      }

      const backup = await storeBackupObject(env.BACKUPS, workspaceId, createdAt, sha256, bodyBytes.bytes);
      if (!backup.ok) return json({ error: backup.error }, backup.status);
      const finalized = await finalizeBackupObjectMetadata(
        env.DB,
        workspaceId,
        auth.memberId,
        backup,
      );
      if (!finalized.ok) {
        return json({
          error: finalized.error,
          persistence: "r2_backup_metadata_pending" satisfies BackupObjectStorePersistence,
          idempotent: backup.idempotent,
        }, finalized.status);
      }

      return json({
        ok: true,
        dryRun: false,
        uploadMode: "worker_r2_put",
        persistence: "r2_backup_object" satisfies BackupObjectStorePersistence,
        restorePointPersistence: finalized.restorePointPersistence,
        auditPersistence: finalized.auditPersistence,
        idempotent: backup.idempotent,
        backup: {
          workspaceId: backup.workspaceId,
          createdAt: backup.createdAt,
          secretPolicy: "provider_secrets_excluded",
          destination: "R2 BACKUPS binding",
          restorePoint: backup.restorePoint,
          retentionPolicy: "last_5_restore_points",
          objectKey: backup.objectKey,
          sizeBytes: backup.sizeBytes,
          sha256: backup.sha256,
        },
      });
    }

	    if (url.pathname === "/api/backups/r2/export-manifest" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<BackupExportManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit === undefined ? 25 : body.limit;
      if (!isValidWorkspaceId(workspaceId) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return json({ error: "invalid_backup_export_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const exportResult = await listStoredBackupObjects(env.DB, workspaceId, limit);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "backup.export_manifest_created",
        {
          rowCount: exportResult.objects.length,
          truncated: exportResult.truncated,
          persistence: exportResult.persistence,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: exportResult.persistence,
        auditPersistence,
        workspaceId,
        exportPolicy: "stored_r2_backup_manifest_only",
        rowCount: exportResult.objects.length,
        truncated: exportResult.truncated,
        objects: exportResult.objects,
	      });
	    }

	    if (url.pathname === "/api/backups/r2/object-download-plan" && request.method === "POST") {
	      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
	      if (!auth.ok) return mutationAuthError(auth);

	      const body = await readJson<BackupObjectDownloadPlanRequest>(request);
	      const workspaceId = body.workspaceId?.trim() ?? "";
	      const restorePointId = body.restorePointId?.trim() ?? "";
	      if (!isValidWorkspaceId(workspaceId) || !isValidRecordId(restorePointId)) {
	        return json({ error: "invalid_backup_download_plan_request" }, 400);
	      }
	      if (!hasWorkspaceAccess(auth, workspaceId)) {
	        return workspaceAccessError(auth);
	      }
	      if (!env.DB) {
	        return json({ error: "backup_download_plan_storage_required" }, 503);
	      }
	      if (!env.BACKUPS) {
	        return json({ error: "r2_binding_unavailable" }, 503);
	      }

	      const row = await findStoredBackupObject(env.DB, workspaceId, restorePointId);
	      if (!row) {
	        return json({ error: "backup_object_not_found" }, 404);
	      }
	      const objectKey = backupObjectKeyFromSnapshotRef(row.snapshot_ref);
	      if (!objectKey || !isValidBackupObjectKey(workspaceId, objectKey)) {
	        return json({ error: "invalid_backup_snapshot_ref" }, 422);
	      }
	      const object = await env.BACKUPS.head(objectKey);
	      if (!object) {
	        return json({ error: "backup_object_bytes_missing" }, 404);
	      }

	      const downloadPlan = await createBackupObjectDownloadPlan(
	        env.DB,
	        workspaceId,
	        auth.memberId,
	        restorePointId,
	        objectKey,
	      );
	      if (!downloadPlan.backupDownloadPlanId) {
	        return json({
	          error: "backup_download_plan_storage_unavailable",
	          backupDownloadPlanPersistence: downloadPlan.persistence,
	          auditPersistence: downloadPlan.auditPersistence,
	        }, 503);
	      }

	      return json({
	        ok: true,
	        dryRun: true,
	        destructiveWrite: false,
	        workspaceId,
	        restorePointId: row.id,
	        objectKey,
	        downloadPolicy: "expiring_backup_object_download_plan",
	        backupDownloadPlanId: downloadPlan.backupDownloadPlanId,
	        backupDownloadToken: downloadPlan.backupDownloadToken,
	        backupDownloadTokenExpiresAt: downloadPlan.backupDownloadTokenExpiresAt,
	        backupDownloadPlanPersistence: downloadPlan.persistence,
	        auditPersistence: downloadPlan.auditPersistence,
	      });
	    }

	    if (url.pathname === "/api/audit-events/export-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<AuditEventManifestRequest>(request);
      const workspaceId = body.workspaceId?.trim() ?? "";
      const limit = body.limit === undefined ? 50 : body.limit;
      const offset = body.offset === undefined ? 0 : body.offset;
      const actionPrefix = body.actionPrefix?.trim() ?? "";
      if (
        !isValidWorkspaceId(workspaceId)
        || !Number.isSafeInteger(limit)
        || limit < 1
        || limit > 100
        || !Number.isSafeInteger(offset)
        || offset < 0
        || offset > 10000
        || (actionPrefix && !isValidAuditActionPrefix(actionPrefix))
      ) {
        return json({ error: "invalid_audit_export_request" }, 400);
      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }

      const manifest = await listAuditEventManifest(env.DB, workspaceId, limit, offset, actionPrefix || null);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "audit.export_manifest_created",
        {
          rowCount: manifest.rowCount,
          truncated: manifest.truncated,
          limit,
          offset,
          actionPrefix: actionPrefix || null,
          persistence: manifest.persistence,
          metadataPolicy: "keys_only",
        },
      );

      return json({
        ok: true,
        dryRun: true,
        persistence: manifest.persistence,
        auditPersistence,
        workspaceId,
        exportPolicy: "audit_event_manifest_only",
        metadataPolicy: "keys_only",
        rowCount: manifest.rowCount,
        truncated: manifest.truncated,
        offset: manifest.offset,
        nextOffset: manifest.nextOffset,
        actionPrefix: manifest.actionPrefix,
        events: manifest.events,
      });
    }

    if (url.pathname === "/api/backups/r2/object" && request.method === "GET") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

	      const workspaceId = url.searchParams.get("workspaceId")?.trim() ?? "";
	      const restorePointId = url.searchParams.get("restorePointId")?.trim() ?? "";
	      const backupDownloadPlanId = url.searchParams.get("backupDownloadPlanId")?.trim() ?? "";
	      const backupDownloadToken = url.searchParams.get("backupDownloadToken")?.trim() ?? "";
	      if (
	        !isValidWorkspaceId(workspaceId)
	        || !isValidRecordId(restorePointId)
	        || !isValidRecordId(backupDownloadPlanId)
	        || !isValidBackupObjectDownloadToken(backupDownloadToken)
	      ) {
	        return json({ error: "invalid_backup_object_request" }, 400);
	      }
      if (!hasWorkspaceAccess(auth, workspaceId)) {
        return workspaceAccessError(auth);
      }
      if (!env.DB) {
        return json({ error: "backup_manifest_storage_required" }, 503);
      }
      if (!env.BACKUPS) {
        return json({ error: "r2_binding_unavailable" }, 503);
      }

      const row = await findStoredBackupObject(env.DB, workspaceId, restorePointId);
      if (!row) {
        return json({ error: "backup_object_not_found" }, 404);
      }
	      const objectKey = backupObjectKeyFromSnapshotRef(row.snapshot_ref);
	      if (!objectKey || !isValidBackupObjectKey(workspaceId, objectKey)) {
	        return json({ error: "invalid_backup_snapshot_ref" }, 422);
	      }
	      const verifiedPlan = await verifyBackupObjectDownloadPlan(
	        env.DB,
	        workspaceId,
	        restorePointId,
	        objectKey,
	        backupDownloadPlanId,
	        backupDownloadToken,
	      );
	      if (!verifiedPlan.ok) {
	        return json({
	          error: verifiedPlan.error,
	          backupDownloadPlanPersistence: "d1_backup_object_download_plans",
	        }, verifiedPlan.status);
	      }
	      const object = await env.BACKUPS.get(objectKey);
      if (!object?.body) {
        return json({ error: "backup_object_bytes_missing" }, 404);
      }

      await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "backup.object_downloaded",
	        {
	          restorePointId: row.id,
	          backupDownloadPlanId,
	          snapshotRef: row.snapshot_ref,
	          objectKey,
	          expiresAt: verifiedPlan.expiresAt,
	        },
	      );

      return new Response(object.body, {
        headers: {
          "content-type": "application/zip",
	          "content-disposition": `attachment; filename="${safeBackupDownloadName(row.created_at)}"`,
	          "x-film-restore-point-id": row.id,
	          "x-film-backup-created-at": row.created_at,
	          "x-film-backup-download-plan-id": backupDownloadPlanId,
	          "x-film-backup-download-token-expires-at": verifiedPlan.expiresAt,
	        },
	      });
    }

    if (url.pathname === "/api/restores/commit-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestoreCommitDryRunRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt, preRestoreBackupId } = identity;

      const preview = normalizeRestoreCommitPreview(body.preview);
      if (!preview) {
        return json({ error: "invalid_restore_preview" }, 400);
      }

      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);
      if (body.confirmation !== expectedConfirmation) {
        return json({
          error: "restore_confirmation_required",
          expectedConfirmation,
        }, 422);
      }

      const preRestoreBackup = await verifyPreRestoreBackupProof(env.DB, workspaceId, preRestoreBackupId);
      const commitStatus = preRestoreBackup.verified
        ? "blocked_until_restore_commit_storage"
        : "blocked_until_pre_restore_backup";
      const auditPersistence = await recordAuditEvent(
        env.DB,
        workspaceId,
        null,
        auth.memberId,
        "restore.commit_dry_run_checked",
        {
          snapshotWorkspaceId,
          backupCreatedAt: backupCreatedAt || null,
          incomingRecordCount: preview.incomingRecordCount,
          changedRecordCount: preview.changedRecordCount,
          newRecordCount: preview.newRecordCount,
          fieldConflictCount: preview.fieldConflictCount,
          preRestoreBackupId: preRestoreBackup.restorePointId,
          preRestoreBackupVerified: preRestoreBackup.verified,
          destructiveWrite: false,
        },
      );

      return json({
        ok: true,
        dryRun: true,
        auditPersistence,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        confirmationAccepted: true,
        confirmationPhrase: expectedConfirmation,
        restoreMode: "confirmation_gate_only",
        destructiveWrite: false,
        preRestoreBackupRequired: true,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: preRestoreBackup.verified,
        preRestoreBackupPersistence: preRestoreBackup.persistence,
        preRestoreBackupBlocker: preRestoreBackup.blocker,
        commitStatus,
        authorizationPolicy: "owner_or_producer",
        preview,
        requirements: [
          "owner_or_producer_session",
          "exact_workspace_confirmation",
          "non_destructive_restore_preview",
          "stored_r2_pre_restore_backup_before_live_commit",
        ],
      });
    }

    if (url.pathname === "/api/restores/approval-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestoreApprovalDryRunRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt, preRestoreBackupId } = identity;

      const preview = normalizeRestoreCommitPreview(body.preview);
      if (!preview) {
        return json({ error: "invalid_restore_preview" }, 400);
      }

      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);
      if (body.confirmation !== expectedConfirmation) {
        return json({
          error: "restore_confirmation_required",
          expectedConfirmation,
        }, 422);
      }

      const preRestoreBackup = await verifyPreRestoreBackupProof(env.DB, workspaceId, preRestoreBackupId);
      const approval = await recordRestoreApproval(
        env.DB,
        workspaceId,
        auth.memberId,
        snapshotWorkspaceId,
        backupCreatedAt || null,
        preRestoreBackup,
        preview,
      );
      if (env.DB && !approval.approvalId) {
        return json({
          error: "restore_approval_storage_unavailable",
          approvalPersistence: approval.persistence,
          auditPersistence: approval.auditPersistence,
        }, 503);
      }

      return json({
        ok: true,
        dryRun: true,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        confirmationAccepted: true,
        confirmationPhrase: expectedConfirmation,
        destructiveWrite: false,
        preRestoreBackupRequired: true,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: preRestoreBackup.verified,
        preRestoreBackupPersistence: preRestoreBackup.persistence,
        preRestoreBackupBlocker: preRestoreBackup.blocker,
        approvalId: approval.approvalId,
        approvalStatus: approval.status,
        approvalPersistence: approval.persistence,
        approvalBlockers: approval.blockers,
        restoreMode: "approval_record_only",
        commitStatus: preRestoreBackup.verified
          ? "blocked_until_restore_commit_storage"
          : "blocked_until_pre_restore_backup",
        authorizationPolicy: "owner_or_producer",
        auditPersistence: approval.auditPersistence,
        preview,
      });
    }

    if (url.pathname === "/api/restores/commit-storage-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestoreCommitStorageDryRunRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt, preRestoreBackupId } = identity;
      const approvalId = body.approvalId?.trim() ?? "";
      if (!isValidRecordId(approvalId)) {
        return json({ error: "invalid_restore_approval" }, 400);
      }

      const preview = normalizeRestoreCommitPreview(body.preview);
      if (!preview) {
        return json({ error: "invalid_restore_preview" }, 400);
      }

      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);
      if (body.confirmation !== expectedConfirmation) {
        return json({
          error: "restore_confirmation_required",
          expectedConfirmation,
        }, 422);
      }

      if (!env.DB) {
        return json({
          error: "restore_approval_storage_required",
          approvalPersistence: "dry_run_memoryless",
          commitAttemptPersistence: "dry_run_memoryless",
        }, 503);
      }

      const approvalProof = await loadRestoreApprovalProof(env.DB, {
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt,
        preRestoreBackupId,
        preview,
      }, approvalId);
      if (!approvalProof.ok) return approvalProof.response;
      const { approval, preRestoreBackup } = approvalProof;

      const attempt = await recordRestoreCommitAttempt(
        env.DB,
        workspaceId,
        auth.memberId,
        approval,
        preRestoreBackup,
        preview,
      );
      if (!attempt.commitAttemptId) {
        return json({
          error: "restore_commit_attempt_storage_unavailable",
          commitAttemptPersistence: attempt.persistence,
          auditPersistence: attempt.auditPersistence,
        }, 503);
      }

      return json({
        ok: true,
        dryRun: true,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        confirmationAccepted: true,
        confirmationPhrase: expectedConfirmation,
        destructiveWrite: false,
        preRestoreBackupRequired: true,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: preRestoreBackup.verified,
        preRestoreBackupPersistence: preRestoreBackup.persistence,
        preRestoreBackupBlocker: preRestoreBackup.blocker,
        approvalId: approval.id,
        approvalStatus: approval.status,
        approvalPersistence: "d1_restore_approvals",
        commitAttemptId: attempt.commitAttemptId,
        commitAttemptStatus: attempt.status,
        commitAttemptPersistence: attempt.persistence,
        restoreMode: "commit_storage_only",
        commitStatus: attempt.status,
        authorizationPolicy: "owner_or_producer",
        auditPersistence: attempt.auditPersistence,
        preview,
      });
    }

    if (url.pathname === "/api/restores/application-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestoreApplicationDryRunRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt, preRestoreBackupId } = identity;
      const approvalId = body.approvalId?.trim() ?? "";
      if (!isValidRecordId(approvalId)) {
        return json({ error: "invalid_restore_approval" }, 400);
      }
      const commitAttemptId = body.commitAttemptId?.trim() ?? "";
      if (!isValidRecordId(commitAttemptId)) {
        return json({ error: "invalid_restore_commit_attempt" }, 400);
      }

      const preview = normalizeRestoreCommitPreview(body.preview);
      if (!preview) {
        return json({ error: "invalid_restore_preview" }, 400);
      }
      const applicationTablePlan = normalizeRestoreApplicationTablePlan(body.applicationTablePlan);
      if (!applicationTablePlan) {
        return json({ error: "invalid_restore_application_table_plan" }, 400);
      }

      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);
      if (body.confirmation !== expectedConfirmation) {
        return json({
          error: "restore_confirmation_required",
          expectedConfirmation,
        }, 422);
      }

      if (!env.DB) {
        return json({
          error: "restore_application_storage_required",
          approvalPersistence: "dry_run_memoryless",
          commitAttemptPersistence: "dry_run_memoryless",
          applicationPreflightPersistence: "dry_run_memoryless",
        }, 503);
      }

      const proofIdentity: RestoreProofIdentity = {
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt,
        preRestoreBackupId,
        preview,
      };
      const approvalProof = await loadRestoreApprovalProof(env.DB, proofIdentity, approvalId);
      if (!approvalProof.ok) return approvalProof.response;
      const { approval, preRestoreBackup } = approvalProof;

      const commitAttemptProof = await loadRestoreCommitAttemptProof(
        env.DB,
        proofIdentity,
        approval,
        preRestoreBackup,
        commitAttemptId,
      );
      if (!commitAttemptProof.ok) return commitAttemptProof.response;
      const { commitAttempt } = commitAttemptProof;

      const applicationPreflight = await recordRestoreApplicationPreflight(
        env.DB,
        workspaceId,
        auth.memberId,
        approval,
        commitAttempt,
        preRestoreBackup,
        preview,
        applicationTablePlan,
      );
      if (!applicationPreflight.applicationPreflightId) {
        return json({
          error: "restore_application_preflight_storage_unavailable",
          applicationPreflightPersistence: applicationPreflight.persistence,
          auditPersistence: applicationPreflight.auditPersistence,
        }, 503);
      }

      return json({
        ok: true,
        dryRun: true,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        confirmationAccepted: true,
        confirmationPhrase: expectedConfirmation,
        destructiveWrite: false,
        preRestoreBackupRequired: true,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: preRestoreBackup.verified,
        preRestoreBackupPersistence: preRestoreBackup.persistence,
        preRestoreBackupBlocker: preRestoreBackup.blocker,
        approvalId: approval.id,
        approvalStatus: approval.status,
        approvalPersistence: "d1_restore_approvals",
        commitAttemptId: commitAttempt.id,
        commitAttemptStatus: commitAttempt.status,
        commitAttemptPersistence: "d1_restore_commit_attempts",
        applicationPreflightId: applicationPreflight.applicationPreflightId,
        applicationPreflightStatus: applicationPreflight.status,
        applicationPreflightPersistence: applicationPreflight.persistence,
        restoreMode: "application_preflight_only",
        commitStatus: applicationPreflight.status,
        rollbackGuidance: applicationPreflight.rollbackGuidance,
        authorizationPolicy: "owner_or_producer",
        auditPersistence: applicationPreflight.auditPersistence,
        preview,
      });
    }

    if (url.pathname === "/api/restores/application-commit" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestoreApplicationCommitRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt, preRestoreBackupId } = identity;
      const approvalId = body.approvalId?.trim() ?? "";
      if (!isValidRecordId(approvalId)) {
        return json({ error: "invalid_restore_approval" }, 400);
      }
      const commitAttemptId = body.commitAttemptId?.trim() ?? "";
      if (!isValidRecordId(commitAttemptId)) {
        return json({ error: "invalid_restore_commit_attempt" }, 400);
      }
      const applicationPreflightId = body.applicationPreflightId?.trim() ?? "";
      if (!isValidRecordId(applicationPreflightId)) {
        return json({ error: "invalid_restore_application_preflight" }, 400);
      }

      const preview = normalizeRestoreCommitPreview(body.preview);
      if (!preview) {
        return json({ error: "invalid_restore_preview" }, 400);
      }
      const applicationTablePlan = normalizeRestoreApplicationTablePlan(body.applicationTablePlan);
      if (!applicationTablePlan) {
        return json({ error: "invalid_restore_application_table_plan" }, 400);
      }
      const records = normalizeRestoreCoreRecords(body.records);
      if (!records) {
        return json({ error: "invalid_restore_application_records" }, 400);
      }
      const recordSummary = restoreCoreRecordSummary(records);
      if (!restoreCoreRecordSummaryFitsPreview(recordSummary, preview)) {
        return json({ error: "restore_application_record_preview_mismatch" }, 422);
      }
      if (!restoreCoreRecordsMatchApplicationTablePlan(records, applicationTablePlan)) {
        return json({
          error: "restore_application_table_plan_record_mismatch",
          destructiveWrite: false,
        }, 422);
      }

      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);
      if (body.confirmation !== expectedConfirmation) {
        return json({
          error: "restore_confirmation_required",
          expectedConfirmation,
        }, 422);
      }

      if (!env.DB) {
        return json({
          error: "restore_application_storage_required",
          approvalPersistence: "dry_run_memoryless",
          commitAttemptPersistence: "dry_run_memoryless",
          applicationPreflightPersistence: "dry_run_memoryless",
          applicationCommitPersistence: "dry_run_memoryless",
        }, 503);
      }

      const proofIdentity: RestoreProofIdentity = {
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt,
        preRestoreBackupId,
        preview,
      };
      const approvalProof = await loadRestoreApprovalProof(env.DB, proofIdentity, approvalId);
      if (!approvalProof.ok) return approvalProof.response;
      const { approval, preRestoreBackup } = approvalProof;

      const commitAttemptProof = await loadRestoreCommitAttemptProof(
        env.DB,
        proofIdentity,
        approval,
        preRestoreBackup,
        commitAttemptId,
      );
      if (!commitAttemptProof.ok) return commitAttemptProof.response;
      const { commitAttempt } = commitAttemptProof;

      const applicationPreflightProof = await loadRestoreApplicationPreflightProof(
        env.DB,
        proofIdentity,
        approval,
        commitAttempt,
        preRestoreBackup,
        applicationPreflightId,
        applicationTablePlan,
      );
      if (!applicationPreflightProof.ok) return applicationPreflightProof.response;
      const { applicationPreflight } = applicationPreflightProof;

      const conflictRejections = await restoreCoreRecordConflictRejections(env.DB, workspaceId, records);
      if (conflictRejections.length > 0) {
        return json({
          error: "restore_application_record_conflict",
          destructiveWrite: false,
          rejected: conflictRejections,
        }, 422);
      }

      const appliedAt = new Date().toISOString();
      const batchCommit = await commitRestoreCoreRecords(
        env.DB,
        workspaceId,
        auth.memberId,
        approval,
        commitAttempt,
        applicationPreflight,
        preRestoreBackup,
        preview,
        records,
        recordSummary,
        appliedAt,
      );
      if (!batchCommit.ok) {
        return json({
          error: batchCommit.error,
          applicationCommitPersistence: batchCommit.persistence,
          destructiveWrite: false,
        }, batchCommit.status);
      }

      return json({
        ok: true,
        dryRun: false,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        confirmationAccepted: true,
        confirmationPhrase: expectedConfirmation,
        destructiveWrite: true,
        preRestoreBackupRequired: true,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: preRestoreBackup.verified,
        preRestoreBackupPersistence: preRestoreBackup.persistence,
        preRestoreBackupBlocker: preRestoreBackup.blocker,
        approvalId: approval.id,
        approvalStatus: approval.status,
        approvalPersistence: "d1_restore_approvals",
        commitAttemptId: commitAttempt.id,
        commitAttemptStatus: commitAttempt.status,
        commitAttemptPersistence: "d1_restore_commit_attempts",
        applicationPreflightId: applicationPreflight.id,
        applicationPreflightStatus: applicationPreflight.status,
        applicationPreflightPersistence: "d1_restore_application_preflights",
        rollbackGuidance: restoreRollbackGuidanceFromJson(applicationPreflight.rollback_guidance_json),
        applicationCommitId: batchCommit.applicationCommitId,
        applicationCommitStatus: batchCommit.applicationCommitStatus,
        applicationCommitPersistence: batchCommit.persistence,
        restoreMode: "workspace_snapshot_records_commit",
        commitStatus: batchCommit.applicationCommitStatus,
        authorizationPolicy: "owner_or_producer",
        auditPersistence: batchCommit.auditPersistence,
        preview,
        recordSummary,
        result: batchCommit.applicationResult,
      unsupportedRestoreDomains: ["planning", "attachment_bytes"],
      });
    }

    if (url.pathname === "/api/restores/planning-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestorePlanningDryRunRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt } = identity;

      const records = body.records ?? [];
      if (!Array.isArray(records) || records.length > 1000) {
        return json({ error: "invalid_restore_planning_batch" }, 400);
      }

      const result = await previewRestorePlanningRecords(env.DB, workspaceId, snapshotWorkspaceId, records);
      const planningPreview = await recordRestorePlanningPreview(
        env.DB,
        workspaceId,
        auth.memberId,
        snapshotWorkspaceId,
        backupCreatedAt || null,
        result,
      );
      if (env.DB && !planningPreview.planningPreviewId) {
        return json({
          error: "restore_planning_preview_storage_unavailable",
          planningPreviewPersistence: planningPreview.persistence,
          auditPersistence: planningPreview.auditPersistence,
        }, 503);
      }

      return json({
        ok: result.rejected.length === 0,
        dryRun: true,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        restoreMode: "planning_restore_preview_only",
        commitPolicy: "planning_rows_preview_only",
        destructiveWrite: false,
        authorizationPolicy: "owner_or_producer",
        planningPreviewId: planningPreview.planningPreviewId,
        planningPreviewStatus: planningPreview.status,
        planningPreviewPersistence: planningPreview.persistence,
        auditPersistence: planningPreview.auditPersistence,
        ...result,
      }, result.rejected.length === 0 ? 200 : 422);
    }

    if (url.pathname === "/api/restores/planning-commit" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestorePlanningCommitRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt, preRestoreBackupId } = identity;
      const approvalId = body.approvalId?.trim() ?? "";
      if (!isValidRecordId(approvalId)) {
        return json({ error: "invalid_restore_approval" }, 400);
      }
      const commitAttemptId = body.commitAttemptId?.trim() ?? "";
      if (!isValidRecordId(commitAttemptId)) {
        return json({ error: "invalid_restore_commit_attempt" }, 400);
      }
      const applicationPreflightId = body.applicationPreflightId?.trim() ?? "";
      if (!isValidRecordId(applicationPreflightId)) {
        return json({ error: "invalid_restore_application_preflight" }, 400);
      }
      const planningPreviewId = body.planningPreviewId?.trim() ?? "";
      if (!isValidRecordId(planningPreviewId)) {
        return json({ error: "invalid_restore_planning_preview" }, 400);
      }

      const preview = normalizeRestoreCommitPreview(body.preview);
      if (!preview) {
        return json({ error: "invalid_restore_preview" }, 400);
      }
      const applicationTablePlan = normalizeRestoreApplicationTablePlan(body.applicationTablePlan);
      if (!applicationTablePlan) {
        return json({ error: "invalid_restore_application_table_plan" }, 400);
      }
      if (!applicationTablePlan.some((row) => row.entityType === "planning" && row.operationCount > 0)) {
        return json({ error: "restore_planning_table_plan_required" }, 422);
      }

      const records = body.records ?? [];
      if (!Array.isArray(records) || records.length === 0 || records.length > RESTORE_PLANNING_COMMIT_MAX_RECORDS) {
        return json({ error: "invalid_restore_planning_batch" }, 400);
      }

      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);
      if (body.confirmation !== expectedConfirmation) {
        return json({
          error: "restore_confirmation_required",
          expectedConfirmation,
        }, 422);
      }

      if (!env.DB) {
        return json({
          error: "restore_planning_commit_storage_required",
          approvalPersistence: "dry_run_memoryless",
          commitAttemptPersistence: "dry_run_memoryless",
          applicationPreflightPersistence: "dry_run_memoryless",
          planningPreviewPersistence: "dry_run_memoryless",
          planningCommitPersistence: "dry_run_memoryless",
        }, 503);
      }

      const proofIdentity: RestoreProofIdentity = {
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt,
        preRestoreBackupId,
        preview,
      };
      const approvalProof = await loadRestoreApprovalProof(env.DB, proofIdentity, approvalId);
      if (!approvalProof.ok) return approvalProof.response;
      const { approval, preRestoreBackup } = approvalProof;

      const commitAttemptProof = await loadRestoreCommitAttemptProof(
        env.DB,
        proofIdentity,
        approval,
        preRestoreBackup,
        commitAttemptId,
      );
      if (!commitAttemptProof.ok) return commitAttemptProof.response;
      const { commitAttempt } = commitAttemptProof;

      const applicationPreflightProof = await loadRestoreApplicationPreflightProof(
        env.DB,
        proofIdentity,
        approval,
        commitAttempt,
        preRestoreBackup,
        applicationPreflightId,
      );
      if (!applicationPreflightProof.ok) return applicationPreflightProof.response;
      const { applicationPreflight } = applicationPreflightProof;

      const planningPreview = await findRestorePlanningPreview(env.DB, workspaceId, planningPreviewId);
      if (!planningPreview) {
        return json({ error: "restore_planning_preview_not_found" }, 404);
      }
      if (planningPreview.status !== "preview_only" || planningPreview.destructive_write !== 0) {
        return json({
          error: "restore_planning_preview_not_ready",
          planningPreviewStatus: planningPreview.status,
          destructiveWrite: planningPreview.destructive_write === 1,
        }, 422);
      }
      if (planningPreview.snapshot_workspace_id !== snapshotWorkspaceId) {
        return json({ error: "restore_planning_preview_snapshot_mismatch" }, 422);
      }
      if ((planningPreview.backup_created_at ?? "") !== backupCreatedAt) {
        return json({ error: "restore_planning_preview_backup_mismatch" }, 422);
      }

      const planningResult = await previewRestorePlanningRecords(env.DB, workspaceId, snapshotWorkspaceId, records);
      if (planningResult.rejected.length > 0) {
        return json({
          error: "restore_planning_records_rejected",
          destructiveWrite: false,
          rejected: planningResult.rejected,
          tableSummary: planningResult.tableSummary,
        }, 422);
      }
      if (!restorePlanningPreviewMatches(planningPreview, planningResult)) {
        return json({
          error: "restore_planning_preview_mismatch",
          destructiveWrite: false,
          planningPreview: restorePlanningPreviewSummary(planningPreview),
          currentPreview: restorePlanningPreviewSummary(planningResult),
        }, 422);
      }

      const appliedAt = new Date().toISOString();
      const planningCommit = await commitRestorePlanningRecords(
        env.DB,
        workspaceId,
        snapshotWorkspaceId,
        records,
        planningResult,
        appliedAt,
        auth.memberId,
        approval,
        commitAttempt,
        applicationPreflight,
        planningPreview,
        preRestoreBackup,
      );
      if (!planningCommit.ok) {
        return json({
          error: planningCommit.error,
          planningCommitPersistence: planningCommit.persistence,
          destructiveWrite: false,
        }, planningCommit.status);
      }

      return json({
        ok: true,
        dryRun: false,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        confirmationAccepted: true,
        confirmationPhrase: expectedConfirmation,
        destructiveWrite: true,
        preRestoreBackupRequired: true,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: preRestoreBackup.verified,
        preRestoreBackupPersistence: preRestoreBackup.persistence,
        preRestoreBackupBlocker: preRestoreBackup.blocker,
        approvalId: approval.id,
        approvalStatus: approval.status,
        approvalPersistence: "d1_restore_approvals",
        commitAttemptId: commitAttempt.id,
        commitAttemptStatus: commitAttempt.status,
        commitAttemptPersistence: "d1_restore_commit_attempts",
        applicationPreflightId: applicationPreflight.id,
        applicationPreflightStatus: applicationPreflight.status,
        applicationPreflightPersistence: "d1_restore_application_preflights",
        planningPreviewId: planningPreview.id,
        planningPreviewStatus: planningPreview.status,
        planningPreviewPersistence: "d1_restore_planning_previews",
        planningCommitId: planningCommit.planningCommitId,
        planningCommitStatus: planningCommit.status,
        planningCommitPersistence: planningCommit.persistence,
        restoreMode: "planning_records_commit",
        commitStatus: planningCommit.status,
        authorizationPolicy: "owner_or_producer",
        auditPersistence: planningCommit.auditPersistence,
        preview,
        result: planningCommit.result,
        unsupportedRestoreDomains: ["workspace", "person", "equipment", "expense", "attachment_bytes"],
      });
    }

	    if (url.pathname === "/api/restores/attachment-package-dry-run" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const identity = await readRestoreRequestIdentity<RestoreAttachmentPackageDryRunRequest>(request, auth);
      if (!identity.ok) return identity.response;
      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt } = identity;

      const attachmentPackagePlan = normalizeRestoreAttachmentPackagePlan(body.attachmentPackagePlan);
      if (!attachmentPackagePlan) {
        return json({ error: "invalid_restore_attachment_package_plan" }, 400);
      }

      const status = attachmentPackagePlan.packageRequired
        ? "blocked_until_attachment_package_verification"
        : "not_required";
      const packagePreflight = await recordRestoreAttachmentPackagePreflight(
        env.DB,
        workspaceId,
        auth.memberId,
        snapshotWorkspaceId,
        backupCreatedAt || null,
        attachmentPackagePlan,
        status,
      );
      if (env.DB && !packagePreflight.attachmentPackagePreflightId) {
        return json({
          error: "restore_attachment_package_preflight_storage_unavailable",
          attachmentPackagePreflightPersistence: packagePreflight.persistence,
          auditPersistence: packagePreflight.auditPersistence,
        }, 503);
      }

      return json({
        ok: true,
        dryRun: true,
        workspaceId,
        snapshotWorkspaceId,
        backupCreatedAt: backupCreatedAt || null,
        restoreMode: "attachment_restore_package_preflight_only",
        commitPolicy: "attachment_bytes_blocked_until_package_verification",
        destructiveWrite: false,
        canRestoreBytes: false,
        authorizationPolicy: "owner_or_producer",
        attachmentPackagePreflightId: packagePreflight.attachmentPackagePreflightId,
        attachmentPackagePreflightStatus: status,
        attachmentPackagePreflightPersistence: packagePreflight.persistence,
        auditPersistence: packagePreflight.auditPersistence,
        attachmentPackagePlan,
        blockers: attachmentPackagePlan.blockers,
	      });
	    }

	    if (url.pathname === "/api/restores/attachment-package-verify-dry-run" && request.method === "POST") {
	      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
	      if (!auth.ok) return mutationAuthError(auth);

	      const identity = await readRestoreRequestIdentity<RestoreAttachmentPackageVerificationDryRunRequest>(request, auth);
	      if (!identity.ok) return identity.response;
	      const { body, workspaceId, snapshotWorkspaceId, backupCreatedAt } = identity;

	      const attachmentPackagePreflightId = body.attachmentPackagePreflightId?.trim() ?? "";
	      const packageSha256 = body.packageSha256?.trim().toLowerCase() ?? "";
	      const requestedManifestSha256 = body.manifestSha256?.trim().toLowerCase() ?? "";
	      if (!isValidRecordId(attachmentPackagePreflightId)) {
	        return json({ error: "invalid_attachment_package_preflight_id" }, 400);
	      }
	      if (!isValidSha256Hex(packageSha256) || (requestedManifestSha256 && !isValidSha256Hex(requestedManifestSha256))) {
	        return json({ error: "invalid_attachment_package_hash" }, 400);
	      }

	      const attachmentPackagePlan = normalizeRestoreAttachmentPackagePlan(body.attachmentPackagePlan);
	      if (!attachmentPackagePlan || !attachmentPackagePlan.packageRequired) {
	        return json({ error: "invalid_restore_attachment_package_plan" }, 400);
	      }

	      const packageManifest = normalizeRestoreAttachmentPackageManifest(workspaceId, body.packageManifest);
	      if (!packageManifest) {
	        return json({ error: "invalid_restore_attachment_package_manifest" }, 400);
	      }
	      if (!restoreAttachmentPackageManifestMatchesPlan(packageManifest, attachmentPackagePlan)) {
	        return json({ error: "restore_attachment_package_manifest_plan_mismatch", destructiveWrite: false }, 422);
	      }

	      const manifestSha256 = await sha256Hex(JSON.stringify(packageManifest));
	      if (requestedManifestSha256 && requestedManifestSha256 !== manifestSha256) {
	        return json({ error: "restore_attachment_package_manifest_sha256_mismatch", destructiveWrite: false }, 422);
	      }

	      const preflight = await restoreAttachmentPackagePreflightForVerification(
	        env.DB,
	        attachmentPackagePreflightId,
	        workspaceId,
	      );
	      if (env.DB && !preflight) {
	        return json({ error: "restore_attachment_package_preflight_not_found", destructiveWrite: false }, 404);
	      }
	      if (
	        preflight
	        && !restoreAttachmentPackagePreflightMatchesVerification(
	          preflight,
	          snapshotWorkspaceId,
	          backupCreatedAt || null,
	          attachmentPackagePlan,
	        )
	      ) {
	        return json({ error: "restore_attachment_package_preflight_mismatch", destructiveWrite: false }, 422);
	      }

	      const status = "verified_until_destination_rules";
	      const verification = await recordRestoreAttachmentPackageVerification(
	        env.DB,
	        workspaceId,
	        attachmentPackagePreflightId,
	        auth.memberId,
	        snapshotWorkspaceId,
	        backupCreatedAt || null,
	        attachmentPackagePlan,
	        packageManifest,
	        packageSha256,
	        manifestSha256,
	        status,
	        preflight,
	      );
	      if (env.DB && !verification.attachmentPackageVerificationId) {
	        return json({
	          error: "restore_attachment_package_verification_storage_unavailable",
	          attachmentPackageVerificationPersistence: verification.persistence,
	          auditPersistence: verification.auditPersistence,
	        }, 503);
	      }

	      return json({
	        ok: true,
	        dryRun: true,
	        workspaceId,
	        snapshotWorkspaceId,
	        backupCreatedAt: backupCreatedAt || null,
	        restoreMode: "attachment_restore_package_verification_only",
	        commitPolicy: "attachment_bytes_blocked_until_destination_write_rules",
	        destructiveWrite: false,
	        canRestoreBytes: false,
	        authorizationPolicy: "owner_or_producer",
	        attachmentPackagePreflightId,
	        attachmentPackagePreflightPersistence: preflight ? "d1_restore_attachment_package_preflights" : "dry_run_memoryless",
	        attachmentPackageVerificationId: verification.attachmentPackageVerificationId,
	        attachmentPackageVerificationStatus: status,
	        attachmentPackageVerificationPersistence: verification.persistence,
	        auditPersistence: verification.auditPersistence,
	        packageSha256,
	        manifestSha256,
	        packageManifest: {
	          format: packageManifest.format,
	          version: packageManifest.version,
	          workspaceId: packageManifest.workspaceId,
	          objectCount: packageManifest.objectCount,
	          totalSourceBytes: packageManifest.totalSourceBytes,
	        },
	        blockers: ["Attachment package metadata is verified, but byte restore still requires destination write rules."],
	      });
	    }

	    if (url.pathname === "/api/restores/attachment-objects-plan-dry-run" && request.method === "POST") {
	      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
	      if (!auth.ok) return mutationAuthError(auth);

	      const body = await readJson<RestoreAttachmentObjectPlanDryRunRequest>(request);
	      const workspaceId = body.workspaceId?.trim() ?? "";
	      if (!isValidWorkspaceId(workspaceId)) {
	        return json({ error: "invalid_workspace" }, 400);
	      }
	      if (!hasWorkspaceAccess(auth, workspaceId)) {
	        return workspaceAccessError(auth);
	      }

	      const attachmentPackageVerificationId = body.attachmentPackageVerificationId?.trim() ?? "";
	      const packageSha256 = body.packageSha256?.trim().toLowerCase() ?? "";
	      const requestedManifestSha256 = body.manifestSha256?.trim().toLowerCase() ?? "";
	      if (!isValidRecordId(attachmentPackageVerificationId)) {
	        return json({ error: "invalid_attachment_package_verification_id" }, 400);
	      }
	      if (!isValidSha256Hex(packageSha256) || (requestedManifestSha256 && !isValidSha256Hex(requestedManifestSha256))) {
	        return json({ error: "invalid_attachment_package_hash" }, 400);
	      }

	      const packageManifest = normalizeRestoreAttachmentPackageManifest(workspaceId, body.packageManifest);
	      if (!packageManifest) {
	        return json({ error: "invalid_restore_attachment_package_manifest" }, 400);
	      }
	      const manifestSha256 = await sha256Hex(JSON.stringify(packageManifest));
	      if (requestedManifestSha256 && requestedManifestSha256 !== manifestSha256) {
	        return json({ error: "restore_attachment_package_manifest_sha256_mismatch", destructiveWrite: false }, 422);
	      }

	      const verification = await restoreAttachmentPackageVerificationForObjectPlan(
	        env.DB,
	        attachmentPackageVerificationId,
	        workspaceId,
	      );
	      if (env.DB && !verification) {
	        return json({ error: "restore_attachment_package_verification_not_found", destructiveWrite: false }, 404);
	      }
	      if (verification && !restoreAttachmentPackageVerificationMatchesObjectPlan(verification, packageManifest, packageSha256, manifestSha256)) {
	        return json({ error: "restore_attachment_package_verification_mismatch", destructiveWrite: false }, 422);
	      }

	      const objectPlan = createRestoreAttachmentObjectPlan(workspaceId, packageManifest);
	      const status = "blocked_until_attachment_destination_write_rules";
	      const objectPlanRecord = await recordRestoreAttachmentObjectPlan(
	        env.DB,
	        workspaceId,
	        attachmentPackageVerificationId,
	        auth.memberId,
	        objectPlan,
	        status,
	        verification,
	      );
	      if (env.DB && !objectPlanRecord.attachmentObjectPlanId) {
	        return json({
	          error: "restore_attachment_object_plan_storage_unavailable",
	          attachmentObjectPlanPersistence: objectPlanRecord.persistence,
	          auditPersistence: objectPlanRecord.auditPersistence,
	        }, 503);
	      }

		      return json({
		        ok: true,
		        dryRun: true,
	        workspaceId,
	        restoreMode: "attachment_restore_object_plan_only",
	        commitPolicy: "attachment_bytes_blocked_until_destination_write_rules",
	        destructiveWrite: false,
	        canRestoreBytes: false,
	        authorizationPolicy: "owner_or_producer",
	        attachmentPackageVerificationId,
	        attachmentPackageVerificationPersistence: verification ? "d1_restore_attachment_package_verifications" : "dry_run_memoryless",
	        attachmentObjectPlanId: objectPlanRecord.attachmentObjectPlanId,
	        attachmentObjectPlanStatus: status,
	        attachmentObjectPlanPersistence: objectPlanRecord.persistence,
	        auditPersistence: objectPlanRecord.auditPersistence,
	        result: objectPlan,
		        blockers: ["Attachment object destinations are planned, but byte restore still requires explicit destination write rules."],
		      });
		    }

	    if (url.pathname === "/api/restores/attachment-objects-commit-preflight" && request.method === "POST") {
	      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
	      if (!auth.ok) return mutationAuthError(auth);

	      const body = await readJson<RestoreAttachmentObjectCommitPreflightRequest>(request);
	      const workspaceId = body.workspaceId?.trim() ?? "";
	      if (!isValidWorkspaceId(workspaceId)) {
	        return json({ error: "invalid_workspace" }, 400);
	      }
	      if (!hasWorkspaceAccess(auth, workspaceId)) {
	        return workspaceAccessError(auth);
	      }

	      const attachmentPackageVerificationId = body.attachmentPackageVerificationId?.trim() ?? "";
	      const attachmentObjectPlanId = body.attachmentObjectPlanId?.trim() ?? "";
	      const packageSha256 = body.packageSha256?.trim().toLowerCase() ?? "";
	      const requestedManifestSha256 = body.manifestSha256?.trim().toLowerCase() ?? "";
	      if (!isValidRecordId(attachmentPackageVerificationId)) {
	        return json({ error: "invalid_attachment_package_verification_id" }, 400);
	      }
	      if (!isValidRecordId(attachmentObjectPlanId)) {
	        return json({ error: "invalid_attachment_object_plan_id" }, 400);
	      }
	      if (!isValidSha256Hex(packageSha256) || (requestedManifestSha256 && !isValidSha256Hex(requestedManifestSha256))) {
	        return json({ error: "invalid_attachment_package_hash" }, 400);
	      }

	      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);
	      if (body.confirmation !== expectedConfirmation) {
	        return json({
	          error: "restore_confirmation_required",
	          expectedConfirmation,
	        }, 422);
	      }

	      const packageManifest = normalizeRestoreAttachmentPackageManifest(workspaceId, body.packageManifest);
	      if (!packageManifest) {
	        return json({ error: "invalid_restore_attachment_package_manifest" }, 400);
	      }
	      const manifestSha256 = await sha256Hex(JSON.stringify(packageManifest));
	      if (requestedManifestSha256 && requestedManifestSha256 !== manifestSha256) {
	        return json({ error: "restore_attachment_package_manifest_sha256_mismatch", destructiveWrite: false }, 422);
	      }

	      if (!env.DB) {
	        return json({
	          error: "restore_attachment_object_commit_preflight_storage_required",
	          attachmentObjectCommitPreflightPersistence: "d1_unavailable_dry_run",
	        }, 503);
	      }

	      const verification = await restoreAttachmentPackageVerificationForObjectPlan(
	        env.DB,
	        attachmentPackageVerificationId,
	        workspaceId,
	      );
	      if (!verification) {
	        return json({ error: "restore_attachment_package_verification_not_found", destructiveWrite: false }, 404);
	      }
	      if (!restoreAttachmentPackageVerificationMatchesObjectPlan(verification, packageManifest, packageSha256, manifestSha256)) {
	        return json({ error: "restore_attachment_package_verification_mismatch", destructiveWrite: false }, 422);
	      }

	      const expectedObjectPlan = createRestoreAttachmentObjectPlan(workspaceId, packageManifest);
	      const objectPlanRow = await restoreAttachmentObjectPlanForCommitPreflight(env.DB, attachmentObjectPlanId, workspaceId);
	      if (!objectPlanRow) {
	        return json({ error: "restore_attachment_object_plan_not_found", destructiveWrite: false }, 404);
	      }
	      if (
	        objectPlanRow.attachment_package_verification_id !== attachmentPackageVerificationId
	        || objectPlanRow.status !== "blocked_until_attachment_destination_write_rules"
	        || objectPlanRow.destructive_write !== 0
	        || objectPlanRow.object_count !== expectedObjectPlan.objectCount
	        || objectPlanRow.total_source_bytes !== expectedObjectPlan.totalSourceBytes
	      ) {
	        return json({ error: "restore_attachment_object_plan_mismatch", destructiveWrite: false }, 422);
	      }
	      const storedObjectPlan = restoreAttachmentObjectPlanFromJson(objectPlanRow.plan_json);
	      if (!storedObjectPlan || !restoreAttachmentObjectPlansEqual(storedObjectPlan, expectedObjectPlan)) {
	        return json({ error: "restore_attachment_object_plan_mismatch", destructiveWrite: false }, 422);
	      }

	      const commitPreflight = await createRestoreAttachmentObjectCommitPreflight(
	        env.DB,
	        env.ATTACHMENTS,
	        workspaceId,
	        storedObjectPlan,
	      );
	      const status = restoreAttachmentObjectCommitPreflightStatus(commitPreflight);
	      const commitPreflightRecord = await recordRestoreAttachmentObjectCommitPreflight(
	        env.DB,
	        workspaceId,
	        attachmentPackageVerificationId,
	        attachmentObjectPlanId,
	        auth.memberId,
	        packageSha256,
	        manifestSha256,
	        commitPreflight,
	        status,
	        verification,
	        objectPlanRow,
	      );
	      if (!commitPreflightRecord.attachmentObjectCommitPreflightId) {
	        return json({
	          error: "restore_attachment_object_commit_preflight_storage_unavailable",
	          attachmentObjectCommitPreflightPersistence: commitPreflightRecord.persistence,
	          auditPersistence: commitPreflightRecord.auditPersistence,
	        }, 503);
	      }

	      return json({
	        ok: true,
	        dryRun: true,
	        workspaceId,
	        confirmationAccepted: true,
	        confirmationPhrase: expectedConfirmation,
	        restoreMode: "attachment_restore_object_commit_preflight_only",
	        commitPolicy: commitPreflight.blockedDestinationCount === 0
	          ? "attachment_bytes_ready_for_explicit_commit_endpoint"
	          : "attachment_bytes_blocked_until_destination_preflight_clears",
	        destructiveWrite: false,
	        canRestoreBytes: false,
	        readyForByteCommit: commitPreflight.blockedDestinationCount === 0,
	        authorizationPolicy: "owner_or_producer",
	        attachmentPackageVerificationId,
	        attachmentPackageVerificationPersistence: "d1_restore_attachment_package_verifications",
	        attachmentObjectPlanId,
	        attachmentObjectPlanStatus: objectPlanRow.status,
	        attachmentObjectPlanPersistence: "d1_restore_attachment_object_plans",
	        attachmentObjectCommitPreflightId: commitPreflightRecord.attachmentObjectCommitPreflightId,
	        attachmentObjectCommitPreflightStatus: status,
	        attachmentObjectCommitPreflightPersistence: commitPreflightRecord.persistence,
	        auditPersistence: commitPreflightRecord.auditPersistence,
	        packageSha256,
	        manifestSha256,
	        result: commitPreflight,
	        blockers: commitPreflight.blockers,
	      });
	    }

    if (url.pathname === "/api/restores/attachment-object-commit" && request.method === "PUT") {
      const auth = await requireMutationAuth(request, env, OWNER_PRODUCER_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const workspaceId = request.headers.get("x-film-workspace-id")?.trim() ?? "";
      const attachmentPackageVerificationId = request.headers.get("x-film-attachment-package-verification-id")?.trim() ?? "";
      const attachmentObjectPlanId = request.headers.get("x-film-attachment-object-plan-id")?.trim() ?? "";
      const attachmentObjectCommitPreflightId = request.headers.get("x-film-attachment-object-commit-preflight-id")?.trim() ?? "";
      const docId = request.headers.get("x-film-doc-id")?.trim() ?? "";
      const destinationObjectKey = request.headers.get("x-film-destination-object-key")?.trim() ?? "";
      const sizeBytes = parseIntegerHeader(request.headers.get("x-film-size-bytes"));
      const sha256 = request.headers.get("x-film-sha256")?.trim().toLowerCase() ?? "";
      const packageSha256 = request.headers.get("x-film-package-sha256")?.trim().toLowerCase() ?? "";
      const manifestSha256 = request.headers.get("x-film-manifest-sha256")?.trim().toLowerCase() ?? "";
      const expectedConfirmation = restoreConfirmationPhrase(workspaceId);

      if (!isValidWorkspaceId(workspaceId)) return json({ error: "invalid_workspace" }, 400);
      if (!hasWorkspaceAccess(auth, workspaceId)) return workspaceAccessError(auth);
      if (
        !isValidRecordId(attachmentPackageVerificationId)
        || !isValidRecordId(attachmentObjectPlanId)
        || !isValidRecordId(attachmentObjectCommitPreflightId)
        || !isValidRecordId(docId)
        || !isValidAttachmentObjectKey(workspaceId, destinationObjectKey)
        || !Number.isSafeInteger(sizeBytes)
        || sizeBytes <= 0
        || sizeBytes > ATTACHMENT_PACKAGE_MAX_BYTES
        || !isValidSha256Hex(sha256)
        || !isValidSha256Hex(packageSha256)
        || !isValidSha256Hex(manifestSha256)
      ) {
        return json({ error: "invalid_restore_attachment_object_commit" }, 400);
      }
      if (request.headers.get("x-film-storage-confirmation") !== expectedConfirmation) {
        return json({ error: "restore_confirmation_required", expectedConfirmation }, 422);
      }
      if (!env.DB || !env.ATTACHMENTS) {
        return json({ error: "restore_attachment_object_commit_storage_required" }, 503);
      }

      const verification = await restoreAttachmentPackageVerificationForObjectPlan(
        env.DB,
        attachmentPackageVerificationId,
        workspaceId,
      );
      const objectPlanRow = await restoreAttachmentObjectPlanForCommitPreflight(env.DB, attachmentObjectPlanId, workspaceId);
      const commitPreflightRow = await restoreAttachmentObjectCommitPreflightForCommit(
        env.DB,
        attachmentObjectCommitPreflightId,
        workspaceId,
      );
      if (!verification || !objectPlanRow || !commitPreflightRow) {
        return json({ error: "restore_attachment_object_commit_chain_not_found" }, 404);
      }
      if (
        verification.package_sha256 !== packageSha256
        || verification.manifest_sha256 !== manifestSha256
        || verification.status !== "verified_until_destination_rules"
        || verification.destructive_write !== 0
        || objectPlanRow.attachment_package_verification_id !== attachmentPackageVerificationId
        || objectPlanRow.status !== "blocked_until_attachment_destination_write_rules"
        || objectPlanRow.destructive_write !== 0
        || commitPreflightRow.attachment_package_verification_id !== attachmentPackageVerificationId
        || commitPreflightRow.attachment_object_plan_id !== attachmentObjectPlanId
        || commitPreflightRow.package_sha256 !== packageSha256
        || commitPreflightRow.manifest_sha256 !== manifestSha256
        || commitPreflightRow.status !== "ready_for_attachment_byte_commit"
        || commitPreflightRow.blocked_destination_count !== 0
        || commitPreflightRow.destructive_write !== 0
      ) {
        return json({ error: "restore_attachment_object_commit_chain_mismatch" }, 422);
      }

      const packageManifest = restoreAttachmentPackageManifestFromJson(verification.package_manifest_json);
      const objectPlan = restoreAttachmentObjectPlanFromJson(objectPlanRow.plan_json);
      const commitPreflight = restoreAttachmentObjectCommitPreflightFromJson(commitPreflightRow.preflight_json);
      const manifestObject = packageManifest?.objects.find((object) => object.docId === docId);
      const plannedObject = objectPlan?.objects.find((object) => object.docId === docId);
      const preflightObject = commitPreflight?.objects.find((object) => object.docId === docId);
      if (
        !packageManifest
        || !objectPlan
        || !commitPreflight
        || !manifestObject
        || !plannedObject
        || !preflightObject
        || plannedObject.destinationObjectKey !== destinationObjectKey
        || preflightObject.destinationObjectKey !== destinationObjectKey
        || manifestObject.sizeBytes !== sizeBytes
        || plannedObject.sizeBytes !== sizeBytes
        || preflightObject.sizeBytes !== sizeBytes
        || manifestObject.sha256 !== sha256
        || plannedObject.sha256 !== sha256
        || preflightObject.sha256 !== sha256
        || preflightObject.action !== "ready_for_explicit_byte_commit"
      ) {
        return json({ error: "restore_attachment_object_commit_metadata_mismatch" }, 422);
      }

      const existingCommit = await restoreAttachmentObjectCommitForRetry(
        env.DB,
        attachmentObjectCommitPreflightId,
        docId,
      );
      if (existingCommit) {
        if (
          existingCommit.workspace_id !== workspaceId
          || existingCommit.attachment_package_verification_id !== attachmentPackageVerificationId
          || existingCommit.attachment_object_plan_id !== attachmentObjectPlanId
          || existingCommit.destination_object_key !== destinationObjectKey
          || existingCommit.size_bytes !== sizeBytes
          || existingCommit.sha256 !== sha256
          || existingCommit.package_sha256 !== packageSha256
          || existingCommit.manifest_sha256 !== manifestSha256
          || existingCommit.status !== "stored_r2"
          || existingCommit.destructive_write !== 1
        ) {
          return json({ error: "restore_attachment_object_commit_state_mismatch" }, 409);
        }
        let existingObject: R2Object | null;
        try {
          existingObject = await env.ATTACHMENTS.head(destinationObjectKey);
        } catch {
          return json({ error: "restore_attachment_destination_check_unavailable" }, 503);
        }
        if (
          !existingObject
          || existingObject.size !== sizeBytes
          || existingObject.customMetadata?.workspaceId !== workspaceId
          || existingObject.customMetadata?.docId !== docId
          || existingObject.customMetadata?.sha256 !== sha256
          || existingObject.customMetadata?.restorePreflightId !== attachmentObjectCommitPreflightId
        ) {
          return json({ error: "restore_attachment_object_commit_state_mismatch" }, 409);
        }
        return json({
          ok: true,
          dryRun: false,
          restoreMode: "attachment_object_byte_commit",
          destructiveWrite: true,
          idempotent: true,
          persistence: "d1_restore_attachment_object_commits",
          commit: restoreAttachmentObjectCommitSummary(existingCommit),
        });
      }

      const reservationIdentity = await restoreAttachmentReservationIdentity(
        workspaceId,
        attachmentObjectCommitPreflightId,
        docId,
        destinationObjectKey,
        sha256,
      );
      const destinationRecord = await findAttachmentObjectRecord(env.DB, workspaceId, destinationObjectKey);
      const matchingReservation = destinationRecord
        ? restoreAttachmentReservationMatches(
          destinationRecord as RestoreAttachmentReservationRow,
          reservationIdentity,
          workspaceId,
          attachmentObjectCommitPreflightId,
          docId,
          destinationObjectKey,
          sizeBytes,
          sha256,
        )
        : false;
      const commitPreflightCreatedAt = Date.parse(commitPreflightRow.created_at);
      const commitPreflightAgeMs = Date.now() - commitPreflightCreatedAt;
      if (
        !matchingReservation
        && (
          !Number.isFinite(commitPreflightCreatedAt)
          || commitPreflightAgeMs < -60_000
          || commitPreflightAgeMs > 15 * 60 * 1000
        )
      ) {
        return json({ error: "restore_attachment_object_commit_preflight_expired" }, 422);
      }
      if (!(await restoreDocumentExists(env.DB, workspaceId, docId))) {
        return json({ error: "restore_attachment_document_missing" }, 422);
      }
      if (destinationRecord && !matchingReservation) {
        return json({ error: "restore_attachment_destination_exists" }, 409);
      }
      let destinationObject: R2Object | null;
      try {
        destinationObject = await env.ATTACHMENTS.head(destinationObjectKey);
      } catch {
        return json({ error: "restore_attachment_destination_check_unavailable" }, 503);
      }
      if (
        destinationObject
        && (
          !matchingReservation
          || !restoreAttachmentR2ObjectMatches(
            destinationObject,
            workspaceId,
            docId,
            sha256,
            attachmentObjectCommitPreflightId,
            sizeBytes,
          )
        )
      ) {
        return json({ error: "restore_attachment_destination_exists" }, 409);
      }

      const bodyBytes = await readBoundedArrayBuffer(request, sizeBytes, ATTACHMENT_PACKAGE_MAX_BYTES);
      if (!bodyBytes.ok) return json({ error: bodyBytes.error }, bodyBytes.status);
      if ((await sha256HexBytes(bodyBytes.bytes)) !== sha256) {
        return json({ error: "sha256_mismatch" }, 422);
      }

      const committedAt = new Date().toISOString();
      const stored = await storeRestoredAttachmentObject(
        env.DB,
        env.ATTACHMENTS,
        auth.memberId,
        workspaceId,
        attachmentPackageVerificationId,
        attachmentObjectPlanId,
        attachmentObjectCommitPreflightId,
        manifestObject,
        plannedObject,
        packageSha256,
        manifestSha256,
        bodyBytes.bytes,
        committedAt,
        reservationIdentity,
      );
      if (!stored.ok) return json({ error: stored.error, persistence: stored.persistence }, stored.status);

      return json({
        ok: true,
        dryRun: false,
        restoreMode: "attachment_object_byte_commit",
        destructiveWrite: true,
        idempotent: stored.idempotent,
        persistence: stored.persistence,
        auditPersistence: stored.auditPersistence,
        commit: restoreAttachmentObjectCommitSummary(stored.commit),
      });
    }

		    if (url.pathname === "/api/operations/dry-run-sync" && request.method === "POST") {
      const auth = await requireMutationAuth(request, env, ALL_AUTHENTICATED_ROLES);
      if (!auth.ok) return mutationAuthError(auth);

      const body = await readJson<OperationSyncRequest>(request);
      const operations = body.operations ?? [];
      if (!Array.isArray(operations) || operations.length > 100) {
        return json({ error: "invalid_operation_batch" }, 400);
      }
      if (auth.workspaceId && operations.some((operation) => operation.workspaceId !== auth.workspaceId)) {
        return workspaceAccessError(auth);
      }

      const validation = validateOperationBatchForSync(operations);
      const roleRejections = validation.rejected.length === 0
        ? operationRoleRejections(operations, auth.role)
        : [];
      const roleRejectedIds = new Set(roleRejections.map((rejection) => rejection.id));
      const authorizedOperations = operations.filter((operation) => !roleRejectedIds.has(operation.id));
      const replay = validation.rejected.length === 0
        ? await replayOperationBatch(env.DB, authorizedOperations, auth.role, auth.memberId)
        : {
          persistence: operationReplayPersistenceMode(env),
          accepted: validation.accepted,
          rejected: validation.rejected,
          replayed: [],
          idempotent: [],
          canonicalApplied: [],
          metadataOnly: [],
        };
      if (env.DB && replay.persistence === "d1_unavailable_dry_run") {
        return json({
          ok: false,
          dryRun: true,
          error: "operation_replay_unavailable",
          persistence: replay.persistence,
          accepted: [],
          rejected: authorizedOperations.map((operation) => ({
            id: operation.id,
            reason: "operation_replay_unavailable",
          })),
          replayed: [],
          idempotent: [],
          canonicalApplied: [],
          metadataOnly: [],
          conflictPolicy: "operation_id_and_entity_guard",
          authorizationPolicy: "operation_kind_role",
          recordAuthorizationPolicy: RECORD_AUTHORIZATION_POLICY,
        }, 503);
      }
      replay.rejected.unshift(...roleRejections);
      const auditPersistence = await recordAuditEvent(
        env.DB,
        auth.workspaceId ?? auditWorkspaceIdForOperations(operations),
        null,
        auth.memberId,
        "operation.sync_replay_checked",
        {
          persistence: replay.persistence,
          operationCount: operations.length,
          acceptedCount: replay.accepted.length,
          rejectedCount: replay.rejected.length,
          replayedCount: replay.replayed.length,
          idempotentCount: replay.idempotent.length,
          canonicalAppliedCount: replay.canonicalApplied.length,
          metadataOnlyCount: replay.metadataOnly.length,
          roleRejectedCount: roleRejections.length,
          validationRejectedCount: validation.rejected.length,
          authorizationPolicy: "operation_kind_role",
          recordAuthorizationPolicy: RECORD_AUTHORIZATION_POLICY,
        },
      );

      return json({
        ok: replay.rejected.length === 0,
        dryRun: true,
        persistence: replay.persistence,
        auditPersistence,
        accepted: replay.accepted,
        rejected: replay.rejected,
        replayed: replay.replayed,
        idempotent: replay.idempotent,
        canonicalApplied: replay.canonicalApplied,
        metadataOnly: replay.metadataOnly,
        conflictPolicy: "operation_id_and_entity_guard",
        authorizationPolicy: "operation_kind_role",
        recordAuthorizationPolicy: RECORD_AUTHORIZATION_POLICY,
      }, replay.rejected.length === 0 ? 200 : 422);
    }

  return json({ error: "not_found" }, 404);
}

function withResponseHeaders(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
  for (const [name, value] of Object.entries(corsHeadersForRequest(request, env))) {
    headers.set(name, value);
  }
  headers.set("vary", appendHeaderValue(headers.get("vary"), "Origin"));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsHeadersForRequest(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("origin")?.trim() ?? "";
  const allowedOrigins = allowedCorsOrigins(env);
  const fallbackOrigin = allowedOrigins[0] ?? defaultAllowedOrigins[0] ?? "http://127.0.0.1:5173";
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : fallbackOrigin;

  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
    "access-control-allow-headers": [
      "content-type",
      "x-film-csrf",
      "x-film-workspace-id",
      "x-film-backup-created-at",
      "x-film-doc-id",
      "x-film-object-key",
      "x-film-destination-object-key",
      "x-film-size-bytes",
      "x-film-sha256",
      "x-film-package-sha256",
      "x-film-manifest-sha256",
      "x-film-attachment-package-verification-id",
      "x-film-attachment-object-plan-id",
      "x-film-attachment-object-commit-preflight-id",
      "x-film-commit-token",
      "x-film-storage-confirmation",
    ].join(", "),
      "access-control-expose-headers": "content-disposition, content-length, content-range, accept-ranges, x-film-doc-id, x-film-sha256, x-film-restore-point-id, x-film-backup-created-at, x-film-package-object-count, x-film-package-total-source-bytes, x-film-package-sha256, x-film-audit-persistence",
    "access-control-allow-credentials": "true",
    "access-control-max-age": "86400",
  };
}

function allowedCorsOrigins(env: Env): string[] {
  const configuredOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins = configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins;
  return [...new Set(origins)];
}

function appendHeaderValue(currentValue: string | null, value: string): string {
  if (!currentValue) return value;
  const values = currentValue.split(",").map((item) => item.trim().toLowerCase());
  return values.includes(value.toLowerCase()) ? currentValue : `${currentValue}, ${value}`;
}

function json(body: JsonValue, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function bindingStatus(env: Env): Record<string, boolean> {
  return {
    d1: Boolean(env.DB),
    kvSessions: Boolean(env.SESSIONS),
    r2Backups: Boolean(env.BACKUPS),
    r2Attachments: Boolean(env.ATTACHMENTS),
  };
}

async function readCanonicalWorkspaceSnapshot(
  db: D1Database,
  workspaceId: string,
  memberId: string,
  role: AuthRole,
): Promise<CanonicalWorkspaceSnapshot | null> {
  try {
    const generatedAt = new Date().toISOString();
    const workspace = await db.prepare(`
      SELECT id, name, updated_at
      FROM workspaces
      WHERE id = ?
      LIMIT 1
    `).bind(workspaceId).first<WorkspaceSnapshotWorkspaceRow>();
    if (!workspace) return null;

    const truncated = new Set<CanonicalWorkspaceCollection>();
    const members = snapshotRows(await db.prepare(`
      SELECT
        wm.id,
        wm.display_name,
        wm.email_hash,
        wm.role,
        COALESCE(wms.status, 'active') AS status,
        wm.last_seen_at
      FROM workspace_members wm
      LEFT JOIN workspace_member_statuses wms ON wms.member_id = wm.id
      WHERE wm.workspace_id = ?
      ORDER BY wm.created_at ASC, wm.id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_MEMBER_LIMIT + 1).all<WorkspaceSnapshotMemberRow>(), WORKSPACE_SNAPSHOT_MEMBER_LIMIT, "members", truncated);
    const projects = snapshotRows(await db.prepare(`
      SELECT id, title, project_type, status, phase, logline, owner_member_id, created_at, updated_at
      FROM projects
      WHERE workspace_id = ?
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_PROJECT_LIMIT + 1).all<WorkspaceSnapshotProjectRow>(), WORKSPACE_SNAPSHOT_PROJECT_LIMIT, "projects", truncated);
    const profiles = snapshotRows(await db.prepare(`
      SELECT fp.project_id, fp.runtime_minutes, fp.format, fp.shoot_start, fp.shoot_end,
        fp.budget_cents, fp.spent_cents, fp.updated_at
      FROM film_profiles fp
      INNER JOIN projects p ON p.id = fp.project_id
      WHERE p.workspace_id = ?
      ORDER BY fp.updated_at DESC, fp.project_id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_PROFILE_LIMIT + 1).all<WorkspaceSnapshotFilmProfileRow>(), WORKSPACE_SNAPSHOT_PROFILE_LIMIT, "filmProfiles", truncated);
    const tasks = snapshotRows(await db.prepare(`
      SELECT id, project_id, title, status, priority, due_at, assignee_member_id,
        owner_member_id, created_at, updated_at
      FROM tasks
      WHERE workspace_id = ?
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_TASK_LIMIT + 1).all<WorkspaceSnapshotTaskRow>(), WORKSPACE_SNAPSHOT_TASK_LIMIT, "tasks", truncated);
    const documents = snapshotRows(await db.prepare(`
      SELECT id, project_id, title, document_type,
        CASE WHEN length(COALESCE(markdown_snapshot, '')) <= ? THEN markdown_snapshot ELSE NULL END AS markdown_snapshot,
        CASE WHEN length(COALESCE(markdown_snapshot, '')) > ? THEN 1 ELSE 0 END AS markdown_truncated,
        external_url, sensitive, owner_member_id, created_at, updated_at
      FROM documents
      WHERE workspace_id = ?
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
    `).bind(
      WORKSPACE_SNAPSHOT_MARKDOWN_MAX_CHARS,
      WORKSPACE_SNAPSHOT_MARKDOWN_MAX_CHARS,
      workspaceId,
      WORKSPACE_SNAPSHOT_DOCUMENT_LIMIT + 1,
    ).all<WorkspaceSnapshotDocumentRow>(), WORKSPACE_SNAPSHOT_DOCUMENT_LIMIT, "documents", truncated);
    const people = snapshotRows(await db.prepare(`
      SELECT id, display_name, role_tags, sensitive, owner_member_id, updated_at
      FROM people
      WHERE workspace_id = ?
      ORDER BY COALESCE(updated_at, '') DESC, id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_PERSON_LIMIT + 1).all<WorkspaceSnapshotPersonRow>(), WORKSPACE_SNAPSHOT_PERSON_LIMIT, "people", truncated);
    const projectPeople = snapshotRows(await db.prepare(`
      SELECT pp.project_id, pp.person_id, pp.project_role
      FROM project_people pp
      INNER JOIN projects p ON p.id = pp.project_id
      INNER JOIN people person ON person.id = pp.person_id
      WHERE p.workspace_id = ? AND person.workspace_id = ?
      ORDER BY pp.project_id ASC, pp.person_id ASC
      LIMIT ?
    `).bind(workspaceId, workspaceId, WORKSPACE_SNAPSHOT_PROJECT_PERSON_LIMIT + 1).all<WorkspaceSnapshotProjectPersonRow>(), WORKSPACE_SNAPSHOT_PROJECT_PERSON_LIMIT, "projectPeople", truncated);
    const equipment = snapshotRows(await db.prepare(`
      SELECT id, project_id, name, equipment_type, status, owner_member_id, updated_at
      FROM equipment
      WHERE workspace_id = ?
      ORDER BY COALESCE(updated_at, '') DESC, id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_EQUIPMENT_LIMIT + 1).all<WorkspaceSnapshotEquipmentRow>(), WORKSPACE_SNAPSHOT_EQUIPMENT_LIMIT, "equipment", truncated);
    const expenses = snapshotRows(await db.prepare(`
      SELECT id, project_id, category, amount_cents, purchased_at, comment, owner_member_id, updated_at
      FROM expenses
      WHERE workspace_id = ?
      ORDER BY COALESCE(updated_at, '') DESC, id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_EXPENSE_LIMIT + 1).all<WorkspaceSnapshotExpenseRow>(), WORKSPACE_SNAPSHOT_EXPENSE_LIMIT, "expenses", truncated);
    const restorePoints = snapshotRows(await db.prepare(`
      SELECT id, label, created_at
      FROM restore_points
      WHERE workspace_id = ?
      ORDER BY created_at DESC, id ASC
      LIMIT ?
    `).bind(workspaceId, WORKSPACE_SNAPSHOT_RESTORE_POINT_LIMIT + 1).all<{ id: string; label: string; created_at: string }>(), WORKSPACE_SNAPSHOT_RESTORE_POINT_LIMIT, "restorePoints", truncated);

    const operatorRead = role === "owner" || role === "producer" || role === "director";
    const accessRows = operatorRead ? [] : (await db.prepare(`
      SELECT entity_type, entity_id
      FROM record_permissions
      WHERE workspace_id = ?
        AND member_id = ?
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY entity_type ASC, entity_id ASC
      LIMIT 2001
    `).bind(workspaceId, memberId, generatedAt).all<WorkspaceSnapshotAccessRow>()).results.slice(0, 2_000);
    const membershipRows = operatorRead ? [] : (await db.prepare(`
      SELECT 'project' AS entity_type, project_id AS entity_id
      FROM project_memberships
      WHERE member_id = ?
      ORDER BY project_id ASC
      LIMIT 1001
    `).bind(memberId).all<WorkspaceSnapshotAccessRow>()).results.slice(0, 1_000);
    const access = workspaceSnapshotAccess(projects, tasks, documents, equipment, memberId, operatorRead, [
      ...accessRows,
      ...membershipRows,
    ]);
    const visibleProjects = projects.filter((project) => access.projectIds.has(project.id));
    const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
    const visibleTasks = tasks.filter((task) =>
      task.owner_member_id === memberId
      || Boolean(task.project_id && visibleProjectIds.has(task.project_id))
      || access.taskIds.has(task.id)
    );
    const visibleDocuments = documents.filter((document) => {
      const directlyAllowed = document.owner_member_id === memberId || access.documentIds.has(document.id);
      const projectAllowed = Boolean(document.project_id && visibleProjectIds.has(document.project_id));
      return directlyAllowed || (projectAllowed && document.sensitive !== 1);
    });
    const visibleEquipment = equipment.filter((item) =>
      item.owner_member_id === memberId
      || Boolean(item.project_id && visibleProjectIds.has(item.project_id))
      || access.equipmentIds.has(item.id)
    );
    const visibleProjectPeople = projectPeople.filter((item) => visibleProjectIds.has(item.project_id));
    const visiblePersonIds = new Set(visibleProjectPeople.map((item) => item.person_id));
    const visiblePeople = people.filter((person) =>
      operatorRead
      || person.owner_member_id === memberId
      || (person.sensitive !== 1 && visiblePersonIds.has(person.id))
      || access.personIds.has(person.id)
    );
    const allowedPersonIds = new Set(visiblePeople.map((person) => person.id));
    const visibleExpenses = expenses.filter((expense) =>
      role === "owner"
      || role === "producer"
      || expense.owner_member_id === memberId
      || access.expenseIds.has(expense.id)
    );

    return {
      schemaVersion: 1,
      generatedAt,
      persistence: "d1_canonical_workspace_snapshot",
      readPolicy: "workspace_role_and_record_scope",
      workspace: {
        id: workspace.id,
        name: workspace.name,
        updatedAt: workspace.updated_at,
      },
      currentMember: { id: memberId, role },
      members: members
        .filter((member) => isAuthRole(member.role))
        .map((member): CanonicalWorkspaceMember => ({
          id: member.id,
          displayName: member.display_name,
          emailHash: role === "owner" || role === "producer" ? member.email_hash : null,
          role: member.role as AuthRole,
          status: normalizeWorkspaceMemberStatus(member.status),
          lastSeenAt: member.last_seen_at,
        })),
      projects: visibleProjects.map(snapshotProject),
      filmProfiles: profiles.filter((profile) => visibleProjectIds.has(profile.project_id)).map(snapshotFilmProfile),
      tasks: visibleTasks.map(snapshotTask),
      documents: visibleDocuments.map(snapshotDocument),
      people: visiblePeople.map((person) => snapshotPerson(person, generatedAt)),
      projectPeople: visibleProjectPeople
        .filter((item) => allowedPersonIds.has(item.person_id))
        .map(snapshotProjectPerson),
      equipment: visibleEquipment.map((item) => snapshotEquipment(item, generatedAt)),
      expenses: visibleExpenses.map((expense) => snapshotExpense(expense, generatedAt)),
      restorePoints: role === "owner" || role === "producer"
        ? restorePoints.map((point) => ({ id: point.id, label: point.label, createdAt: point.created_at }))
        : [],
      truncatedCollections: [...truncated],
    };
  } catch {
    return null;
  }
}

function snapshotRows<T>(
  result: D1Result<T>,
  limit: number,
  collection: CanonicalWorkspaceCollection,
  truncated: Set<CanonicalWorkspaceCollection>,
): T[] {
  if (result.results.length > limit) truncated.add(collection);
  return result.results.slice(0, limit);
}

function workspaceSnapshotAccess(
  projects: WorkspaceSnapshotProjectRow[],
  tasks: WorkspaceSnapshotTaskRow[],
  documents: WorkspaceSnapshotDocumentRow[],
  equipment: WorkspaceSnapshotEquipmentRow[],
  memberId: string,
  operatorRead: boolean,
  accessRows: WorkspaceSnapshotAccessRow[],
): {
  projectIds: Set<string>;
  taskIds: Set<string>;
  documentIds: Set<string>;
  personIds: Set<string>;
  equipmentIds: Set<string>;
  expenseIds: Set<string>;
} {
  const entityIds = (type: string) => new Set(accessRows.filter((row) => row.entity_type === type).map((row) => row.entity_id));
  const projectIds = operatorRead
    ? new Set(projects.map((project) => project.id))
    : entityIds("project");
  for (const project of projects) {
    if (project.owner_member_id === memberId) projectIds.add(project.id);
  }
  const taskIds = entityIds("task");
  const documentIds = entityIds("document");
  const equipmentIds = entityIds("equipment");
  for (const task of tasks) {
    if (taskIds.has(task.id) && task.project_id) projectIds.add(task.project_id);
  }
  for (const document of documents) {
    if (documentIds.has(document.id) && document.project_id) projectIds.add(document.project_id);
  }
  for (const item of equipment) {
    if (equipmentIds.has(item.id) && item.project_id) projectIds.add(item.project_id);
  }
  return {
    projectIds,
    taskIds,
    documentIds,
    personIds: entityIds("person"),
    equipmentIds,
    expenseIds: entityIds("expense"),
  };
}

function snapshotProject(row: WorkspaceSnapshotProjectRow): CanonicalProject {
  return {
    id: row.id,
    title: row.title,
    projectType: row.project_type,
    status: row.status,
    phase: row.phase,
    logline: row.logline,
    ownerMemberId: row.owner_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function snapshotFilmProfile(row: WorkspaceSnapshotFilmProfileRow): CanonicalFilmProfile {
  return {
    projectId: row.project_id,
    runtimeMinutes: row.runtime_minutes,
    format: row.format,
    shootStart: row.shoot_start,
    shootEnd: row.shoot_end,
    budgetCents: row.budget_cents,
    spentCents: row.spent_cents,
    updatedAt: row.updated_at,
  };
}

function snapshotTask(row: WorkspaceSnapshotTaskRow): CanonicalTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    assigneeMemberId: row.assignee_member_id,
    ownerMemberId: row.owner_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function snapshotDocument(row: WorkspaceSnapshotDocumentRow): CanonicalDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    documentType: row.document_type,
    markdownSnapshot: row.markdown_snapshot,
    markdownTruncated: row.markdown_truncated === 1,
    externalUrl: row.external_url,
    sensitive: row.sensitive === 1,
    ownerMemberId: row.owner_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function snapshotPerson(row: WorkspaceSnapshotPersonRow, fallbackUpdatedAt: string): CanonicalPerson {
  return {
    id: row.id,
    displayName: row.display_name,
    roleTags: safeStringList(row.role_tags, 20, 80),
    sensitive: row.sensitive === 1,
    ownerMemberId: row.owner_member_id,
    updatedAt: row.updated_at ?? fallbackUpdatedAt,
  };
}

function snapshotProjectPerson(row: WorkspaceSnapshotProjectPersonRow): CanonicalProjectPerson {
  return { projectId: row.project_id, personId: row.person_id, projectRole: row.project_role };
}

function snapshotEquipment(row: WorkspaceSnapshotEquipmentRow, fallbackUpdatedAt: string): CanonicalEquipment {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    equipmentType: row.equipment_type,
    status: row.status,
    ownerMemberId: row.owner_member_id,
    updatedAt: row.updated_at ?? fallbackUpdatedAt,
  };
}

function snapshotExpense(row: WorkspaceSnapshotExpenseRow, fallbackUpdatedAt: string): CanonicalExpense {
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category,
    spentCents: row.amount_cents,
    budgetCents: expenseBudgetCents(row.comment),
    purchasedAt: row.purchased_at,
    ownerMemberId: row.owner_member_id,
    updatedAt: row.updated_at ?? fallbackUpdatedAt,
  };
}

function expenseBudgetCents(comment: string | null): number {
  if (!comment) return 0;
  try {
    const parsed = JSON.parse(comment) as { budget?: unknown };
    const budget = typeof parsed.budget === "number" && Number.isFinite(parsed.budget) ? parsed.budget : 0;
    return Math.max(0, Math.min(100_000_000_000, Math.round(budget * 100)));
  } catch {
    return 0;
  }
}

function safeStringList(value: string, maxItems: number, maxLength: number): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean)
      .slice(0, maxItems);
  } catch {
    return [];
  }
}

function seedCanonicalWorkspaceSnapshot(role: AuthRole, memberId: string | null): CanonicalWorkspaceSnapshot {
  const generatedAt = new Date().toISOString();
  const projects: CanonicalProject[] = seedWorkspace.projects.map((project) => ({
    id: project.id,
    title: project.title,
    projectType: project.type,
    status: "active",
    phase: canonicalProjectPhase(project.phase),
    logline: project.description || null,
    ownerMemberId: seedWorkspace.members[0]?.id ?? null,
    createdAt: generatedAt,
    updatedAt: generatedAt,
  }));
  const projectPeople: CanonicalProjectPerson[] = [];
  return {
    schemaVersion: 1,
    generatedAt,
    persistence: "dry_run_seed_snapshot",
    readPolicy: "workspace_role_and_record_scope",
    workspace: { id: seedWorkspace.id, name: seedWorkspace.name, updatedAt: generatedAt },
    currentMember: { id: memberId ?? seedWorkspace.members[0]?.id ?? null, role },
    members: seedWorkspace.members.map((member) => ({
      id: member.id,
      displayName: member.displayName,
      emailHash: member.emailHash,
      role: member.role,
      status: member.status,
      lastSeenAt: member.lastSeenAt,
    })),
    projects,
    filmProfiles: seedWorkspace.projects.map((project) => ({
      projectId: project.id,
      runtimeMinutes: project.runtimeMinutes,
      format: project.format,
      shootStart: null,
      shootEnd: null,
      budgetCents: Math.round(project.totalBudget * 100),
      spentCents: Math.round(project.spentBudget * 100),
      updatedAt: generatedAt,
    })),
    tasks: seedWorkspace.projects.flatMap((project) => project.openTasks.map((task) => ({
      id: task.id,
      projectId: project.id,
      title: task.title,
      status: task.status,
      priority: "normal",
      dueAt: task.due === "Unscheduled" ? null : task.due,
      assigneeMemberId: null,
      ownerMemberId: seedWorkspace.members[0]?.id ?? null,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    }))),
    documents: seedWorkspace.projects.flatMap((project) => project.docs.map((document) => ({
      id: document.id,
      projectId: project.id,
      title: document.name,
      documentType: canonicalDocumentType(document.type),
      markdownSnapshot: document.markdownSnapshot ?? null,
      markdownTruncated: false,
      externalUrl: null,
      sensitive: false,
      ownerMemberId: seedWorkspace.members[0]?.id ?? null,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    }))),
    people: seedWorkspace.projects.flatMap((project) => project.people.map((person) => {
      projectPeople.push({ projectId: project.id, personId: person.id, projectRole: person.role });
      return {
        id: person.id,
        displayName: person.name,
        roleTags: [person.role],
        sensitive: false,
        ownerMemberId: seedWorkspace.members[0]?.id ?? null,
        updatedAt: generatedAt,
      };
    })),
    projectPeople,
    equipment: seedWorkspace.projects.flatMap((project) => project.equipment.map((item) => ({
      id: item.id,
      projectId: project.id,
      name: item.name,
      equipmentType: item.statusTone,
      status: item.status,
      ownerMemberId: seedWorkspace.members[0]?.id ?? null,
      updatedAt: generatedAt,
    }))),
    expenses: seedWorkspace.projects.flatMap((project) => project.expenses.map((expense) => ({
      id: expense.id,
      projectId: project.id,
      category: expense.category,
      spentCents: Math.round(expense.spent * 100),
      budgetCents: Math.round(expense.budget * 100),
      purchasedAt: null,
      ownerMemberId: seedWorkspace.members[0]?.id ?? null,
      updatedAt: generatedAt,
    }))),
    restorePoints: seedWorkspace.restorePoints,
    truncatedCollections: [],
  };
}

async function updateCanonicalDocumentMarkdown(
  db: D1Database,
  workspaceId: string,
  projectId: string,
  documentId: string,
  markdownSnapshot: string,
  markdownBytes: number,
  expectedUpdatedAt: string,
  role: AuthRole,
  memberId: string,
): Promise<
  | {
    ok: true;
    destructiveWrite: true;
    persistence: "d1_document_markdown";
    auditPersistence: "d1_audit_events";
    document: {
      id: string;
      projectId: string;
      markdownLength: number;
      markdownBytes: number;
      markdownSha256: string;
      updatedAt: string;
    };
  }
  | {
    ok: false;
    error: string;
    status: number;
    persistence: "d1_document_markdown" | "d1_unavailable_dry_run";
  }
> {
  try {
    const document = await db.prepare(`
      SELECT id, workspace_id, project_id, document_type, sensitive, owner_member_id, updated_at
      FROM documents
      WHERE id = ?
      LIMIT 1
    `).bind(documentId).first<DocumentMarkdownRow>();
    if (!document) {
      return { ok: false, error: "document_not_found", status: 404, persistence: "d1_document_markdown" };
    }
    if (document.workspace_id !== workspaceId || document.project_id !== projectId) {
      return { ok: false, error: "document_scope_mismatch", status: 403, persistence: "d1_document_markdown" };
    }
    if (document.document_type !== "markdown" && document.document_type !== "native") {
      return { ok: false, error: "document_type_not_editable", status: 422, persistence: "d1_document_markdown" };
    }
    if (document.updated_at !== expectedUpdatedAt) {
      return { ok: false, error: "stale_document_version", status: 409, persistence: "d1_document_markdown" };
    }
    const canWrite = role === "owner"
      || role === "producer"
      || role === "director"
      || document.owner_member_id === memberId
      || Boolean(await recordWritePermissionFor(db, workspaceId, "document", documentId, memberId));
    if (!canWrite) {
      return { ok: false, error: "document_write_permission_required", status: 403, persistence: "d1_document_markdown" };
    }

    const updatedAt = new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1)).toISOString();
    const markdownSha256 = await sha256Hex(markdownSnapshot);
    const statements = [
      db.prepare(`
        SELECT CASE
          WHEN EXISTS (
            SELECT 1
            FROM documents
            WHERE id = ?
              AND workspace_id = ?
              AND project_id = ?
              AND document_type IN ('markdown', 'native')
              AND updated_at = ?
          )
          THEN 1 ELSE abs(-9223372036854775808)
        END AS document_markdown_state_assertion
      `).bind(documentId, workspaceId, projectId, expectedUpdatedAt),
      db.prepare(`
        UPDATE documents /* canonical_document_markdown_update */
        SET markdown_snapshot = ?,
          updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND project_id = ?
          AND document_type IN ('markdown', 'native')
          AND updated_at = ?
      `).bind(markdownSnapshot, updatedAt, documentId, workspaceId, projectId, expectedUpdatedAt),
      auditEventInsertStatement(
        db,
        `audit_document_markdown_${crypto.randomUUID()}`,
        workspaceId,
        projectId,
        memberId,
        "document.markdown_updated",
        {
          documentId,
          markdownLength: markdownSnapshot.length,
          markdownBytes,
          markdownSha256,
          expectedUpdatedAt,
          updatedAt,
          sensitive: document.sensitive === 1,
        },
        updatedAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("document markdown batch did not apply exactly once");
    }
    return {
      ok: true,
      destructiveWrite: true,
      persistence: "d1_document_markdown",
      auditPersistence: "d1_audit_events",
      document: {
        id: documentId,
        projectId,
        markdownLength: markdownSnapshot.length,
        markdownBytes,
        markdownSha256,
        updatedAt,
      },
    };
  } catch {
    return {
      ok: false,
      error: "document_storage_unavailable",
      status: 503,
      persistence: "d1_unavailable_dry_run",
    };
  }
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

type RestoreRequestIdentityBody = {
  workspaceId?: string;
  snapshotWorkspaceId?: string;
  backupCreatedAt?: string;
  preRestoreBackupId?: string;
};

type RestoreRequestIdentity<T extends RestoreRequestIdentityBody> =
  | {
      ok: true;
      body: T;
      workspaceId: string;
      snapshotWorkspaceId: string;
      backupCreatedAt: string;
      preRestoreBackupId: string;
    }
  | { ok: false; response: Response };

async function readRestoreRequestIdentity<T extends RestoreRequestIdentityBody>(
  request: Request,
  auth: Extract<MutationAuthResult, { ok: true }>,
): Promise<RestoreRequestIdentity<T>> {
  const body = await readJson<T>(request);
  const workspaceId = body.workspaceId?.trim() ?? "";
  if (!isValidWorkspaceId(workspaceId)) {
    return { ok: false, response: json({ error: "invalid_workspace" }, 400) };
  }
  if (!hasWorkspaceAccess(auth, workspaceId)) {
    return { ok: false, response: workspaceAccessError(auth) };
  }

  const snapshotWorkspaceId = body.snapshotWorkspaceId?.trim() || workspaceId;
  if (snapshotWorkspaceId !== workspaceId) {
    return { ok: false, response: json({ error: "snapshot_workspace_mismatch" }, 422) };
  }

  const backupCreatedAt = body.backupCreatedAt?.trim() ?? "";
  if (backupCreatedAt && Number.isNaN(Date.parse(backupCreatedAt))) {
    return { ok: false, response: json({ error: "invalid_backup_created_at" }, 400) };
  }
  const preRestoreBackupId = body.preRestoreBackupId?.trim() ?? "";
  if (preRestoreBackupId && !isValidRecordId(preRestoreBackupId)) {
    return { ok: false, response: json({ error: "invalid_pre_restore_backup" }, 400) };
  }

  return {
    ok: true,
    body,
    workspaceId,
    snapshotWorkspaceId,
    backupCreatedAt,
    preRestoreBackupId,
  };
}

function parseJsonObject<T>(value: string): T | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isObjectRecord(parsed) ? parsed as T : null;
  } catch {
    return null;
  }
}

async function readBoundedText(request: Request, maxBytes: number): Promise<string | null> {
  const body = await request.text();
  return new TextEncoder().encode(body).byteLength <= maxBytes ? body : null;
}

async function readBoundedArrayBuffer(
  request: Request,
  expectedBytes: number,
  maxBytes: number,
): Promise<
  | { ok: true; bytes: ArrayBuffer }
  | { ok: false; error: "size_mismatch" | "payload_too_large"; status: 413 | 422 }
> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsed = Number.parseInt(declaredLength, 10);
    if (!Number.isSafeInteger(parsed) || parsed !== expectedBytes) {
      return { ok: false, error: "size_mismatch", status: 422 };
    }
  }
  if (expectedBytes > maxBytes) return { ok: false, error: "payload_too_large", status: 413 };
  if (!request.body) return { ok: false, error: "size_mismatch", status: 422 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes || total > expectedBytes) {
      await reader.cancel();
      return { ok: false, error: "payload_too_large", status: 413 };
    }
    chunks.push(value);
  }
  if (total !== expectedBytes) return { ok: false, error: "size_mismatch", status: 422 };

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes: merged.buffer };
}

async function requireMutationRateLimit(
  request: Request,
  env: Env,
  url: URL,
): Promise<RateLimitResult> {
  const policy = rateLimitPolicyFor(request.method, url.pathname, env);
  if (!policy) {
    return { ok: true, persistence: "dry_run_memoryless" };
  }

  if (!env.SESSIONS) {
    if (isLiveMagicLinkDelivery(env)) {
      return { ok: false, error: "rate_limit_unavailable", status: 503, persistence: "kv_unavailable_dry_run" };
    }
    return { ok: true, persistence: "dry_run_memoryless" };
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const key = `${RATE_LIMIT_PREFIX}:${policy.bucket}:${await rateLimitIdentityHash(request, policy.bucket)}`;
    const current = parseRateLimitBucket(await env.SESSIONS.get(key));
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + policy.windowSeconds };

    if (bucket.count >= policy.limit) {
      return {
        ok: false,
        error: "rate_limited",
        status: 429,
        persistence: "kv_rate_limit",
        limit: policy.limit,
        windowSeconds: policy.windowSeconds,
        retryAfterSeconds: Math.max(1, bucket.resetAt - now),
      };
    }

    bucket.count += 1;
    await env.SESSIONS.put(key, JSON.stringify(bucket), {
      expirationTtl: Math.max(60, bucket.resetAt - now),
    });
    return { ok: true, persistence: "kv_rate_limit" };
  } catch {
    if (isLiveMagicLinkDelivery(env)) {
      return { ok: false, error: "rate_limit_unavailable", status: 503, persistence: "kv_unavailable_dry_run" };
    }
    return { ok: true, persistence: "kv_unavailable_dry_run" };
  }
}

function rateLimitPolicyFor(method: string, pathname: string, env: Env): RateLimitPolicy | null {
  if (method === "GET" && pathname === "/api/providers/google/oauth/callback") {
    return rateLimitPolicyWithOverride(
      { bucket: "google_oauth_callback", limit: 60, windowSeconds: 10 * 60 },
      env.RATE_LIMIT_OVERRIDES,
    );
  }
  if (method === "GET" && pathname === "/api/providers/meta/oauth/callback") {
    return rateLimitPolicyWithOverride(
      { bucket: "meta_oauth_callback", limit: 60, windowSeconds: 10 * 60 },
      env.RATE_LIMIT_OVERRIDES,
    );
  }
  if (method === "GET" && pathname === "/api/providers/meta/data-deletion/status") {
    return rateLimitPolicyWithOverride(
      { bucket: "meta_data_deletion_status", limit: 60, windowSeconds: 60 },
      env.RATE_LIMIT_OVERRIDES,
    );
  }
  if (method !== "POST") {
    return null;
  }

  let policy: RateLimitPolicy;
  if (pathname === "/api/auth/magic-link/request") {
    policy = { bucket: "auth_magic_link_request", limit: 5, windowSeconds: 10 * 60 };
  } else if (pathname === "/api/auth/magic-link/verify") {
    policy = { bucket: "auth_magic_link_verify", limit: 20, windowSeconds: 10 * 60 };
  } else if (pathname === "/api/auth/logout") {
    policy = { bucket: "auth_logout", limit: 60, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/invites/")) {
    policy = { bucket: "invite_dry_run", limit: 20, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/projects/")) {
    policy = { bucket: "project_membership", limit: 60, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/records/")) {
    policy = { bucket: "record_permission", limit: 60, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/members/")) {
    policy = { bucket: "member_status", limit: 60, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/workspaces/")) {
    policy = { bucket: "workspace_snapshot", limit: 60, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/documents/")) {
    policy = { bucket: "document_content", limit: 120, windowSeconds: 60 };
  } else if (pathname === "/api/providers/google/oauth/start") {
    policy = { bucket: "google_oauth_start", limit: 10, windowSeconds: 10 * 60 };
  } else if (pathname === "/api/providers/google/disconnect") {
    policy = { bucket: "google_oauth_disconnect", limit: 10, windowSeconds: 60 };
  } else if (pathname === "/api/providers/runtime-readiness") {
    policy = { bucket: "provider_runtime_readiness", limit: 60, windowSeconds: 60 };
  } else if (pathname === "/api/providers/google/connection") {
    policy = { bucket: "google_connection_status", limit: 60, windowSeconds: 60 };
  } else if (pathname === "/api/providers/meta/oauth/start") {
    policy = { bucket: "meta_oauth_start", limit: 10, windowSeconds: 10 * 60 };
  } else if (pathname === "/api/providers/meta/connection") {
    policy = { bucket: "meta_connection_status", limit: 60, windowSeconds: 60 };
  } else if (pathname === "/api/providers/meta/pages") {
    policy = { bucket: "meta_page_candidates", limit: 20, windowSeconds: 60 };
  } else if (pathname === "/api/providers/meta/select-page") {
    policy = { bucket: "meta_page_select", limit: 10, windowSeconds: 60 };
  } else if (pathname === "/api/providers/meta/analytics") {
    policy = { bucket: "meta_analytics", limit: 30, windowSeconds: 60 };
  } else if (pathname === "/api/providers/meta/disconnect") {
    policy = { bucket: "meta_oauth_disconnect", limit: 10, windowSeconds: 60 };
  } else if (pathname === "/api/webhooks/meta/data-deletion") {
    policy = { bucket: "meta_data_deletion_callback", limit: 120, windowSeconds: 60 };
  } else if (pathname === "/api/webhooks/meta/deauthorize") {
    policy = { bucket: "meta_deauthorization_callback", limit: 120, windowSeconds: 60 };
  } else if (pathname === "/api/providers/sms/consent/commit") {
    policy = { bucket: "sms_consent_commit", limit: 20, windowSeconds: 60 };
  } else if (pathname === "/api/providers/sms/consent/revoke") {
    policy = { bucket: "sms_consent_revoke", limit: 20, windowSeconds: 60 };
  } else if (pathname === "/api/providers/sms/consent/manifest") {
    policy = { bucket: "sms_consent_manifest", limit: 60, windowSeconds: 60 };
  } else if (pathname === "/api/providers/sms/provider-readiness") {
    policy = { bucket: "telnyx_provider_readiness", limit: 20, windowSeconds: 60 };
  } else if (pathname === "/api/providers/sms/send") {
    policy = { bucket: "sms_live_send", limit: 10, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/providers/")) {
    policy = { bucket: "provider_dry_run", limit: 60, windowSeconds: 60 };
  } else if (pathname === "/api/webhooks/telnyx/messaging") {
    policy = { bucket: "telnyx_webhook", limit: 120, windowSeconds: 60 };
  } else if (pathname === "/api/imports/notion/dry-run") {
    policy = { bucket: "notion_import_preflight", limit: 20, windowSeconds: 60 };
  } else if (pathname === "/api/imports/notion/core/commit") {
    policy = { bucket: "notion_core_import", limit: 20, windowSeconds: 60 };
  } else if (pathname === "/api/imports/notion/planning/commit") {
    policy = { bucket: "notion_planning_import", limit: 20, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/imports/")) {
    policy = { bucket: "import_dry_run", limit: 20, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/attachments/")) {
    policy = { bucket: "attachment_dry_run", limit: 60, windowSeconds: 60 };
  } else if (pathname.startsWith("/api/backups/") || pathname.startsWith("/api/restores/") || pathname.startsWith("/api/planning/") || pathname.startsWith("/api/audit-events/")) {
    policy = { bucket: "backup_restore", limit: 20, windowSeconds: 60 };
  } else if (pathname === "/api/operations/dry-run-sync") {
    policy = { bucket: "operation_sync", limit: 120, windowSeconds: 60 };
  } else {
    policy = { bucket: "unknown_mutation", limit: 20, windowSeconds: 60 };
  }

  return rateLimitPolicyWithOverride(policy, env.RATE_LIMIT_OVERRIDES);
}

function rateLimitPolicyWithOverride(policy: RateLimitPolicy, rawOverrides: string | undefined): RateLimitPolicy {
  const raw = rawOverrides?.trim();
  if (!raw) return policy;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObjectRecord(parsed)) return policy;
    const override = parsed[policy.bucket];
    if (!isObjectRecord(override)) return policy;
    const limit = Number(override.limit);
    const windowSeconds = Number(override.windowSeconds ?? override.window_seconds);
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > RATE_LIMIT_OVERRIDE_MAX_LIMIT ||
      !Number.isSafeInteger(windowSeconds) ||
      windowSeconds < RATE_LIMIT_OVERRIDE_MIN_WINDOW_SECONDS ||
      windowSeconds > RATE_LIMIT_OVERRIDE_MAX_WINDOW_SECONDS
    ) {
      return policy;
    }
    return { ...policy, limit, windowSeconds };
  } catch {
    return policy;
  }
}

async function rateLimitIdentityHash(request: Request, bucket: string): Promise<string> {
  const ip = firstHeaderValue(request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")) ?? "unknown-ip";
  const userAgent = request.headers.get("user-agent") ?? "unknown-agent";
  return sha256Hex(`${bucket}|${ip}|${userAgent}`);
}

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
}

function parseRateLimitBucket(value: string | null): RateLimitBucket | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<RateLimitBucket>;
    if (
      typeof parsed.count === "number" &&
      Number.isFinite(parsed.count) &&
      parsed.count >= 0 &&
      typeof parsed.resetAt === "number" &&
      Number.isFinite(parsed.resetAt)
    ) {
      return { count: parsed.count, resetAt: parsed.resetAt };
    }
  } catch {
    return null;
  }

  return null;
}

function rateLimitError(result: Extract<RateLimitResult, { ok: false }>): Response {
  if (result.error === "rate_limit_unavailable") {
    return json({
      error: result.error,
      persistence: result.persistence,
    }, result.status);
  }

  return json({
    error: result.error,
    persistence: result.persistence,
    limit: result.limit,
    windowSeconds: result.windowSeconds,
    retryAfterSeconds: result.retryAfterSeconds,
  }, result.status, {
    "retry-after": String(result.retryAfterSeconds),
  });
}

async function requireMutationAuth(
  request: Request,
  env: Env,
  allowedRoles: AuthRole[],
): Promise<MutationAuthResult> {
  const csrfToken = request.headers.get("x-film-csrf");
  if (!csrfToken || csrfToken.length < 12) {
    return { ok: false, error: "missing_csrf", status: 403 };
  }

  if (!env.DB) {
    return { ok: true, role: "owner", workspaceId: null, memberId: null, csrfToken, persistence: "dry_run_memoryless" };
  }

  const sessionId = getCookie(request.headers.get("cookie"), "film_session");
  if (!sessionId) {
    if (await isSessionStoreAvailable(env.DB)) {
      return { ok: false, error: "missing_session", status: 401, persistence: "d1_kv_auth_records" };
    }
    return isLiveMagicLinkDelivery(env)
      ? { ok: false, error: "missing_session", status: 401, persistence: "d1_kv_auth_records" }
      : { ok: true, role: "owner", workspaceId: null, memberId: null, csrfToken, persistence: "d1_unavailable_dry_run" };
  }

  try {
    const csrfHash = await sha256Hex(csrfToken);
    const session = await env.DB.prepare(`
      SELECT id, workspace_id, member_id, csrf_hash, revoked_at, expires_at
      FROM sessions
      WHERE id = ?
      LIMIT 1
    `).bind(sessionId).first<SessionRow>();

    if (!session || session.revoked_at || Date.parse(session.expires_at) < Date.now() || session.csrf_hash !== csrfHash) {
      return { ok: false, error: "invalid_session", status: 401, persistence: "d1_kv_auth_records" };
    }
    if (isLiveMagicLinkDelivery(env) && (!session.workspace_id || !session.member_id)) {
      return { ok: false, error: "invalid_session", status: 401, persistence: "d1_kv_auth_records" };
    }

    const membership = await readSessionMembership(env, sessionId, session.member_id, session.workspace_id);
    if (session.member_id && membership.status !== "active") {
      return { ok: false, error: "member_not_active", status: 403, persistence: "d1_kv_auth_records" };
    }

    const role = membership.role;
    if (!allowedRoles.includes(role)) {
      return { ok: false, error: "insufficient_role", status: 403, persistence: "d1_kv_auth_records" };
    }

    return {
      ok: true,
      role,
      workspaceId: session.workspace_id,
      memberId: session.member_id,
      csrfToken,
      persistence: "d1_kv_auth_records",
    };
  } catch {
    return isLiveMagicLinkDelivery(env)
      ? { ok: false, error: "invalid_session", status: 401, persistence: "d1_kv_auth_records" }
      : { ok: true, role: "owner", workspaceId: null, memberId: null, csrfToken, persistence: "d1_unavailable_dry_run" };
  }
}

function mutationAuthError(auth: Extract<MutationAuthResult, { ok: false }>): Response {
  return json({ error: auth.error, persistence: auth.persistence }, auth.status);
}

function hasWorkspaceAccess(auth: Extract<MutationAuthResult, { ok: true }>, workspaceId: string): boolean {
  return !auth.workspaceId || auth.workspaceId === workspaceId;
}

function workspaceAccessError(auth: Extract<MutationAuthResult, { ok: true }>): Response {
  return json({ error: "workspace_mismatch", persistence: auth.persistence }, 403);
}

async function isSessionStoreAvailable(db: D1Database): Promise<boolean> {
  try {
    await db.prepare("SELECT id FROM sessions LIMIT 1").bind().first();
    return true;
  } catch {
    return false;
  }
}

async function readCachedSessionRole(kv: KVNamespace | undefined, sessionId: string): Promise<AuthRole> {
  if (!kv) {
    return "owner";
  }

  try {
    const value = await kv.get(sessionId);
    if (!value) return "owner";
    const parsed = JSON.parse(value) as { role?: unknown };
    return isAuthRole(parsed.role) ? parsed.role : "owner";
  } catch {
    return "owner";
  }
}

async function readSessionMembership(
  env: Env,
  sessionId: string,
  memberId: string | null,
  sessionWorkspaceId: string | null,
): Promise<SessionMembership> {
  const cachedRole = await readCachedSessionRole(env.SESSIONS, sessionId);
  if (!memberId || !env.DB) {
    return { role: cachedRole, status: "active" };
  }

  const member = await findWorkspaceMemberById(env.DB, memberId);
  if (!member || member.workspace_id !== sessionWorkspaceId || !isAuthRole(member.role)) {
    return { role: cachedRole, status: "missing" };
  }

  return {
    role: member.role,
    status: normalizeWorkspaceMemberStatus(member.status),
  };
}

async function readCurrentSessionMetadata(
  request: Request,
  env: Env,
): Promise<SessionMetadataResult> {
  if (!env.DB) {
    if (isLiveMagicLinkDelivery(env)) {
      return { ok: false, error: "auth_storage_unavailable", status: 503, persistence: "d1_kv_auth_records" };
    }
    return { ok: true, persistence: "dry_run_memoryless", session: null };
  }

  const sessionId = getCookie(request.headers.get("cookie"), "film_session");
  if (!sessionId) {
    const sessionStoreAvailable = await isSessionStoreAvailable(env.DB);
    if (!sessionStoreAvailable && isLiveMagicLinkDelivery(env)) {
      return { ok: false, error: "auth_storage_unavailable", status: 503, persistence: "d1_kv_auth_records" };
    }
    return {
      ok: true,
      persistence: sessionStoreAvailable ? "d1_kv_auth_records" : "d1_unavailable_dry_run",
      session: null,
    };
  }

  try {
    const session = await env.DB.prepare(`
      SELECT id, workspace_id, member_id, csrf_hash, revoked_at, expires_at
      FROM sessions
      WHERE id = ?
      LIMIT 1
    `).bind(sessionId).first<SessionRow>();

    if (!session || session.revoked_at || Date.parse(session.expires_at) < Date.now()) {
      return { ok: false, error: "invalid_session", status: 401, persistence: "d1_kv_auth_records" };
    }
    if (isLiveMagicLinkDelivery(env) && (!session.workspace_id || !session.member_id)) {
      return { ok: false, error: "invalid_session", status: 401, persistence: "d1_kv_auth_records" };
    }

    const membership = await readSessionMembership(env, session.id, session.member_id, session.workspace_id);
    if (session.member_id && membership.status !== "active") {
      return { ok: false, error: "member_not_active", status: 403, persistence: "d1_kv_auth_records" };
    }

    return {
      ok: true,
      persistence: "d1_kv_auth_records",
      session: {
        id: session.id,
        role: membership.role,
        expiresAt: session.expires_at,
      },
    };
  } catch {
    if (isLiveMagicLinkDelivery(env)) {
      return { ok: false, error: "auth_storage_unavailable", status: 503, persistence: "d1_kv_auth_records" };
    }
    return { ok: true, persistence: "d1_unavailable_dry_run", session: null };
  }
}

function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === "string" && ALL_AUTHENTICATED_ROLES.includes(value as AuthRole);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidInviteToken(token: string): boolean {
  return token.startsWith("dry_invite_") && token.length > 30 && token.length < 120;
}

async function createWorkspaceInvite(
  db: D1Database | undefined,
  workspaceId: string,
  email: string,
  role: AuthRole,
  expiresInDays: number,
  invitedByMemberId: string | null,
): Promise<{ persistence: InvitePersistence; invite: WorkspaceInviteSummary }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const emailHash = await sha256Hex(email);
  const token = `dry_invite_${crypto.randomUUID()}`;
  const invite: WorkspaceInviteSummary = {
    id: `invite_${crypto.randomUUID()}`,
    workspaceId,
    emailHash,
    role,
    expiresAt,
    devOnlyInviteToken: token,
  };

  if (!db) {
    return { persistence: "dry_run_memoryless", invite };
  }

  try {
    await ensureWorkspaceRow(db, workspaceId, now.toISOString());
    const revokePrevious = db.prepare(`
      UPDATE workspace_invites
      SET status = 'revoked'
      WHERE workspace_id = ?
        AND email_hash = ?
        AND status = 'pending'
    `).bind(workspaceId, emailHash);
    const insertReplacement = db.prepare(`
      INSERT INTO workspace_invites (
        id,
        workspace_id,
        email_hash,
        invited_role,
        invited_by_member_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invite.id,
      workspaceId,
      emailHash,
      role,
      invitedByMemberId,
      await sha256Hex(token),
      expiresAt,
    );
    await db.batch([revokePrevious, insertReplacement]);

    return { persistence: "d1_invite_records", invite };
  } catch {
    return { persistence: "d1_unavailable_dry_run", invite };
  }
}

async function listWorkspaceInviteManifest(
  db: D1Database | undefined,
  workspaceId: string,
  limit: number,
): Promise<WorkspaceInviteManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      invites: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        email_hash,
        invited_role,
        status,
        expires_at,
        created_at
      FROM workspace_invites
      WHERE workspace_id = ?
        AND status = 'pending'
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, limit + 1).all<WorkspaceInviteManifestRow>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);

    return {
      persistence: "d1_invite_records",
      invites: visibleRows.map(workspaceInviteManifestEntryFromRow),
      rowCount: visibleRows.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      invites: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

async function listInviteDeliverySuppressionManifest(
  db: D1Database | undefined,
  workspaceId: string,
  limit: number,
): Promise<InviteDeliverySuppressionManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      suppressions: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        provider,
        target_hash,
        suppression_reason,
        workspace_id,
        invite_id,
        delivery_attempt_id,
        provider_message_id,
        source_webhook_event_id,
        first_seen_at,
        last_seen_at
      FROM invite_delivery_suppressions
      WHERE workspace_id = ?
      ORDER BY last_seen_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, limit + 1).all<InviteDeliverySuppressionManifestRow>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);

    return {
      persistence: "d1_invite_delivery_suppressions",
      suppressions: visibleRows.map(inviteDeliverySuppressionManifestEntryFromRow),
      rowCount: visibleRows.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      suppressions: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

async function revokeWorkspaceInvite(
  db: D1Database | undefined,
  workspaceId: string,
  inviteId: string,
  emailHash: string,
  role: AuthRole,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: InvitePersistence;
    auditPersistence: AuditPersistence;
    invite: WorkspaceInviteManifestEntry;
  }
  | { ok: false; persistence: InvitePersistence; error: string; status: number }
> {
  const requestSummary: WorkspaceInviteManifestEntry = {
    id: inviteId,
    workspaceId,
    emailHash,
    role,
    status: "pending",
    expiresAt: "",
    createdAt: "",
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      invite: requestSummary,
    };
  }

  try {
    const row = await db.prepare(`
      SELECT
        id,
        workspace_id,
        email_hash,
        invited_role,
        status,
        expires_at,
        created_at
      FROM workspace_invites
      WHERE workspace_id = ?
        AND id = ?
        AND email_hash = ?
        AND invited_role = ?
        AND status = 'pending'
      LIMIT 1
    `).bind(workspaceId, inviteId, emailHash, role).first<WorkspaceInviteManifestRow>();

    if (!row) {
      return {
        ok: false,
        persistence: "d1_invite_records",
        error: "invite_not_found",
        status: 404,
      };
    }

    const revokedAt = new Date().toISOString();
    const statements = [
      workspaceInviteStateAssertion(db, row, "pending"),
      db.prepare(`
        UPDATE workspace_invites
        SET status = 'revoked'
        WHERE workspace_id = ?
          AND id = ?
          AND email_hash = ?
          AND invited_role = ?
          AND status = 'pending'
      `).bind(workspaceId, inviteId, emailHash, role),
      auditEventInsertStatement(
        db,
        `audit_invite_revoke_${inviteId}`,
        workspaceId,
        null,
        actorMemberId,
        "invite.revoked",
        {
          inviteId,
          emailHash,
          role,
          persistence: "d1_invite_records",
        },
        revokedAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("invite revoke batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_invite_records",
      auditPersistence: "d1_audit_events",
      invite: workspaceInviteManifestEntryFromRow(row),
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "invite_revoke_unavailable", status: 503 };
  }
}

function workspaceInviteManifestEntryFromRow(row: WorkspaceInviteManifestRow): WorkspaceInviteManifestEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    emailHash: row.email_hash,
    role: isAuthRole(row.invited_role) ? row.invited_role : "contributor",
    status: "pending",
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function workspaceInviteStateAssertion(
  db: D1Database,
  invite: Pick<WorkspaceInviteRow, "id" | "workspace_id" | "email_hash" | "invited_role" | "expires_at">,
  status: "pending",
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM workspace_invites
        WHERE id = ?
          AND workspace_id = ?
          AND email_hash = ?
          AND invited_role = ?
          AND expires_at = ?
          AND status = ?
          AND accepted_at IS NULL
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS workspace_invite_state_assertion
  `).bind(
    invite.id,
    invite.workspace_id,
    invite.email_hash,
    invite.invited_role,
    invite.expires_at,
    status,
  );
}

function inviteDeliverySuppressionManifestEntryFromRow(
  row: InviteDeliverySuppressionManifestRow,
): InviteDeliverySuppressionManifestEntry {
  const reason = inviteDeliverySuppressionReasonFromString(row.suppression_reason);
  return {
    id: row.id,
    provider: "resend",
    targetHash: row.target_hash,
    reason,
    workspaceId: row.workspace_id,
    inviteId: row.invite_id,
    deliveryAttemptId: row.delivery_attempt_id,
    providerMessageId: row.provider_message_id,
    sourceWebhookEventId: row.source_webhook_event_id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

function inviteDeliverySuppressionReasonFromString(value: string): "bounced" | "complained" | "suppressed" {
  return value === "complained" || value === "suppressed" ? value : "bounced";
}

async function findInviteDeliverySuppressionForTarget(
  db: D1Database | undefined,
  targetHash: string,
): Promise<InviteDeliverySuppressionCheckResult> {
  if (!db) {
    return { persistence: "dry_run_memoryless", suppression: null };
  }

  try {
    const row = await db.prepare(`
      SELECT
        id,
        provider,
        target_hash,
        suppression_reason,
        workspace_id,
        invite_id,
        delivery_attempt_id,
        provider_message_id,
        source_webhook_event_id,
        first_seen_at,
        last_seen_at
      FROM invite_delivery_suppressions
      WHERE provider = 'resend'
        AND target_hash = ?
      ORDER BY
        CASE suppression_reason
          WHEN 'complained' THEN 0
          WHEN 'bounced' THEN 1
          ELSE 2
        END,
        last_seen_at DESC,
        id DESC
      LIMIT 1
    `).bind(targetHash).first<InviteDeliverySuppressionManifestRow>();

    return {
      persistence: "d1_invite_delivery_suppressions",
      suppression: row ? inviteDeliverySuppressionManifestEntryFromRow(row) : null,
    };
  } catch {
    return { persistence: "d1_unavailable_dry_run", suppression: null };
  }
}

type WorkspaceInviteDeliveryRequest = {
  workspaceId: string;
  inviteId: string;
  actorMemberId: string | null;
  targetEmail: string;
  targetHash: string;
  role: AuthRole;
  token: string;
  expiresAt: string;
};

async function deliverWorkspaceInvite(
  env: Env,
  request: WorkspaceInviteDeliveryRequest,
): Promise<{
  persistence: InviteDeliveryPersistence;
  summary: WorkspaceInviteDeliverySummary;
  exposeInviteToken: boolean;
}> {
  const readiness = inviteDeliveryReadiness(env);
  if (!readiness.liveDeliveryAllowed) {
    const delivery = await recordInviteDeliveryAttempt(
      env.DB,
      request.workspaceId,
      request.inviteId,
      request.actorMemberId,
      request.targetHash,
      "dry_run_outbox",
      "queued_dry_run",
    );
    return { ...delivery, exposeInviteToken: true };
  }

  const queued = await recordInviteDeliveryAttempt(
    env.DB,
    request.workspaceId,
    request.inviteId,
    request.actorMemberId,
    request.targetHash,
    "live_resend",
    "queued_live",
  );
  if (queued.persistence !== "d1_invite_delivery_attempts" || !queued.summary.id) {
    return {
      persistence: queued.persistence,
      summary: {
        ...queued.summary,
        status: "blocked_provider_not_configured",
        errorCode: "delivery_attempt_storage_unavailable",
      },
      exposeInviteToken: false,
    };
  }

  const sendResult = await sendResendWorkspaceInvite(env, request, queued.summary.id);
  await updateInviteDeliveryAttemptResult(
    env.DB,
    queued.summary.id,
    sendResult.status,
    sendResult.providerMessageId,
    sendResult.errorCode,
  );

  return {
    persistence: queued.persistence,
    summary: {
      ...queued.summary,
      status: sendResult.status,
      providerMessageId: sendResult.providerMessageId,
      errorCode: sendResult.errorCode,
    },
    exposeInviteToken: false,
  };
}

async function recordInviteDeliveryAttempt(
  db: D1Database | undefined,
  workspaceId: string,
  inviteId: string,
  actorMemberId: string | null,
  targetHash: string,
  deliveryMode: InviteDeliveryMode,
  status: InviteDeliveryStatus,
): Promise<{
  persistence: InviteDeliveryPersistence;
  summary: WorkspaceInviteDeliverySummary;
}> {
  const summary: WorkspaceInviteDeliverySummary = {
    id: `invite_delivery_${crypto.randomUUID()}`,
    provider: "resend",
    channel: "email",
    targetHash,
    templateKey: "workspace_invite",
    deliveryMode,
    status,
    providerMessageId: null,
    errorCode: null,
  };

  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      summary: { ...summary, id: null },
    };
  }

  try {
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    await db.prepare(`
      INSERT INTO invite_delivery_attempts (
        id,
        workspace_id,
        invite_id,
        actor_member_id,
        provider,
        channel,
        target_hash,
        template_key,
        delivery_mode,
        status,
        provider_message_id,
        error_code,
        created_at
      )
      VALUES (?, ?, ?, ?, 'resend', 'email', ?, 'workspace_invite', ?, ?, NULL, NULL, ?)
    `).bind(
      summary.id,
      workspaceId,
      inviteId,
      actorMemberId,
      targetHash,
      deliveryMode,
      summary.status,
      createdAt,
    ).run();
    return {
      persistence: "d1_invite_delivery_attempts",
      summary,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      summary: { ...summary, id: null, status: "blocked_provider_not_configured", errorCode: "delivery_attempt_storage_unavailable" },
    };
  }
}

async function updateInviteDeliveryAttemptResult(
  db: D1Database | undefined,
  deliveryAttemptId: string,
  status: Extract<InviteDeliveryStatus, "sent_live" | "failed_live_delivery">,
  providerMessageId: string | null,
  errorCode: string | null,
): Promise<void> {
  if (!db) return;
  try {
    await db.prepare(`
      UPDATE invite_delivery_attempts
      SET status = ?,
        provider_message_id = ?,
        error_code = ?
      WHERE id = ?
        AND delivery_mode = 'live_resend'
    `).bind(status, providerMessageId, errorCode, deliveryAttemptId).run();
  } catch {
    // The provider call has already completed; response metadata still reports the send result.
  }
}

async function sendResendWorkspaceInvite(
  env: Env,
  request: WorkspaceInviteDeliveryRequest,
  deliveryAttemptId: string,
): Promise<{
  status: Extract<InviteDeliveryStatus, "sent_live" | "failed_live_delivery">;
  providerMessageId: string | null;
  errorCode: string | null;
}> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.INVITE_FROM_EMAIL?.trim();
  const appOrigin = env.INVITE_APP_ORIGIN?.trim().replace(/\/+$/, "");
  if (!apiKey || !from || !appOrigin) {
    return { status: "failed_live_delivery", providerMessageId: null, errorCode: "resend_configuration_missing" };
  }

  const inviteUrl = new URL(appOrigin);
  inviteUrl.hash = new URLSearchParams({ inviteToken: request.token }).toString();
  const roleLabel = request.role.replaceAll("_", " ");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `film-invite/${request.inviteId}`,
    },
    body: JSON.stringify({
      from,
      to: request.targetEmail,
      subject: "You are invited to Film",
      text: [
        `You have been invited to Film as ${roleLabel}.`,
        `Open ${appOrigin} and paste this invite token: ${request.token}`,
        `Direct link: ${inviteUrl.toString()}`,
        `This invite expires at ${request.expiresAt}.`,
      ].join("\n\n"),
      html: [
        `<p>You have been invited to Film as ${escapeHtmlText(roleLabel)}.</p>`,
        `<p>Open <a href="${escapeHtmlAttribute(inviteUrl.toString())}">Film</a> and paste this invite token:</p>`,
        `<p><code>${escapeHtmlText(request.token)}</code></p>`,
        `<p>This invite expires at ${escapeHtmlText(request.expiresAt)}.</p>`,
      ].join(""),
      tags: [
        { name: "film_delivery_attempt", value: deliveryAttemptId },
      ],
    }),
  });

  if (!response.ok) {
    return { status: "failed_live_delivery", providerMessageId: null, errorCode: `resend_${response.status}` };
  }

  const body = await readOptionalJson(response);
  const providerMessageId = typeof body?.id === "string" ? body.id.slice(0, 160) : null;
  return { status: "sent_live", providerMessageId, errorCode: null };
}

function normalizeResendInviteDeliveryWebhookEvent(
  rawBody: string,
  svixId: string,
): ResendInviteDeliveryWebhookEvent | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!isObjectRecord(parsed)) return null;
    const eventType = typeof parsed.type === "string" ? parsed.type.trim() : "";
    const deliveryStatus = resendInviteDeliveryStatus(eventType);
    if (!deliveryStatus) return null;
    const data = isObjectRecord(parsed.data) ? parsed.data : {};
    const tags = isObjectRecord(data.tags) ? data.tags : {};
    const providerMessageId = boundedProviderMessageId(data.email_id);
    const deliveryAttemptTag = boundedDeliveryAttemptTag(tags.film_delivery_attempt);
    const eventCreatedAt = typeof parsed.created_at === "string" && !Number.isNaN(Date.parse(parsed.created_at))
      ? parsed.created_at
      : null;
    const metadataKeys = Array.from(new Set([
      ...Object.keys(data).sort(),
      ...(
        isObjectRecord(data.tags)
          ? Object.keys(data.tags).map((key) => `tags.${key}`).sort()
          : []
      ),
    ])).slice(0, 30);

    return {
      id: `invite_delivery_webhook_${svixId}`,
      svixId,
      eventType,
      providerMessageId,
      deliveryStatus,
      receivedAt: new Date().toISOString(),
      eventCreatedAt,
      metadataKeys,
      deliveryAttemptTag,
    };
  } catch {
    return null;
  }
}

function resendInviteDeliveryStatus(eventType: string): InviteDeliveryWebhookStatus | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    case "email.suppressed":
      return "suppressed";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    default:
      return null;
  }
}

function boundedProviderMessageId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 160 ? trimmed : null;
}

function boundedDeliveryAttemptTag(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^invite_delivery_[A-Za-z0-9_-]{8,160}$/.test(trimmed) ? trimmed : null;
}

async function recordInviteDeliveryWebhookEvent(
  db: D1Database | undefined,
  event: ResendInviteDeliveryWebhookEvent,
): Promise<{
  persistence: InviteDeliveryWebhookPersistence;
  duplicate: boolean;
  deliveryAttemptId: string | null;
  workspaceId: string | null;
  inviteId: string | null;
  attemptEventStatusUpdated: boolean;
  suppressionRecorded: boolean;
}> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      duplicate: false,
      deliveryAttemptId: null,
      workspaceId: null,
      inviteId: null,
      attemptEventStatusUpdated: false,
      suppressionRecorded: false,
    };
  }

  try {
    const providerAttempt = event.providerMessageId
      ? await findInviteDeliveryAttemptForProviderMessage(db, event.providerMessageId)
      : null;
    const attempt = providerAttempt ?? (
      event.deliveryAttemptTag
        ? await findInviteDeliveryAttemptByTag(db, event.deliveryAttemptTag, event.providerMessageId)
        : null
    );
    const eventInsert = db.prepare(`
      INSERT OR IGNORE INTO invite_delivery_webhook_events (
        id,
        svix_id,
        provider,
        event_type,
        provider_message_id,
        delivery_attempt_id,
        workspace_id,
        invite_id,
        delivery_status,
        received_at,
        event_created_at,
        metadata_keys_json
      )
      VALUES (?, ?, 'resend', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.id,
      event.svixId,
      event.eventType,
      event.providerMessageId,
      attempt?.id ?? null,
      attempt?.workspace_id ?? null,
      attempt?.invite_id ?? null,
      event.deliveryStatus,
      event.receivedAt,
      event.eventCreatedAt,
      JSON.stringify(event.metadataKeys),
    );
    const statements: D1PreparedStatement[] = [eventInsert];
    let attemptUpdateIndex: number | null = null;
    let suppressionIndex: number | null = null;
    if (attempt) {
      attemptUpdateIndex = statements.length;
      statements.push(db.prepare(`
        UPDATE invite_delivery_attempts
        SET last_event_status = ?,
          last_event_at = ?,
          provider_message_id = COALESCE(provider_message_id, ?)
        WHERE id = ?
          AND provider = 'resend'
          AND delivery_mode = 'live_resend'
      `).bind(
        event.deliveryStatus,
        event.eventCreatedAt ?? event.receivedAt,
        event.providerMessageId,
        attempt.id,
      ));

      const suppressionReason = inviteDeliverySuppressionReason(event.deliveryStatus);
      if (suppressionReason) {
        const seenAt = event.eventCreatedAt ?? event.receivedAt;
        suppressionIndex = statements.length;
        statements.push(db.prepare(`
          INSERT INTO invite_delivery_suppressions (
            id,
            provider,
            target_hash,
            suppression_reason,
            workspace_id,
            invite_id,
            delivery_attempt_id,
            provider_message_id,
            source_webhook_event_id,
            first_seen_at,
            last_seen_at
          )
          VALUES (?, 'resend', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(provider, target_hash, suppression_reason) DO UPDATE SET
            workspace_id = excluded.workspace_id,
            invite_id = excluded.invite_id,
            delivery_attempt_id = excluded.delivery_attempt_id,
            provider_message_id = excluded.provider_message_id,
            source_webhook_event_id = excluded.source_webhook_event_id,
            last_seen_at = excluded.last_seen_at
        `).bind(
          `invite_delivery_suppression_${attempt.target_hash.slice(0, 24)}_${suppressionReason}`,
          attempt.target_hash,
          suppressionReason,
          attempt.workspace_id,
          attempt.invite_id,
          attempt.id,
          event.providerMessageId,
          event.id,
          seenAt,
          seenAt,
        ));
      }
    }

    const results = await db.batch(statements);
    const duplicate = (results[0]?.meta.changes ?? 0) === 0;
    const attemptEventStatusUpdated = !duplicate
      && attemptUpdateIndex !== null
      && (results[attemptUpdateIndex]?.meta.changes ?? 0) > 0;
    const suppressionRecorded = !duplicate
      && suppressionIndex !== null
      && (results[suppressionIndex]?.meta.changes ?? 0) > 0;

    return {
      persistence: "d1_invite_delivery_webhook_events",
      duplicate,
      deliveryAttemptId: attempt?.id ?? null,
      workspaceId: attempt?.workspace_id ?? null,
      inviteId: attempt?.invite_id ?? null,
      attemptEventStatusUpdated,
      suppressionRecorded,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      duplicate: false,
      deliveryAttemptId: null,
      workspaceId: null,
      inviteId: null,
      attemptEventStatusUpdated: false,
      suppressionRecorded: false,
    };
  }
}

async function findInviteDeliveryAttemptForProviderMessage(
  db: D1Database,
  providerMessageId: string,
): Promise<InviteDeliveryAttemptLookupRow | null> {
  return await db.prepare(`
    SELECT id, workspace_id, invite_id, target_hash
    FROM invite_delivery_attempts
    WHERE provider = 'resend'
      AND delivery_mode = 'live_resend'
      AND provider_message_id = ?
    LIMIT 1
  `).bind(providerMessageId).first<InviteDeliveryAttemptLookupRow>();
}

async function findInviteDeliveryAttemptByTag(
  db: D1Database,
  deliveryAttemptId: string,
  providerMessageId: string | null,
): Promise<InviteDeliveryAttemptLookupRow | null> {
  return await db.prepare(`
    SELECT id, workspace_id, invite_id, target_hash
    FROM invite_delivery_attempts
    WHERE id = ?
      AND provider = 'resend'
      AND delivery_mode = 'live_resend'
      AND (provider_message_id IS NULL OR provider_message_id = ?)
    LIMIT 1
  `).bind(deliveryAttemptId, providerMessageId).first<InviteDeliveryAttemptLookupRow>();
}

function inviteDeliverySuppressionReason(status: InviteDeliveryWebhookStatus): "bounced" | "complained" | "suppressed" | null {
  return status === "bounced" || status === "complained" || status === "suppressed" ? status : null;
}

async function readOptionalJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value = await response.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value)
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function inviteDeliveryReadiness(env: Env): WorkspaceInviteDeliveryReadiness {
  const appOrigin = env.INVITE_APP_ORIGIN?.trim() ?? "";
  const liveMode = (env.INVITE_DELIVERY_MODE?.trim().toLowerCase() ?? "") === "live";
  const configured = {
    resendApiKey: Boolean(env.RESEND_API_KEY?.trim()),
    fromEmail: Boolean(env.INVITE_FROM_EMAIL?.trim()),
    appOrigin: Boolean(appOrigin),
    webhookSecret: Boolean(env.INVITE_DELIVERY_WEBHOOK_SECRET?.trim()),
    productionOrigin: Boolean(appOrigin && isProductionHttpOrigin(appOrigin) && allowedCorsOrigins(env).includes(appOrigin)),
    liveMode,
  };
  const missing: string[] = [];
  if (!configured.resendApiKey) missing.push("RESEND_API_KEY");
  if (!configured.fromEmail) missing.push("INVITE_FROM_EMAIL");
  if (!configured.appOrigin) missing.push("INVITE_APP_ORIGIN");
  if (!configured.webhookSecret) missing.push("INVITE_DELIVERY_WEBHOOK_SECRET");

  const blockers = [
    ...missing.map((name) => `Missing ${name}.`),
    ...(configured.appOrigin && !configured.productionOrigin
      ? ["INVITE_APP_ORIGIN must be a production HTTPS origin and included in ALLOWED_ORIGINS."]
      : []),
  ];
  const readyForLiveAdapter = missing.length === 0 && configured.productionOrigin;
  const liveDeliveryAllowed = readyForLiveAdapter && configured.liveMode;

  return {
    provider: "resend",
    channel: "email",
    mode: "readiness_only",
    status: liveDeliveryAllowed ? "live_delivery_enabled" : readyForLiveAdapter ? "ready_for_live_adapter" : "blocked_live_delivery",
    dryRunOutboxAllowed: true,
    liveDeliveryAllowed,
    configured,
    requiredConfiguration: ["RESEND_API_KEY", "INVITE_FROM_EMAIL", "INVITE_APP_ORIGIN", "INVITE_DELIVERY_WEBHOOK_SECRET", "INVITE_DELIVERY_MODE=live"],
    blockers,
    complianceNotes: [
      "Invite targets stay hash-only in Film storage; raw email is sent only to the configured Resend API request.",
      "Live delivery requires the signed Resend webhook endpoint, bounce handling, suppression policy, abuse controls, and redacted audit records.",
    ],
  };
}

function isProductionHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

function stripeSummaryReadiness(env: Env): StripeSummaryReadiness {
  const liveMode = (env.STRIPE_SUMMARY_MODE?.trim().toLowerCase() ?? "") === "live";
  const configured = {
    poolAdapter: Boolean(env.POOL_STRIPE_SUMMARY_ADAPTER_URL?.trim()),
    storeAdapter: Boolean(env.STORE_STRIPE_SUMMARY_ADAPTER_URL?.trim()),
    projectMappings: Boolean(env.STRIPE_PROJECT_MAPPINGS?.trim()),
    webhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
    redactedAudit: isEnabledConfigFlag(env.STRIPE_REDACTED_AUDIT),
    adapterSecret: Boolean(env.STRIPE_SUMMARY_ADAPTER_SECRET?.trim()),
    liveMode,
  };
  const missing: string[] = [];
  if (!configured.poolAdapter) missing.push("POOL_STRIPE_SUMMARY_ADAPTER_URL");
  if (!configured.storeAdapter) missing.push("STORE_STRIPE_SUMMARY_ADAPTER_URL");
  if (!configured.projectMappings) missing.push("STRIPE_PROJECT_MAPPINGS");
  if (!configured.webhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!configured.redactedAudit) missing.push("STRIPE_REDACTED_AUDIT");
  if (!configured.adapterSecret) missing.push("STRIPE_SUMMARY_ADAPTER_SECRET");

  const readyForSummaryAdapter = missing.length === 0;
  const liveSummaryReadAllowed = readyForSummaryAdapter && configured.liveMode;

  return {
    provider: "stripe",
    source: "pool_store_summary_adapter",
    mode: "readiness_only",
    status: liveSummaryReadAllowed ? "live_summary_enabled" : readyForSummaryAdapter ? "ready_for_summary_adapter" : "blocked_summary_adapter",
    dataBoundary: "summary_only",
    directStripeReadAllowed: false,
    liveSummaryReadAllowed,
    configured,
    requiredConfiguration: [
      "POOL_STRIPE_SUMMARY_ADAPTER_URL",
      "STORE_STRIPE_SUMMARY_ADAPTER_URL",
      "STRIPE_PROJECT_MAPPINGS",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_REDACTED_AUDIT",
      "STRIPE_SUMMARY_ADAPTER_SECRET",
      "STRIPE_SUMMARY_MODE=live",
    ],
    blockers: missing.map((name) => `Missing ${name}.`),
    complianceNotes: [
      "Stripe summaries must come through Pool/Store adapter aggregates, not browser or direct raw payment reads.",
      "No card data, payment method details, unrestricted customer exports, or unredacted webhook payloads may be stored in Film.",
    ],
  };
}

function googleOAuthReadiness(env: Env): GoogleOAuthRuntimeReadiness {
  const configured = {
    clientId: Boolean(env.GOOGLE_OAUTH_CLIENT_ID?.trim()),
    clientSecret: Boolean(env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()),
    redirectUri: isValidGoogleOAuthRedirectUri(env.GOOGLE_OAUTH_REDIRECT_URI),
    tokenEncryptionKey: hasValidGoogleTokenEncryptionKey(env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ?? ""),
    appOrigin: isProductionHttpOrigin(env.INVITE_APP_ORIGIN?.trim() ?? ""),
    d1: Boolean(env.DB),
    kv: Boolean(env.SESSIONS),
    liveMode: env.GOOGLE_OAUTH_MODE?.trim().toLowerCase() === "live",
  };
  const blockers: string[] = [];
  if (!configured.clientId) blockers.push("Missing GOOGLE_OAUTH_CLIENT_ID.");
  if (!configured.clientSecret) blockers.push("Missing GOOGLE_OAUTH_CLIENT_SECRET.");
  if (!configured.redirectUri) blockers.push("Missing or invalid GOOGLE_OAUTH_REDIRECT_URI.");
  if (!configured.tokenEncryptionKey) blockers.push("Missing or invalid 32-byte GOOGLE_TOKEN_ENCRYPTION_KEY.");
  if (!configured.appOrigin) blockers.push("Missing or invalid HTTPS INVITE_APP_ORIGIN callback destination.");
  if (!configured.d1) blockers.push("D1 provider connection storage is unavailable.");
  if (!configured.kv) blockers.push("KV OAuth state storage is unavailable.");
  if (!configured.liveMode) blockers.push("Set GOOGLE_OAUTH_MODE=live after consent and scope review.");
  const liveOAuthAllowed = blockers.length === 0;
  return {
    provider: "google",
    mode: "oauth_connection",
    status: liveOAuthAllowed ? "live_oauth_enabled" : "blocked_oauth",
    liveOAuthAllowed,
    configured,
    requiredConfiguration: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_OAUTH_REDIRECT_URI",
      "GOOGLE_TOKEN_ENCRYPTION_KEY",
      "INVITE_APP_ORIGIN",
      "GOOGLE_OAUTH_MODE=live",
      "D1 DB binding",
      "KV SESSIONS binding",
    ],
    blockers,
    dataBoundary: "drive_metadata_and_explicit_file_content",
  };
}

function googleOAuthConfiguration(env: Env): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? "";
  if (!clientId || !clientSecret || !isValidGoogleOAuthRedirectUri(redirectUri)) return null;
  return { clientId, clientSecret, redirectUri };
}

function isValidGoogleOAuthRedirectUri(value: string | undefined): boolean {
  const raw = value?.trim() ?? "";
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:"
      && url.username === ""
      && url.password === ""
      && url.search === ""
      && url.hash === ""
      && url.pathname === "/api/providers/google/oauth/callback";
  } catch {
    return false;
  }
}

async function googleOAuthStateKey(state: string): Promise<string> {
  return `oauth:google:${await sha256Hex(state)}`;
}

function isValidGoogleOAuthState(value: string): boolean {
  return value.length >= 20 && value.length <= 256 && /^[A-Za-z0-9._~-]+$/.test(value);
}

function parseGoogleOAuthStateRecord(value: string | null): GoogleOAuthStateRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GoogleOAuthStateRecord>;
    if (
      !isValidWorkspaceId(parsed.workspaceId ?? "")
      || !isValidRecordId(parsed.memberId ?? "")
      || !/^[a-f0-9]{64}$/.test(parsed.sessionHash ?? "")
      || typeof parsed.codeVerifier !== "string"
      || parsed.codeVerifier.length < 43
      || parsed.codeVerifier.length > 128
      || !Array.isArray(parsed.scopes)
      || parsed.scopes.length < 1
      || parsed.scopes.length > 3
      || !parsed.scopes.every((scope) => typeof scope === "string" && scope.startsWith("https://www.googleapis.com/auth/"))
      || typeof parsed.createdAt !== "string"
      || Number.isNaN(Date.parse(parsed.createdAt))
      || typeof parsed.expiresAt !== "string"
      || Number.isNaN(Date.parse(parsed.expiresAt))
    ) {
      return null;
    }
    return parsed as GoogleOAuthStateRecord;
  } catch {
    return null;
  }
}

async function requireGoogleOAuthCallbackAuth(
  env: Env,
  sessionId: string,
  state: GoogleOAuthStateRecord,
): Promise<boolean> {
  if (!env.DB) return false;
  try {
    const session = await env.DB.prepare(`
      SELECT id, workspace_id, member_id, csrf_hash, revoked_at, expires_at
      FROM sessions
      WHERE id = ?
      LIMIT 1
    `).bind(sessionId).first<SessionRow>();
    if (
      !session
      || session.revoked_at
      || Date.parse(session.expires_at) < Date.now()
      || session.workspace_id !== state.workspaceId
      || session.member_id !== state.memberId
    ) {
      return false;
    }
    const membership = await readSessionMembership(env, sessionId, session.member_id, session.workspace_id);
    return membership.status === "active" && OWNER_PRODUCER_ROLES.includes(membership.role);
  } catch {
    return false;
  }
}

function googleTokenAdditionalData(workspaceId: string, tokenKind: "access" | "refresh"): string {
  return `google|${workspaceId}|${tokenKind}|${GOOGLE_TOKEN_KEY_VERSION}`;
}

function googleOAuthCallbackRedirect(
  env: Env,
  outcome: "connected" | "error",
  errorCode?: string,
): Response {
  const appOrigin = env.INVITE_APP_ORIGIN?.trim() ?? "";
  try {
    const target = new URL("/", appOrigin);
    if (target.protocol !== "https:" && target.hostname !== "localhost" && target.hostname !== "127.0.0.1") {
      throw new Error("invalid_app_origin");
    }
    target.searchParams.set("google", outcome);
    if (errorCode) target.searchParams.set("code", errorCode);
    return Response.redirect(target.toString(), 303);
  } catch {
    return json({ error: errorCode ?? "google_oauth_callback_failed" }, 400);
  }
}

async function readGoogleProviderConnection(
  db: D1Database | undefined,
  workspaceId: string,
): Promise<{
  persistence: "dry_run_memoryless" | "d1_provider_connections" | "d1_unavailable_dry_run";
  connection: GoogleProviderConnection | null;
}> {
  if (!db) return { persistence: "dry_run_memoryless", connection: null };
  try {
    const row = await readGoogleProviderConnectionRow(db, workspaceId);
    return {
      persistence: "d1_provider_connections",
      connection: row ? googleProviderConnectionFromRow(row) : null,
    };
  } catch {
    return { persistence: "d1_unavailable_dry_run", connection: null };
  }
}

async function readGoogleProviderConnectionRow(
  db: D1Database,
  workspaceId: string,
): Promise<GoogleProviderConnectionRow | null> {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      provider,
      status,
      scopes_json,
      access_token_ciphertext,
      refresh_token_ciphertext,
      token_expires_at,
      token_type,
      token_key_version,
      root_folder_id,
      last_error_code,
      connected_at,
      disconnected_at,
      updated_at
    FROM provider_connections
    WHERE workspace_id = ? AND provider = 'google'
    LIMIT 1
  `).bind(workspaceId).first<GoogleProviderConnectionRow>();
}

function googleProviderConnectionFromRow(row: GoogleProviderConnectionRow): GoogleProviderConnection {
  return {
    provider: "google",
    status: row.status,
    scopes: parseGoogleScopes(row.scopes_json),
    hasRefreshToken: Boolean(row.refresh_token_ciphertext),
    tokenExpiresAt: row.token_expires_at,
    rootFolderId: row.root_folder_id,
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    updatedAt: row.updated_at,
  };
}

function parseGoogleScopes(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((scope): scope is string => typeof scope === "string").slice(0, 10)
      : [];
  } catch {
    return [];
  }
}

async function usableGoogleAccessToken(
  env: Env,
  connection: GoogleProviderConnectionRow,
): Promise<
  | { ok: true; accessToken: string; refreshed: boolean }
  | { ok: false; error: string; status: 409 | 502 | 503 }
> {
  const encodedKey = env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : Number.NaN;
  const expiredOrExpiring = Number.isFinite(expiresAt) && expiresAt <= Date.now() + 2 * 60 * 1000;
  if (connection.access_token_ciphertext && !expiredOrExpiring) {
    try {
      return {
        ok: true,
        accessToken: await decryptGoogleToken(
          connection.access_token_ciphertext,
          encodedKey,
          googleTokenAdditionalData(connection.workspace_id, "access"),
        ),
        refreshed: false,
      };
    } catch {
      // A refresh token can recover an unreadable or rotated access token below.
    }
  }

  const configuration = googleOAuthConfiguration(env);
  if (!configuration || !env.DB || !hasValidGoogleTokenEncryptionKey(encodedKey)) {
    return { ok: false, error: "google_token_runtime_unavailable", status: 503 };
  }
  if (!connection.refresh_token_ciphertext) {
    return { ok: false, error: "google_reauthorization_required", status: 409 };
  }
  try {
    const refreshToken = await decryptGoogleToken(
      connection.refresh_token_ciphertext,
      encodedKey,
      googleTokenAdditionalData(connection.workspace_id, "refresh"),
    );
    const refreshed = await refreshGoogleAccessToken(
      configuration,
      refreshToken,
      parseGoogleScopes(connection.scopes_json),
    );
    const accessTokenCiphertext = await encryptGoogleToken(
      refreshed.accessToken,
      encodedKey,
      googleTokenAdditionalData(connection.workspace_id, "access"),
    );
    const refreshTokenCiphertext = refreshed.refreshToken
      ? await encryptGoogleToken(
          refreshed.refreshToken,
          encodedKey,
          googleTokenAdditionalData(connection.workspace_id, "refresh"),
        )
      : connection.refresh_token_ciphertext;
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE provider_connections
      SET scopes_json = ?,
          access_token_ciphertext = ?,
          refresh_token_ciphertext = ?,
          token_expires_at = ?,
          token_type = ?,
          token_key_version = ?,
          last_error_code = NULL,
          updated_at = ?
      WHERE workspace_id = ? AND provider = 'google' AND status = 'active'
    `).bind(
      JSON.stringify(refreshed.scopes),
      accessTokenCiphertext,
      refreshTokenCiphertext,
      refreshed.expiresAt,
      refreshed.tokenType,
      GOOGLE_TOKEN_KEY_VERSION,
      now,
      connection.workspace_id,
    ).run();
    return { ok: true, accessToken: refreshed.accessToken, refreshed: true };
  } catch {
    await env.DB.prepare(`
      UPDATE provider_connections
      SET last_error_code = 'token_refresh_failed', updated_at = ?
      WHERE workspace_id = ? AND provider = 'google'
    `).bind(new Date().toISOString(), connection.workspace_id).run();
    return { ok: false, error: "google_token_refresh_failed", status: 502 };
  }
}

async function readMetaCallbackSignedRequest(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) return null;
  const body = await readBoundedText(request, META_SIGNED_REQUEST_MAX_BYTES);
  if (body === null) return null;
  const signedRequest = new URLSearchParams(body).get("signed_request")?.trim() ?? "";
  return signedRequest && signedRequest.length <= META_SIGNED_REQUEST_MAX_BYTES ? signedRequest : null;
}

async function completeMetaDataDeletion(
  db: D1Database,
  userId: string,
  requestFingerprint: string,
): Promise<{ confirmationCode: string; deletedConnectionCount: number; replayed: boolean }> {
  const existing = await db.prepare(`
    SELECT confirmation_code, status, deleted_connection_count, requested_at, completed_at
    FROM meta_data_deletion_requests
    WHERE request_fingerprint = ?
    LIMIT 1
  `).bind(requestFingerprint).first<MetaDataDeletionRequestRow>();
  if (existing) {
    return {
      confirmationCode: existing.confirmation_code,
      deletedConnectionCount: existing.deleted_connection_count,
      replayed: true,
    };
  }
  const workspaces = await metaConnectionWorkspacesForUser(db, userId);
  const confirmationCode = createMetaDeletionConfirmationCode();
  const now = new Date().toISOString();
  const statements = [
    db.prepare(`
      INSERT INTO meta_data_deletion_requests (
        id,
        confirmation_code,
        request_fingerprint,
        meta_user_id_sha256,
        status,
        deleted_connection_count,
        requested_at,
        completed_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?)
    `).bind(
      `meta_deletion_${crypto.randomUUID()}`,
      confirmationCode,
      requestFingerprint,
      await metaUserIdSha256(userId),
      workspaces.length,
      now,
      now,
      now,
    ),
    db.prepare("DELETE FROM meta_provider_connections WHERE meta_user_id = ?").bind(userId),
    ...workspaces.map((workspace) => auditEventInsertStatement(
      db,
      `audit_${crypto.randomUUID()}`,
      workspace.workspace_id,
      null,
      null,
      "provider.meta_data_deleted",
      { deletedConnection: true, deletionStatus: "completed" },
      now,
    )),
  ];
  await db.batch(statements);
  return { confirmationCode, deletedConnectionCount: workspaces.length, replayed: false };
}

async function clearMetaConnectionsForUser(
  db: D1Database,
  userId: string,
  auditAction: "provider.meta_deauthorized",
): Promise<number> {
  const workspaces = await metaConnectionWorkspacesForUser(db, userId);
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("DELETE FROM meta_provider_connections WHERE meta_user_id = ?").bind(userId),
    ...workspaces.map((workspace) => auditEventInsertStatement(
      db,
      `audit_${crypto.randomUUID()}`,
      workspace.workspace_id,
      null,
      null,
      auditAction,
      { deletedConnection: true, localTokensDeleted: true, localMappingDeleted: true },
      now,
    )),
  ]);
  return workspaces.length;
}

async function metaConnectionWorkspacesForUser(db: D1Database, userId: string): Promise<MetaConnectionWorkspaceRow[]> {
  const result = await db.prepare(`
    SELECT workspace_id
    FROM meta_provider_connections
    WHERE meta_user_id = ?
    ORDER BY workspace_id
    LIMIT 101
  `).bind(userId).all<MetaConnectionWorkspaceRow>();
  const rows = result.results ?? [];
  if (rows.length > 100) throw new Error("meta_connection_deletion_too_large");
  return rows;
}

function metaOAuthReadiness(env: Env): MetaOAuthRuntimeReadiness {
  const configuration = metaOAuthConfiguration(env);
  const configured = {
    clientId: /^\d{5,40}$/.test(env.META_OAUTH_CLIENT_ID?.trim() ?? ""),
    clientSecret: (env.META_OAUTH_CLIENT_SECRET?.trim().length ?? 0) >= 16,
    redirectUri: isValidMetaOAuthRedirectUri(env.META_OAUTH_REDIRECT_URI),
    graphVersion: /^v\d{1,2}\.\d$/.test(env.META_GRAPH_API_VERSION?.trim() ?? ""),
    loginConfigurationId: /^\d{5,40}$/.test(env.META_LOGIN_CONFIGURATION_ID?.trim() ?? ""),
    tokenEncryptionKey: hasValidMetaTokenEncryptionKey(env.META_TOKEN_ENCRYPTION_KEY?.trim() ?? ""),
    appOrigin: isProductionHttpOrigin(env.INVITE_APP_ORIGIN?.trim() ?? ""),
    d1: Boolean(env.DB),
    kv: Boolean(env.SESSIONS),
    liveMode: env.META_OAUTH_MODE?.trim().toLowerCase() === "live",
  };
  const blockers: string[] = [];
  if (!configured.clientId) blockers.push("Missing or invalid META_OAUTH_CLIENT_ID.");
  if (!configured.clientSecret) blockers.push("Missing or invalid META_OAUTH_CLIENT_SECRET.");
  if (!configured.redirectUri) blockers.push("Missing or invalid META_OAUTH_REDIRECT_URI.");
  if (!configured.graphVersion) blockers.push("Missing or invalid explicit META_GRAPH_API_VERSION.");
  if (!configured.loginConfigurationId) blockers.push("Missing or invalid META_LOGIN_CONFIGURATION_ID.");
  if (!configured.tokenEncryptionKey) blockers.push("Missing or invalid 32-byte META_TOKEN_ENCRYPTION_KEY.");
  if (!configured.appOrigin) blockers.push("Missing or invalid HTTPS INVITE_APP_ORIGIN callback destination.");
  if (!configured.d1) blockers.push("D1 Meta connection storage is unavailable.");
  if (!configured.kv) blockers.push("KV OAuth state storage is unavailable.");
  if (!configured.liveMode) blockers.push("Set META_OAUTH_MODE=live after Meta App Review and data handling approval.");
  if (!configuration && Object.values(configured).every(Boolean)) blockers.push("Meta OAuth configuration is invalid.");
  const liveOAuthAllowed = Boolean(configuration) && blockers.length === 0;
  return {
    provider: "meta",
    mode: "read_only_oauth_connection",
    status: liveOAuthAllowed ? "live_oauth_enabled" : "blocked_oauth",
    liveOAuthAllowed,
    configured,
    requiredConfiguration: [
      "META_OAUTH_CLIENT_ID",
      "META_OAUTH_CLIENT_SECRET",
      "META_OAUTH_REDIRECT_URI",
      "META_GRAPH_API_VERSION",
      "META_LOGIN_CONFIGURATION_ID",
      "META_TOKEN_ENCRYPTION_KEY",
      "INVITE_APP_ORIGIN",
      "META_OAUTH_MODE=live",
      "D1 DB binding",
      "KV SESSIONS binding",
    ],
    blockers,
    dataBoundary: "meta_page_and_instagram_read_only_analytics_and_calendar_metadata",
  };
}

function metaOAuthConfiguration(env: Env): MetaOAuthConfiguration | null {
  const configuration: MetaOAuthConfiguration = {
    clientId: env.META_OAUTH_CLIENT_ID?.trim() ?? "",
    clientSecret: env.META_OAUTH_CLIENT_SECRET?.trim() ?? "",
    redirectUri: env.META_OAUTH_REDIRECT_URI?.trim() ?? "",
    graphVersion: env.META_GRAPH_API_VERSION?.trim() ?? "",
    loginConfigurationId: env.META_LOGIN_CONFIGURATION_ID?.trim() ?? "",
  };
  return hasValidMetaOAuthConfiguration(configuration) && isValidMetaOAuthRedirectUri(configuration.redirectUri)
    ? configuration
    : null;
}

function isValidMetaOAuthRedirectUri(value: string | undefined): boolean {
  const raw = value?.trim() ?? "";
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:"
      && url.username === ""
      && url.password === ""
      && url.search === ""
      && url.hash === ""
      && url.pathname === "/api/providers/meta/oauth/callback";
  } catch {
    return false;
  }
}

async function metaOAuthStateKey(state: string): Promise<string> {
  return `oauth:meta:${await sha256Hex(state)}`;
}

function isValidMetaOAuthState(value: string): boolean {
  return value.length >= 20 && value.length <= 256 && /^[A-Za-z0-9._~-]+$/.test(value);
}

function parseMetaOAuthStateRecord(value: string | null): MetaOAuthStateRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<MetaOAuthStateRecord>;
    if (
      !isValidWorkspaceId(parsed.workspaceId ?? "")
      || !isValidRecordId(parsed.memberId ?? "")
      || !/^[a-f0-9]{64}$/.test(parsed.sessionHash ?? "")
      || !Array.isArray(parsed.scopes)
      || parsed.scopes.length !== META_REQUIRED_SCOPES.length
      || !META_REQUIRED_SCOPES.every((scope) => parsed.scopes?.includes(scope))
      || typeof parsed.createdAt !== "string"
      || Number.isNaN(Date.parse(parsed.createdAt))
      || typeof parsed.expiresAt !== "string"
      || Number.isNaN(Date.parse(parsed.expiresAt))
    ) {
      return null;
    }
    return parsed as MetaOAuthStateRecord;
  } catch {
    return null;
  }
}

async function requireMetaOAuthCallbackAuth(
  env: Env,
  sessionId: string,
  state: MetaOAuthStateRecord,
): Promise<boolean> {
  if (!env.DB) return false;
  try {
    const session = await env.DB.prepare(`
      SELECT id, workspace_id, member_id, csrf_hash, revoked_at, expires_at
      FROM sessions
      WHERE id = ?
      LIMIT 1
    `).bind(sessionId).first<SessionRow>();
    if (
      !session
      || session.revoked_at
      || Date.parse(session.expires_at) < Date.now()
      || session.workspace_id !== state.workspaceId
      || session.member_id !== state.memberId
    ) {
      return false;
    }
    const membership = await readSessionMembership(env, sessionId, session.member_id, session.workspace_id);
    return membership.status === "active" && OWNER_PRODUCER_ROLES.includes(membership.role);
  } catch {
    return false;
  }
}

function metaOAuthCallbackRedirect(
  env: Env,
  outcome: "connected" | "error",
  errorCode?: string,
): Response {
  const appOrigin = env.INVITE_APP_ORIGIN?.trim() ?? "";
  try {
    const target = new URL("/", appOrigin);
    if (target.protocol !== "https:" && target.hostname !== "localhost" && target.hostname !== "127.0.0.1") {
      throw new Error("invalid_app_origin");
    }
    target.searchParams.set("meta", outcome);
    if (errorCode) target.searchParams.set("code", errorCode);
    return Response.redirect(target.toString(), 303);
  } catch {
    return json({ error: errorCode ?? "meta_oauth_callback_failed" }, 400);
  }
}

async function readMetaProviderConnection(
  db: D1Database | undefined,
  workspaceId: string,
): Promise<{
  persistence: "dry_run_memoryless" | "d1_meta_provider_connections" | "d1_unavailable_dry_run";
  connection: MetaProviderConnection | null;
}> {
  if (!db) return { persistence: "dry_run_memoryless", connection: null };
  try {
    const row = await readMetaProviderConnectionRow(db, workspaceId);
    return {
      persistence: "d1_meta_provider_connections",
      connection: row ? metaProviderConnectionFromRow(row) : null,
    };
  } catch {
    return { persistence: "d1_unavailable_dry_run", connection: null };
  }
}

async function readMetaProviderConnectionRow(
  db: D1Database,
  workspaceId: string,
): Promise<MetaProviderConnectionRow | null> {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      connected_by_member_id,
      status,
      scopes_json,
      user_access_token_ciphertext,
      page_access_token_ciphertext,
      token_expires_at,
      token_key_version,
      meta_user_id,
      page_id,
      page_name,
      instagram_account_id,
      instagram_username,
      last_error_code,
      connected_at,
      disconnected_at,
      updated_at
    FROM meta_provider_connections
    WHERE workspace_id = ?
    LIMIT 1
  `).bind(workspaceId).first<MetaProviderConnectionRow>();
}

function metaProviderConnectionFromRow(row: MetaProviderConnectionRow): MetaProviderConnection {
  return {
    provider: "meta",
    status: row.status,
    scopes: parseMetaScopes(row.scopes_json),
    tokenExpiresAt: row.token_expires_at,
    page: row.page_id && row.page_name ? { id: row.page_id, name: row.page_name } : null,
    instagramAccount: row.instagram_account_id
      ? { id: row.instagram_account_id, username: row.instagram_username }
      : null,
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    updatedAt: row.updated_at,
  };
}

function parseMetaScopes(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((scope): scope is string => typeof scope === "string" && scope.length <= 80).slice(0, 10)
      : [];
  } catch {
    return [];
  }
}

async function usableMetaToken(
  env: Env,
  row: MetaProviderConnectionRow,
  kind: "user" | "page",
): Promise<
  | { ok: true; token: string }
  | { ok: false; error: "meta_reauthorization_required" | "meta_token_runtime_unavailable"; status: 409 | 503 }
> {
  const encodedKey = env.META_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
  if (!hasValidMetaTokenEncryptionKey(encodedKey)) {
    return { ok: false, error: "meta_token_runtime_unavailable", status: 503 };
  }
  const expiresAt = row.token_expires_at ? Date.parse(row.token_expires_at) : Number.NaN;
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now() + 2 * 60 * 1000) {
    return { ok: false, error: "meta_reauthorization_required", status: 409 };
  }
  const ciphertext = kind === "user" ? row.user_access_token_ciphertext : row.page_access_token_ciphertext;
  if (!ciphertext) return { ok: false, error: "meta_reauthorization_required", status: 409 };
  try {
    return {
      ok: true,
      token: await decryptMetaToken(ciphertext, encodedKey, metaTokenAdditionalData(row.workspace_id, kind)),
    };
  } catch {
    return { ok: false, error: "meta_reauthorization_required", status: 409 };
  }
}

function providerRuntimeReadiness(env: Env, workspaceId: string): ProviderRuntimeReadinessResult {
  const stripe = stripeSummaryReadiness(env);
  const resend = inviteDeliveryReadiness(env);
  const google = googleOAuthReadiness(env);
  const meta = metaOAuthReadiness(env);
  const authLive = isLiveMagicLinkDelivery(env);
  const summaryLive = stripe.liveSummaryReadAllowed;
  const resendLive = authLive && resend.liveDeliveryAllowed;
  const resendPartial = authLive || resend.liveDeliveryAllowed;
  const smsEncryptionReady = hasValidSmsRecipientEncryptionKey(env.SMS_RECIPIENT_ENCRYPTION_KEY?.trim() ?? "");
  const smsHashReady = hasValidSmsRecipientHashKey(env.SMS_RECIPIENT_HASH_KEY?.trim() ?? "");
  const telnyxPublicKeyReady = Boolean(env.TELNYX_WEBHOOK_PUBLIC_KEY?.trim());
  const telnyxMappingsReady = Boolean(parseTelnyxInboundNumberMappings(env.TELNYX_INBOUND_NUMBER_MAPPINGS?.trim() ?? ""));
  const telnyxWebhookLive = env.TELNYX_WEBHOOK_MODE?.trim().toLowerCase() === "live";
  const telnyxApiReady = (env.TELNYX_API_KEY?.trim().length ?? 0) >= 16;
  const telnyxProfileReady = isValidTelnyxMessagingProfileId(env.TELNYX_MESSAGING_PROFILE_ID?.trim() ?? "");
  const telnyxSenderReady = Boolean(parseTelnyxOutboundNumber(
    env.TELNYX_INBOUND_NUMBER_MAPPINGS?.trim() ?? "",
    workspaceId,
  ));
  const smsQuietHoursReady = isValidQuietHoursConfiguration(
    env.SMS_QUIET_HOURS_TIME_ZONE?.trim() ?? "",
    env.SMS_QUIET_HOURS_START?.trim() ?? "",
    env.SMS_QUIET_HOURS_END?.trim() ?? "",
  );
  const smsRetentionDays = parseSmsRetentionDays(env.SMS_DELIVERY_RETENTION_DAYS?.trim() ?? "");
  const smsLive = env.SMS_MODE?.trim().toLowerCase() === "live"
    && telnyxApiReady
    && telnyxProfileReady
    && telnyxSenderReady
    && smsQuietHoursReady
    && smsRetentionDays !== null
    && smsEncryptionReady
    && smsHashReady
    && telnyxPublicKeyReady
    && telnyxMappingsReady
    && telnyxWebhookLive;
  const summaryBlockers = stripe.blockers.length
    ? [...stripe.blockers]
    : summaryLive ? [] : ["Enable the explicit summary-only adapter gate."];
  const providers: ProviderRuntimeReadinessItem[] = [
    {
      key: "pool",
      label: "Pool",
      status: summaryLive ? "live" : "blocked",
      runtimeMode: summaryLive ? "live_summary_only" : "dry_run_only",
      liveCapabilities: summaryLive ? ["campaign_aggregate_summary"] : [],
      blockers: summaryBlockers,
      requiredDecisions: ["Map each canonical Film project to approved Pool campaign refs."],
      dataBoundary: "aggregate_money_and_counts_only",
    },
    {
      key: "store",
      label: "Store",
      status: summaryLive ? "live" : "blocked",
      runtimeMode: summaryLive ? "live_summary_only" : "dry_run_only",
      liveCapabilities: summaryLive ? ["order_revenue_aggregate_summary"] : [],
      blockers: summaryBlockers,
      requiredDecisions: ["Map each canonical Film project to approved Store product or event refs."],
      dataBoundary: "aggregate_money_and_counts_only",
    },
    {
      key: "stripe",
      label: "Stripe",
      status: summaryLive ? "live" : "blocked",
      runtimeMode: summaryLive ? "live_summary_only" : "dry_run_only",
      liveCapabilities: summaryLive ? ["pool_store_payment_summary"] : [],
      blockers: summaryBlockers,
      requiredDecisions: ["Keep direct Stripe API access disabled unless a separate restricted-scope review is accepted."],
      dataBoundary: "pool_store_summary_adapters_only",
    },
    {
      key: "resend",
      label: "Resend",
      status: resendLive ? "live" : resendPartial ? "partial_live" : "blocked",
      runtimeMode: resendLive || resendPartial ? "live_transactional_email" : "dry_run_only",
      liveCapabilities: [
        ...(authLive ? ["member_magic_link_delivery"] : []),
        ...(resend.liveDeliveryAllowed ? ["workspace_invite_delivery"] : []),
      ],
      blockers: [
        ...(!authLive ? ["Enable member-only live magic-link mode."] : []),
        ...resend.blockers,
      ],
      requiredDecisions: ["Keep bulk and marketing email blocked until consent and unsubscribe policy exists."],
      dataBoundary: "transactional_recipient_sent_to_resend_only",
    },
    {
      key: "google",
      label: "Google",
      status: google.liveOAuthAllowed ? "live" : "blocked",
      runtimeMode: google.liveOAuthAllowed ? "live_oauth" : "dry_run_only",
      liveCapabilities: google.liveOAuthAllowed
        ? ["workspace_oauth_connection", "drive_metadata_read"]
        : [],
      blockers: google.blockers,
      requiredDecisions: [
        "Keep Drive content and optional Calendar scopes behind separate incremental consent.",
        "Approve workspace opt-in and consent copy.",
      ],
      dataBoundary: google.dataBoundary,
    },
    {
      key: "social",
      label: "Meta Insights",
      status: meta.liveOAuthAllowed ? "live" : "blocked",
      runtimeMode: meta.liveOAuthAllowed ? "live_oauth" : "dry_run_only",
      liveCapabilities: meta.liveOAuthAllowed
        ? ["workspace_oauth_connection", "page_selection", "facebook_instagram_calendar", "bounded_engagement_analytics"]
        : [],
      blockers: meta.blockers,
      requiredDecisions: [
        "Complete Business Verification, data handling questions, and App Review before external accounts are connected.",
        "Keep publishing, messaging, moderation, and advertising permissions outside social v1.",
      ],
      dataBoundary: meta.dataBoundary,
    },
    {
      key: "sms",
      label: "Telnyx SMS",
      status: smsLive ? "live" : "blocked",
      runtimeMode: smsLive ? "live_transactional_sms" : "dry_run_only",
      liveCapabilities: smsLive ? ["crew_transactional_sms", "signed_delivery_and_opt_out_webhooks"] : [],
      blockers: [
        ...(!telnyxApiReady ? ["The Telnyx API key is not configured."] : []),
        ...(!telnyxProfileReady ? ["The Telnyx messaging profile is not configured."] : []),
        ...(!telnyxSenderReady ? ["Exactly one Telnyx sender must map to this workspace."] : []),
        ...(!smsEncryptionReady ? ["The dedicated SMS recipient encryption key is not configured."] : []),
        ...(!smsHashReady ? ["The separate SMS recipient HMAC key is not configured."] : []),
        ...(!telnyxPublicKeyReady ? ["The Telnyx Ed25519 webhook public key is not configured."] : []),
        ...(!telnyxMappingsReady ? ["No receiving-number to workspace mapping is configured."] : []),
        ...(!telnyxWebhookLive ? ["The signed Telnyx webhook live gate is disabled."] : []),
        ...(!smsQuietHoursReady ? ["The approved SMS quiet-hours time zone and window are not configured."] : []),
        ...(smsRetentionDays === null ? ["The approved terminal SMS metadata retention period is not configured."] : []),
        ...(env.SMS_MODE?.trim().toLowerCase() !== "live" ? ["The explicit SMS live-send gate is disabled."] : []),
        ...(!smsLive ? ["Telnyx account, dedicated number, 10DLC campaign, disclosure, retention policy, and owned-number smoke require operator approval before live mode."] : []),
      ],
      requiredDecisions: [
        "Approve the crew consent disclosure, retention period, quiet hours, and emergency override policy.",
        "Keep investor, fundraising, promotional, and bulk marketing messages outside SMS v1.",
      ],
      dataBoundary: "transient_message_body_encrypted_recipients_content_free_attempts_and_signed_redacted_webhooks",
    },
  ];

  return {
    policy: "explicit_provider_live_gates",
    secretValuesExposed: false,
    liveCount: providers.filter((provider) => provider.status === "live").length,
    partialLiveCount: providers.filter((provider) => provider.status === "partial_live").length,
    blockedCount: providers.filter((provider) => provider.status === "blocked").length,
    providers,
  };
}

function stripeProjectMappingFor(rawMappings: string | undefined, workspaceId: string, projectId: string): StripeProjectMapping | null {
  const raw = rawMappings?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const mapping = stripeProjectMappingFromParsed(parsed, workspaceId, projectId);
    if (mapping) return mapping;
  } catch {
    return stripeProjectMappingFromText(raw, projectId);
  }

  return null;
}

function stripeProjectMappingFromParsed(parsed: unknown, workspaceId: string, projectId: string): StripeProjectMapping | null {
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!isObjectRecord(item) || String(item.projectId ?? item.project_id ?? "").trim() !== projectId) continue;
      return stripeProjectMappingFromValue(projectId, item);
    }
    return null;
  }

  if (!isObjectRecord(parsed)) return null;
  const workspaceScoped = parsed[workspaceId];
  const candidate = isObjectRecord(workspaceScoped) ? workspaceScoped : parsed;
  const projectValue = candidate[projectId];
  if (projectValue === undefined) return null;

  return stripeProjectMappingFromValue(projectId, projectValue);
}

function stripeProjectMappingFromValue(projectId: string, value: unknown): StripeProjectMapping | null {
  if (typeof value === "string") {
    return stripeProjectMappingFromText(value, projectId);
  }

  if (Array.isArray(value)) {
    const refs = value.map((item) => safeStripeMappingRef(item)).filter((item): item is string => Boolean(item));
    return refs.length ? { projectId, poolRefs: refs, storeRefs: refs } : null;
  }

  if (!isObjectRecord(value)) return null;
  const poolRefs = stripeMappingRefsFromUnknown(value.pool ?? value.poolRefs ?? value.pool_refs ?? value.poolCampaigns ?? value.pool_campaigns);
  const storeRefs = stripeMappingRefsFromUnknown(value.store ?? value.storeRefs ?? value.store_refs ?? value.storeProducts ?? value.store_products);
  if (poolRefs.length === 0 && storeRefs.length === 0) return null;

  return { projectId, poolRefs, storeRefs };
}

function stripeProjectMappingFromText(value: string, projectId: string): StripeProjectMapping | null {
  const text = value.trim();
  if (!text) return null;

  const entries = text.includes(";") ? text.split(";") : [text];
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const [maybeProject, mappingText] = trimmed.includes("=") ? trimmed.split(/=(.*)/s, 2) : [projectId, trimmed];
    if ((maybeProject ?? "").trim() !== projectId) continue;
    const poolMatch = mappingText.match(/(?:^|[,|\s])pool:([^,|;]+)/i);
    const storeMatch = mappingText.match(/(?:^|[,|\s])store:([^,|;]+)/i);
    const poolRefs = stripeMappingRefsFromText(poolMatch?.[1] ?? "");
    const storeRefs = stripeMappingRefsFromText(storeMatch?.[1] ?? "");
    if (poolRefs.length || storeRefs.length) return { projectId, poolRefs, storeRefs };
  }

  return null;
}

function stripeMappingRefsFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => safeStripeMappingRef(item)).filter((item): item is string => Boolean(item)).slice(0, 20);
  }
  if (typeof value === "string") {
    return stripeMappingRefsFromText(value);
  }
  return [];
}

function stripeMappingRefsFromText(value: string): string[] {
  return value
    .split(/[,\s|]+/)
    .map((item) => safeStripeMappingRef(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 20);
}

function safeStripeMappingRef(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(text) ? text : null;
}

async function fetchStripeSummary(env: Env, workspaceId: string, mapping: StripeProjectMapping): Promise<StripeSummaryResult> {
  const [pool, store] = await Promise.all([
    fetchStripeSummaryAdapter("pool", env.POOL_STRIPE_SUMMARY_ADAPTER_URL ?? "", env.STRIPE_SUMMARY_ADAPTER_SECRET ?? "", workspaceId, mapping.projectId, mapping.poolRefs),
    fetchStripeSummaryAdapter("store", env.STORE_STRIPE_SUMMARY_ADAPTER_URL ?? "", env.STRIPE_SUMMARY_ADAPTER_SECRET ?? "", workspaceId, mapping.projectId, mapping.storeRefs),
  ]);
  const adapters = [pool, store];
  const warnings = adapters
    .filter((adapter) => adapter.status !== "available" && adapter.status !== "empty")
    .map((adapter) => `${adapter.source}:${adapter.status}`);
  const availableCount = adapters.filter((adapter) => adapter.status === "available" || adapter.status === "empty").length;
  const status = availableCount === adapters.length
    ? "complete_summary"
    : availableCount > 0
      ? "partial_summary"
      : "unavailable_summary";

  return {
    provider: "stripe",
    source: "pool_store_summary_adapter",
    mode: "live_summary_adapter",
    status,
    workspaceId,
    projectId: mapping.projectId,
    dataBoundary: "summary_only",
    directStripeReadAllowed: false,
    liveSummaryReadAllowed: true,
    adapters,
    totals: sumStripeSummaryTotals(adapters),
    counts: sumStripeSummaryCounts(adapters),
    warnings,
  };
}

async function fetchStripeSummaryAdapter(
  source: StripeSummaryAdapterSource,
  adapterUrl: string,
  adapterSecret: string,
  workspaceId: string,
  projectId: string,
  mappedRefs: string[],
): Promise<StripeSummaryAdapterSummary> {
  if (mappedRefs.length === 0) {
    return emptyStripeSummaryAdapter(source, "blocked_not_mapped", 0, "project_not_mapped");
  }

  try {
    const response = await fetch(adapterUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adapterSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workspaceId,
        projectId,
        source,
        mappedRefs,
        dataBoundary: "summary_only",
        requestedFields: [
          "grossAmountCents",
          "feeAmountCents",
          "netAmountCents",
          "pledgedAmountCents",
          "chargedAmountCents",
          "orderRevenueCents",
          "paymentFailedAmountCents",
          "paymentCount",
          "paymentFailedCount",
        ],
      }),
    });

    if (!response.ok) {
      return emptyStripeSummaryAdapter(source, "failed", mappedRefs.length, `adapter_http_${response.status}`);
    }

    const body = await readOptionalJson(response);
    const summary = sanitizeStripeSummaryAdapterBody(source, body, mappedRefs.length);
    return summary ?? emptyStripeSummaryAdapter(source, "invalid_response", mappedRefs.length, "adapter_invalid_response");
  } catch {
    return emptyStripeSummaryAdapter(source, "failed", mappedRefs.length, "adapter_fetch_failed");
  }
}

function sanitizeStripeSummaryAdapterBody(
  source: StripeSummaryAdapterSource,
  body: Record<string, unknown> | null,
  mappedRefCount: number,
): StripeSummaryAdapterSummary | null {
  if (!body) return null;
  const totalsBody = isObjectRecord(body.totals) ? body.totals : body;
  const countsBody = isObjectRecord(body.counts) ? body.counts : body;
  const totals: StripeSummaryTotals = {
    grossAmountCents: stripeSummaryNumber(totalsBody.grossAmountCents ?? totalsBody.grossAmount ?? totalsBody.actualStripeGrossAmount ?? totalsBody.totalCents ?? totalsBody.orderRevenueCents),
    feeAmountCents: stripeSummaryNumber(totalsBody.feeAmountCents ?? totalsBody.feeAmount ?? totalsBody.actualStripeFeeAmount),
    netAmountCents: stripeSummaryNumber(totalsBody.netAmountCents ?? totalsBody.netAmount ?? totalsBody.actualStripeNetAmount),
    pledgedAmountCents: stripeSummaryNumber(totalsBody.pledgedAmountCents ?? totalsBody.pledgedAmount),
    chargedAmountCents: stripeSummaryNumber(totalsBody.chargedAmountCents ?? totalsBody.chargedAmount),
    orderRevenueCents: stripeSummaryNumber(totalsBody.orderRevenueCents ?? totalsBody.totalCents),
    paymentFailedAmountCents: stripeSummaryNumber(totalsBody.paymentFailedAmountCents ?? totalsBody.paymentFailedAmount),
    refundedAmountCents: stripeSummaryNumber(totalsBody.refundedAmountCents ?? totalsBody.refundAmountCents),
    disputedAmountCents: stripeSummaryNumber(totalsBody.disputedAmountCents ?? totalsBody.disputeAmountCents),
  };
  const counts: StripeSummaryCounts = {
    paymentCount: stripeSummaryNumber(countsBody.paymentCount ?? countsBody.chargedPledgeCount ?? countsBody.orders),
    paymentFailedCount: stripeSummaryNumber(countsBody.paymentFailedCount ?? countsBody.paymentFailedPledgeCount),
    refundCount: stripeSummaryNumber(countsBody.refundCount),
    disputeCount: stripeSummaryNumber(countsBody.disputeCount),
    invoiceCount: stripeSummaryNumber(countsBody.invoiceCount),
    payoutCount: stripeSummaryNumber(countsBody.payoutCount),
  };
  const currency = stripeSummaryCurrency(body.currency ?? totalsBody.currency);
  const generatedAt = typeof body.generatedAt === "string" && body.generatedAt.length <= 80 ? body.generatedAt : null;
  const hasMetrics = Object.values(totals).some((value) => value > 0) || Object.values(counts).some((value) => value > 0);

  return {
    source,
    status: hasMetrics ? "available" : "empty",
    mappedRefCount,
    generatedAt,
    currency,
    totals,
    counts,
    errorCode: null,
  };
}

function emptyStripeSummaryAdapter(
  source: StripeSummaryAdapterSource,
  status: StripeSummaryAdapterStatus,
  mappedRefCount: number,
  errorCode: string | null,
): StripeSummaryAdapterSummary {
  return {
    source,
    status,
    mappedRefCount,
    generatedAt: null,
    currency: "USD",
    totals: emptyStripeSummaryTotals(),
    counts: emptyStripeSummaryCounts(),
    errorCode,
  };
}

function emptyStripeSummaryTotals(): StripeSummaryTotals {
  return {
    grossAmountCents: 0,
    feeAmountCents: 0,
    netAmountCents: 0,
    pledgedAmountCents: 0,
    chargedAmountCents: 0,
    orderRevenueCents: 0,
    paymentFailedAmountCents: 0,
    refundedAmountCents: 0,
    disputedAmountCents: 0,
  };
}

function emptyStripeSummaryCounts(): StripeSummaryCounts {
  return {
    paymentCount: 0,
    paymentFailedCount: 0,
    refundCount: 0,
    disputeCount: 0,
    invoiceCount: 0,
    payoutCount: 0,
  };
}

function sumStripeSummaryTotals(adapters: StripeSummaryAdapterSummary[]): StripeSummaryTotals {
  const totals = emptyStripeSummaryTotals();
  for (const adapter of adapters) {
    for (const key of Object.keys(totals) as Array<keyof StripeSummaryTotals>) {
      totals[key] += adapter.totals[key];
    }
  }
  return totals;
}

function sumStripeSummaryCounts(adapters: StripeSummaryAdapterSummary[]): StripeSummaryCounts {
  const counts = emptyStripeSummaryCounts();
  for (const adapter of adapters) {
    for (const key of Object.keys(counts) as Array<keyof StripeSummaryCounts>) {
      counts[key] += adapter.counts[key];
    }
  }
  return counts;
}

function stripeSummaryNumber(value: unknown): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(10_000_000_000_000, Math.trunc(number));
}

function stripeSummaryCurrency(value: unknown): string {
  const text = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(text) ? text : "USD";
}

function isEnabledConfigFlag(value: string | undefined): boolean {
  return ["1", "true", "yes", "enabled"].includes(value?.trim().toLowerCase() ?? "");
}

async function acceptWorkspaceInvite(
  db: D1Database | undefined,
  token: string,
  displayName: string,
): Promise<
  | {
    ok: true;
    persistence: InvitePersistence;
    auditPersistence: AuditPersistence;
    member: WorkspaceInviteMemberSummary;
  }
  | { ok: false; persistence: InvitePersistence; error: string; status: number }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "invite_storage_unavailable",
      status: 503,
    };
  }

  try {
    const tokenHash = await sha256Hex(token);
    const invite = await db.prepare(`
      SELECT
        id,
        workspace_id,
        email_hash,
        invited_role,
        status,
        expires_at,
        accepted_at
      FROM workspace_invites
      WHERE token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first<WorkspaceInviteRow>();
    const expiresAtMs = invite ? Date.parse(invite.expires_at) : Number.NaN;

    if (!invite || invite.status !== "pending" || invite.accepted_at || !Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
      return {
        ok: false,
        persistence: "d1_invite_records",
        error: "invalid_or_expired_invite",
        status: 401,
      };
    }
    if (!isAuthRole(invite.invited_role)) {
      return {
        ok: false,
        persistence: "d1_invite_records",
        error: "invalid_invite_role",
        status: 422,
      };
    }

    const now = new Date().toISOString();
    const existingMember = await findWorkspaceMemberByWorkspaceEmailHash(db, invite.workspace_id, invite.email_hash);
    const memberId = existingMember?.id ?? `member_${crypto.randomUUID()}`;
    const memberWrite = existingMember
      ? db.prepare(`
        UPDATE workspace_members
        SET role = ?,
          display_name = ?
        WHERE id = ?
          AND workspace_id = ?
          AND email_hash = ?
      `).bind(invite.invited_role, displayName, memberId, invite.workspace_id, invite.email_hash)
      : db.prepare(`
        INSERT INTO workspace_members (
          id,
          workspace_id,
          email_hash,
          role,
          display_name
        )
        VALUES (?, ?, ?, ?, ?)
      `).bind(memberId, invite.workspace_id, invite.email_hash, invite.invited_role, displayName);
    const statusWrite = db.prepare(`
      INSERT INTO workspace_member_statuses (
        member_id,
        workspace_id,
        status,
        updated_at
      )
      VALUES (?, ?, 'active', ?)
      ON CONFLICT(member_id) DO UPDATE SET
        workspace_id = excluded.workspace_id,
        status = 'active',
        updated_at = excluded.updated_at
    `).bind(memberId, invite.workspace_id, now);
    const consumeInvite = db.prepare(`
      UPDATE workspace_invites
      SET status = 'accepted',
        accepted_at = ?
      WHERE id = ?
        AND status = 'pending'
    `).bind(now, invite.id);
    const statements = [
      workspaceInviteStateAssertion(db, invite, "pending"),
      inviteAcceptanceMemberAssertion(db, invite.workspace_id, invite.email_hash, existingMember?.id ?? null),
      memberWrite,
      statusWrite,
      consumeInvite,
      auditEventInsertStatement(
        db,
        `audit_invite_accept_${invite.id}`,
        invite.workspace_id,
        null,
        null,
        "invite.accepted_dry_run",
        {
          memberId,
          emailHash: invite.email_hash,
          role: invite.invited_role,
          persistence: "d1_invite_records",
        },
        now,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[2]?.meta?.changes ?? 0) !== 1
      || Number(results[3]?.meta?.changes ?? 0) !== 1
      || Number(results[4]?.meta?.changes ?? 0) !== 1
      || Number(results[5]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("invite acceptance batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_invite_records",
      auditPersistence: "d1_audit_events",
      member: {
        id: memberId,
        workspaceId: invite.workspace_id,
        emailHash: invite.email_hash,
        role: invite.invited_role,
        status: "active",
      },
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "invite_storage_unavailable",
      status: 503,
    };
  }
}

function inviteAcceptanceMemberAssertion(
  db: D1Database,
  workspaceId: string,
  emailHash: string,
  expectedMemberId: string | null,
): D1PreparedStatement {
  const expectation = expectedMemberId === null
    ? "NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = ? AND email_hash = ?)"
    : "EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = ? AND email_hash = ? AND id = ?)";
  return db.prepare(`
    SELECT CASE
      WHEN ${expectation}
      THEN 1 ELSE abs(-9223372036854775808)
    END AS invite_acceptance_member_assertion
  `).bind(workspaceId, emailHash, ...(expectedMemberId === null ? [] : [expectedMemberId]));
}

async function updateWorkspaceMemberStatus(
  db: D1Database | undefined,
  workspaceId: string,
  memberId: string,
  status: Extract<WorkspaceMemberStatus, "active" | "disabled">,
  actorRole: AuthRole,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: WorkspaceMemberStatusUpdatePersistence;
    auditPersistence: AuditPersistence;
    member: WorkspaceMemberStatusUpdateSummary;
  }
  | { ok: false; persistence: WorkspaceMemberStatusUpdatePersistence; error: string; status: number }
> {
  const dryRunMember: WorkspaceMemberStatusUpdateSummary = {
    workspaceId,
    memberId,
    role: seedWorkspace.members.find((member) => member.id === memberId)?.role ?? "contributor",
    status,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      member: dryRunMember,
    };
  }

  try {
    const member = await findWorkspaceMemberById(db, memberId);
    if (!member || member.workspace_id !== workspaceId || !isAuthRole(member.role)) {
      return {
        ok: false,
        persistence: "d1_workspace_member_status",
        error: "member_not_found",
        status: 404,
      };
    }
    if (member.role === "owner" && actorRole !== "owner") {
      return {
        ok: false,
        persistence: "d1_workspace_member_status",
        error: "insufficient_member_status_role",
        status: 403,
      };
    }
    if (status === "disabled" && actorMemberId === memberId) {
      return {
        ok: false,
        persistence: "d1_workspace_member_status",
        error: "self_disable_not_allowed",
        status: 409,
      };
    }

    const updatedAt = new Date().toISOString();
    const statements = [
      workspaceMemberStatusAssertion(db, workspaceId, memberId, member.role, member.status),
      db.prepare(`
      INSERT INTO workspace_member_statuses (
        member_id,
        workspace_id,
        status,
        updated_at
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(member_id) DO UPDATE SET
        workspace_id = excluded.workspace_id,
        status = excluded.status,
        updated_at = excluded.updated_at
      `).bind(memberId, workspaceId, status, updatedAt),
    ];

    if (status === "disabled") {
      statements.push(db.prepare(`
        UPDATE sessions
        SET revoked_at = ?
        WHERE member_id = ?
          AND revoked_at IS NULL
      `).bind(updatedAt, memberId));
    }

    statements.push(auditEventInsertStatement(
      db,
      `audit_workspace_member_status_${crypto.randomUUID()}`,
      workspaceId,
      null,
      actorMemberId,
      "workspace_member.status_updated",
      {
        memberId,
        role: member.role,
        status,
        revokedSessions: status === "disabled",
        persistence: "d1_workspace_member_status",
      },
      updatedAt,
    ));

    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results.at(-1)?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("member status batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_workspace_member_status",
      auditPersistence: "d1_audit_events",
      member: {
        workspaceId,
        memberId,
        role: member.role,
        status,
      },
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "member_status_update_unavailable", status: 503 };
  }
}

function workspaceMemberStatusAssertion(
  db: D1Database,
  workspaceId: string,
  memberId: string,
  role: string,
  expectedStatus: string,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM workspace_members AS member
        LEFT JOIN workspace_member_statuses AS member_status
          ON member_status.member_id = member.id
        WHERE member.id = ?
          AND member.workspace_id = ?
          AND member.role = ?
          AND COALESCE(member_status.status, 'active') = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS workspace_member_status_assertion
  `).bind(memberId, workspaceId, role, expectedStatus);
}

async function assignProjectMembership(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
  projectTitle: string,
  memberId: string,
  role: AuthRole,
  department: string | null,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: ProjectMembershipPersistence;
    auditPersistence: AuditPersistence;
    membership: ProjectMembershipSummary;
  }
  | { ok: false; persistence: ProjectMembershipPersistence; error: string; status: number }
> {
  const membership: ProjectMembershipSummary = {
    workspaceId,
    projectId,
    memberId,
    role,
    department,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      membership,
    };
  }

  try {
    const timestamp = new Date().toISOString();
    const member = await findWorkspaceMemberById(db, memberId);
    if (!member || member.workspace_id !== workspaceId) {
      return {
        ok: false,
        persistence: "d1_project_membership",
        error: "member_not_found",
        status: 404,
      };
    }
    if (normalizeWorkspaceMemberStatus(member.status) !== "active") {
      return {
        ok: false,
        persistence: "d1_project_membership",
        error: "member_not_active",
        status: 403,
      };
    }
    const existingProject = await db.prepare(`
      SELECT id, workspace_id
      FROM projects
      WHERE id = ?
      LIMIT 1
    `).bind(projectId).first<{ id: string; workspace_id: string }>();
    if (existingProject && existingProject.workspace_id !== workspaceId) {
      return {
        ok: false,
        persistence: "d1_project_membership",
        error: "project_workspace_conflict",
        status: 409,
      };
    }

    const seedProject = seedWorkspace.projects.find((project) => project.id === projectId);
    const statements = [
      workspaceMemberStatusAssertion(db, workspaceId, memberId, member.role, "active"),
      db.prepare(`
        INSERT INTO projects (
          id,
          workspace_id,
          title,
          phase,
          project_type,
          status,
          logline,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'film', 'active', ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `).bind(
        projectId,
        workspaceId,
        projectTitle || seedProject?.title || "Assigned Project",
        seedProject ? canonicalProjectPhase(seedProject.phase) : "development",
        seedProject?.description ?? null,
        timestamp,
        timestamp,
      ),
      projectWorkspaceAssertion(db, workspaceId, projectId),
      db.prepare(`
        INSERT INTO project_memberships (
          project_id,
          member_id,
          project_role,
          department
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(project_id, member_id) DO UPDATE SET
          project_role = excluded.project_role,
          department = excluded.department
      `).bind(projectId, memberId, role, department),
      auditEventInsertStatement(
        db,
        `audit_project_membership_assign_${crypto.randomUUID()}`,
        workspaceId,
        projectId,
        actorMemberId,
        "project_membership.assigned",
        {
          memberId,
          role,
          department,
          persistence: "d1_project_membership",
        },
        timestamp,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[3]?.meta?.changes ?? 0) !== 1
      || Number(results[4]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("project membership assignment batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_project_membership",
      auditPersistence: "d1_audit_events",
      membership,
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "project_membership_assignment_unavailable", status: 503 };
  }
}

async function listProjectMembershipManifest(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
  limit: number,
): Promise<ProjectMembershipManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      memberships: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        projects.workspace_id AS workspace_id,
        project_memberships.project_id,
        project_memberships.member_id,
        project_memberships.project_role,
        project_memberships.department
      FROM project_memberships
      INNER JOIN projects
        ON projects.id = project_memberships.project_id
      WHERE projects.workspace_id = ?
        AND project_memberships.project_id = ?
      ORDER BY project_memberships.member_id ASC, project_memberships.project_role ASC
      LIMIT ?
    `).bind(workspaceId, projectId, limit + 1).all<ProjectMembershipRow & { workspace_id: string }>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);

    return {
      persistence: "d1_project_membership",
      memberships: visibleRows.map(projectMembershipSummaryFromRow),
      rowCount: visibleRows.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      memberships: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

async function revokeProjectMembership(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
  memberId: string,
  role: AuthRole,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: ProjectMembershipPersistence;
    auditPersistence: AuditPersistence;
    membership: ProjectMembershipSummary;
  }
  | { ok: false; persistence: ProjectMembershipPersistence; error: string; status: number }
> {
  const requestSummary: ProjectMembershipSummary = {
    workspaceId,
    projectId,
    memberId,
    role,
    department: null,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      membership: requestSummary,
    };
  }

  try {
    const row = await db.prepare(`
      SELECT
        projects.workspace_id AS workspace_id,
        project_memberships.project_id,
        project_memberships.member_id,
        project_memberships.project_role,
        project_memberships.department
      FROM project_memberships
      INNER JOIN projects
        ON projects.id = project_memberships.project_id
      WHERE projects.workspace_id = ?
        AND project_memberships.project_id = ?
        AND project_memberships.member_id = ?
        AND project_memberships.project_role = ?
      LIMIT 1
    `).bind(workspaceId, projectId, memberId, role).first<ProjectMembershipRow & { workspace_id: string }>();

    if (!row) {
      return {
        ok: false,
        persistence: "d1_project_membership",
        error: "project_membership_not_found",
        status: 404,
      };
    }

    const timestamp = new Date().toISOString();
    const statements = [
      projectMembershipAssertion(db, workspaceId, projectId, memberId, role, row.department),
      db.prepare(`
        DELETE FROM project_memberships
        WHERE project_id = ?
          AND member_id = ?
          AND project_role = ?
          AND department IS ?
      `).bind(projectId, memberId, role, row.department),
      auditEventInsertStatement(
        db,
        `audit_project_membership_revoke_${crypto.randomUUID()}`,
        workspaceId,
        projectId,
        actorMemberId,
        "project_membership.revoked",
        {
          projectId,
          memberId,
          role,
          department: row.department,
          persistence: "d1_project_membership",
        },
        timestamp,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("project membership revoke batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_project_membership",
      auditPersistence: "d1_audit_events",
      membership: projectMembershipSummaryFromRow(row),
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "project_membership_revoke_unavailable", status: 503 };
  }
}

function projectWorkspaceAssertion(db: D1Database, workspaceId: string, projectId: string): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM projects
        WHERE id = ?
          AND workspace_id = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS project_workspace_assertion
  `).bind(projectId, workspaceId);
}

function projectMembershipAssertion(
  db: D1Database,
  workspaceId: string,
  projectId: string,
  memberId: string,
  role: AuthRole,
  department: string | null,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM project_memberships AS membership
        INNER JOIN projects AS project
          ON project.id = membership.project_id
        WHERE project.workspace_id = ?
          AND membership.project_id = ?
          AND membership.member_id = ?
          AND membership.project_role = ?
          AND membership.department IS ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS project_membership_assertion
  `).bind(workspaceId, projectId, memberId, role, department);
}

function projectMembershipSummaryFromRow(row: ProjectMembershipRow & { workspace_id: string }): ProjectMembershipSummary {
  return {
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    memberId: row.member_id,
    role: isAuthRole(row.project_role) ? row.project_role : "contributor",
    department: row.department,
  };
}

async function listProjectMembershipHistory(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
  limit: number,
): Promise<ProjectMembershipHistoryResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      entries: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      FROM audit_events
      WHERE workspace_id = ?
        AND project_id = ?
        AND action IN ('project_membership.assigned', 'project_membership.revoked')
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, projectId, limit + 1).all<ProjectMembershipHistoryRow>();
    const allRows = rows.results ?? [];
    const entries = allRows
      .slice(0, limit)
      .map(projectMembershipHistoryEntry)
      .filter((entry): entry is ProjectMembershipHistoryEntry => entry !== null);
    return {
      persistence: "d1_audit_events",
      entries,
      rowCount: entries.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      entries: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

function projectMembershipHistoryEntry(row: ProjectMembershipHistoryRow): ProjectMembershipHistoryEntry | null {
  if (row.action !== "project_membership.assigned" && row.action !== "project_membership.revoked") return null;
  try {
    const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
    const memberId = metadata.memberId;
    const role = metadata.role;
    const department = metadata.department;
    if (typeof memberId !== "string" || !memberId || !isAuthRole(role)) return null;
    return {
      id: row.id,
      action: row.action,
      actorMemberId: row.actor_member_id,
      memberId,
      role,
      department: typeof department === "string" && department ? department : null,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

async function assignRecordPermission(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: RecordPermissionEntityType,
  entityId: string,
  memberId: string,
  permission: RecordPermissionLevel,
  department: string | null,
  expiresAt: string | null,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: RecordPermissionPersistence;
    auditPersistence: AuditPersistence;
    permission: RecordPermissionSummary;
  }
  | { ok: false; persistence: RecordPermissionPersistence; error: string; status: number }
> {
  const summary: RecordPermissionSummary = {
    id: `record_permission_${crypto.randomUUID()}`,
    workspaceId,
    entityType,
    entityId,
    memberId,
    permission,
    department,
    expiresAt,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      permission: summary,
    };
  }

  try {
    const timestamp = new Date().toISOString();
    const member = await findWorkspaceMemberById(db, memberId);
    if (!member || member.workspace_id !== workspaceId) {
      return {
        ok: false,
        persistence: "d1_record_permissions",
        error: "member_not_found",
        status: 404,
      };
    }
    if (normalizeWorkspaceMemberStatus(member.status) !== "active") {
      return {
        ok: false,
        persistence: "d1_record_permissions",
        error: "member_not_active",
        status: 403,
      };
    }
    const existing = await db.prepare(`
      SELECT
        id,
        workspace_id,
        entity_type,
        entity_id,
        member_id,
        permission,
        department,
        expires_at,
        updated_at
      FROM record_permissions
      WHERE workspace_id = ?
        AND entity_type = ?
        AND entity_id = ?
        AND member_id = ?
        AND permission = ?
      LIMIT 1
    `).bind(workspaceId, entityType, entityId, memberId, permission).first<RecordPermissionRow>();
    if (existing) summary.id = existing.id;

    const statements = [
      workspaceMemberStatusAssertion(db, workspaceId, memberId, member.role, "active"),
      recordPermissionIdentityAssertion(db, workspaceId, entityType, entityId, memberId, permission, existing?.id ?? null),
      db.prepare(`
        INSERT INTO record_permissions (
          id,
          workspace_id,
          entity_type,
          entity_id,
          member_id,
          permission,
          department,
          expires_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, entity_type, entity_id, member_id, permission) DO UPDATE SET
          department = excluded.department,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `).bind(
        summary.id,
        workspaceId,
        entityType,
        entityId,
        memberId,
        permission,
        department,
        expiresAt,
        timestamp,
        timestamp,
      ),
      auditEventInsertStatement(
        db,
        `audit_record_permission_assign_${crypto.randomUUID()}`,
        workspaceId,
        entityType === "project" ? entityId : null,
        actorMemberId,
        "record_permission.assigned",
        {
          permissionId: summary.id,
          entityType,
          entityId,
          memberId,
          permission,
          department,
          expiresAt,
          persistence: "d1_record_permissions",
        },
        timestamp,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[2]?.meta?.changes ?? 0) !== 1
      || Number(results[3]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("record permission assignment batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_record_permissions",
      auditPersistence: "d1_audit_events",
      permission: summary,
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "record_permission_assignment_unavailable", status: 503 };
  }
}

async function revokeRecordPermission(
  db: D1Database | undefined,
  workspaceId: string,
  permissionId: string,
  entityType: RecordPermissionEntityType,
  entityId: string,
  memberId: string,
  permission: RecordPermissionLevel,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: RecordPermissionPersistence;
    auditPersistence: AuditPersistence;
    permission: RecordPermissionSummary;
  }
  | { ok: false; persistence: RecordPermissionPersistence; error: string; status: number }
> {
  const requestSummary: RecordPermissionSummary = {
    id: permissionId,
    workspaceId,
    entityType,
    entityId,
    memberId,
    permission,
    department: null,
    expiresAt: null,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      permission: requestSummary,
    };
  }

  try {
    const row = await db.prepare(`
      SELECT
        id,
        workspace_id,
        entity_type,
        entity_id,
        member_id,
        permission,
        department,
        expires_at,
        updated_at
      FROM record_permissions
      WHERE workspace_id = ?
        AND id = ?
        AND entity_type = ?
        AND entity_id = ?
        AND member_id = ?
        AND permission = ?
      LIMIT 1
    `).bind(workspaceId, permissionId, entityType, entityId, memberId, permission).first<RecordPermissionRow>();

    if (!row) {
      return {
        ok: false,
        persistence: "d1_record_permissions",
        error: "record_permission_not_found",
        status: 404,
      };
    }

    const timestamp = new Date().toISOString();
    const statements = [
      recordPermissionRevokeAssertion(db, row),
      db.prepare(`
        DELETE FROM record_permissions
        WHERE workspace_id = ?
          AND id = ?
          AND entity_type = ?
          AND entity_id = ?
          AND member_id = ?
          AND permission = ?
          AND updated_at = ?
      `).bind(workspaceId, permissionId, entityType, entityId, memberId, permission, row.updated_at ?? ""),
      auditEventInsertStatement(
        db,
        `audit_record_permission_revoke_${crypto.randomUUID()}`,
        workspaceId,
        entityType === "project" ? entityId : null,
        actorMemberId,
        "record_permission.revoked",
        {
          permissionId,
          entityType,
          entityId,
          memberId,
          permission,
          department: row.department,
          expiresAt: row.expires_at,
          persistence: "d1_record_permissions",
        },
        timestamp,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("record permission revoke batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_record_permissions",
      auditPersistence: "d1_audit_events",
      permission: recordPermissionSummaryFromRow(row),
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "record_permission_revoke_unavailable", status: 503 };
  }
}

function recordPermissionIdentityAssertion(
  db: D1Database,
  workspaceId: string,
  entityType: RecordPermissionEntityType,
  entityId: string,
  memberId: string,
  permission: RecordPermissionLevel,
  expectedId: string | null,
): D1PreparedStatement {
  const expectation = expectedId === null
    ? `NOT EXISTS (
        SELECT 1 FROM record_permissions
        WHERE workspace_id = ? AND entity_type = ? AND entity_id = ? AND member_id = ? AND permission = ?
      )`
    : `EXISTS (
        SELECT 1 FROM record_permissions
        WHERE workspace_id = ? AND entity_type = ? AND entity_id = ? AND member_id = ? AND permission = ? AND id = ?
      )`;
  return db.prepare(`
    SELECT CASE
      WHEN ${expectation}
      THEN 1 ELSE abs(-9223372036854775808)
    END AS record_permission_identity_assertion
  `).bind(workspaceId, entityType, entityId, memberId, permission, ...(expectedId === null ? [] : [expectedId]));
}

function recordPermissionRevokeAssertion(db: D1Database, row: RecordPermissionRow): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM record_permissions
        WHERE workspace_id = ?
          AND id = ?
          AND entity_type = ?
          AND entity_id = ?
          AND member_id = ?
          AND permission = ?
          AND updated_at = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS record_permission_revoke_assertion
  `).bind(
    row.workspace_id,
    row.id,
    row.entity_type,
    row.entity_id,
    row.member_id,
    row.permission,
    row.updated_at ?? "",
  );
}

async function listRecordPermissionManifest(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: RecordPermissionEntityType,
  entityId: string,
  limit: number,
  mode: RecordPermissionManifestMode,
): Promise<RecordPermissionManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      permissions: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const now = new Date().toISOString();
    const expirationPredicate = mode === "expired"
      ? "expires_at IS NOT NULL AND expires_at <= ?"
      : "(expires_at IS NULL OR expires_at > ?)";
    const orderBy = mode === "expired"
      ? "expires_at DESC, member_id ASC, permission ASC"
      : "member_id ASC, permission ASC";
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        entity_type,
        entity_id,
        member_id,
        permission,
        department,
        expires_at
      FROM record_permissions
      WHERE workspace_id = ?
        AND entity_type = ?
        AND entity_id = ?
        AND ${expirationPredicate}
      ORDER BY ${orderBy}
      LIMIT ?
    `).bind(workspaceId, entityType, entityId, now, limit + 1).all<RecordPermissionRow>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);

    return {
      persistence: "d1_record_permissions",
      permissions: visibleRows.map(recordPermissionSummaryFromRow),
      rowCount: visibleRows.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      permissions: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

async function transferRecordOwner(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  memberId: string,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: RecordOwnerPersistence;
    auditPersistence: AuditPersistence;
    owner: RecordOwnerSummary;
  }
  | { ok: false; persistence: RecordOwnerPersistence; error: string; status: number }
> {
  const dryRunOwner: RecordOwnerSummary = {
    workspaceId,
    entityType,
    entityId,
    ownerMemberId: memberId,
    previousOwnerMemberId: null,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      owner: dryRunOwner,
    };
  }

  try {
    const member = await findWorkspaceMemberById(db, memberId);
    if (!member || member.workspace_id !== workspaceId) {
      return {
        ok: false,
        persistence: "d1_record_owner",
        error: "member_not_found",
        status: 404,
      };
    }
    if (normalizeWorkspaceMemberStatus(member.status) !== "active") {
      return {
        ok: false,
        persistence: "d1_record_owner",
        error: "member_not_active",
        status: 403,
      };
    }

    const tableName = coreRecordOwnerTableName(entityType);
    const row = await db.prepare(`
      SELECT id, workspace_id, owner_member_id
      FROM ${tableName}
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(workspaceId, entityId).first<CoreRecordOwnerRow>();
    if (!row) {
      return {
        ok: false,
        persistence: "d1_record_owner",
        error: "record_not_found",
        status: 404,
      };
    }

    const timestamp = new Date().toISOString();
    const statements = [
      workspaceMemberStatusAssertion(db, workspaceId, memberId, member.role, "active"),
      coreRecordOwnerAssertion(db, tableName, workspaceId, entityId, row.owner_member_id),
      db.prepare(`
        UPDATE ${tableName}
        SET owner_member_id = ?
        WHERE workspace_id = ?
          AND id = ?
          AND owner_member_id IS ?
      `).bind(memberId, workspaceId, entityId, row.owner_member_id),
      auditEventInsertStatement(
        db,
        `audit_record_owner_transfer_${crypto.randomUUID()}`,
        workspaceId,
        entityType === "project" ? entityId : null,
        actorMemberId,
        "record_owner.transferred",
        {
          entityType,
          entityId,
          memberId,
          previousOwnerMemberId: row.owner_member_id,
          persistence: "d1_record_owner",
        },
        timestamp,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[2]?.meta?.changes ?? 0) !== 1
      || Number(results[3]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("record owner transfer batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_record_owner",
      auditPersistence: "d1_audit_events",
      owner: {
        workspaceId,
        entityType,
        entityId,
        ownerMemberId: memberId,
        previousOwnerMemberId: row.owner_member_id,
      },
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "record_owner_transfer_unavailable", status: 503 };
  }
}

function coreRecordOwnerAssertion(
  db: D1Database,
  tableName: ReturnType<typeof coreRecordOwnerTableName>,
  workspaceId: string,
  entityId: string,
  expectedOwnerMemberId: string | null,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM ${tableName}
        WHERE workspace_id = ?
          AND id = ?
          AND owner_member_id IS ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS record_owner_assertion
  `).bind(workspaceId, entityId, expectedOwnerMemberId);
}

async function readRecordOwnerManifest(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
): Promise<
  | { ok: true; persistence: RecordOwnerPersistence; owner: RecordOwnerManifestEntry }
  | { ok: false; persistence: RecordOwnerPersistence; error: string; status: number }
> {
  const dryRunOwner: RecordOwnerManifestEntry = {
    workspaceId,
    entityType,
    entityId,
    ownerMemberId: null,
  };

  if (!db) {
    return { ok: true, persistence: "dry_run_memoryless", owner: dryRunOwner };
  }

  try {
    const tableName = coreRecordOwnerTableName(entityType);
    const row = await db.prepare(`
      SELECT id, workspace_id, owner_member_id
      FROM ${tableName}
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `).bind(workspaceId, entityId).first<CoreRecordOwnerRow>();
    if (!row) {
      return {
        ok: false,
        persistence: "d1_record_owner",
        error: "record_not_found",
        status: 404,
      };
    }

    return {
      ok: true,
      persistence: "d1_record_owner",
      owner: {
        workspaceId,
        entityType,
        entityId,
        ownerMemberId: row.owner_member_id,
      },
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "record_owner_unavailable", status: 503 };
  }
}

async function listRecordOwnerHistory(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  limit: number,
): Promise<RecordOwnerHistoryResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      entries: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        actor_member_id,
        metadata_json,
        created_at
      FROM audit_events
      WHERE workspace_id = ?
        AND action = 'record_owner.transferred'
        AND json_extract(metadata_json, '$.entityType') = ?
        AND json_extract(metadata_json, '$.entityId') = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, entityType, entityId, limit + 1).all<RecordOwnerHistoryRow>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);
    const entries = visibleRows
      .map(recordOwnerHistoryEntry)
      .filter((entry): entry is RecordOwnerHistoryEntry => entry !== null);
    return {
      persistence: "d1_audit_events",
      entries,
      rowCount: entries.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      entries: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

function recordOwnerHistoryEntry(row: RecordOwnerHistoryRow): RecordOwnerHistoryEntry | null {
  try {
    const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
    const ownerMemberId = metadata.memberId;
    const previousOwnerMemberId = metadata.previousOwnerMemberId;
    if (typeof ownerMemberId !== "string" || !ownerMemberId) return null;
    return {
      id: row.id,
      actorMemberId: row.actor_member_id,
      ownerMemberId,
      previousOwnerMemberId: typeof previousOwnerMemberId === "string" && previousOwnerMemberId
        ? previousOwnerMemberId
        : null,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

async function listRecordPermissionHistory(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: RecordPermissionHistoryEntityType,
  entityId: string,
  limit: number,
): Promise<RecordPermissionHistoryResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      entries: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      FROM audit_events
      WHERE workspace_id = ?
        AND action IN ('record_permission.assigned', 'record_permission.revoked')
        AND json_extract(metadata_json, '$.entityType') = ?
        AND json_extract(metadata_json, '$.entityId') = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, entityType, entityId, limit + 1).all<RecordPermissionHistoryRow>();
    const allRows = rows.results ?? [];
    const entries = allRows
      .slice(0, limit)
      .map(recordPermissionHistoryEntry)
      .filter((entry): entry is RecordPermissionHistoryEntry => entry !== null);
    return {
      persistence: "d1_audit_events",
      entries,
      rowCount: entries.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      entries: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

function recordPermissionHistoryEntry(row: RecordPermissionHistoryRow): RecordPermissionHistoryEntry | null {
  if (row.action !== "record_permission.assigned" && row.action !== "record_permission.revoked") return null;
  try {
    const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
    const memberId = metadata.memberId;
    const permission = metadata.permission;
    const department = metadata.department;
    const expiresAt = metadata.expiresAt;
    if (typeof memberId !== "string" || !memberId || typeof permission !== "string" || !isRecordPermissionLevel(permission)) return null;
    return {
      id: row.id,
      action: row.action,
      actorMemberId: row.actor_member_id,
      memberId,
      permission,
      department: typeof department === "string" && department ? department : null,
      expiresAt: typeof expiresAt === "string" && expiresAt ? expiresAt : null,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

async function authorizeRecordCommentIntent(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: RecordCommentEntityType,
  entityId: string,
  role: AuthRole,
  memberId: string | null,
): Promise<
  | { ok: true }
  | { ok: false; persistence: RecordPermissionPersistence | RecordCommentPersistence; error: string; status: number }
> {
  if (role === "owner" || role === "producer") {
    return { ok: true };
  }
  if (!db) {
    return { ok: true };
  }
  if (!memberId) {
    return {
      ok: false,
      persistence: "d1_record_permissions",
      error: "record_comment_permission_required",
      status: 403,
    };
  }

  try {
    const ownerCanComment = await recordOwnedByMember(db, workspaceId, entityType, entityId, memberId);
    if (ownerCanComment) return { ok: true };

    const permission = await recordCommentPermissionFor(db, workspaceId, entityType, entityId, memberId);
    if (permission) return { ok: true };

    return {
      ok: false,
      persistence: "d1_record_permissions",
      error: "record_comment_permission_required",
      status: 403,
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_comment_authorization_unavailable",
      status: 503,
    };
  }
}

async function authorizeRecordMutationPreflight(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  mutation: RecordMutationKind,
  role: AuthRole,
  memberId: string | null,
): Promise<
  | { ok: true; persistence: RecordMutationPreflightPersistence; preflight: RecordMutationPreflightSummary }
  | { ok: false; persistence: RecordPermissionPersistence | RecordMutationPreflightPersistence; error: string; status: number }
> {
  const persistence: RecordMutationPreflightPersistence = db ? "d1_record_mutation_authorization" : "dry_run_memoryless";
  const allowed = (allowedBy: RecordMutationAllowedBy): { ok: true; persistence: RecordMutationPreflightPersistence; preflight: RecordMutationPreflightSummary } => ({
    ok: true,
    persistence,
    preflight: {
      workspaceId,
      entityType,
      entityId,
      mutation,
      allowedBy,
    },
  });

  if (role === "owner" || role === "producer") {
    return allowed("owner_producer");
  }
  if (!db) {
    return allowed("dry_run_memoryless");
  }
  if (mutation === "delete") {
    return {
      ok: false,
      persistence,
      error: "record_delete_operator_required",
      status: 403,
    };
  }
  if (entityType === "person" || entityType === "expense") {
    return {
      ok: false,
      persistence,
      error: "sensitive_record_update_operator_required",
      status: 403,
    };
  }
  if (!memberId) {
    return {
      ok: false,
      persistence: "d1_record_permissions",
      error: "record_write_permission_required",
      status: 403,
    };
  }

  try {
    const ownerCanUpdate = await recordOwnedByMember(db, workspaceId, entityType, entityId, memberId);
    if (ownerCanUpdate) return allowed("record_owner");

    const permission = await recordWritePermissionFor(db, workspaceId, entityType, entityId, memberId);
    if (permission) return allowed("write_permission");

    return {
      ok: false,
      persistence: "d1_record_permissions",
      error: "record_write_permission_required",
      status: 403,
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_mutation_authorization_unavailable",
      status: 503,
    };
  }
}

async function createRecordMutationRequest(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  mutation: RecordMutationKind,
  actorMemberId: string | null,
  allowedBy: RecordMutationAllowedBy,
  summary: string,
  fieldKeys: string[],
  auditAction: "record_mutation.request_created" | "record_mutation.rollback_requested" = "record_mutation.request_created",
  sourceRequestId: string | null = null,
): Promise<
  | {
    ok: true;
    persistence: RecordMutationRequestPersistence;
    auditPersistence: AuditPersistence;
    request: RecordMutationRequestSummary;
  }
  | { ok: false; persistence: RecordMutationRequestPersistence; error: string; status: number }
> {
  const createdAt = new Date().toISOString();
  const request: RecordMutationRequestSummary = {
    id: `mutation_request_${crypto.randomUUID()}`,
    workspaceId,
    entityType,
    entityId,
    mutation,
    actorMemberId,
    allowedBy,
    status: "pending_owner_producer_review",
    summaryPreview: summary.replace(/\s+/g, " ").slice(0, 240),
    summarySha256: await sha256Hex(summary),
    fieldKeys,
    expectedUpdatedAt: null,
    resolvedByMemberId: null,
    resolvedAt: null,
    resolutionNotePreview: null,
    resolutionNoteSha256: null,
    appliedByMemberId: null,
    appliedAt: null,
    application: null,
    destructiveWrite: false,
    createdAt,
    updatedAt: createdAt,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      request,
    };
  }

  try {
    const snapshot = await readCoreRecordMutationSnapshot(db, workspaceId, entityType, entityId);
    if (!snapshot.ok) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: snapshot.error,
        status: snapshot.status,
      };
    }
    request.expectedUpdatedAt = snapshot.record.updatedAt;

    const auditMetadata = {
      requestId: request.id,
      ...(sourceRequestId ? { sourceRequestId } : {}),
      entityType,
      entityId,
      mutation,
      allowedBy,
      status: request.status,
      summaryPreview: request.summaryPreview,
      summarySha256: request.summarySha256,
      fieldKeys,
      expectedUpdatedAt: request.expectedUpdatedAt,
      destructiveWrite: false,
      persistence: "d1_record_mutation_requests",
    };
    const statements = [
      coreRecordMutationTargetAssertion(db, entityType, workspaceId, entityId, request.expectedUpdatedAt),
      db.prepare(`
        INSERT INTO record_mutation_requests (
          id,
          workspace_id,
          entity_type,
          entity_id,
          mutation,
          actor_member_id,
          allowed_by,
          status,
          summary_preview,
          summary_sha256,
          field_keys_json,
          expected_updated_at,
          destructive_write,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_owner_producer_review', ?, ?, ?, ?, 0, ?, ?)
      `).bind(
        request.id,
        workspaceId,
        entityType,
        entityId,
        mutation,
        actorMemberId,
        allowedBy,
        request.summaryPreview,
        request.summarySha256,
        JSON.stringify(fieldKeys),
        request.expectedUpdatedAt,
        createdAt,
        createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_record_mutation_request_${request.id}`,
        workspaceId,
        entityType === "project" ? entityId : null,
        actorMemberId,
        auditAction,
        auditMetadata,
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("record mutation request batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_record_mutation_requests",
      auditPersistence: "d1_audit_events",
      request,
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "record_mutation_request_unavailable", status: 503 };
  }
}

async function createFilmProfileMutationRequest(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
  actorMemberId: string | null,
  summary: string,
  fieldKeys: FilmProfileMutationFieldKey[],
): Promise<
  | {
    ok: true;
    persistence: FilmProfileMutationRequestPersistence;
    auditPersistence: AuditPersistence;
    request: FilmProfileMutationRequestSummary;
  }
  | { ok: false; persistence: FilmProfileMutationRequestPersistence; error: string; status: number }
> {
  const createdAt = new Date().toISOString();
  const request: FilmProfileMutationRequestSummary = {
    id: `profile_mutation_request_${crypto.randomUUID()}`,
    workspaceId,
    projectId,
    mutation: "update",
    actorMemberId,
    allowedBy: db ? "owner_producer" : "dry_run_memoryless",
    status: "pending_owner_producer_review",
    summaryPreview: summary.replace(/\s+/g, " ").slice(0, 240),
    summarySha256: await sha256Hex(summary),
    fieldKeys,
    expectedUpdatedAt: null,
    resolvedByMemberId: null,
    resolvedAt: null,
    resolutionNotePreview: null,
    resolutionNoteSha256: null,
    appliedByMemberId: null,
    appliedAt: null,
    application: null,
    destructiveWrite: false,
    createdAt,
    updatedAt: createdAt,
  };

  if (!db) {
    const snapshot = await readFilmProfileMutationSnapshot(undefined, workspaceId, projectId);
    if (!snapshot.ok) {
      return { ok: false, persistence: "dry_run_memoryless", error: snapshot.error, status: snapshot.status };
    }
    request.expectedUpdatedAt = snapshot.profile.expectedUpdatedAt;
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      request,
    };
  }

  try {
    const snapshot = await readFilmProfileMutationSnapshot(db, workspaceId, projectId);
    if (!snapshot.ok) {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: snapshot.error,
        status: snapshot.status,
      };
    }
    if (snapshot.persistence !== "d1_film_profile_stale_check") {
      return {
        ok: false,
        persistence: "d1_unavailable_dry_run",
        error: "film_profile_mutation_request_unavailable",
        status: 503,
      };
    }
    request.expectedUpdatedAt = snapshot.profile.expectedUpdatedAt;

    const statements = [
      projectWorkspaceAssertion(db, workspaceId, projectId),
      filmProfileMutationTargetAssertion(db, projectId, request.expectedUpdatedAt),
      db.prepare(`
        INSERT INTO film_profile_mutation_requests (
          id,
          workspace_id,
          project_id,
          actor_member_id,
          status,
          summary_preview,
          summary_sha256,
          field_keys_json,
          expected_updated_at,
          destructive_write,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'pending_owner_producer_review', ?, ?, ?, ?, 0, ?, ?)
      `).bind(
        request.id,
        workspaceId,
        projectId,
        actorMemberId,
        request.summaryPreview,
        request.summarySha256,
        JSON.stringify(fieldKeys),
        request.expectedUpdatedAt,
        createdAt,
        createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_film_profile_mutation_request_${request.id}`,
        workspaceId,
        projectId,
        actorMemberId,
        "film_profile_mutation.request_created",
        {
          requestId: request.id,
          projectId,
          status: request.status,
          summaryPreview: request.summaryPreview,
          summarySha256: request.summarySha256,
          fieldKeys,
          expectedUpdatedAt: request.expectedUpdatedAt,
          destructiveWrite: false,
          persistence: "d1_film_profile_mutation_requests",
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[2]?.meta?.changes ?? 0) !== 1
      || Number(results[3]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("film profile mutation request batch did not apply exactly once");
    }

    return {
      ok: true,
      persistence: "d1_film_profile_mutation_requests",
      auditPersistence: "d1_audit_events",
      request,
    };
  } catch {
    return { ok: false, persistence: "d1_unavailable_dry_run", error: "film_profile_mutation_request_unavailable", status: 503 };
  }
}

async function listFilmProfileMutationRequests(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
  limit: number,
): Promise<FilmProfileMutationRequestManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      requests: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        project_id,
        actor_member_id,
        status,
        summary_preview,
        summary_sha256,
        field_keys_json,
        expected_updated_at,
        resolved_by_member_id,
        resolved_at,
        resolution_note_preview,
        resolution_note_sha256,
        applied_by_member_id,
        applied_at,
        application_json,
        destructive_write,
        created_at,
        updated_at
      FROM film_profile_mutation_requests
      WHERE workspace_id = ?
        AND project_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, projectId, limit + 1).all<FilmProfileMutationRequestRow>();
    const allRows = rows.results ?? [];
    const requests = allRows
      .slice(0, limit)
      .map(filmProfileMutationRequestFromRow)
      .filter((request): request is FilmProfileMutationRequestSummary => request !== null);
    return {
      persistence: "d1_film_profile_mutation_requests",
      requests,
      rowCount: requests.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      requests: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

async function resolveFilmProfileMutationRequest(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
  decision: RecordMutationResolutionDecision,
  actorMemberId: string | null,
  note: string,
): Promise<
  | {
    ok: true;
    persistence: FilmProfileMutationRequestPersistence;
    auditPersistence: AuditPersistence;
    request: FilmProfileMutationRequestSummary;
  }
  | { ok: false; persistence: FilmProfileMutationRequestPersistence; error: string; status: number }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "film_profile_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readFilmProfileMutationRequestRow(db, workspaceId, requestId);
    if (!row) {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_request_not_found",
        status: 404,
      };
    }
    if (row.status !== "pending_owner_producer_review") {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_request_not_pending",
        status: 409,
      };
    }

    const resolvedAt = new Date().toISOString();
    const notePreview = note ? note.replace(/\s+/g, " ").slice(0, 240) : null;
    const noteSha256 = note ? await sha256Hex(note) : null;
    const status = decision === "approve" ? "approved_pending_apply" : "rejected";
    const request = filmProfileMutationRequestFromRow({
      ...row,
      status,
      resolved_by_member_id: actorMemberId,
      resolved_at: resolvedAt,
      resolution_note_preview: notePreview,
      resolution_note_sha256: noteSha256,
      updated_at: resolvedAt,
    });
    if (!request) {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_request_not_found",
        status: 404,
      };
    }
    const statements = [
      mutationRequestExactStatusAssertion(
        db,
        "film_profile_mutation_requests",
        workspaceId,
        requestId,
        "pending_owner_producer_review",
      ),
      db.prepare(`
        UPDATE film_profile_mutation_requests
        SET
          status = ?,
          resolved_by_member_id = ?,
          resolved_at = ?,
          resolution_note_preview = ?,
          resolution_note_sha256 = ?,
          updated_at = ?
        WHERE workspace_id = ?
          AND id = ?
          AND status = 'pending_owner_producer_review'
      `).bind(status, actorMemberId, resolvedAt, notePreview, noteSha256, resolvedAt, workspaceId, requestId),
      auditEventInsertStatement(
        db,
        `audit_film_profile_mutation_resolution_${requestId}`,
        workspaceId,
        request.projectId,
        actorMemberId,
        decision === "approve" ? "film_profile_mutation.request_approved" : "film_profile_mutation.request_rejected",
        {
          requestId,
          projectId: request.projectId,
          status: request.status,
          noteSha256: request.resolutionNoteSha256,
          destructiveWrite: false,
          persistence: "d1_film_profile_mutation_requests",
        },
        resolvedAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("film profile mutation resolution batch did not apply exactly once");
    }
    return {
      ok: true,
      persistence: "d1_film_profile_mutation_requests",
      auditPersistence: "d1_audit_events",
      request,
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "film_profile_mutation_request_resolution_unavailable",
      status: 503,
    };
  }
}

async function prepareFilmProfileMutationChanges(
  db: D1Database,
  workspaceId: string,
  request: FilmProfileMutationRequestSummary,
  value: unknown,
): Promise<
  | {
      ok: true;
      updates: RecordMutationFieldUpdate[];
      fieldDiffs: RecordMutationFieldDiff[];
      expectedUpdatedAt: string | null;
    }
  | { ok: false; error: string; status: number }
> {
  const normalized = normalizeFilmProfileMutationUpdates(request.fieldKeys, value);
  if (!normalized.ok) return { ok: false, error: normalized.error, status: 422 };

  const valueSnapshot = await readFilmProfileMutationValueSnapshot(
    db,
    workspaceId,
    request.projectId,
    normalized.updates,
  );
  if (!valueSnapshot.ok) return valueSnapshot;

  return {
    ok: true,
    updates: normalized.updates,
    fieldDiffs: createRecordMutationFieldDiffs(normalized.updates, valueSnapshot.values),
    expectedUpdatedAt: valueSnapshot.expectedUpdatedAt,
  };
}

async function previewFilmProfileMutationRequestDiff(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
  updates: unknown,
): Promise<
  | { ok: true; persistence: FilmProfileMutationRequestPersistence; preview: FilmProfileMutationDiffPreviewSummary }
  | { ok: false; persistence: FilmProfileMutationRequestPersistence; error: string; status: number; request?: FilmProfileMutationRequestSummary }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "film_profile_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readFilmProfileMutationRequestRow(db, workspaceId, requestId);
    const request = row ? filmProfileMutationRequestFromRow(row) : null;
    if (!row || !request) {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_request_not_found",
        status: 404,
      };
    }
    if (request.status !== "approved_pending_apply") {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_request_not_approved",
        status: 409,
        request,
      };
    }

    const preparedChanges = await prepareFilmProfileMutationChanges(db, workspaceId, request, updates);
    if (!preparedChanges.ok) {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: preparedChanges.error,
        status: preparedChanges.status,
        request,
      };
    }

    return {
      ok: true,
      persistence: "d1_film_profile_mutation_requests",
      preview: {
        request,
        stale: preparedChanges.expectedUpdatedAt !== request.expectedUpdatedAt,
        currentUpdatedAt: preparedChanges.expectedUpdatedAt,
        expectedUpdatedAt: request.expectedUpdatedAt,
        fieldDiffs: preparedChanges.fieldDiffs,
        rollbackGuidance: recordMutationRollbackGuidance(
          "update",
          preparedChanges.fieldDiffs.map((diff) => diff.key),
        ),
      },
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "film_profile_mutation_diff_preview_unavailable",
      status: 503,
    };
  }
}

async function applyFilmProfileMutationRequest(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
  updates: unknown,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: FilmProfileMutationRequestPersistence;
    auditPersistence: "d1_audit_events";
    request: FilmProfileMutationRequestSummary;
    application: RecordMutationApplicationSummary;
  }
  | {
    ok: false;
    persistence: FilmProfileMutationRequestPersistence;
    error: string;
    status: number;
    request?: FilmProfileMutationRequestSummary;
  }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "film_profile_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readFilmProfileMutationRequestRow(db, workspaceId, requestId);
    const request = row ? filmProfileMutationRequestFromRow(row) : null;
    if (!row || !request) {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_request_not_found",
        status: 404,
      };
    }

    if (request.status === "applied") {
      const idempotentApplication = request.application
        ? { ...request.application, idempotent: true }
        : {
          action: "update" as const,
          applied: true,
          idempotent: true,
          fieldKeys: request.fieldKeys,
          previousUpdatedAt: request.expectedUpdatedAt,
          updatedAt: request.appliedAt,
          deletedAt: null,
          fieldDiffs: [],
          rollbackGuidance: recordMutationRollbackGuidance("update", request.fieldKeys),
        };
      return {
        ok: true,
        persistence: "d1_film_profile_mutation_requests",
        auditPersistence: "d1_audit_events",
        request,
        application: idempotentApplication,
      };
    }

    if (request.status !== "approved_pending_apply") {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_request_not_approved",
        status: 409,
        request,
      };
    }

    const preparedChanges = await prepareFilmProfileMutationChanges(db, workspaceId, request, updates);
    if (!preparedChanges.ok) {
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: preparedChanges.error,
        status: preparedChanges.status,
        request,
      };
    }

    if (preparedChanges.expectedUpdatedAt !== request.expectedUpdatedAt) {
      const staleRequest = await markFilmProfileMutationRequestStale(
        db,
        workspaceId,
        requestId,
        actorMemberId,
        preparedChanges.expectedUpdatedAt,
      );
      return {
        ok: false,
        persistence: "d1_film_profile_mutation_requests",
        error: "film_profile_mutation_stale",
        status: 409,
        request: staleRequest ?? request,
      };
    }

    const appliedAt = new Date().toISOString();
    const application: RecordMutationApplicationSummary = {
      action: "update",
      applied: true,
      idempotent: false,
      fieldKeys: preparedChanges.updates.map((update) => update.key),
      previousUpdatedAt: preparedChanges.expectedUpdatedAt,
      updatedAt: appliedAt,
      deletedAt: null,
      fieldDiffs: preparedChanges.fieldDiffs,
      rollbackGuidance: recordMutationRollbackGuidance(
        "update",
        preparedChanges.fieldDiffs.map((diff) => diff.key),
      ),
    };

    const writeApplied = await commitFilmProfileMutationApplication(
      db,
      workspaceId,
      requestId,
      request.projectId,
      preparedChanges.updates,
      preparedChanges.expectedUpdatedAt,
      actorMemberId,
      application,
      appliedAt,
    );
    if (!writeApplied) {
      const currentSnapshot = await readFilmProfileMutationValueSnapshot(
        db,
        workspaceId,
        request.projectId,
        preparedChanges.updates,
      );
      if (currentSnapshot.ok && currentSnapshot.expectedUpdatedAt !== preparedChanges.expectedUpdatedAt) {
        const staleRequest = await markFilmProfileMutationRequestStale(
          db,
          workspaceId,
          requestId,
          actorMemberId,
          currentSnapshot.expectedUpdatedAt,
        );
        return {
          ok: false,
          persistence: "d1_film_profile_mutation_requests",
          error: "film_profile_mutation_stale",
          status: 409,
          request: staleRequest ?? request,
        };
      }
      return {
        ok: false,
        persistence: "d1_unavailable_dry_run",
        error: "film_profile_mutation_application_unavailable",
        status: 503,
        request,
      };
    }

    return {
      ok: true,
      persistence: "d1_film_profile_mutation_requests",
      auditPersistence: "d1_audit_events",
      request: { ...request, status: "applied", appliedByMemberId: actorMemberId, appliedAt, application, destructiveWrite: true, updatedAt: appliedAt },
      application,
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "film_profile_mutation_application_unavailable",
      status: 503,
    };
  }
}

async function listRecordMutationRequests(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  limit: number,
): Promise<RecordMutationRequestManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      requests: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        entity_type,
        entity_id,
        mutation,
        actor_member_id,
        allowed_by,
        status,
        summary_preview,
        summary_sha256,
        field_keys_json,
        expected_updated_at,
        resolved_by_member_id,
        resolved_at,
        resolution_note_preview,
        resolution_note_sha256,
        applied_by_member_id,
        applied_at,
        application_json,
        destructive_write,
        created_at,
        updated_at
      FROM record_mutation_requests
      WHERE workspace_id = ?
        AND entity_type = ?
        AND entity_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, entityType, entityId, limit + 1).all<RecordMutationRequestRow>();
    const allRows = rows.results ?? [];
    const requests = allRows
      .slice(0, limit)
      .map(recordMutationRequestFromRow)
      .filter((request): request is RecordMutationRequestSummary => request !== null);
    return {
      persistence: "d1_record_mutation_requests",
      requests,
      rowCount: requests.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      requests: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

async function resolveRecordMutationRequest(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
  decision: RecordMutationResolutionDecision,
  actorMemberId: string | null,
  note: string,
): Promise<
  | {
    ok: true;
    persistence: RecordMutationRequestPersistence;
    auditPersistence: AuditPersistence;
    request: RecordMutationRequestSummary;
  }
  | { ok: false; persistence: RecordMutationRequestPersistence; error: string; status: number }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "record_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readRecordMutationRequestRow(db, workspaceId, requestId);
    if (!row) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_found",
        status: 404,
      };
    }
    if (row.status !== "pending_owner_producer_review") {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_pending",
        status: 409,
      };
    }

    const resolvedAt = new Date().toISOString();
    const notePreview = note ? note.replace(/\s+/g, " ").slice(0, 240) : null;
    const noteSha256 = note ? await sha256Hex(note) : null;
    const status = decision === "approve" ? "approved_pending_apply" : "rejected";
    const request = recordMutationRequestFromRow({
      ...row,
      status,
      resolved_by_member_id: actorMemberId,
      resolved_at: resolvedAt,
      resolution_note_preview: notePreview,
      resolution_note_sha256: noteSha256,
      updated_at: resolvedAt,
    });
    if (!request) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_found",
        status: 404,
      };
    }
    const statements = [
      mutationRequestExactStatusAssertion(
        db,
        "record_mutation_requests",
        workspaceId,
        requestId,
        "pending_owner_producer_review",
      ),
      db.prepare(`
        UPDATE record_mutation_requests
        SET
          status = ?,
          resolved_by_member_id = ?,
          resolved_at = ?,
          resolution_note_preview = ?,
          resolution_note_sha256 = ?,
          updated_at = ?
        WHERE workspace_id = ?
          AND id = ?
          AND status = 'pending_owner_producer_review'
      `).bind(status, actorMemberId, resolvedAt, notePreview, noteSha256, resolvedAt, workspaceId, requestId),
      auditEventInsertStatement(
        db,
        `audit_record_mutation_resolution_${requestId}`,
        workspaceId,
        request.entityType === "project" ? request.entityId : null,
        actorMemberId,
        decision === "approve" ? "record_mutation.request_approved" : "record_mutation.request_rejected",
        {
          requestId,
          entityType: request.entityType,
          entityId: request.entityId,
          mutation: request.mutation,
          status: request.status,
          noteSha256: request.resolutionNoteSha256,
          destructiveWrite: false,
          persistence: "d1_record_mutation_requests",
        },
        resolvedAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("record mutation resolution batch did not apply exactly once");
    }
    return {
      ok: true,
      persistence: "d1_record_mutation_requests",
      auditPersistence: "d1_audit_events",
      request,
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_mutation_request_resolution_unavailable",
      status: 503,
    };
  }
}

async function prepareRecordMutationChanges(
  db: D1Database,
  workspaceId: string,
  request: RecordMutationRequestSummary,
  value: unknown,
): Promise<
  | { ok: true; updates: RecordMutationFieldUpdate[]; fieldDiffs: RecordMutationFieldDiff[] }
  | { ok: false; error: string; status: number }
> {
  const normalized = request.mutation === "update"
    ? normalizeRecordMutationUpdates(request.entityType, request.fieldKeys, value)
    : { ok: true as const, updates: [] as RecordMutationFieldUpdate[] };
  if (!normalized.ok) return { ok: false, error: normalized.error, status: 422 };

  if (request.mutation === "delete") {
    return { ok: true, updates: normalized.updates, fieldDiffs: createRecordMutationDeleteDiff() };
  }

  const relationshipValidation = await validateRecordMutationRelationships(
    db,
    workspaceId,
    request.entityType,
    request.entityId,
    normalized.updates,
  );
  if (!relationshipValidation.ok) return relationshipValidation;

  const valueSnapshot = await readCoreRecordMutationValueSnapshot(
    db,
    workspaceId,
    request.entityType,
    request.entityId,
    normalized.updates,
  );
  if (!valueSnapshot.ok) return valueSnapshot;

  return {
    ok: true,
    updates: normalized.updates,
    fieldDiffs: createRecordMutationFieldDiffs(normalized.updates, valueSnapshot.record.values),
  };
}

async function previewRecordMutationRequestDiff(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
  updates: unknown,
): Promise<
  | { ok: true; persistence: RecordMutationRequestPersistence; preview: RecordMutationDiffPreviewSummary }
  | { ok: false; persistence: RecordMutationRequestPersistence; error: string; status: number; request?: RecordMutationRequestSummary }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "record_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readRecordMutationRequestRow(db, workspaceId, requestId);
    const request = row ? recordMutationRequestFromRow(row) : null;
    if (!row || !request) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_found",
        status: 404,
      };
    }
    if (request.status !== "approved_pending_apply") {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_approved",
        status: 409,
        request,
      };
    }

    const snapshot = await readCoreRecordMutationSnapshot(db, workspaceId, request.entityType, request.entityId);
    if (!snapshot.ok) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: snapshot.error,
        status: snapshot.status,
        request,
      };
    }

    const preparedChanges = await prepareRecordMutationChanges(db, workspaceId, request, updates);
    if (!preparedChanges.ok) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: preparedChanges.error,
        status: preparedChanges.status,
        request,
      };
    }

    return {
      ok: true,
      persistence: "d1_record_mutation_requests",
      preview: {
        request,
        stale: snapshot.record.updatedAt !== request.expectedUpdatedAt,
        currentUpdatedAt: snapshot.record.updatedAt,
        expectedUpdatedAt: request.expectedUpdatedAt,
        fieldDiffs: preparedChanges.fieldDiffs,
        rollbackGuidance: recordMutationRollbackGuidance(
          request.mutation,
          preparedChanges.fieldDiffs.map((diff) => diff.key),
        ),
      },
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_mutation_diff_preview_unavailable",
      status: 503,
    };
  }
}

async function createRecordMutationRollbackRequest(
  db: D1Database | undefined,
  workspaceId: string,
  sourceRequestId: string,
  actorMemberId: string | null,
  summary: string,
): Promise<
  | {
    ok: true;
    persistence: RecordMutationRequestPersistence;
    auditPersistence: AuditPersistence;
    rollback: RecordMutationRollbackRequestSummary;
  }
  | { ok: false; persistence: RecordMutationRequestPersistence; error: string; status: number; sourceRequest?: RecordMutationRequestSummary }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "record_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readRecordMutationRequestRow(db, workspaceId, sourceRequestId);
    const sourceRequest = row ? recordMutationRequestFromRow(row) : null;
    if (!row || !sourceRequest) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_found",
        status: 404,
      };
    }
    if (sourceRequest.status !== "applied" || !sourceRequest.application?.applied) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_source_not_applied",
        status: 409,
        sourceRequest,
      };
    }
    if (sourceRequest.mutation !== "update") {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_delete_rollback_requires_restore",
        status: 422,
        sourceRequest,
      };
    }

    const fieldDiffs = sourceRequest.application.fieldDiffs.filter((diff) => diff.key !== "record");
    if (fieldDiffs.length === 0) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_rollback_diff_unavailable",
        status: 422,
        sourceRequest,
      };
    }
    const suggestedUpdates = Object.fromEntries(fieldDiffs.map((diff) => [diff.key, diff.before]));
    const rollbackSummary = summary
      || `Rollback ${sourceRequest.id}: ${sourceRequest.summaryPreview}`.replace(/\s+/g, " ").slice(0, 500);
    const rollbackRequest = await createRecordMutationRequest(
      db,
      workspaceId,
      sourceRequest.entityType,
      sourceRequest.entityId,
      "update",
      actorMemberId,
      "owner_producer",
      rollbackSummary,
      fieldDiffs.map((diff) => diff.key),
      "record_mutation.rollback_requested",
      sourceRequest.id,
    );
    if (!rollbackRequest.ok) {
      return rollbackRequest;
    }

    return {
      ok: true,
      persistence: rollbackRequest.persistence,
      auditPersistence: rollbackRequest.auditPersistence,
      rollback: {
        sourceRequest,
        rollbackRequest: rollbackRequest.request,
        suggestedUpdates,
      },
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_mutation_rollback_request_unavailable",
      status: 503,
    };
  }
}

async function createRecordMutationDeleteRecoveryPlan(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
): Promise<
  | { ok: true; persistence: RecordMutationRequestPersistence; sourceRequest: RecordMutationRequestSummary; plan: RecordMutationDeleteRecoveryPlan }
  | { ok: false; persistence: RecordMutationRequestPersistence; error: string; status: number; sourceRequest?: RecordMutationRequestSummary }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "record_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readRecordMutationRequestRow(db, workspaceId, requestId);
    const sourceRequest = row ? recordMutationRequestFromRow(row) : null;
    if (!row || !sourceRequest) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_found",
        status: 404,
      };
    }
    if (sourceRequest.status !== "applied" || !sourceRequest.application?.applied) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_source_not_applied",
        status: 409,
        sourceRequest,
      };
    }
    if (sourceRequest.mutation !== "delete") {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_update_rollback_uses_inverse_request",
        status: 422,
        sourceRequest,
      };
    }

    return {
      ok: true,
      persistence: "d1_record_mutation_requests",
      sourceRequest,
      plan: {
        strategy: "restore_from_backup_or_recreate",
        entityType: sourceRequest.entityType,
        entityId: sourceRequest.entityId,
        deletedAt: sourceRequest.application.deletedAt,
        requiresBackupRestore: true,
        requiresNewRecordApproval: true,
        blockers: [
          "Mutation requests do not store raw deleted row contents.",
          "Recovering a deleted row requires an encrypted backup restore or a future approved recreate flow.",
        ],
        suggestedSteps: [
          "Export the mutation audit manifest to confirm who approved and applied the delete.",
          "Preview a stored encrypted backup from before the delete and restore the affected workspace snapshot if appropriate.",
          "If no suitable backup exists, create a new record through the canonical create/import path and assign ownership/permissions again.",
        ],
      },
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_mutation_delete_recovery_plan_unavailable",
      status: 503,
    };
  }
}

async function listRecordMutationAuditManifest(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
  limit: number,
): Promise<RecordMutationAuditManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      request: null,
      events: [],
      rowCount: 0,
      truncated: false,
      rollbackGuidance: recordMutationRollbackGuidance("update", []),
    };
  }

  try {
    const row = await readRecordMutationRequestRow(db, workspaceId, requestId);
    const request = row ? recordMutationRequestFromRow(row) : null;
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        project_id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      FROM audit_events
      WHERE workspace_id = ?
        AND instr(action, 'record_mutation.') = 1
        AND json_extract(metadata_json, '$.requestId') = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, requestId, limit + 1).all<AuditEventManifestRow>();
    const allRows = rows.results ?? [];
    const events = allRows.slice(0, limit).map(auditEventManifestEntry);
    return {
      persistence: "d1_audit_events",
      request,
      events,
      rowCount: events.length,
      truncated: allRows.length > limit,
      rollbackGuidance: request?.application?.rollbackGuidance ?? recordMutationRollbackGuidance(request?.mutation ?? "update", request?.fieldKeys ?? []),
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      request: null,
      events: [],
      rowCount: 0,
      truncated: false,
      rollbackGuidance: recordMutationRollbackGuidance("update", []),
    };
  }
}

async function applyRecordMutationRequest(
  db: D1Database | undefined,
  workspaceId: string,
  requestId: string,
  updates: unknown,
  actorMemberId: string | null,
): Promise<
  | {
    ok: true;
    persistence: RecordMutationRequestPersistence;
    auditPersistence: "d1_audit_events";
    request: RecordMutationRequestSummary;
    application: RecordMutationApplicationSummary;
  }
  | {
    ok: false;
    persistence: RecordMutationRequestPersistence;
    error: string;
    status: number;
    request?: RecordMutationRequestSummary;
  }
> {
  if (!db) {
    return {
      ok: false,
      persistence: "dry_run_memoryless",
      error: "record_mutation_request_persistence_required",
      status: 503,
    };
  }

  try {
    const row = await readRecordMutationRequestRow(db, workspaceId, requestId);
    const request = row ? recordMutationRequestFromRow(row) : null;
    if (!row || !request) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_found",
        status: 404,
      };
    }

    if (request.status === "applied") {
      const idempotentApplication = request.application
        ? { ...request.application, idempotent: true }
        : {
          action: request.mutation,
          applied: true,
          idempotent: true,
          fieldKeys: request.fieldKeys,
          previousUpdatedAt: request.expectedUpdatedAt,
          updatedAt: request.appliedAt,
          deletedAt: request.mutation === "delete" ? request.appliedAt : null,
          fieldDiffs: [],
          rollbackGuidance: recordMutationRollbackGuidance(request.mutation, request.fieldKeys),
        };
      return {
        ok: true,
        persistence: "d1_record_mutation_requests",
        auditPersistence: "d1_audit_events",
        request,
        application: idempotentApplication,
      };
    }

    if (request.status !== "approved_pending_apply") {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_request_not_approved",
        status: 409,
        request,
      };
    }

    const snapshot = await readCoreRecordMutationSnapshot(db, workspaceId, request.entityType, request.entityId);
    if (!snapshot.ok) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: snapshot.error,
        status: snapshot.status,
        request,
      };
    }

    if (snapshot.record.updatedAt !== request.expectedUpdatedAt) {
      const staleRequest = await markRecordMutationRequestStale(db, workspaceId, requestId, request.mutation, actorMemberId, snapshot.record.updatedAt);
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: "record_mutation_stale",
        status: 409,
        request: staleRequest ?? request,
      };
    }

    const appliedAt = new Date().toISOString();
    const preparedChanges = await prepareRecordMutationChanges(db, workspaceId, request, updates);
    if (!preparedChanges.ok) {
      return {
        ok: false,
        persistence: "d1_record_mutation_requests",
        error: preparedChanges.error,
        status: preparedChanges.status,
        request,
      };
    }

    const application: RecordMutationApplicationSummary = {
      action: request.mutation,
      applied: true,
      idempotent: false,
      fieldKeys: preparedChanges.updates.map((update) => update.key),
      previousUpdatedAt: snapshot.record.updatedAt,
      updatedAt: request.mutation === "update" ? appliedAt : null,
      deletedAt: request.mutation === "delete" ? appliedAt : null,
      fieldDiffs: preparedChanges.fieldDiffs,
      rollbackGuidance: recordMutationRollbackGuidance(
        request.mutation,
        preparedChanges.fieldDiffs.map((diff) => diff.key),
      ),
    };

    const writeApplied = await commitCoreRecordMutationApplication(
      db,
      workspaceId,
      requestId,
      request.entityType,
      request.entityId,
      request.mutation,
      preparedChanges.updates,
      snapshot.record.updatedAt,
      actorMemberId,
      application,
      appliedAt,
    );
    if (!writeApplied) {
      const currentSnapshot = await readCoreRecordMutationSnapshot(db, workspaceId, request.entityType, request.entityId);
      const stale = request.mutation === "delete"
        ? !currentSnapshot.ok
        : !currentSnapshot.ok || currentSnapshot.record.updatedAt !== snapshot.record.updatedAt;
      if (stale) {
        const staleRequest = await markRecordMutationRequestStale(
          db,
          workspaceId,
          requestId,
          request.mutation,
          actorMemberId,
          currentSnapshot.ok ? currentSnapshot.record.updatedAt : null,
        );
        return {
          ok: false,
          persistence: "d1_record_mutation_requests",
          error: "record_mutation_stale",
          status: 409,
          request: staleRequest ?? request,
        };
      }
      return {
        ok: false,
        persistence: "d1_unavailable_dry_run",
        error: "record_mutation_application_unavailable",
        status: 503,
        request,
      };
    }

    return {
      ok: true,
      persistence: "d1_record_mutation_requests",
      auditPersistence: "d1_audit_events",
      request: { ...request, status: "applied", appliedByMemberId: actorMemberId, appliedAt, application, destructiveWrite: true, updatedAt: appliedAt },
      application,
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_mutation_application_unavailable",
      status: 503,
    };
  }
}

async function readFilmProfileMutationRequestRow(
  db: D1Database,
  workspaceId: string,
  requestId: string,
): Promise<FilmProfileMutationRequestRow | null> {
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      project_id,
      actor_member_id,
      status,
      summary_preview,
      summary_sha256,
      field_keys_json,
      expected_updated_at,
      resolved_by_member_id,
      resolved_at,
      resolution_note_preview,
      resolution_note_sha256,
      applied_by_member_id,
      applied_at,
      application_json,
      destructive_write,
      created_at,
      updated_at
    FROM film_profile_mutation_requests
    WHERE workspace_id = ?
      AND id = ?
    LIMIT 1
  `).bind(workspaceId, requestId).first<FilmProfileMutationRequestRow>();
}

function filmProfileMutationRequestFromRow(row: FilmProfileMutationRequestRow): FilmProfileMutationRequestSummary | null {
  if (
    !isValidRecordId(row.id)
    || !isValidRecordId(row.project_id)
    || !isRecordMutationRequestStatus(row.status)
    || !isValidSha256Hex(row.summary_sha256)
  ) {
    return null;
  }
  const fieldKeys = normalizeFilmProfileMutationFieldKeys(filmProfileMutationFieldKeysFromJson(row.field_keys_json));
  if (fieldKeys.length === 0) return null;
  const application = row.application_json ? recordMutationApplicationFromJson(row.application_json, "update") : null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    mutation: "update",
    actorMemberId: row.actor_member_id,
    allowedBy: "owner_producer",
    status: row.status,
    summaryPreview: row.summary_preview,
    summarySha256: row.summary_sha256,
    fieldKeys,
    expectedUpdatedAt: row.expected_updated_at,
    resolvedByMemberId: row.resolved_by_member_id,
    resolvedAt: row.resolved_at,
    resolutionNotePreview: row.resolution_note_preview,
    resolutionNoteSha256: row.resolution_note_sha256,
    appliedByMemberId: row.applied_by_member_id,
    appliedAt: row.applied_at,
    application,
    destructiveWrite: row.destructive_write === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filmProfileMutationFieldKeysFromJson(value: string): FilmProfileMutationFieldKey[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? normalizeFilmProfileMutationFieldKeys(parsed) : [];
  } catch {
    return [];
  }
}

function normalizeFilmProfileMutationUpdates(
  requestedFieldKeys: FilmProfileMutationFieldKey[],
  value: unknown,
): { ok: true; updates: RecordMutationFieldUpdate[] } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "film_profile_mutation_updates_required" };
  }
  if (requestedFieldKeys.length === 0) {
    return { ok: false, error: "film_profile_mutation_field_keys_required" };
  }

  const updates: RecordMutationFieldUpdate[] = [];
  const requestedKeys = new Set(requestedFieldKeys);
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (!isFilmProfileMutationFieldKey(key)) {
      return { ok: false, error: "film_profile_mutation_unsupported_field" };
    }
    if (!requestedKeys.has(key)) {
      return { ok: false, error: "film_profile_mutation_unrequested_field" };
    }
    const update = normalizeFilmProfileMutationFieldUpdate(key, rawValue);
    if (!update) {
      return { ok: false, error: "film_profile_mutation_unsupported_field" };
    }
    updates.push(update);
    if (updates.length >= requestedFieldKeys.length) break;
  }

  if (updates.length === 0) {
    return { ok: false, error: "film_profile_mutation_updates_required" };
  }
  return { ok: true, updates };
}

function normalizeFilmProfileMutationFieldUpdate(key: FilmProfileMutationFieldKey, value: unknown): RecordMutationFieldUpdate | null {
  if (key === "runtimeMinutes") return nullableIntegerMutationUpdate(key, "runtime_minutes", value, 0, 600);
  if (key === "format") return stringMutationUpdate(key, "format", value, 80, true);
  if (key === "shootStart") return stringMutationUpdate(key, "shoot_start", value, 80, true);
  if (key === "shootEnd") return stringMutationUpdate(key, "shoot_end", value, 80, true);
  if (key === "budgetCents") return integerMutationUpdate(key, "budget_cents", value, 0, 100_000_000_000);
  if (key === "spentCents") return integerMutationUpdate(key, "spent_cents", value, 0, 100_000_000_000);
  return null;
}

async function readFilmProfileMutationValueSnapshot(
  db: D1Database,
  workspaceId: string,
  projectId: string,
  updates: RecordMutationFieldUpdate[],
): Promise<
  | { ok: true; values: Record<string, unknown>; expectedUpdatedAt: string | null }
  | { ok: false; error: string; status: number }
> {
  const snapshot = await readFilmProfileMutationSnapshot(db, workspaceId, projectId);
  if (!snapshot.ok) {
    return { ok: false, error: snapshot.error, status: snapshot.status };
  }
  if (snapshot.persistence !== "d1_film_profile_stale_check") {
    return { ok: false, error: "film_profile_mutation_snapshot_unavailable", status: 503 };
  }
  const profile = snapshot.profile;
  const valuesByColumn: Record<string, unknown> = {
    runtime_minutes: profile.runtimeMinutes,
    format: profile.format,
    shoot_start: profile.shootStart,
    shoot_end: profile.shootEnd,
    budget_cents: profile.budgetCents,
    spent_cents: profile.spentCents,
  };
  const values: Record<string, unknown> = {};
  for (const update of updates) {
    values[update.column] = valuesByColumn[update.column] ?? null;
  }
  return {
    ok: true,
    values,
    expectedUpdatedAt: profile.expectedUpdatedAt,
  };
}

async function commitFilmProfileMutationApplication(
  db: D1Database,
  workspaceId: string,
  requestId: string,
  projectId: string,
  updates: RecordMutationFieldUpdate[],
  expectedUpdatedAt: string | null,
  actorMemberId: string | null,
  application: RecordMutationApplicationSummary,
  appliedAt: string,
): Promise<boolean> {
  const statements = [
    mutationRequestStatusAssertion(db, "film_profile_mutation_requests", workspaceId, requestId),
    filmProfileMutationTargetAssertion(db, projectId, expectedUpdatedAt),
    filmProfileMutationWriteStatement(db, projectId, updates, expectedUpdatedAt, appliedAt),
    db.prepare(`
      UPDATE film_profile_mutation_requests
      SET
        status = 'applied',
        applied_by_member_id = ?,
        applied_at = ?,
        application_json = ?,
        destructive_write = 1,
        updated_at = ?
      WHERE workspace_id = ?
        AND id = ?
        AND status = 'approved_pending_apply'
    `).bind(actorMemberId, appliedAt, JSON.stringify(application), appliedAt, workspaceId, requestId),
    auditEventInsertStatement(
      db,
      `audit_film_profile_mutation_apply_${requestId}`,
      workspaceId,
      projectId,
      actorMemberId,
      "film_profile_mutation.applied",
      {
        requestId,
        projectId,
        fieldKeys: application.fieldKeys,
        destructiveWrite: true,
        persistence: "d1_film_profile_mutation_requests",
      },
      appliedAt,
    ),
  ];
  try {
    const results = await db.batch(statements);
    return results.length === statements.length
      && results.every((result) => result.success)
      && Number(results[2]?.meta?.changes ?? 0) === 1
      && Number(results[3]?.meta?.changes ?? 0) === 1;
  } catch {
    return false;
  }
}

function filmProfileMutationTargetAssertion(
  db: D1Database,
  projectId: string,
  expectedUpdatedAt: string | null,
): D1PreparedStatement {
  if (expectedUpdatedAt === null) {
    return db.prepare(`
      SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM film_profiles WHERE project_id = ?)
        THEN 1 ELSE abs(-9223372036854775808)
      END AS mutation_assertion
    `).bind(projectId);
  }
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM film_profiles WHERE project_id = ? AND updated_at = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS mutation_assertion
  `).bind(projectId, expectedUpdatedAt);
}

function filmProfileMutationWriteStatement(
  db: D1Database,
  projectId: string,
  updates: RecordMutationFieldUpdate[],
  expectedUpdatedAt: string | null,
  appliedAt: string,
): D1PreparedStatement {
  if (expectedUpdatedAt === null) {
    const valuesByColumn: Record<string, string | number | null> = {
      runtime_minutes: null,
      format: null,
      shoot_start: null,
      shoot_end: null,
      budget_cents: 0,
      spent_cents: 0,
    };
    for (const update of updates) valuesByColumn[update.column] = update.value;
    return db.prepare(`
      INSERT INTO film_profiles (
        project_id, runtime_minutes, format, shoot_start, shoot_end,
        budget_cents, spent_cents, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      projectId,
      valuesByColumn.runtime_minutes,
      valuesByColumn.format,
      valuesByColumn.shoot_start,
      valuesByColumn.shoot_end,
      valuesByColumn.budget_cents,
      valuesByColumn.spent_cents,
      appliedAt,
      appliedAt,
    );
  }
  const assignments = updates.map((update) => `${update.column} = ?`).join(", ");
  return db.prepare(`
    UPDATE film_profiles
    SET ${assignments}, updated_at = ?
    WHERE project_id = ?
      AND updated_at = ?
  `).bind(...updates.map((update) => update.value), appliedAt, projectId, expectedUpdatedAt);
}

async function markFilmProfileMutationRequestStale(
  db: D1Database,
  workspaceId: string,
  requestId: string,
  actorMemberId: string | null,
  currentUpdatedAt: string | null,
): Promise<FilmProfileMutationRequestSummary | null> {
  const updatedAt = new Date().toISOString();
  const application: RecordMutationApplicationSummary = {
    action: "update",
    applied: false,
    idempotent: false,
    fieldKeys: [],
    previousUpdatedAt: currentUpdatedAt,
    updatedAt: null,
    deletedAt: null,
    fieldDiffs: [],
    rollbackGuidance: recordMutationRollbackGuidance("update", []),
  };
  await db.prepare(`
    UPDATE film_profile_mutation_requests
    SET
      status = 'stale_record_blocked',
      resolved_by_member_id = COALESCE(resolved_by_member_id, ?),
      application_json = ?,
      destructive_write = 0,
      updated_at = ?
    WHERE workspace_id = ?
      AND id = ?
      AND status = 'approved_pending_apply'
  `).bind(actorMemberId, JSON.stringify(application), updatedAt, workspaceId, requestId).run();
  const row = await readFilmProfileMutationRequestRow(db, workspaceId, requestId);
  return row ? filmProfileMutationRequestFromRow(row) : null;
}

async function readRecordMutationRequestRow(
  db: D1Database,
  workspaceId: string,
  requestId: string,
): Promise<RecordMutationRequestRow | null> {
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      entity_type,
      entity_id,
      mutation,
      actor_member_id,
      allowed_by,
      status,
      summary_preview,
      summary_sha256,
      field_keys_json,
      expected_updated_at,
      resolved_by_member_id,
      resolved_at,
      resolution_note_preview,
      resolution_note_sha256,
      applied_by_member_id,
      applied_at,
      application_json,
      destructive_write,
      created_at,
      updated_at
    FROM record_mutation_requests
    WHERE workspace_id = ?
      AND id = ?
    LIMIT 1
  `).bind(workspaceId, requestId).first<RecordMutationRequestRow>();
}

function recordMutationRequestFromRow(row: RecordMutationRequestRow): RecordMutationRequestSummary | null {
  const entityType = row.entity_type;
  const mutation = row.mutation;
  if (
    !isValidRecordId(row.id)
    || !isCoreRecordOwnerEntityType(entityType)
    || !isValidRecordId(row.entity_id)
    || !isRecordMutationKind(mutation)
    || !isRecordMutationAllowedBy(row.allowed_by)
    || !isRecordMutationRequestStatus(row.status)
    || !isValidSha256Hex(row.summary_sha256)
  ) {
    return null;
  }
  const fieldKeys = recordMutationFieldKeysFromJson(row.field_keys_json);
  const application = row.application_json ? recordMutationApplicationFromJson(row.application_json, mutation) : null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    entityType,
    entityId: row.entity_id,
    mutation,
    actorMemberId: row.actor_member_id,
    allowedBy: row.allowed_by,
    status: row.status,
    summaryPreview: row.summary_preview,
    summarySha256: row.summary_sha256,
    fieldKeys,
    expectedUpdatedAt: row.expected_updated_at,
    resolvedByMemberId: row.resolved_by_member_id,
    resolvedAt: row.resolved_at,
    resolutionNotePreview: row.resolution_note_preview,
    resolutionNoteSha256: row.resolution_note_sha256,
    appliedByMemberId: row.applied_by_member_id,
    appliedAt: row.applied_at,
    application,
    destructiveWrite: row.destructive_write === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function recordMutationFieldKeysFromJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return normalizeRecordMutationFieldKeys(parsed);
  } catch {
    return [];
  }
}

function recordMutationApplicationFromJson(value: string, fallbackMutation: RecordMutationKind): RecordMutationApplicationSummary | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const action = typeof parsed.action === "string" && isRecordMutationKind(parsed.action) ? parsed.action : fallbackMutation;
    const fieldKeys = normalizeRecordMutationFieldKeys(parsed.fieldKeys);
    const fieldDiffs = recordMutationFieldDiffsFromJson(parsed.fieldDiffs);
    return {
      action,
      applied: parsed.applied === true,
      idempotent: parsed.idempotent === true,
      fieldKeys,
      previousUpdatedAt: typeof parsed.previousUpdatedAt === "string" ? parsed.previousUpdatedAt : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      deletedAt: typeof parsed.deletedAt === "string" ? parsed.deletedAt : null,
      fieldDiffs,
      rollbackGuidance: recordMutationRollbackGuidanceFromJson(parsed.rollbackGuidance, action, fieldDiffs.map((diff) => diff.key).length ? fieldDiffs.map((diff) => diff.key) : fieldKeys),
    };
  } catch {
    return null;
  }
}

function recordMutationFieldDiffsFromJson(value: unknown): RecordMutationFieldDiff[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): RecordMutationFieldDiff | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const key = typeof row.key === "string" && isValidRecordMutationFieldKey(row.key) ? row.key : null;
      if (!key) return null;
      return {
        key,
        before: recordMutationFieldValueFromUnknown(row.before),
        after: recordMutationFieldValueFromUnknown(row.after),
        changed: row.changed === true,
      };
    })
    .filter((item): item is RecordMutationFieldDiff => item !== null)
    .slice(0, 12);
}

function recordMutationRollbackGuidanceFromJson(
  value: unknown,
  mutation: RecordMutationKind,
  fallbackFieldKeys: string[],
): RecordMutationRollbackGuidance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return recordMutationRollbackGuidance(mutation, fallbackFieldKeys);
  }
  const row = value as Record<string, unknown>;
  const strategy = row.strategy === "apply_inverse_update_request" || row.strategy === "restore_from_backup_or_recreate"
    ? row.strategy
    : recordMutationRollbackGuidance(mutation, fallbackFieldKeys).strategy;
  const fieldKeys = normalizeRecordMutationFieldKeys(row.fieldKeys).length
    ? normalizeRecordMutationFieldKeys(row.fieldKeys)
    : fallbackFieldKeys;
  const notes = Array.isArray(row.notes)
    ? row.notes.filter((note): note is string => typeof note === "string").map((note) => note.slice(0, 240)).slice(0, 5)
    : recordMutationRollbackGuidance(mutation, fallbackFieldKeys).notes;
  return {
    strategy,
    fieldKeys,
    requiresApproval: true,
    requiresFreshRecord: row.requiresFreshRecord === false ? false : true,
    notes,
  };
}

async function readCoreRecordMutationSnapshot(
  db: D1Database,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
): Promise<
  | { ok: true; record: CoreRecordMutationSnapshot }
  | { ok: false; error: string; status: number }
> {
  const tableName = coreRecordOwnerTableName(entityType);
  const row = await db.prepare(`
    SELECT id, workspace_id, updated_at
    FROM ${tableName}
    WHERE workspace_id = ?
      AND id = ?
    LIMIT 1
  `).bind(workspaceId, entityId).first<{ id: string; workspace_id: string; updated_at: string | null }>();
  if (!row) {
    return { ok: false, error: "record_not_found", status: 404 };
  }
  return {
    ok: true,
    record: {
      workspaceId,
      entityType,
      entityId,
      updatedAt: row.updated_at ?? null,
    },
  };
}

async function readFilmProfileMutationSnapshot(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
): Promise<
  | { ok: true; persistence: FilmProfileMutationPreflightPersistence; profile: FilmProfileMutationSnapshot }
  | { ok: false; persistence: FilmProfileMutationPreflightPersistence; error: string; status: number }
> {
  if (!db) {
    const profile = seedFilmProfileMutationSnapshot(workspaceId, projectId);
    return profile
      ? { ok: true, persistence: "dry_run_memoryless", profile }
      : { ok: false, persistence: "dry_run_memoryless", error: "project_not_found", status: 404 };
  }

  try {
    const row = await db.prepare(`
      SELECT
        projects.id AS project_id,
        projects.title AS project_title,
        film_profiles.runtime_minutes AS runtime_minutes,
        film_profiles.format AS format,
        film_profiles.shoot_start AS shoot_start,
        film_profiles.shoot_end AS shoot_end,
        film_profiles.budget_cents AS budget_cents,
        film_profiles.spent_cents AS spent_cents,
        film_profiles.updated_at AS profile_updated_at
      FROM projects
      LEFT JOIN film_profiles ON film_profiles.project_id = projects.id
      WHERE projects.workspace_id = ?
        AND projects.id = ?
      LIMIT 1
    `).bind(workspaceId, projectId).first<{
      project_id: string;
      project_title: string;
      runtime_minutes: number | string | null;
      format: string | null;
      shoot_start: string | null;
      shoot_end: string | null;
      budget_cents: number | string | null;
      spent_cents: number | string | null;
      profile_updated_at: string | null;
    }>();

    if (!row) {
      return { ok: false, persistence: "d1_film_profile_stale_check", error: "project_not_found", status: 404 };
    }

    return {
      ok: true,
      persistence: "d1_film_profile_stale_check",
      profile: {
        projectId: row.project_id,
        projectTitle: row.project_title,
        runtimeMinutes: nullableProfileNumber(row.runtime_minutes),
        format: nullableProfileString(row.format),
        shootStart: nullableProfileString(row.shoot_start),
        shootEnd: nullableProfileString(row.shoot_end),
        budgetCents: profileInteger(row.budget_cents),
        spentCents: profileInteger(row.spent_cents),
        expectedUpdatedAt: row.profile_updated_at ?? null,
      },
    };
  } catch {
    const profile = seedFilmProfileMutationSnapshot(workspaceId, projectId);
    return profile
      ? { ok: true, persistence: "d1_unavailable_dry_run", profile }
      : { ok: false, persistence: "d1_unavailable_dry_run", error: "film_profile_preflight_unavailable", status: 503 };
  }
}

function seedFilmProfileMutationSnapshot(workspaceId: string, projectId: string): FilmProfileMutationSnapshot | null {
  if (workspaceId !== seedWorkspace.id) return null;
  const project = seedWorkspace.projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;

  return {
    projectId: project.id,
    projectTitle: project.title,
    runtimeMinutes: project.runtimeMinutes,
    format: project.format,
    shootStart: null,
    shootEnd: null,
    budgetCents: Math.round(project.totalBudget * 100),
    spentCents: Math.round(project.spentBudget * 100),
    expectedUpdatedAt: null,
  };
}

function nullableProfileString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableProfileNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function profileInteger(value: number | string | null | undefined): number {
  const numberValue = nullableProfileNumber(value);
  return numberValue === null ? 0 : Math.max(0, Math.round(numberValue));
}

async function readCoreRecordMutationValueSnapshot(
  db: D1Database,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  updates: RecordMutationFieldUpdate[],
): Promise<
  | { ok: true; record: CoreRecordMutationSnapshot & { values: Record<string, unknown> } }
  | { ok: false; error: string; status: number }
> {
  const tableName = coreRecordOwnerTableName(entityType);
  const columns = [...new Set(updates.map((update) => update.column))];
  const row = await db.prepare(`
    SELECT id, workspace_id, updated_at${columns.length ? `, ${columns.join(", ")}` : ""}
    FROM ${tableName}
    WHERE workspace_id = ?
      AND id = ?
    LIMIT 1
  `).bind(workspaceId, entityId).first<Record<string, unknown> & { id: string; workspace_id: string; updated_at: string | null }>();
  if (!row) {
    return { ok: false, error: "record_not_found", status: 404 };
  }
  const values: Record<string, unknown> = {};
  for (const column of columns) {
    values[column] = row[column];
  }
  return {
    ok: true,
    record: {
      workspaceId,
      entityType,
      entityId,
      updatedAt: row.updated_at ?? null,
      values,
    },
  };
}

async function validateRecordMutationRelationships(
  db: D1Database,
  workspaceId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  updates: RecordMutationFieldUpdate[],
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const projectUpdate = updates.find((update) => update.key === "projectId");
  const assigneeUpdate = updates.find((update) => update.key === "assigneeMemberId");

  if (projectUpdate?.value) {
    const projectValidation = await validateRecordMutationProjectReference(db, workspaceId, String(projectUpdate.value));
    if (!projectValidation.ok) return projectValidation;
  }

  if (entityType !== "task" || (!assigneeUpdate && !projectUpdate)) {
    return { ok: true };
  }

  const currentTask = await readTaskMutationRelationships(db, workspaceId, entityId);
  if (!currentTask.ok) return currentTask;

  const effectiveProjectId = projectUpdate
    ? recordMutationOptionalIdValue(projectUpdate.value)
    : currentTask.projectId;
  const effectiveAssigneeMemberId = assigneeUpdate
    ? recordMutationOptionalIdValue(assigneeUpdate.value)
    : currentTask.assigneeMemberId;

  if (!effectiveAssigneeMemberId) {
    return { ok: true };
  }

  return validateRecordMutationAssigneeReference(db, workspaceId, effectiveProjectId, effectiveAssigneeMemberId);
}

async function validateRecordMutationProjectReference(
  db: D1Database,
  workspaceId: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const row = await db.prepare(`
    SELECT id, workspace_id
    FROM projects
    WHERE id = ?
    LIMIT 1
  `).bind(projectId).first<{ id: string; workspace_id: string }>();
  if (!row || row.workspace_id !== workspaceId) {
    return { ok: false, error: "record_mutation_project_not_found", status: 422 };
  }
  return { ok: true };
}

async function readTaskMutationRelationships(
  db: D1Database,
  workspaceId: string,
  taskId: string,
): Promise<
  | { ok: true; projectId: string | null; assigneeMemberId: string | null }
  | { ok: false; error: string; status: number }
> {
  const row = await db.prepare(`
    SELECT id, workspace_id, project_id, assignee_member_id
    FROM tasks
    WHERE id = ?
    LIMIT 1
  `).bind(taskId).first<{
    id: string;
    workspace_id: string;
    project_id: string | null;
    assignee_member_id: string | null;
  }>();
  if (!row || row.workspace_id !== workspaceId) {
    return { ok: false, error: "record_not_found", status: 404 };
  }
  return {
    ok: true,
    projectId: row.project_id ?? null,
    assigneeMemberId: row.assignee_member_id ?? null,
  };
}

async function validateRecordMutationAssigneeReference(
  db: D1Database,
  workspaceId: string,
  projectId: string | null,
  assigneeMemberId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const member = await findWorkspaceMemberById(db, assigneeMemberId);
  if (!member || member.workspace_id !== workspaceId || member.status !== "active") {
    return { ok: false, error: "record_mutation_assignee_not_active", status: 422 };
  }

  if (!projectId) {
    return { ok: true };
  }

  const projectValidation = await validateRecordMutationProjectReference(db, workspaceId, projectId);
  if (!projectValidation.ok) return projectValidation;

  const membership = await projectMembershipFor(db, projectId, assigneeMemberId);
  if (membership) {
    return { ok: true };
  }

  if (await recordOwnedByMember(db, workspaceId, "project", projectId, assigneeMemberId)) {
    return { ok: true };
  }

  const projectPermission = await recordWritePermissionFor(db, workspaceId, "project", projectId, assigneeMemberId);
  if (projectPermission) {
    return { ok: true };
  }

  return { ok: false, error: "record_mutation_assignee_project_access_required", status: 422 };
}

function recordMutationOptionalIdValue(value: string | number | null): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function createRecordMutationFieldDiffs(
  updates: RecordMutationFieldUpdate[],
  currentValues: Record<string, unknown>,
): RecordMutationFieldDiff[] {
  return updates.map((update) => {
    const before = recordMutationFieldValue(update.key, currentValues[update.column]);
    const after = recordMutationFieldValue(update.key, update.value);
    return {
      key: update.key,
      before,
      after,
      changed: before !== after,
    };
  });
}

function createRecordMutationDeleteDiff(): RecordMutationFieldDiff[] {
  return [
    {
      key: "record",
      before: "present",
      after: "deleted",
      changed: true,
    },
  ];
}

function recordMutationFieldValue(key: string, value: unknown): RecordMutationFieldValue {
  const normalized = recordMutationFieldValueFromUnknown(value);
  if (key === "sensitive") {
    if (normalized === 1) return true;
    if (normalized === 0) return false;
  }
  if (key === "roleTags" && typeof normalized === "string") {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string").join(", ");
      }
    } catch {
      return normalized;
    }
  }
  return normalized;
}

function recordMutationFieldValueFromUnknown(value: unknown): RecordMutationFieldValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.slice(0, 500);
  return JSON.stringify(value).slice(0, 500);
}

function recordMutationRollbackGuidance(
  mutation: RecordMutationKind,
  fieldKeys: string[],
): RecordMutationRollbackGuidance {
  if (mutation === "update") {
    return {
      strategy: "apply_inverse_update_request",
      fieldKeys: fieldKeys.slice(0, 12),
      requiresApproval: true,
      requiresFreshRecord: true,
      notes: [
        "Use the diff preview's before values to create a new approved mutation request if this update must be reversed.",
        "Rollback must pass the same approval and stale-record gates as the original mutation.",
      ],
    };
  }

  return {
    strategy: "restore_from_backup_or_recreate",
    fieldKeys: ["record"],
    requiresApproval: true,
    requiresFreshRecord: false,
    notes: [
      "Deleted record recovery should use an encrypted backup restore or a newly approved recreate flow.",
      "The mutation manifest proves who approved and applied the delete but does not store raw deleted row contents.",
    ],
  };
}

async function markRecordMutationRequestStale(
  db: D1Database,
  workspaceId: string,
  requestId: string,
  mutation: RecordMutationKind,
  actorMemberId: string | null,
  currentUpdatedAt: string | null,
): Promise<RecordMutationRequestSummary | null> {
  const updatedAt = new Date().toISOString();
  const application: RecordMutationApplicationSummary = {
    action: mutation,
    applied: false,
    idempotent: false,
    fieldKeys: [],
    previousUpdatedAt: currentUpdatedAt,
    updatedAt: null,
    deletedAt: null,
    fieldDiffs: [],
    rollbackGuidance: recordMutationRollbackGuidance(mutation, []),
  };
  await db.prepare(`
    UPDATE record_mutation_requests
    SET
      status = 'stale_record_blocked',
      resolved_by_member_id = COALESCE(resolved_by_member_id, ?),
      application_json = ?,
      destructive_write = 0,
      updated_at = ?
    WHERE workspace_id = ?
      AND id = ?
      AND status = 'approved_pending_apply'
  `).bind(actorMemberId, JSON.stringify(application), updatedAt, workspaceId, requestId).run();
  const row = await readRecordMutationRequestRow(db, workspaceId, requestId);
  return row ? recordMutationRequestFromRow(row) : null;
}

function normalizeRecordMutationUpdates(
  entityType: CoreRecordOwnerEntityType,
  requestedFieldKeys: string[],
  value: unknown,
): { ok: true; updates: RecordMutationFieldUpdate[] } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "record_mutation_updates_required" };
  }
  if (requestedFieldKeys.length === 0) {
    return { ok: false, error: "record_mutation_field_keys_required" };
  }

  const updates: RecordMutationFieldUpdate[] = [];
  const requestedKeys = new Set(requestedFieldKeys);
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (!requestedKeys.has(key)) {
      return { ok: false, error: "record_mutation_unrequested_field" };
    }
    if (!isRecordMutationFieldKeyForEntity(entityType, key)) {
      return { ok: false, error: "record_mutation_unsupported_field" };
    }
    const update = normalizeRecordMutationFieldUpdate(entityType, key, rawValue);
    if (!update) {
      return { ok: false, error: "record_mutation_unsupported_field" };
    }
    updates.push(update);
    if (updates.length > 12) break;
  }

  if (updates.length === 0) {
    return { ok: false, error: "record_mutation_updates_required" };
  }
  return { ok: true, updates };
}

function parseRecordMutationFieldKeyRequest(
  entityType: CoreRecordOwnerEntityType,
  mutation: RecordMutationKind,
  value: unknown,
): { ok: true; fieldKeys: string[] } | { ok: false; error: string } {
  if (mutation === "delete") {
    if (Array.isArray(value) && value.length > 0) {
      return { ok: false, error: "record_mutation_delete_field_keys_not_supported" };
    }
    return { ok: true, fieldKeys: [] };
  }

  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "record_mutation_field_keys_required" };
  }

  const fieldKeys = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: "record_mutation_unsupported_field_key" };
    }
    const fieldKey = item.trim().slice(0, 80);
    if (!isValidRecordMutationFieldKey(fieldKey) || !isRecordMutationFieldKeyForEntity(entityType, fieldKey)) {
      return { ok: false, error: "record_mutation_unsupported_field_key" };
    }
    fieldKeys.add(fieldKey);
    if (fieldKeys.size >= 12) break;
  }

  if (fieldKeys.size === 0) {
    return { ok: false, error: "record_mutation_field_keys_required" };
  }
  return { ok: true, fieldKeys: [...fieldKeys] };
}

function normalizeRecordMutationFieldUpdate(
  entityType: CoreRecordOwnerEntityType,
  key: string,
  value: unknown,
): RecordMutationFieldUpdate | null {
  if (entityType === "project") {
    if (key === "title") return stringMutationUpdate(key, "title", value, 180, false);
    if (key === "projectType") return stringMutationUpdate(key, "project_type", value, 80, false);
    if (key === "status") return stringMutationUpdate(key, "status", value, 40, false);
    if (key === "phase") return stringMutationUpdate(key, "phase", value, 80, false);
    if (key === "logline") return stringMutationUpdate(key, "logline", value, 500, true);
  }
  if (entityType === "task") {
    if (key === "title") return stringMutationUpdate(key, "title", value, 180, false);
    if (key === "status") return stringMutationUpdate(key, "status", value, 40, false);
    if (key === "priority") return stringMutationUpdate(key, "priority", value, 40, false);
    if (key === "dueAt") return stringMutationUpdate(key, "due_at", value, 80, true);
    if (key === "projectId") return idMutationUpdate(key, "project_id", value, true);
    if (key === "assigneeMemberId") return idMutationUpdate(key, "assignee_member_id", value, true);
  }
  if (entityType === "document") {
    if (key === "title") return stringMutationUpdate(key, "title", value, 180, false);
    if (key === "documentType") return documentTypeMutationUpdate(key, value);
    if (key === "projectId") return idMutationUpdate(key, "project_id", value, true);
    if (key === "sensitive") return booleanMutationUpdate(key, "sensitive", value);
    if (key === "externalUrl") return urlMutationUpdate(key, "external_url", value, true);
  }
  if (entityType === "person") {
    if (key === "displayName") return stringMutationUpdate(key, "display_name", value, 160, false);
    if (key === "roleTags") return roleTagsMutationUpdate(key, value);
    if (key === "sensitive") return booleanMutationUpdate(key, "sensitive", value);
  }
  if (entityType === "equipment") {
    if (key === "name") return stringMutationUpdate(key, "name", value, 160, false);
    if (key === "equipmentType") return stringMutationUpdate(key, "equipment_type", value, 80, true);
    if (key === "status") return stringMutationUpdate(key, "status", value, 80, false);
    if (key === "projectId") return idMutationUpdate(key, "project_id", value, true);
    if (key === "notes") return stringMutationUpdate(key, "notes", value, 500, true);
  }
  if (entityType === "expense") {
    if (key === "category") return stringMutationUpdate(key, "category", value, 120, false);
    if (key === "amountCents") return integerMutationUpdate(key, "amount_cents", value, 0, 100_000_000_000);
    if (key === "purchasedAt") return stringMutationUpdate(key, "purchased_at", value, 80, true);
    if (key === "projectId") return idMutationUpdate(key, "project_id", value, true);
    if (key === "comment") return stringMutationUpdate(key, "comment", value, 500, true);
  }
  return null;
}

function stringMutationUpdate(key: string, column: string, value: unknown, maxLength: number, nullable: boolean): RecordMutationFieldUpdate | null {
  if (value === null && nullable) return { key, column, value: null };
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  if (!trimmed && nullable) return { key, column, value: null };
  if (!trimmed) return null;
  return { key, column, value: trimmed };
}

function idMutationUpdate(key: string, column: string, value: unknown, nullable: boolean): RecordMutationFieldUpdate | null {
  if (value === null && nullable) return { key, column, value: null };
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed && nullable) return { key, column, value: null };
  if (!isValidRecordId(trimmed)) return null;
  return { key, column, value: trimmed };
}

function booleanMutationUpdate(key: string, column: string, value: unknown): RecordMutationFieldUpdate | null {
  if (typeof value !== "boolean") return null;
  return { key, column, value: value ? 1 : 0 };
}

function urlMutationUpdate(key: string, column: string, value: unknown, nullable: boolean): RecordMutationFieldUpdate | null {
  if (value === null && nullable) return { key, column, value: null };
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed && nullable) return { key, column, value: null };
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  } catch {
    return null;
  }
  return { key, column, value: trimmed };
}

function integerMutationUpdate(key: string, column: string, value: unknown, min: number, max: number): RecordMutationFieldUpdate | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isSafeInteger(numeric) || numeric < min || numeric > max) return null;
  return { key, column, value: numeric };
}

function nullableIntegerMutationUpdate(key: string, column: string, value: unknown, min: number, max: number): RecordMutationFieldUpdate | null {
  if (value === null || value === "") return { key, column, value: null };
  return integerMutationUpdate(key, column, value, min, max);
}

function documentTypeMutationUpdate(key: string, value: unknown): RecordMutationFieldUpdate | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!["native", "google_doc", "uploaded_file", "screenplay", "markdown"].includes(normalized)) return null;
  return { key, column: "document_type", value: normalized };
}

function roleTagsMutationUpdate(key: string, value: unknown): RecordMutationFieldUpdate | null {
  const tags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = tags
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);
  if (normalized.length === 0) return null;
  return { key, column: "role_tags", value: JSON.stringify(normalized) };
}

async function commitCoreRecordMutationApplication(
  db: D1Database,
  workspaceId: string,
  requestId: string,
  entityType: CoreRecordOwnerEntityType,
  entityId: string,
  mutation: RecordMutationKind,
  updates: RecordMutationFieldUpdate[],
  expectedUpdatedAt: string | null,
  actorMemberId: string | null,
  application: RecordMutationApplicationSummary,
  appliedAt: string,
): Promise<boolean> {
  const targetWrite = mutation === "update"
    ? coreRecordMutationUpdateStatement(db, entityType, workspaceId, entityId, updates, expectedUpdatedAt, appliedAt)
    : coreRecordMutationDeleteStatement(db, entityType, workspaceId, entityId, expectedUpdatedAt);
  const statements = [
    mutationRequestStatusAssertion(db, "record_mutation_requests", workspaceId, requestId),
    coreRecordMutationTargetAssertion(db, entityType, workspaceId, entityId, expectedUpdatedAt),
    targetWrite,
    db.prepare(`
      UPDATE record_mutation_requests
      SET
        status = 'applied',
        applied_by_member_id = ?,
        applied_at = ?,
        application_json = ?,
        destructive_write = 1,
        updated_at = ?
      WHERE workspace_id = ?
        AND id = ?
        AND status = 'approved_pending_apply'
    `).bind(actorMemberId, appliedAt, JSON.stringify(application), appliedAt, workspaceId, requestId),
    auditEventInsertStatement(
      db,
      `audit_record_mutation_apply_${requestId}`,
      workspaceId,
      entityType === "project" ? entityId : null,
      actorMemberId,
      "record_mutation.applied",
      {
        requestId,
        entityType,
        entityId,
        mutation,
        fieldKeys: application.fieldKeys,
        idempotent: false,
        destructiveWrite: true,
        persistence: "d1_record_mutation_requests",
      },
      appliedAt,
    ),
  ];
  try {
    const results = await db.batch(statements);
    return results.length === statements.length
      && results.every((result) => result.success)
      && Number(results[2]?.meta?.changes ?? 0) === 1
      && Number(results[3]?.meta?.changes ?? 0) === 1;
  } catch {
    return false;
  }
}

function mutationRequestStatusAssertion(
  db: D1Database,
  table: "record_mutation_requests" | "film_profile_mutation_requests",
  workspaceId: string,
  requestId: string,
): D1PreparedStatement {
  return mutationRequestExactStatusAssertion(db, table, workspaceId, requestId, "approved_pending_apply");
}

function mutationRequestExactStatusAssertion(
  db: D1Database,
  table: "record_mutation_requests" | "film_profile_mutation_requests",
  workspaceId: string,
  requestId: string,
  status: string,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM ${table}
        WHERE workspace_id = ?
          AND id = ?
          AND status = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS mutation_assertion
  `).bind(workspaceId, requestId, status);
}

function coreRecordMutationTargetAssertion(
  db: D1Database,
  entityType: CoreRecordOwnerEntityType,
  workspaceId: string,
  entityId: string,
  expectedUpdatedAt: string | null,
): D1PreparedStatement {
  const tableName = coreRecordOwnerTableName(entityType);
  const staleClause = expectedUpdatedAt === null ? "updated_at IS NULL" : "updated_at = ?";
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM ${tableName}
        WHERE workspace_id = ?
          AND id = ?
          AND ${staleClause}
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS mutation_assertion
  `).bind(workspaceId, entityId, ...(expectedUpdatedAt === null ? [] : [expectedUpdatedAt]));
}

function coreRecordMutationUpdateStatement(
  db: D1Database,
  entityType: CoreRecordOwnerEntityType,
  workspaceId: string,
  entityId: string,
  updates: RecordMutationFieldUpdate[],
  expectedUpdatedAt: string | null,
  appliedAt: string,
): D1PreparedStatement {
  const tableName = coreRecordOwnerTableName(entityType);
  const assignments = updates.map((update) => `${update.column} = ?`).join(", ");
  const staleClause = expectedUpdatedAt === null ? "updated_at IS NULL" : "updated_at = ?";
  return db.prepare(`
    UPDATE ${tableName}
    SET ${assignments}, updated_at = ?
    WHERE workspace_id = ?
      AND id = ?
      AND ${staleClause}
  `).bind(
    ...updates.map((update) => update.value),
    appliedAt,
    workspaceId,
    entityId,
    ...(expectedUpdatedAt === null ? [] : [expectedUpdatedAt]),
  );
}

function coreRecordMutationDeleteStatement(
  db: D1Database,
  entityType: CoreRecordOwnerEntityType,
  workspaceId: string,
  entityId: string,
  expectedUpdatedAt: string | null,
): D1PreparedStatement {
  const tableName = coreRecordOwnerTableName(entityType);
  const staleClause = expectedUpdatedAt === null ? "updated_at IS NULL" : "updated_at = ?";
  return db.prepare(`
    DELETE FROM ${tableName}
    WHERE workspace_id = ?
      AND id = ?
      AND ${staleClause}
  `).bind(
    workspaceId,
    entityId,
    ...(expectedUpdatedAt === null ? [] : [expectedUpdatedAt]),
  );
}

function auditEventInsertStatement(
  db: D1Database,
  auditId: string,
  workspaceId: string,
  projectId: string | null,
  actorMemberId: string | null,
  action: string,
  metadata: Record<string, unknown>,
  createdAt: string,
): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO audit_events (
      id,
      workspace_id,
      project_id,
      actor_member_id,
      action,
      metadata_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).bind(auditId, workspaceId, projectId, actorMemberId, action, JSON.stringify(metadata), createdAt);
}

async function createRecordCommentIntent(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: RecordCommentEntityType,
  entityId: string,
  authorRole: AuthRole,
  authorMemberId: string | null,
  body: string,
): Promise<
  | {
    ok: true;
    persistence: RecordCommentPersistence;
    auditPersistence: AuditPersistence;
    comment: RecordCommentSummary;
  }
  | { ok: false; persistence: RecordCommentPersistence; error: string; status: number }
> {
  const createdAt = new Date().toISOString();
  const comment: RecordCommentSummary = {
    id: `comment_${crypto.randomUUID()}`,
    workspaceId,
    entityType,
    entityId,
    authorMemberId,
    bodyPreview: body.replace(/\s+/g, " ").slice(0, 240),
    bodySha256: await sha256Hex(body),
    createdAt,
  };

  if (!db) {
    return {
      ok: true,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      comment,
    };
  }

  try {
    const statements = [
      recordCommentAuthorizationAssertion(db, workspaceId, entityType, entityId, authorRole, authorMemberId, createdAt),
      db.prepare(`
        INSERT INTO record_comment_intents (
          id,
          workspace_id,
          entity_type,
          entity_id,
          author_member_id,
          body_preview,
          body_sha256,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        comment.id,
        workspaceId,
        entityType,
        entityId,
        authorMemberId,
        comment.bodyPreview,
        comment.bodySha256,
        createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_record_comment_intent_${comment.id}`,
        workspaceId,
        entityType === "project" ? entityId : null,
        authorMemberId,
        "record_comment.intent_created",
        {
          entityType,
          entityId,
          bodyLength: body.length,
          bodySha256: comment.bodySha256,
          persistence: "d1_record_comment_intents",
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("record comment intent batch did not apply exactly once");
    }
    return {
      ok: true,
      persistence: "d1_record_comment_intents",
      auditPersistence: "d1_audit_events",
      comment,
    };
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_dry_run",
      error: "record_comment_intent_unavailable",
      status: 503,
    };
  }
}

function recordCommentAuthorizationAssertion(
  db: D1Database,
  workspaceId: string,
  entityType: RecordCommentEntityType,
  entityId: string,
  authorRole: AuthRole,
  authorMemberId: string | null,
  now: string,
): D1PreparedStatement {
  const tableName = coreRecordOwnerTableName(entityType);
  if (authorRole === "owner" || authorRole === "producer") {
    return db.prepare(`
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM ${tableName} WHERE workspace_id = ? AND id = ?)
        THEN 1 ELSE abs(-9223372036854775808)
      END AS record_comment_authorization_assertion
    `).bind(workspaceId, entityId);
  }
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM ${tableName} AS target
        WHERE target.workspace_id = ?
          AND target.id = ?
          AND (
            target.owner_member_id = ?
            OR EXISTS (
              SELECT 1
              FROM record_permissions AS permission
              WHERE permission.workspace_id = ?
                AND permission.entity_type = ?
                AND permission.entity_id = ?
                AND permission.member_id = ?
                AND permission.permission IN ('comment', 'write', 'admin')
                AND (permission.expires_at IS NULL OR permission.expires_at > ?)
            )
          )
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS record_comment_authorization_assertion
  `).bind(
    workspaceId,
    entityId,
    authorMemberId,
    workspaceId,
    entityType,
    entityId,
    authorMemberId,
    now,
  );
}

async function listRecordCommentIntents(
  db: D1Database | undefined,
  workspaceId: string,
  entityType: RecordCommentEntityType,
  entityId: string,
  limit: number,
): Promise<RecordCommentManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      comments: [],
      rowCount: 0,
      truncated: false,
    };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        entity_type,
        entity_id,
        author_member_id,
        body_preview,
        body_sha256,
        created_at
      FROM record_comment_intents
      WHERE workspace_id = ?
        AND entity_type = ?
        AND entity_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(workspaceId, entityType, entityId, limit + 1).all<RecordCommentRow>();
    const allRows = rows.results ?? [];
    const comments = allRows
      .slice(0, limit)
      .map(recordCommentSummaryFromRow)
      .filter((comment): comment is RecordCommentSummary => comment !== null);
    return {
      persistence: "d1_record_comment_intents",
      comments,
      rowCount: comments.length,
      truncated: allRows.length > limit,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      comments: [],
      rowCount: 0,
      truncated: false,
    };
  }
}

function recordCommentSummaryFromRow(row: RecordCommentRow): RecordCommentSummary | null {
  if (!isRecordCommentEntityType(row.entity_type)) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    authorMemberId: row.author_member_id,
    bodyPreview: row.body_preview,
    bodySha256: row.body_sha256,
    createdAt: row.created_at,
  };
}

function recordPermissionSummaryFromRow(row: RecordPermissionRow): RecordPermissionSummary {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    memberId: row.member_id,
    permission: row.permission,
    department: row.department,
    expiresAt: row.expires_at,
  };
}

function isRecordPermissionEntityType(value: string): value is RecordPermissionEntityType {
  return value === "workspace"
    || value === "project"
    || value === "task"
    || value === "document"
    || value === "person"
    || value === "equipment"
    || value === "expense"
    || value === "planning";
}

function isRecordCommentEntityType(value: string): value is RecordCommentEntityType {
  return value === "project" || value === "task" || value === "document";
}

function isRecordPermissionHistoryEntityType(value: string): value is RecordPermissionHistoryEntityType {
  return value === "project" || value === "task" || value === "document";
}

function isRecordMutationKind(value: string): value is RecordMutationKind {
  return value === "update" || value === "delete";
}

function isRecordMutationResolutionDecision(value: string): value is RecordMutationResolutionDecision {
  return value === "approve" || value === "reject";
}

function isRecordMutationAllowedBy(value: unknown): value is RecordMutationAllowedBy {
  return value === "owner_producer"
    || value === "record_owner"
    || value === "write_permission"
    || value === "dry_run_memoryless";
}

function isRecordMutationRequestStatus(value: string): value is RecordMutationRequestStatus {
  return value === "pending_owner_producer_review"
    || value === "approved_pending_apply"
    || value === "rejected"
    || value === "applied"
    || value === "stale_record_blocked";
}

function normalizeRecordMutationFieldKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const fieldKeys = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const fieldKey = item.trim().slice(0, 80);
    if (isValidRecordMutationFieldKey(fieldKey)) {
      fieldKeys.add(fieldKey);
    }
    if (fieldKeys.size >= 12) break;
  }
  return [...fieldKeys];
}

function isValidRecordMutationFieldKey(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value);
}

function isCoreRecordOwnerEntityType(value: string): value is CoreRecordOwnerEntityType {
  return value === "project"
    || value === "document"
    || value === "task"
    || value === "person"
    || value === "equipment"
    || value === "expense";
}

function coreRecordOwnerTableName(entityType: CoreRecordOwnerEntityType): "projects" | "documents" | "tasks" | "people" | "equipment" | "expenses" {
  if (entityType === "project") return "projects";
  if (entityType === "document") return "documents";
  if (entityType === "task") return "tasks";
  if (entityType === "person") return "people";
  if (entityType === "equipment") return "equipment";
  return "expenses";
}

function isRecordPermissionLevel(value: string): value is RecordPermissionLevel {
  return value === "read" || value === "comment" || value === "write" || value === "admin";
}

async function recordMagicLinkRequest(
  db: D1Database | undefined,
  workspaceId: string | null,
  emailHash: string,
  token: string,
  expiresAt: string,
): Promise<{ persistence: AuthPersistence; magicLinkId: string | null }> {
  if (!db) {
    return { persistence: "dry_run_memoryless", magicLinkId: null };
  }

  try {
    const magicLinkId = `magic_${crypto.randomUUID()}`;
    await db.prepare(`
      INSERT INTO magic_links (
        id,
        workspace_id,
        email_hash,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      magicLinkId,
      workspaceId,
      emailHash,
      await sha256Hex(token),
      expiresAt,
    ).run();

    return { persistence: "d1_kv_auth_records", magicLinkId };
  } catch {
    return { persistence: "d1_unavailable_dry_run", magicLinkId: null };
  }
}

function authPersistenceMode(env: Env): AuthPersistence {
  return env.DB ? "d1_kv_auth_records" : "dry_run_memoryless";
}

async function verifyMagicLinkAndRecordSession(
  env: Env,
  token: string,
  request: Request,
  sessionId: string,
  csrfToken: string,
  expiresAt: string,
): Promise<{ ok: true; persistence: AuthPersistence; role: AuthRole } | { ok: false; error: string }> {
  if (!env.DB) {
    return { ok: true, persistence: "dry_run_memoryless", role: "owner" };
  }

  try {
    const now = new Date().toISOString();
    const tokenHash = await sha256Hex(token);
    const link = await env.DB.prepare(`
      SELECT id, email_hash, consumed_at, expires_at
      FROM magic_links
      WHERE token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first<MagicLinkRow>();

    if (!link || link.consumed_at || Date.parse(link.expires_at) < Date.now()) {
      return { ok: false, error: "invalid_or_expired_token" };
    }

    const member = await findWorkspaceMemberByEmailHash(env.DB, link.email_hash);
    if (isLiveMagicLinkDelivery(env) && !member) {
      return { ok: false, error: "invalid_or_expired_token" };
    }
    if (member && normalizeWorkspaceMemberStatus(member.status) !== "active") {
      return { ok: false, error: "member_not_active" };
    }

    const csrfHash = await sha256Hex(csrfToken);
    const sessionRole = member && isAuthRole(member.role) ? member.role : "owner";
    const statements = [
      magicLinkStateAssertion(env.DB, link, tokenHash, now),
      ...(member
        ? [workspaceMemberStatusAssertion(env.DB, member.workspace_id, member.id, member.role, "active")]
        : []),
    ];
    const consumeIndex = statements.length;
    statements.push(env.DB.prepare(`
      UPDATE magic_links
      SET consumed_at = ?
      WHERE token_hash = ?
        AND id = ?
        AND email_hash = ?
        AND expires_at = ?
        AND consumed_at IS NULL
    `).bind(now, tokenHash, link.id, link.email_hash, link.expires_at));
    const sessionIndex = statements.length;
    statements.push(env.DB.prepare(`
      INSERT INTO sessions (
        id,
        workspace_id,
        member_id,
        csrf_hash,
        user_agent_hash,
        ip_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      member?.workspace_id ?? null,
      member?.id ?? null,
      csrfHash,
      await optionalHeaderHash(request, "user-agent"),
      await optionalHeaderHash(request, "cf-connecting-ip"),
      expiresAt,
    ));
    if (member) {
      statements.push(env.DB.prepare(`
        UPDATE workspace_members
        SET last_seen_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND email_hash = ?
      `).bind(now, member.id, member.workspace_id, link.email_hash));
    }
    const results = await env.DB.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[consumeIndex]?.meta?.changes ?? 0) !== 1
      || Number(results[sessionIndex]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("magic link verification batch did not apply exactly once");
    }

    if (env.SESSIONS) {
      try {
        await env.SESSIONS.put(
          sessionId,
          JSON.stringify({
            id: sessionId,
            role: sessionRole,
            csrfHash,
            emailHash: link.email_hash,
            expiresAt,
          }),
          { expirationTtl: SESSION_TTL_SECONDS },
        );
      } catch {
        // D1 is authoritative for member-bound sessions; KV is a role cache only.
      }
    }

    return { ok: true, persistence: "d1_kv_auth_records", role: sessionRole };
  } catch {
    return { ok: false, error: "invalid_or_expired_token" };
  }
}

function magicLinkStateAssertion(
  db: D1Database,
  link: MagicLinkRow,
  tokenHash: string,
  now: string,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM magic_links
        WHERE id = ?
          AND token_hash = ?
          AND email_hash = ?
          AND expires_at = ?
          AND consumed_at IS NULL
          AND expires_at > ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS magic_link_state_assertion
  `).bind(link.id, tokenHash, link.email_hash, link.expires_at, now);
}

function isValidMagicLinkToken(token: string | undefined): token is string {
  if (!token || token.length < 20 || token.length > 180) return false;
  return token.startsWith("dry_") || token.startsWith("magic_");
}

function isLiveMagicLinkDelivery(env: Env): boolean {
  return env.AUTH_MAGIC_LINK_MODE?.trim().toLowerCase() === "live";
}

function sessionMutationDatabase(env: Env, authenticatedWorkspaceId: string | null): D1Database | undefined {
  return !isLiveMagicLinkDelivery(env) && !authenticatedWorkspaceId ? undefined : env.DB;
}

async function deliverLiveMagicLink(
  env: Env,
  email: string,
  token: string,
  expiresAt: string,
  magicLinkId: string,
): Promise<{ sent: boolean; errorCode: string | null }> {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.INVITE_FROM_EMAIL?.trim() ?? "";
  const appOrigin = env.INVITE_APP_ORIGIN?.trim().replace(/\/+$/, "") ?? "";
  if (!apiKey || !from || !appOrigin) {
    return { sent: false, errorCode: "missing_configuration" };
  }

  const signInUrl = new URL(appOrigin);
  signInUrl.hash = new URLSearchParams({ magicLinkToken: token }).toString();
  const expirationLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  }).format(new Date(expiresAt));

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": `film-magic-link/${magicLinkId}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Sign in to Film",
        text: `Use this one-time link to sign in to Film: ${signInUrl.toString()}\n\nThis link expires ${expirationLabel}. If you did not request it, you can ignore this email.`,
        html: `<p>Use this one-time link to sign in to Film.</p><p><a href="${escapeHtmlAttribute(signInUrl.toString())}">Sign in to Film</a></p><p>This link expires ${escapeHtmlText(expirationLabel)}. If you did not request it, you can ignore this email.</p>`,
      }),
    });
    if (!response.ok) {
      return { sent: false, errorCode: `resend_${response.status}` };
    }
    return { sent: true, errorCode: null };
  } catch {
    return { sent: false, errorCode: "resend_unavailable" };
  }
}

async function expireMagicLink(db: D1Database | undefined, token: string): Promise<void> {
  if (!db) return;
  try {
    await db.prepare(`
      UPDATE magic_links
      SET consumed_at = ?
      WHERE token_hash = ?
        AND consumed_at IS NULL
    `).bind(new Date().toISOString(), await sha256Hex(token)).run();
  } catch {
    // Delivery already failed closed; cleanup is best effort.
  }
}

async function revokeSession(
  env: Env,
  sessionId: string | null,
  csrfToken: string,
): Promise<
  | { ok: true; persistence: AuthPersistence }
  | { ok: false; error: string; status: number; persistence: AuthPersistence }
> {
  if (!sessionId) {
    return { ok: true, persistence: authPersistenceMode(env) };
  }

  if (!env.DB) {
    if (isLiveMagicLinkDelivery(env)) {
      return { ok: false, error: "auth_storage_unavailable", status: 503, persistence: "d1_kv_auth_records" };
    }
    if (env.SESSIONS) {
      try {
        await env.SESSIONS.delete(sessionId);
      } catch {
        // The memoryless development cache is non-authoritative.
      }
    }
    return { ok: true, persistence: "dry_run_memoryless" };
  }

  try {
    const csrfHash = await sha256Hex(csrfToken);
    const session = await env.DB.prepare(`
      SELECT id, workspace_id, member_id, csrf_hash, revoked_at, expires_at
      FROM sessions
      WHERE id = ?
      LIMIT 1
    `).bind(sessionId).first<SessionRow>();

    if (session && session.csrf_hash !== csrfHash) {
      return { ok: false, error: "invalid_session", status: 403, persistence: "d1_kv_auth_records" };
    }

    if (session && !session.revoked_at && Date.parse(session.expires_at) >= Date.now()) {
      const revokedAt = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE sessions
        SET revoked_at = ?
        WHERE id = ?
          AND csrf_hash = ?
          AND revoked_at IS NULL
      `).bind(revokedAt, sessionId, csrfHash).run();
    }

    if (env.SESSIONS) {
      try {
        await env.SESSIONS.delete(sessionId);
      } catch {
        // D1 revocation is authoritative; stale cache data cannot revive the session.
      }
    }

    return { ok: true, persistence: "d1_kv_auth_records" };
  } catch {
    if (isLiveMagicLinkDelivery(env)) {
      return { ok: false, error: "auth_storage_unavailable", status: 503, persistence: "d1_kv_auth_records" };
    }
    return { ok: true, persistence: "d1_unavailable_dry_run" };
  }
}

async function findWorkspaceMemberByEmailHash(
  db: D1Database,
  emailHash: string,
): Promise<WorkspaceMemberRow | null> {
  try {
    return await db.prepare(`
      SELECT
        workspace_members.id,
        workspace_members.workspace_id,
        workspace_members.role,
        COALESCE(workspace_member_statuses.status, 'active') AS status
      FROM workspace_members
      LEFT JOIN workspace_member_statuses
        ON workspace_member_statuses.member_id = workspace_members.id
      WHERE workspace_members.email_hash = ?
      LIMIT 1
    `).bind(emailHash).first<WorkspaceMemberRow>();
  } catch {
    return null;
  }
}

async function findWorkspaceMemberByWorkspaceEmailHash(
  db: D1Database,
  workspaceId: string,
  emailHash: string,
): Promise<WorkspaceMemberRow | null> {
  try {
    return await db.prepare(`
      SELECT
        workspace_members.id,
        workspace_members.workspace_id,
        workspace_members.role,
        COALESCE(workspace_member_statuses.status, 'active') AS status
      FROM workspace_members
      LEFT JOIN workspace_member_statuses
        ON workspace_member_statuses.member_id = workspace_members.id
      WHERE workspace_members.workspace_id = ?
        AND workspace_members.email_hash = ?
      LIMIT 1
    `).bind(workspaceId, emailHash).first<WorkspaceMemberRow>();
  } catch {
    return null;
  }
}

async function findWorkspaceMemberById(
  db: D1Database,
  memberId: string,
): Promise<WorkspaceMemberRow | null> {
  try {
    return await db.prepare(`
      SELECT
        workspace_members.id,
        workspace_members.workspace_id,
        workspace_members.role,
        COALESCE(workspace_member_statuses.status, 'active') AS status
      FROM workspace_members
      LEFT JOIN workspace_member_statuses
        ON workspace_member_statuses.member_id = workspace_members.id
      WHERE workspace_members.id = ?
      LIMIT 1
    `).bind(memberId).first<WorkspaceMemberRow>();
  } catch {
    return null;
  }
}

function normalizeWorkspaceMemberStatus(value: string): WorkspaceMemberStatus {
  return value === "invited" || value === "disabled" ? value : "active";
}

function isManagedWorkspaceMemberStatus(value: string): value is Extract<WorkspaceMemberStatus, "active" | "disabled"> {
  return value === "active" || value === "disabled";
}

async function optionalHeaderHash(request: Request, name: string): Promise<string | null> {
  const value = request.headers.get(name);
  return value ? sha256Hex(value) : null;
}

function getCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }
  return null;
}

function isValidImportFile(file: NotionExportFile): boolean {
  return Boolean(
    file
      && typeof file.path === "string"
      && file.path.length <= NOTION_IMPORT_PATH_MAX_CHARS
      && Number.isSafeInteger(file.sizeBytes)
      && (file.sizeBytes ?? -1) >= 0
      && (
        file.contentType === undefined
        || (typeof file.contentType === "string" && file.contentType.length <= NOTION_IMPORT_CONTENT_TYPE_MAX_CHARS)
      ),
  );
}

function isNotionImportManifestWithinBounds(files: NotionExportFile[]): boolean {
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += file.sizeBytes ?? 0;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > NOTION_IMPORT_MANIFEST_MAX_BYTES) return false;
  }
  return true;
}

async function commitNotionPlanningImport(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  rawRecords: unknown[],
): Promise<NotionPlanningImportResult> {
  const accepted: NotionPlanningImportAcceptance[] = [];
  const rejected: Array<{ index: number; reason: string }> = [];
  const records: Array<NotionPlanningImportRecord & { id: string }> = [];
  const recordIndexes = new Map<string, number>();
  const seenIds = new Set<string>();

  for (const [index, rawRecord] of rawRecords.entries()) {
    const normalized = await normalizeNotionPlanningRecord(workspaceId, rawRecord);
    if (!normalized.ok) {
      rejected.push({ index, reason: normalized.reason });
      continue;
    }
    if (seenIds.has(normalized.record.id)) {
      rejected.push({ index, reason: "duplicate_id" });
      continue;
    }
    seenIds.add(normalized.record.id);
    records.push(normalized.record);
    recordIndexes.set(normalized.record.id, index);
    accepted.push({
      id: normalized.record.id,
      kind: normalized.record.kind,
      title: normalized.record.title,
    });
  }

  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      destructiveWrite: false,
      accepted,
      rejected,
      committed: [],
      idempotent: [],
      updatePreview: [],
      updatePreviewDetails: [],
      tableSummary: notionPlanningImportTableSummary(rawRecords, records, rejected, [], [], []),
      error: "planning_import_storage_required",
      errorStatus: 503,
    };
  }

  if (rejected.length > 0) {
    const result: NotionPlanningImportResult = {
      persistence: "d1_planning_import",
      auditPersistence: "dry_run_memoryless",
      destructiveWrite: false,
      accepted,
      rejected,
      committed: [],
      idempotent: [],
      updatePreview: [],
      updatePreviewDetails: [],
      tableSummary: notionPlanningImportTableSummary(rawRecords, records, rejected, [], [], []),
    };
    const auditPersistence = await recordAuditEvent(
      db,
      workspaceId,
      null,
      actorMemberId,
      "import.notion_planning_committed",
      notionPlanningImportAuditMetadata(result),
    );
    return {
      ...result,
      persistence: auditPersistence === "d1_audit_events" ? "d1_planning_import" : "d1_unavailable_import_blocked",
      auditPersistence,
    };
  }

  try {
    await db.prepare("SELECT id FROM locations LIMIT 1").bind().first();

    const committed: string[] = [];
    const idempotent: string[] = [];
    const updatePreview: string[] = [];
    const updatePreviewDetails: NotionPlanningUpdatePreview[] = [];
    const createRecords: Array<{
      record: NotionPlanningImportRecord & { id: string };
      projectId: string | null;
    }> = [];
    for (const record of records) {
      const table = planningTableForKind(record.kind);
      const projectId = record.kind === "role"
        ? null
        : await projectIdForPlanningRecord(db, workspaceId, record.projectTitles, record.projectTitle);
      const existingRow = await findNotionPlanningExistingRow(db, table, record.id);
      if (existingRow) {
        if (existingRow.workspace_id !== workspaceId) {
          rejected.push({ index: recordIndexes.get(record.id) ?? 0, reason: "id_workspace_conflict" });
          continue;
        }
        if (notionPlanningExistingRowMatches(record.kind, existingRow, projectId, record)) {
          idempotent.push(record.id);
        } else {
          updatePreview.push(record.id);
          updatePreviewDetails.push(notionPlanningUpdatePreview(record.kind, existingRow, projectId, record));
        }
        continue;
      }

      createRecords.push({ record, projectId });
      committed.push(record.id);
    }

    if (rejected.length > 0) {
      const result: NotionPlanningImportResult = {
        persistence: "d1_planning_import",
        auditPersistence: "dry_run_memoryless",
        destructiveWrite: false,
        accepted,
        rejected,
        committed: [],
        idempotent: [],
        updatePreview: [],
        updatePreviewDetails: [],
        tableSummary: notionPlanningImportTableSummary(rawRecords, records, rejected, [], [], []),
      };
      const auditPersistence = await recordAuditEvent(
        db,
        workspaceId,
        null,
        actorMemberId,
        "import.notion_planning_committed",
        notionPlanningImportAuditMetadata(result),
      );
      return {
        ...result,
        persistence: auditPersistence === "d1_audit_events" ? "d1_planning_import" : "d1_unavailable_import_blocked",
        auditPersistence,
      };
    }

    const result: NotionPlanningImportResult = {
      persistence: "d1_planning_import",
      auditPersistence: "d1_audit_events",
      destructiveWrite: committed.length > 0,
      accepted,
      rejected,
      committed,
      idempotent,
      updatePreview,
      updatePreviewDetails: updatePreviewDetails.slice(0, 20),
      tableSummary: notionPlanningImportTableSummary(rawRecords, records, rejected, committed, idempotent, updatePreview),
    };
    const timestamp = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    for (const { record, projectId } of createRecords) {
      statements.push(notionPlanningCreateAssertion(db, record.kind, record.id));
      if (projectId) statements.push(restoreProjectScopeAssertion(db, workspaceId, projectId));
      statements.push(notionPlanningRecordStatement(db, workspaceId, projectId, record, timestamp));
    }
    statements.push(db.prepare(`
      INSERT INTO audit_events (
        id,
        workspace_id,
        project_id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `audit_${crypto.randomUUID()}`,
      workspaceId,
      null,
      actorMemberId,
      "import.notion_planning_committed",
      JSON.stringify(notionPlanningImportAuditMetadata(result)),
      timestamp,
    ));

    if (statements.length > NOTION_PLANNING_BATCH_MAX_STATEMENTS) {
      return {
        ...result,
        persistence: "d1_unavailable_import_blocked",
        auditPersistence: "d1_unavailable_dry_run",
        destructiveWrite: false,
        committed: [],
        tableSummary: notionPlanningImportTableSummary(rawRecords, records, rejected, [], idempotent, updatePreview),
        error: "planning_import_batch_too_large",
        errorStatus: 422,
      };
    }

    const batchResults = await db.batch(statements);
    if (batchResults.length !== statements.length || batchResults.some((batchResult) => !batchResult.success)) {
      throw new Error("Notion planning import batch did not commit every statement.");
    }
    return result;
  } catch {
    return {
      persistence: "d1_unavailable_import_blocked",
      auditPersistence: "d1_unavailable_dry_run",
      destructiveWrite: false,
      accepted,
      rejected,
      committed: [],
      idempotent: [],
      updatePreview: [],
      updatePreviewDetails: [],
      tableSummary: notionPlanningImportTableSummary(rawRecords, records, rejected, [], [], []),
      error: "planning_import_storage_unavailable",
      errorStatus: 503,
    };
  }
}

function notionPlanningImportAuditMetadata(result: NotionPlanningImportResult): Record<string, unknown> {
  return {
    persistence: result.persistence,
    acceptedCount: result.accepted.length,
    committedCount: result.committed.length,
    idempotentCount: result.idempotent.length,
    updatePreviewCount: result.updatePreview.length,
    rejectedCount: result.rejected.length,
    tableSummary: result.tableSummary,
    destructiveWrite: result.destructiveWrite,
  };
}

function notionPlanningCreateAssertion(
  db: D1Database,
  kind: NotionPlanningRecordKind,
  id: string,
): D1PreparedStatement {
  const table = planningTableForKind(kind);
  return db.prepare(`
    SELECT CASE
      WHEN NOT EXISTS (SELECT 1 FROM ${table} WHERE id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS import_assertion
  `).bind(id);
}

function notionPlanningImportTableSummary(
  rawRecords: unknown[],
  records: Array<NotionPlanningImportRecord & { id: string }>,
  rejected: Array<{ index: number; reason: string }>,
  committed: string[],
  idempotent: string[],
  updatePreview: string[],
): NotionPlanningImportTableSummary[] {
  const committedIds = new Set(committed);
  const idempotentIds = new Set(idempotent);
  const updatePreviewIds = new Set(updatePreview);
  const rows = new Map<NotionPlanningRecordKind, NotionPlanningImportTableSummary>();
  const rowForKind = (kind: NotionPlanningRecordKind): NotionPlanningImportTableSummary => {
    const existing = rows.get(kind);
    if (existing) return existing;
    const row = {
      kind,
      tableName: NOTION_PLANNING_TABLES[kind],
      acceptedCount: 0,
      committedCount: 0,
      idempotentCount: 0,
      updatePreviewCount: 0,
      rejectedCount: 0,
    };
    rows.set(kind, row);
    return row;
  };

  for (const record of records) {
    const row = rowForKind(record.kind);
    row.acceptedCount += 1;
    if (committedIds.has(record.id)) row.committedCount += 1;
    if (idempotentIds.has(record.id)) row.idempotentCount += 1;
    if (updatePreviewIds.has(record.id)) row.updatePreviewCount += 1;
  }

  for (const rejection of rejected) {
    const rawRecord = rawRecords[rejection.index];
    if (!isObjectRecord(rawRecord) || !isNotionPlanningRecordKind(rawRecord.kind)) continue;
    rowForKind(rawRecord.kind).rejectedCount += 1;
  }

  return [...rows.values()]
    .filter((row) => row.acceptedCount + row.committedCount + row.idempotentCount + row.rejectedCount > 0)
    .sort((left, right) => left.tableName.localeCompare(right.tableName));
}

async function findNotionPlanningExistingRow(
  db: D1Database,
  table: string,
  id: string,
): Promise<NotionPlanningExistingRow | null> {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`).bind(id).first<NotionPlanningExistingRow>();
}

function notionPlanningExistingRowMatches(
  kind: NotionPlanningRecordKind,
  row: NotionPlanningExistingRow,
  projectId: string | null,
  record: NotionPlanningImportRecord & { id: string },
): boolean {
  return stableJson(notionPlanningExistingRowSignature(kind, row))
    === stableJson(notionPlanningIncomingRowSignature(kind, projectId, record));
}

function notionPlanningUpdatePreview(
  kind: NotionPlanningRecordKind,
  row: NotionPlanningExistingRow,
  projectId: string | null,
  record: NotionPlanningImportRecord & { id: string },
): NotionPlanningUpdatePreview {
  const existing = notionPlanningExistingRowSignature(kind, row);
  const incoming = notionPlanningIncomingRowSignature(kind, projectId, record);
  const fieldChanges = notionPlanningSignatureFieldChanges(existing, incoming);
  return {
    id: record.id,
    kind,
    tableName: NOTION_PLANNING_TABLES[kind],
    title: record.title,
    fieldChangeCount: fieldChanges.length,
    fieldChanges: fieldChanges.slice(0, 8),
  };
}

function notionPlanningSignatureFieldChanges(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): NotionPlanningUpdatePreview["fieldChanges"] {
  const changes: NotionPlanningUpdatePreview["fieldChanges"] = [];
  comparePlanningSignatureValue(changes, "title", existing.title, incoming.title);
  comparePlanningSignatureValue(changes, "projectId", existing.projectId, incoming.projectId);
  comparePlanningSignatureValue(changes, "sourcePath", existing.sourcePath, incoming.sourcePath);
  comparePlanningSignatureValue(changes, "projectTitles", existing.projectTitles, incoming.projectTitles);

  const existingFields = isObjectRecord(existing.fields) ? existing.fields : {};
  const incomingFields = isObjectRecord(incoming.fields) ? incoming.fields : {};
  const fieldKeys = new Set([...Object.keys(existingFields), ...Object.keys(incomingFields)]);
  for (const key of [...fieldKeys].sort()) {
    comparePlanningSignatureValue(changes, `fields.${key}`, existingFields[key], incomingFields[key]);
  }
  return changes;
}

function comparePlanningSignatureValue(
  changes: NotionPlanningUpdatePreview["fieldChanges"],
  field: string,
  currentValue: unknown,
  incomingValue: unknown,
): void {
  if (stableJson(currentValue) === stableJson(incomingValue)) return;
  changes.push({
    field: field.slice(0, 120),
    currentValue: planningDiffValue(currentValue),
    incomingValue: planningDiffValue(incomingValue),
  });
}

function planningDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map(planningDiffValue).filter(Boolean).join(", ").slice(0, 200);
  if (typeof value === "object") return stableJson(value).slice(0, 200);
  return String(value).slice(0, 200);
}

function notionPlanningExistingRowSignature(
  kind: NotionPlanningRecordKind,
  row: NotionPlanningExistingRow,
): Record<string, unknown> {
  const notes = notionPlanningNotesFields(row.notes ?? row.notes_markdown ?? row.description ?? null);
  if (kind === "location") {
    return {
      projectId: row.project_id ?? null,
      title: row.name ?? row.title ?? "",
      fields: {
        Type: row.location_type ?? "",
        ...notes.fields,
      },
      sourcePath: notes.sourcePath,
      projectTitles: notes.projectTitles,
    };
  }
  if (kind === "opportunity") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: {
        Type: row.opportunity_type ?? "",
        "Due Date": row.due_at ?? "",
        Website: row.website_url ?? "",
        Tags: parseJsonStringList(row.tags_json as string | null).join(", "),
        ...notes.fields,
      },
      sourcePath: notes.sourcePath,
      projectTitles: notes.projectTitles,
    };
  }
  if (kind === "meeting_note") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: {
        Type: row.meeting_type ?? "",
        Date: row.meeting_at ?? "",
        Participants: parseJsonStringList(row.participants_json as string | null).join(", "),
        ...notes.fields,
      },
      sourcePath: notes.sourcePath,
      projectTitles: notes.projectTitles,
    };
  }
  if (kind === "equipment_request") {
    return {
      projectId: row.project_id ?? null,
      title: notes.title ?? row.title ?? row.id ?? "",
      fields: {
        "Checkout Date": row.checkout_start ?? "",
        "Return Date": row.checkout_end ?? "",
        Status: row.status ?? "",
        ...notes.fields,
      },
      sourcePath: notes.sourcePath,
      projectTitles: notes.projectTitles,
    };
  }
  if (kind === "show") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: {
        Type: row.show_type ?? "",
        Channels: parseJsonStringList(row.channels_json as string | null).join(", "),
        ...notes.fields,
      },
      sourcePath: notes.sourcePath,
      projectTitles: notes.projectTitles,
    };
  }
  if (kind === "merch") {
    return {
      projectId: row.project_id ?? null,
      title: row.name ?? row.title ?? "",
      fields: {
        Category: row.category ?? "",
        Quantity: row.quantity_on_hand ?? "",
        ...notes.fields,
      },
      sourcePath: notes.sourcePath,
      projectTitles: notes.projectTitles,
    };
  }
  if (kind === "media") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: {
        Type: row.media_type ?? "",
        URL: row.url ?? "",
        Tags: parseJsonStringList(row.tags_json as string | null).join(", "),
        ...notes.fields,
      },
      sourcePath: notes.sourcePath,
      projectTitles: notes.projectTitles,
    };
  }
  return {
    projectId: null,
    title: row.name ?? row.title ?? "",
    fields: {
      Department: row.department ?? "",
      ...notes.fields,
    },
    sourcePath: notes.sourcePath,
    projectTitles: notes.projectTitles,
  };
}

function notionPlanningIncomingRowSignature(
  kind: NotionPlanningRecordKind,
  projectId: string | null,
  record: NotionPlanningImportRecord & { id: string },
): Record<string, unknown> {
  const withNotes = (fields: Record<string, unknown>) => ({
    projectId: kind === "role" ? null : projectId,
    title: record.title,
    fields: {
      ...fields,
      ...record.fields,
    },
    sourcePath: record.sourcePath,
    projectTitles: record.projectTitles,
  });
  if (kind === "location") {
    return withNotes({
      Type: planningField(record.fields, ["Type", "Location Type", "Category"], 80) ?? "",
    });
  }
  if (kind === "opportunity") {
    return withNotes({
      Type: planningField(record.fields, ["Type", "Opportunity Type", "Category"], 80) ?? "",
      "Due Date": planningField(record.fields, ["Due Date", "Due", "Date"], 80) ?? "",
      Website: planningField(record.fields, ["Website", "Website URL", "URL", "Link"], 500) ?? "",
      Tags: planningList(record.fields, ["Tags", "Category"]).join(", "),
    });
  }
  if (kind === "meeting_note") {
    return withNotes({
      Type: planningField(record.fields, ["Type", "Meeting Type"], 80) ?? "",
      Date: planningField(record.fields, ["Date", "Meeting Date", "Meeting At"], 80) ?? "",
      Participants: planningList(record.fields, ["Participants", "Attendees", "Team"]).join(", "),
    });
  }
  if (kind === "equipment_request") {
    return {
      projectId,
      title: record.id,
      fields: {
        "Checkout Date": planningField(record.fields, ["Checkout Date", "Checkout Start", "Start"], 80) ?? "",
        "Return Date": planningField(record.fields, ["Return Date", "Checkout End", "End"], 80) ?? "",
        Status: planningEquipmentRequestStatus(record.fields),
        ...record.fields,
      },
      sourcePath: record.sourcePath,
      projectTitles: record.projectTitles,
    };
  }
  if (kind === "show") {
    return {
      projectId,
      title: record.title,
      fields: {
        Type: planningField(record.fields, ["Type", "Show Type"], 80) ?? "",
        Channels: planningList(record.fields, ["Channels", "Channel", "Platform"]).join(", "),
      },
    };
  }
  if (kind === "merch") {
    return withNotes({
      Category: planningField(record.fields, ["Category", "Type"], 80) ?? "",
      Quantity: planningQuantity(record.fields),
    });
  }
  if (kind === "media") {
    return withNotes({
      Type: planningField(record.fields, ["Type", "Media Type"], 80) ?? "",
      URL: planningField(record.fields, ["URL", "Website", "Link"], 500) ?? "",
      Tags: planningList(record.fields, ["Tags", "Topics", "Category"]).join(", "),
    });
  }
  return withNotes({
    Department: planningField(record.fields, ["Department", "Dept"], 80) ?? "",
  });
}

function notionPlanningNotesFields(value: string | number | null): {
  sourcePath: string;
  projectTitles: string[];
  fields: Record<string, string>;
  title?: string;
} {
  if (typeof value !== "string" || !value) {
    return { sourcePath: "", projectTitles: [], fields: {} };
  }
  try {
    const parsed = JSON.parse(value) as {
      sourcePath?: unknown;
      projectTitles?: unknown;
      fields?: unknown;
      title?: unknown;
    };
    return {
      sourcePath: typeof parsed.sourcePath === "string" ? parsed.sourcePath : "",
      projectTitles: Array.isArray(parsed.projectTitles)
        ? parsed.projectTitles.filter((title): title is string => typeof title === "string")
        : [],
      fields: normalizePlanningImportFields(parsed.fields),
      ...(typeof parsed.title === "string" ? { title: parsed.title } : {}),
    };
  } catch {
    return { sourcePath: "", projectTitles: [], fields: {} };
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== "" && entryValue !== null && entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function normalizeNotionPlanningRecord(
  workspaceId: string,
  rawRecord: unknown,
): Promise<
  | { ok: true; record: NotionPlanningImportRecord & { id: string } }
  | { ok: false; reason: string }
> {
  if (!isObjectRecord(rawRecord)) {
    return { ok: false, reason: "invalid_record" };
  }

  const kind = rawRecord.kind;
  if (!isNotionPlanningRecordKind(kind)) {
    return { ok: false, reason: "invalid_kind" };
  }

  const title = typeof rawRecord.title === "string" ? rawRecord.title.trim().slice(0, 160) : "";
  if (!title) {
    return { ok: false, reason: "invalid_title" };
  }

  const sourcePath = typeof rawRecord.sourcePath === "string" ? rawRecord.sourcePath.trim().slice(0, 240) : "";
  if (!isSafeImportSourcePath(sourcePath)) {
    return { ok: false, reason: "invalid_source_path" };
  }

  const projectTitle = typeof rawRecord.projectTitle === "string"
    ? rawRecord.projectTitle.trim().slice(0, 160) || null
    : null;
  const projectTitles = normalizePlanningProjectTitles(rawRecord.projectTitles, projectTitle);
  const fields = normalizePlanningImportFields(rawRecord.fields);
  const record = {
    kind,
    title,
    sourcePath,
    projectTitle,
    projectTitles,
    fields,
    id: await planningImportRecordId(workspaceId, kind, title, sourcePath),
  };

  return { ok: true, record };
}

function normalizePlanningProjectTitles(value: unknown, fallbackTitle: string | null): string[] {
  const candidates = Array.isArray(value)
    ? value
    : fallbackTitle
      ? relationTextValues(fallbackTitle)
      : [];
  const titles: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const title = candidate.trim().slice(0, 160);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
    if (titles.length >= 20) break;
  }
  return titles;
}

function isNotionPlanningRecordKind(value: unknown): value is NotionPlanningRecordKind {
  return value === "location"
    || value === "opportunity"
    || value === "meeting_note"
    || value === "equipment_request"
    || value === "show"
    || value === "merch"
    || value === "media"
    || value === "role";
}

function normalizePlanningImportFields(value: unknown): Record<string, string> {
  if (!isObjectRecord(value)) return {};

  const fields: Record<string, string> = {};
  for (const [key, fieldValue] of Object.entries(value).slice(0, 40)) {
    if (typeof fieldValue !== "string") continue;
    const normalizedKey = key.trim().slice(0, 80);
    const normalizedValue = fieldValue.trim().slice(0, 500);
    if (normalizedKey && normalizedValue) {
      fields[normalizedKey] = normalizedValue;
    }
  }
  return fields;
}

function isSafeImportSourcePath(value: string): boolean {
  if (!value || value.includes("\0") || value.includes("\\") || value.startsWith("/") || /^[a-zA-Z]:/.test(value)) {
    return false;
  }
  const segments = value.split("/");
  return segments.every((segment) => segment && segment !== "." && segment !== "..") && segments[0] !== "__MACOSX";
}

async function planningImportRecordId(
  workspaceId: string,
  kind: NotionPlanningRecordKind,
  title: string,
  sourcePath: string,
): Promise<string> {
  const hash = await sha256Hex([workspaceId, kind, title.toLowerCase(), sourcePath].join(":"));
  return `notion_${kind}_${hash.slice(0, 32)}`;
}

function planningTableForKind(kind: NotionPlanningRecordKind): string {
  return NOTION_PLANNING_TABLES[kind];
}

async function projectIdForPlanningRecord(
  db: D1Database,
  workspaceId: string,
  projectTitles: string[],
  projectTitle: string | null,
): Promise<string | null> {
  const titles = projectTitles.length > 0 ? projectTitles : projectTitle ? relationTextValues(projectTitle) : [];
  if (titles.length === 0) return null;

  for (const title of titles) {
    const project = await db.prepare(`
      SELECT id
      FROM projects
      WHERE workspace_id = ?
        AND lower(title) = lower(?)
      LIMIT 1
    `).bind(workspaceId, title).first<{ id: string }>();
    if (project) return project.id;
  }

  return null;
}

function notionPlanningRecordStatement(
  db: D1Database,
  workspaceId: string,
  projectId: string | null,
  record: NotionPlanningImportRecord & { id: string },
  timestamp: string,
): D1PreparedStatement {
  const notes = planningImportNotes(record);
  if (record.kind === "location") {
    return db.prepare(`
      INSERT INTO locations (
        id, workspace_id, project_id, parent_location_id, name, location_type,
        permit_required, release_required, notes, sensitive, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, ?, ?, 0, 0, ?, 1, ?, ?)
    `).bind(record.id, workspaceId, projectId, record.title, planningField(record.fields, ["Type", "Location Type", "Category"], 80), notes, timestamp, timestamp);
  }

  if (record.kind === "opportunity") {
    return db.prepare(`
      INSERT INTO opportunities (
        id, workspace_id, project_id, title, opportunity_type, status, due_at,
        website_url, tags_json, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'tracking', ?, ?, ?, ?, ?, ?)
    `).bind(
      record.id,
      workspaceId,
      projectId,
      record.title,
      planningField(record.fields, ["Type", "Opportunity Type", "Category"], 80),
      planningField(record.fields, ["Due Date", "Due", "Date"], 80),
      planningField(record.fields, ["Website", "Website URL", "URL", "Link"], 500),
      JSON.stringify(planningList(record.fields, ["Tags", "Category"])),
      notes,
      timestamp,
      timestamp,
    );
  }

  if (record.kind === "meeting_note") {
    return db.prepare(`
      INSERT INTO meeting_notes (
        id, workspace_id, project_id, title, meeting_type, meeting_at,
        participants_json, notes_markdown, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.id,
      workspaceId,
      projectId,
      record.title,
      planningField(record.fields, ["Type", "Meeting Type"], 80),
      planningField(record.fields, ["Date", "Meeting Date", "Meeting At"], 80),
      JSON.stringify(planningList(record.fields, ["Participants", "Attendees", "Team"])),
      notes,
      timestamp,
      timestamp,
    );
  }

  if (record.kind === "equipment_request") {
    return db.prepare(`
      INSERT INTO equipment_requests (
        id, workspace_id, project_id, equipment_id, requester_member_id, approved_by_member_id,
        checkout_start, checkout_end, returned_at, status, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, ?, ?, ?, ?)
    `).bind(
      record.id,
      workspaceId,
      projectId,
      planningField(record.fields, ["Checkout Date", "Checkout Start", "Start"], 80),
      planningField(record.fields, ["Return Date", "Checkout End", "End"], 80),
      planningEquipmentRequestStatus(record.fields),
      notes,
      timestamp,
      timestamp,
    );
  }

  if (record.kind === "show") {
    return db.prepare(`
      INSERT INTO shows (
        id, workspace_id, project_id, title, show_type, channels_json, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      record.id,
      workspaceId,
      projectId,
      record.title,
      planningField(record.fields, ["Type", "Show Type"], 80),
      JSON.stringify(planningList(record.fields, ["Channels", "Channel", "Platform"])),
      timestamp,
      timestamp,
    );
  }

  if (record.kind === "merch") {
    return db.prepare(`
      INSERT INTO merch_items (
        id, workspace_id, project_id, name, category, quantity_on_hand, image_ref, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `).bind(
      record.id,
      workspaceId,
      projectId,
      record.title,
      planningField(record.fields, ["Category", "Type"], 80),
      planningQuantity(record.fields),
      notes,
      timestamp,
      timestamp,
    );
  }

  if (record.kind === "media") {
    return db.prepare(`
      INSERT INTO media_items (
        id, workspace_id, project_id, title, media_type, url, tags_json, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.id,
      workspaceId,
      projectId,
      record.title,
      planningField(record.fields, ["Type", "Media Type"], 80),
      planningField(record.fields, ["URL", "Website", "Link"], 500),
      JSON.stringify(planningList(record.fields, ["Tags", "Topics", "Category"])),
      notes,
      timestamp,
      timestamp,
    );
  }

  return db.prepare(`
    INSERT INTO production_roles (
      id, workspace_id, name, department, description, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    record.id,
    workspaceId,
    record.title,
    planningField(record.fields, ["Department", "Dept"], 80),
    notes,
    timestamp,
  );
}

async function recordRestorePlanningPreview(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  snapshotWorkspaceId: string,
  backupCreatedAt: string | null,
  result: RestorePlanningDryRunResult,
): Promise<{
  planningPreviewId: string | null;
  status: "preview_only";
  persistence: RestorePlanningPreviewPersistence;
  auditPersistence: AuditPersistence;
}> {
  const status = "preview_only";
  const planningPreviewId = `restore_planning_preview_${crypto.randomUUID()}`;
  if (!db) {
    return {
      planningPreviewId: null,
      status,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
    };
  }

  try {
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const updatePreviewSummary = result.updatePreviewDetails.slice(0, 20).map((detail) => ({
      id: detail.id,
      kind: detail.kind,
      tableName: detail.tableName,
      title: detail.title,
      fieldChangeCount: detail.fieldChangeCount,
      fieldKeys: detail.fieldChanges.slice(0, 8).map((change) => change.field),
    }));
    const statements = [
      db.prepare(`
      INSERT INTO restore_planning_previews (
        id,
        workspace_id,
        actor_member_id,
        snapshot_workspace_id,
        backup_created_at,
        persistence,
        accepted_count,
        create_preview_count,
        idempotent_count,
        update_preview_count,
        rejected_count,
        table_summary_json,
        update_preview_json,
        rejected_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      planningPreviewId,
      workspaceId,
      actorMemberId,
      snapshotWorkspaceId,
      backupCreatedAt,
      result.persistence,
      result.accepted.length,
      result.createPreview.length,
      result.idempotent.length,
      result.updatePreview.length,
      result.rejected.length,
      JSON.stringify(result.tableSummary),
      JSON.stringify(updatePreviewSummary),
      JSON.stringify(result.rejected.slice(0, 50)),
      status,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_restore_planning_preview_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.planning_dry_run_created",
        {
          planningPreviewId,
          planningPreviewPersistence: "d1_restore_planning_previews",
          persistence: result.persistence,
          acceptedCount: result.accepted.length,
          createPreviewCount: result.createPreview.length,
          idempotentCount: result.idempotent.length,
          updatePreviewCount: result.updatePreview.length,
          rejectedCount: result.rejected.length,
          tableSummary: result.tableSummary,
          destructiveWrite: false,
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((batchResult) => !batchResult.success)
      || Number(results[0]?.meta?.changes ?? 0) !== 1
      || Number(results[1]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore planning preview batch did not apply exactly once");
    }
    return {
      planningPreviewId,
      status,
      persistence: "d1_restore_planning_previews",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return {
      planningPreviewId: null,
      status,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }
}

async function findRestorePlanningPreview(
  db: D1Database,
  workspaceId: string,
  planningPreviewId: string,
): Promise<RestorePlanningPreviewRow | null> {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      actor_member_id,
      snapshot_workspace_id,
      backup_created_at,
      persistence,
      accepted_count,
      create_preview_count,
      idempotent_count,
      update_preview_count,
      rejected_count,
      table_summary_json,
      update_preview_json,
      rejected_json,
      status,
      destructive_write,
      created_at
    FROM restore_planning_previews
    WHERE workspace_id = ? AND id = ?
    LIMIT 1
  `).bind(workspaceId, planningPreviewId).first<RestorePlanningPreviewRow>();
}

function restorePlanningPreviewMatches(row: RestorePlanningPreviewRow, result: RestorePlanningDryRunResult): boolean {
  return row.accepted_count === result.accepted.length
    && row.create_preview_count === result.createPreview.length
    && row.idempotent_count === result.idempotent.length
    && row.update_preview_count === result.updatePreview.length
    && row.rejected_count === result.rejected.length
    && stableJson(jsonValueFromString(row.table_summary_json, [])) === stableJson(result.tableSummary);
}

function restorePlanningPreviewSummary(value: RestorePlanningPreviewRow | RestorePlanningDryRunResult): Record<string, unknown> {
  if ("accepted_count" in value) {
    return {
      acceptedCount: value.accepted_count,
      createPreviewCount: value.create_preview_count,
      idempotentCount: value.idempotent_count,
      updatePreviewCount: value.update_preview_count,
      rejectedCount: value.rejected_count,
      tableSummary: jsonValueFromString(value.table_summary_json, []),
    };
  }
  return {
    acceptedCount: value.accepted.length,
    createPreviewCount: value.createPreview.length,
    idempotentCount: value.idempotent.length,
    updatePreviewCount: value.updatePreview.length,
    rejectedCount: value.rejected.length,
    tableSummary: value.tableSummary,
  };
}

function jsonValueFromString(value: string, fallback: unknown): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

async function commitRestorePlanningRecords(
  db: D1Database,
  workspaceId: string,
  snapshotWorkspaceId: string,
  rawRecords: unknown[],
  preview: RestorePlanningDryRunResult,
  timestamp: string,
  actorMemberId: string | null,
  approval: RestoreApprovalRow,
  commitAttempt: RestoreCommitAttemptRow,
  applicationPreflight: RestoreApplicationPreflightRow,
  planningPreview: RestorePlanningPreviewRow,
  preRestoreBackup: PreRestoreBackupProof,
): Promise<
  | {
    ok: true;
    planningCommitId: string;
    status: "applied_planning_records";
    persistence: "d1_restore_planning_commits";
    auditPersistence: "d1_audit_events";
    result: RestorePlanningCommitResult;
  }
  | {
    ok: false;
    error: "restore_planning_batch_too_large" | "restore_planning_commit_storage_unavailable";
    persistence: "d1_unavailable_restore_blocked";
    status: 422 | 503;
  }
> {
  const createIds = new Set(preview.createPreview);
  const updateIds = new Set(preview.updatePreview);
  const idempotentIds = new Set(preview.idempotent);
  const applied: string[] = [];
  const skipped: string[] = [];
  const appliedByKind = new Map<NotionPlanningRecordKind, number>();
  const skippedByKind = new Map<NotionPlanningRecordKind, number>();
  const statements: D1PreparedStatement[] = [];

  for (const rawRecord of rawRecords) {
    const normalized = normalizeRestorePlanningRecord(snapshotWorkspaceId, rawRecord);
    if (!normalized.ok) continue;
    const record = normalized.record;
    if (idempotentIds.has(record.id)) {
      skipped.push(record.id);
      skippedByKind.set(record.kind, (skippedByKind.get(record.kind) ?? 0) + 1);
      continue;
    }
    if (!createIds.has(record.id) && !updateIds.has(record.id)) {
      continue;
    }
    const action = createIds.has(record.id) ? "create" : "update";
    statements.push(restorePlanningTargetActionAssertion(db, workspaceId, record, action));
    if (record.projectId) {
      statements.push(restoreProjectScopeAssertion(db, workspaceId, record.projectId));
    }
    statements.push(restorePlanningRecordStatement(db, workspaceId, record, timestamp));
    applied.push(record.id);
    appliedByKind.set(record.kind, (appliedByKind.get(record.kind) ?? 0) + 1);
  }

  const result: RestorePlanningCommitResult = {
    applied,
    skipped,
    appliedCount: applied.length,
    skippedCount: skipped.length,
    createCount: preview.createPreview.length,
    updateCount: preview.updatePreview.length,
    idempotentCount: preview.idempotent.length,
    tableSummary: preview.tableSummary.map((row) => ({
      ...row,
      appliedCount: appliedByKind.get(row.kind) ?? 0,
      skippedCount: skippedByKind.get(row.kind) ?? 0,
    })),
  };
  const planningCommitId = `restore_planning_commit_${crypto.randomUUID()}`;
  const status = "applied_planning_records" as const;
  const auditId = `audit_${crypto.randomUUID()}`;
  statements.push(
    db.prepare(`
      INSERT INTO restore_planning_commits (
        id,
        workspace_id,
        actor_member_id,
        approval_id,
        commit_attempt_id,
        application_preflight_id,
        planning_preview_id,
        pre_restore_backup_id,
        snapshot_workspace_id,
        backup_created_at,
        request_summary_json,
        table_summary_json,
        result_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      planningCommitId,
      workspaceId,
      actorMemberId,
      approval.id,
      commitAttempt.id,
      applicationPreflight.id,
      planningPreview.id,
      preRestoreBackup.restorePointId,
      planningPreview.snapshot_workspace_id,
      planningPreview.backup_created_at,
      JSON.stringify(restorePlanningPreviewSummary(preview)),
      JSON.stringify(result.tableSummary),
      JSON.stringify(result),
      status,
      timestamp,
    ),
    db.prepare(`
      INSERT INTO audit_events (
        id,
        workspace_id,
        project_id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auditId,
      workspaceId,
      null,
      actorMemberId,
      "restore.planning_records_committed",
      JSON.stringify({
        approvalId: approval.id,
        commitAttemptId: commitAttempt.id,
        applicationPreflightId: applicationPreflight.id,
        planningPreviewId: planningPreview.id,
        planningCommitId,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        destructiveWrite: true,
        appliedCount: result.appliedCount,
        skippedCount: result.skippedCount,
        createCount: result.createCount,
        updateCount: result.updateCount,
        idempotentCount: result.idempotentCount,
      }),
      timestamp,
    ),
  );

  if (statements.length > RESTORE_PLANNING_BATCH_MAX_STATEMENTS) {
    return {
      ok: false,
      error: "restore_planning_batch_too_large",
      persistence: "d1_unavailable_restore_blocked",
      status: 422,
    };
  }

  try {
    const results = await db.batch(statements);
    if (results.length !== statements.length || results.some((batchResult) => !batchResult.success)) {
      throw new Error("Restore planning batch did not commit every statement.");
    }
    return {
      ok: true,
      planningCommitId,
      status,
      persistence: "d1_restore_planning_commits",
      auditPersistence: "d1_audit_events",
      result,
    };
  } catch {
    return {
      ok: false,
      error: "restore_planning_commit_storage_unavailable",
      persistence: "d1_unavailable_restore_blocked",
      status: 503,
    };
  }
}

function restorePlanningTargetActionAssertion(
  db: D1Database,
  workspaceId: string,
  record: RestorePlanningDryRunRecord,
  action: "create" | "update",
): D1PreparedStatement {
  const table = planningTableForKind(record.kind);
  if (action === "create") {
    return db.prepare(`
      SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM ${table} WHERE id = ?)
        THEN 1 ELSE abs(-9223372036854775808)
      END AS restore_assertion
    `).bind(record.id);
  }
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM ${table} WHERE id = ? AND workspace_id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_assertion
  `).bind(record.id, workspaceId);
}

function restorePlanningRecordStatement(
  db: D1Database,
  workspaceId: string,
  record: RestorePlanningDryRunRecord,
  timestamp: string,
): D1PreparedStatement {
  const notes = restorePlanningNotes(record);
  const createdAt = record.createdAt || timestamp;
  const updatedAt = record.updatedAt || timestamp;
  if (record.kind === "location") {
    return db.prepare(`
      INSERT INTO locations (
        id, workspace_id, project_id, parent_location_id, name, location_type,
        permit_required, release_required, notes, sensitive, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, ?, ?, 0, 0, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        name = excluded.name,
        location_type = excluded.location_type,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE locations.workspace_id = excluded.workspace_id
    `).bind(
      record.id,
      workspaceId,
      record.projectId,
      record.title,
      restorePlanningField(record.fields, ["locationType", "Type", "Location Type", "Category"], 80),
      notes,
      createdAt,
      updatedAt,
    );
  }

  if (record.kind === "opportunity") {
    return db.prepare(`
      INSERT INTO opportunities (
        id, workspace_id, project_id, title, opportunity_type, status, due_at,
        website_url, tags_json, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'tracking', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        title = excluded.title,
        opportunity_type = excluded.opportunity_type,
        due_at = excluded.due_at,
        website_url = excluded.website_url,
        tags_json = excluded.tags_json,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE opportunities.workspace_id = excluded.workspace_id
    `).bind(
      record.id,
      workspaceId,
      record.projectId,
      record.title,
      restorePlanningField(record.fields, ["opportunityType", "Type", "Opportunity Type", "Category"], 80),
      restorePlanningField(record.fields, ["dueAt", "Due Date", "Due", "Date"], 80),
      restorePlanningField(record.fields, ["websiteUrl", "Website", "Website URL", "URL", "Link"], 500),
      JSON.stringify(restorePlanningList(record.fields, ["tags", "Tags", "Category"])),
      notes,
      createdAt,
      updatedAt,
    );
  }

  if (record.kind === "meeting_note") {
    return db.prepare(`
      INSERT INTO meeting_notes (
        id, workspace_id, project_id, title, meeting_type, meeting_at,
        participants_json, notes_markdown, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        title = excluded.title,
        meeting_type = excluded.meeting_type,
        meeting_at = excluded.meeting_at,
        participants_json = excluded.participants_json,
        notes_markdown = excluded.notes_markdown,
        updated_at = excluded.updated_at
      WHERE meeting_notes.workspace_id = excluded.workspace_id
    `).bind(
      record.id,
      workspaceId,
      record.projectId,
      record.title,
      restorePlanningField(record.fields, ["meetingType", "Type", "Meeting Type"], 80),
      restorePlanningField(record.fields, ["meetingAt", "Date", "Meeting Date", "Meeting At"], 80),
      JSON.stringify(restorePlanningList(record.fields, ["participants", "Participants", "Attendees", "Team"])),
      notes,
      createdAt,
      updatedAt,
    );
  }

  if (record.kind === "equipment_request") {
    return db.prepare(`
      INSERT INTO equipment_requests (
        id, workspace_id, project_id, equipment_id, requester_member_id, approved_by_member_id,
        checkout_start, checkout_end, returned_at, status, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        checkout_start = excluded.checkout_start,
        checkout_end = excluded.checkout_end,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE equipment_requests.workspace_id = excluded.workspace_id
    `).bind(
      record.id,
      workspaceId,
      record.projectId,
      restorePlanningField(record.fields, ["checkoutStart", "Checkout Date", "Checkout Start", "Start"], 80),
      restorePlanningField(record.fields, ["checkoutEnd", "Return Date", "Checkout End", "End"], 80),
      restorePlanningEquipmentRequestStatus(record.fields),
      notes,
      createdAt,
      updatedAt,
    );
  }

  if (record.kind === "show") {
    return db.prepare(`
      INSERT INTO shows (
        id, workspace_id, project_id, title, show_type, channels_json, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        title = excluded.title,
        show_type = excluded.show_type,
        channels_json = excluded.channels_json,
        status = excluded.status,
        updated_at = excluded.updated_at
      WHERE shows.workspace_id = excluded.workspace_id
    `).bind(
      record.id,
      workspaceId,
      record.projectId,
      record.title,
      restorePlanningField(record.fields, ["showType", "Type", "Show Type"], 80),
      JSON.stringify(restorePlanningList(record.fields, ["channels", "Channels", "Channel", "Platform"])),
      restorePlanningField(record.fields, ["status", "Status"], 80) ?? "active",
      createdAt,
      updatedAt,
    );
  }

  if (record.kind === "merch") {
    return db.prepare(`
      INSERT INTO merch_items (
        id, workspace_id, project_id, name, category, quantity_on_hand, image_ref, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        name = excluded.name,
        category = excluded.category,
        quantity_on_hand = excluded.quantity_on_hand,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE merch_items.workspace_id = excluded.workspace_id
    `).bind(
      record.id,
      workspaceId,
      record.projectId,
      record.title,
      restorePlanningField(record.fields, ["category", "Category", "Type"], 80),
      restorePlanningQuantity(record.fields),
      notes,
      createdAt,
      updatedAt,
    );
  }

  if (record.kind === "media") {
    return db.prepare(`
      INSERT INTO media_items (
        id, workspace_id, project_id, title, media_type, url, tags_json, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        title = excluded.title,
        media_type = excluded.media_type,
        url = excluded.url,
        tags_json = excluded.tags_json,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE media_items.workspace_id = excluded.workspace_id
    `).bind(
      record.id,
      workspaceId,
      record.projectId,
      record.title,
      restorePlanningField(record.fields, ["mediaType", "Type", "Media Type"], 80),
      restorePlanningField(record.fields, ["url", "URL", "Website", "Link"], 500),
      JSON.stringify(restorePlanningList(record.fields, ["tags", "Tags", "Topics", "Category"])),
      notes,
      createdAt,
      updatedAt,
    );
  }

  return db.prepare(`
    INSERT INTO production_roles (
      id, workspace_id, name, department, description, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      department = excluded.department,
      description = excluded.description
    WHERE production_roles.workspace_id = excluded.workspace_id
  `).bind(
    record.id,
    workspaceId,
    record.title,
    restorePlanningField(record.fields, ["department", "Department", "Dept"], 80),
    notes,
    createdAt,
  );
}

function restorePlanningField(
  fields: RestorePlanningDryRunRecord["fields"],
  aliases: string[],
  maxLength: number,
): string | null {
  for (const alias of aliases) {
    const key = Object.keys(fields).find((candidate) => candidate.trim().toLowerCase() === alias.toLowerCase());
    const value = key ? fields[key] : undefined;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const joined = value.map((item) => item.trim()).filter(Boolean).join(", ");
      if (joined) return joined.slice(0, maxLength);
      continue;
    }
    const text = String(value).trim();
    if (text) return text.slice(0, maxLength);
  }
  return null;
}

function restorePlanningList(fields: RestorePlanningDryRunRecord["fields"], aliases: string[]): string[] {
  for (const alias of aliases) {
    const key = Object.keys(fields).find((candidate) => candidate.trim().toLowerCase() === alias.toLowerCase());
    const value = key ? fields[key] : undefined;
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean).slice(0, 20);
    }
    if (typeof value === "string") {
      return relationTextValues(value).slice(0, 20);
    }
  }
  return [];
}

function restorePlanningEquipmentRequestStatus(fields: RestorePlanningDryRunRecord["fields"]): string {
  const value = restorePlanningField(fields, ["status", "Status"], 80)?.toLowerCase() ?? "";
  if (["approved", "declined", "checked_out", "returned", "canceled"].includes(value)) return value;
  if (value.includes("approve")) return "approved";
  if (value.includes("decline")) return "declined";
  if (value.includes("return")) return "returned";
  if (value.includes("cancel")) return "canceled";
  if (value.includes("out")) return "checked_out";
  return "requested";
}

function restorePlanningQuantity(fields: RestorePlanningDryRunRecord["fields"]): number {
  const rawValue = restorePlanningField(fields, ["quantityOnHand", "Quantity", "Qty", "Count"], 40) ?? "0";
  const parsed = Number.parseInt(rawValue.replace(/[^0-9-]/g, ""), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 1_000_000) : 0;
}

function restorePlanningNotes(record: RestorePlanningDryRunRecord): string {
  return JSON.stringify({
    source: "restore_backup",
    ...(record.sourcePath ? { sourcePath: record.sourcePath } : {}),
    title: record.title,
    fields: record.fields,
  }).slice(0, 4000);
}

async function previewRestorePlanningRecords(
  db: D1Database | undefined,
  workspaceId: string,
  snapshotWorkspaceId: string,
  rawRecords: unknown[],
): Promise<RestorePlanningDryRunResult> {
  const accepted: RestorePlanningDryRunResult["accepted"] = [];
  const rejected: RestorePlanningDryRunResult["rejected"] = [];
  const records: RestorePlanningDryRunRecord[] = [];
  const seenIds = new Set<string>();

  for (const [index, rawRecord] of rawRecords.entries()) {
    const normalized = normalizeRestorePlanningRecord(snapshotWorkspaceId, rawRecord);
    if (!normalized.ok) {
      rejected.push({ index, reason: normalized.reason });
      continue;
    }
    if (seenIds.has(normalized.record.id)) {
      rejected.push({ index, reason: "duplicate_id" });
      continue;
    }
    seenIds.add(normalized.record.id);
    records.push(normalized.record);
    accepted.push({
      id: normalized.record.id,
      kind: normalized.record.kind,
      title: normalized.record.title,
    });
  }

  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      accepted,
      rejected,
      createPreview: [],
      idempotent: [],
      updatePreview: [],
      updatePreviewDetails: [],
      tableSummary: restorePlanningTableSummary(rawRecords, records, rejected, [], [], []),
    };
  }

  try {
    await db.prepare("SELECT id FROM locations LIMIT 1").bind().first();
    const createPreview: string[] = [];
    const idempotent: string[] = [];
    const updatePreview: string[] = [];
    const updatePreviewDetails: RestorePlanningPreviewDetail[] = [];

    for (const record of records) {
      const table = planningTableForKind(record.kind);
      const existingRow = await findRestorePlanningExistingRow(db, table, workspaceId, record.id);
      if (!existingRow) {
        createPreview.push(record.id);
        continue;
      }
      if (restorePlanningExistingRowMatches(record.kind, existingRow, record)) {
        idempotent.push(record.id);
        continue;
      }
      updatePreview.push(record.id);
      updatePreviewDetails.push(restorePlanningUpdatePreview(record.kind, existingRow, record));
    }

    return {
      persistence: "d1_planning_restore_preview",
      accepted,
      rejected,
      createPreview,
      idempotent,
      updatePreview,
      updatePreviewDetails: updatePreviewDetails.slice(0, 20),
      tableSummary: restorePlanningTableSummary(rawRecords, records, rejected, createPreview, idempotent, updatePreview),
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      accepted,
      rejected,
      createPreview: [],
      idempotent: [],
      updatePreview: [],
      updatePreviewDetails: [],
      tableSummary: restorePlanningTableSummary(rawRecords, records, rejected, [], [], []),
    };
  }
}

function normalizeRestorePlanningRecord(
  snapshotWorkspaceId: string,
  rawRecord: unknown,
): { ok: true; record: RestorePlanningDryRunRecord } | { ok: false; reason: string } {
  if (!isObjectRecord(rawRecord)) {
    return { ok: false, reason: "invalid_record" };
  }
  const kind = rawRecord.kind;
  if (!isNotionPlanningRecordKind(kind)) {
    return { ok: false, reason: "invalid_kind" };
  }
  const id = typeof rawRecord.id === "string" ? rawRecord.id.trim() : "";
  if (!isValidRecordId(id)) {
    return { ok: false, reason: "invalid_id" };
  }
  const workspaceId = typeof rawRecord.workspaceId === "string" ? rawRecord.workspaceId.trim() : "";
  if (workspaceId !== snapshotWorkspaceId) {
    return { ok: false, reason: "workspace_mismatch" };
  }
  let projectId: string | null = null;
  if (rawRecord.projectId !== null && rawRecord.projectId !== undefined) {
    if (typeof rawRecord.projectId !== "string" || !isValidRecordId(rawRecord.projectId.trim())) {
      return { ok: false, reason: "invalid_project_id" };
    }
    projectId = rawRecord.projectId.trim();
  }
  if (kind === "role" && projectId) {
    return { ok: false, reason: "role_project_id_not_allowed" };
  }
  const title = typeof rawRecord.title === "string" ? rawRecord.title.trim().slice(0, 160) : "";
  if (!title) {
    return { ok: false, reason: "invalid_title" };
  }
  const sourcePath = typeof rawRecord.sourcePath === "string" ? rawRecord.sourcePath.trim().slice(0, 240) : "";
  if (sourcePath && !isSafeImportSourcePath(sourcePath)) {
    return { ok: false, reason: "invalid_source_path" };
  }
  const fields = normalizeRestorePlanningFields(rawRecord.fields);
  const createdAt = normalizeRestorePlanningTimestamp(rawRecord.createdAt);
  if (!createdAt.ok) {
    return { ok: false, reason: "invalid_created_at" };
  }
  const updatedAt = normalizeRestorePlanningTimestamp(rawRecord.updatedAt);
  if (!updatedAt.ok) {
    return { ok: false, reason: "invalid_updated_at" };
  }

  return {
    ok: true,
    record: {
      kind,
      id,
      workspaceId,
      projectId,
      title,
      ...(sourcePath ? { sourcePath } : {}),
      fields,
      createdAt: createdAt.value,
      updatedAt: updatedAt.value,
    },
  };
}

function normalizeRestorePlanningTimestamp(
  value: unknown,
): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") return { ok: false };
  const timestamp = value.trim();
  if (!timestamp || timestamp.length > 80) return { ok: false };
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds)) return { ok: false };
  const normalized = new Date(milliseconds);
  const year = normalized.getUTCFullYear();
  if (year < 1900 || year > 2100) return { ok: false };
  return { ok: true, value: normalized.toISOString() };
}

function normalizeRestorePlanningFields(value: unknown): RestorePlanningDryRunRecord["fields"] {
  if (!isObjectRecord(value)) return {};
  const fields: RestorePlanningDryRunRecord["fields"] = {};
  for (const [key, rawValue] of Object.entries(value).slice(0, 60)) {
    const normalizedKey = key.trim().slice(0, 80);
    if (!normalizedKey) continue;
    if (typeof rawValue === "string") {
      fields[normalizedKey] = rawValue.trim().slice(0, 500);
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      fields[normalizedKey] = rawValue;
    } else if (typeof rawValue === "boolean" || rawValue === null) {
      fields[normalizedKey] = rawValue;
    } else if (Array.isArray(rawValue)) {
      fields[normalizedKey] = rawValue
        .filter((item): item is string => typeof item === "string")
        .slice(0, 20)
        .map((item) => item.trim().slice(0, 160))
        .filter(Boolean);
    }
  }
  return fields;
}

async function findRestorePlanningExistingRow(
  db: D1Database,
  table: string,
  workspaceId: string,
  id: string,
): Promise<NotionPlanningExistingRow | null> {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ? AND workspace_id = ? LIMIT 1`)
    .bind(id, workspaceId)
    .first<NotionPlanningExistingRow>();
}

function restorePlanningExistingRowMatches(
  kind: NotionPlanningRecordKind,
  row: NotionPlanningExistingRow,
  record: RestorePlanningDryRunRecord,
): boolean {
  return stableJson(restorePlanningExistingRowSignature(kind, row))
    === stableJson(restorePlanningIncomingRowSignature(record));
}

function restorePlanningUpdatePreview(
  kind: NotionPlanningRecordKind,
  row: NotionPlanningExistingRow,
  record: RestorePlanningDryRunRecord,
): RestorePlanningPreviewDetail {
  const existing = restorePlanningExistingRowSignature(kind, row);
  const incoming = restorePlanningIncomingRowSignature(record);
  const fieldChanges = notionPlanningSignatureFieldChanges(existing, incoming);
  return {
    id: record.id,
    kind,
    tableName: planningTableForKind(kind),
    title: record.title,
    fieldChangeCount: fieldChanges.length,
    fieldChanges: fieldChanges.slice(0, 8),
  };
}

function restorePlanningExistingRowSignature(
  kind: NotionPlanningRecordKind,
  row: NotionPlanningExistingRow,
): Record<string, unknown> {
  if (kind === "location") {
    return { projectId: row.project_id ?? null, title: row.name ?? row.title ?? "", fields: compactSignatureFields({ locationType: row.location_type ?? null }) };
  }
  if (kind === "opportunity") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: compactSignatureFields({
        opportunityType: row.opportunity_type ?? null,
        dueAt: row.due_at ?? null,
        websiteUrl: row.website_url ?? null,
        tags: parseJsonStringList(row.tags_json as string | null),
      }),
    };
  }
  if (kind === "meeting_note") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: compactSignatureFields({
        meetingType: row.meeting_type ?? null,
        meetingAt: row.meeting_at ?? null,
        participants: parseJsonStringList(row.participants_json as string | null),
      }),
    };
  }
  if (kind === "equipment_request") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? row.id ?? "",
      fields: compactSignatureFields({
        status: row.status ?? null,
        checkoutStart: row.checkout_start ?? null,
        checkoutEnd: row.checkout_end ?? null,
      }),
    };
  }
  if (kind === "show") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: compactSignatureFields({
        showType: row.show_type ?? null,
        status: row.status ?? null,
        channels: parseJsonStringList(row.channels_json as string | null),
      }),
    };
  }
  if (kind === "merch") {
    return {
      projectId: row.project_id ?? null,
      title: row.name ?? row.title ?? "",
      fields: compactSignatureFields({
        category: row.category ?? null,
        quantityOnHand: row.quantity_on_hand ?? null,
      }),
    };
  }
  if (kind === "media") {
    return {
      projectId: row.project_id ?? null,
      title: row.title ?? "",
      fields: compactSignatureFields({
        mediaType: row.media_type ?? null,
        url: row.url ?? null,
        tags: parseJsonStringList(row.tags_json as string | null),
      }),
    };
  }
  return {
    projectId: null,
    title: row.name ?? row.title ?? "",
    fields: compactSignatureFields({
      department: row.department ?? null,
    }),
  };
}

function restorePlanningIncomingRowSignature(record: RestorePlanningDryRunRecord): Record<string, unknown> {
  return {
    projectId: record.kind === "role" ? null : record.projectId,
    title: record.title,
    fields: compactSignatureFields(record.fields),
  };
}

function compactSignatureFields(fields: Record<string, unknown>): Record<string, unknown> {
  const compact: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === "" || value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    compact[key] = value;
  }
  return compact;
}

function restorePlanningTableSummary(
  rawRecords: unknown[],
  records: RestorePlanningDryRunRecord[],
  rejected: Array<{ index: number; reason: string }>,
  createPreview: string[],
  idempotent: string[],
  updatePreview: string[],
): RestorePlanningTableSummary[] {
  const createIds = new Set(createPreview);
  const idempotentIds = new Set(idempotent);
  const updatePreviewIds = new Set(updatePreview);
  const rows = new Map<NotionPlanningRecordKind, RestorePlanningTableSummary>();
  const rowForKind = (kind: NotionPlanningRecordKind): RestorePlanningTableSummary => {
    const existing = rows.get(kind);
    if (existing) return existing;
    const row = {
      kind,
      tableName: planningTableForKind(kind),
      acceptedCount: 0,
      createPreviewCount: 0,
      idempotentCount: 0,
      updatePreviewCount: 0,
      rejectedCount: 0,
    };
    rows.set(kind, row);
    return row;
  };

  for (const record of records) {
    const row = rowForKind(record.kind);
    row.acceptedCount += 1;
    if (createIds.has(record.id)) row.createPreviewCount += 1;
    if (idempotentIds.has(record.id)) row.idempotentCount += 1;
    if (updatePreviewIds.has(record.id)) row.updatePreviewCount += 1;
  }

  for (const rejection of rejected) {
    const rawRecord = rawRecords[rejection.index];
    if (!isObjectRecord(rawRecord) || !isNotionPlanningRecordKind(rawRecord.kind)) continue;
    rowForKind(rawRecord.kind).rejectedCount += 1;
  }

  return [...rows.values()]
    .filter((row) => row.acceptedCount + row.rejectedCount > 0)
    .sort((left, right) => left.tableName.localeCompare(right.tableName));
}

async function exportPlanningRows(
  db: D1Database | undefined,
  workspaceId: string,
  limit: number,
): Promise<PlanningExportResult> {
  const exportedAt = new Date().toISOString();
  if (!db) {
    return {
      policy: "d1_planning_rows",
      persistence: "dry_run_memoryless",
      exportedAt,
      rowCount: 0,
      truncated: false,
      records: [],
    };
  }

  try {
    const records: PlanningExportRecord[] = [];
    for (const query of planningExportQueries()) {
      if (records.length > limit) break;
      const remaining = limit + 1 - records.length;
      const result = await db.prepare(query.sql).bind(workspaceId, remaining).all<PlanningExportSourceRow>();
      for (const row of result.results ?? []) {
        records.push(planningExportRecordFromRow(query.kind, row, query.fields(row)));
      }
    }
    const truncated = records.length > limit;
    const cappedRecords = records.slice(0, limit);

    return {
      policy: "d1_planning_rows",
      persistence: "d1_planning_export",
      exportedAt,
      rowCount: cappedRecords.length,
      truncated,
      records: cappedRecords,
    };
  } catch {
    return {
      policy: "d1_planning_rows",
      persistence: "d1_unavailable_dry_run",
      exportedAt,
      rowCount: 0,
      truncated: false,
      records: [],
    };
  }
}

function planningExportQueries(): Array<{
  kind: NotionPlanningRecordKind;
  sql: string;
  fields: (row: PlanningExportSourceRow) => Record<string, string | number | boolean | null | string[]>;
}> {
  return [
    {
      kind: "location",
      sql: `
        SELECT id, workspace_id, project_id, name AS title, location_type, notes, created_at, updated_at
        FROM locations
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        locationType: row.location_type ?? null,
      }),
    },
    {
      kind: "opportunity",
      sql: `
        SELECT id, workspace_id, project_id, title, opportunity_type, due_at, website_url, tags_json, notes, created_at, updated_at
        FROM opportunities
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        opportunityType: row.opportunity_type ?? null,
        dueAt: row.due_at ?? null,
        websiteUrl: row.website_url ?? null,
        tags: parseJsonStringList(row.tags_json ?? null),
      }),
    },
    {
      kind: "meeting_note",
      sql: `
        SELECT id, workspace_id, project_id, title, meeting_type, meeting_at, participants_json, notes_markdown AS notes, created_at, updated_at
        FROM meeting_notes
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        meetingType: row.meeting_type ?? null,
        meetingAt: row.meeting_at ?? null,
        participants: parseJsonStringList(row.participants_json ?? null),
      }),
    },
    {
      kind: "equipment_request",
      sql: `
        SELECT id, workspace_id, project_id, id AS title, checkout_start, checkout_end, status, notes, created_at, updated_at
        FROM equipment_requests
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        status: row.status ?? null,
        checkoutStart: row.checkout_start ?? null,
        checkoutEnd: row.checkout_end ?? null,
      }),
    },
    {
      kind: "show",
      sql: `
        SELECT id, workspace_id, project_id, title, show_type, channels_json, status, NULL AS notes, created_at, updated_at
        FROM shows
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        showType: row.show_type ?? null,
        status: row.status ?? null,
        channels: parseJsonStringList(row.channels_json ?? null),
      }),
    },
    {
      kind: "merch",
      sql: `
        SELECT id, workspace_id, project_id, name AS title, category, quantity_on_hand, notes, created_at, updated_at
        FROM merch_items
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        category: row.category ?? null,
        quantityOnHand: row.quantity_on_hand ?? null,
      }),
    },
    {
      kind: "media",
      sql: `
        SELECT id, workspace_id, project_id, title, media_type, url, tags_json, notes, created_at, updated_at
        FROM media_items
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        mediaType: row.media_type ?? null,
        url: row.url ?? null,
        tags: parseJsonStringList(row.tags_json ?? null),
      }),
    },
    {
      kind: "role",
      sql: `
        SELECT id, workspace_id, NULL AS project_id, name AS title, department, description AS notes, created_at, created_at AS updated_at
        FROM production_roles
        WHERE workspace_id = ?
        ORDER BY created_at, id
        LIMIT ?
      `,
      fields: (row) => compactExportFields({
        department: row.department ?? null,
      }),
    },
  ];
}

function planningExportRecordFromRow(
  kind: NotionPlanningRecordKind,
  row: PlanningExportSourceRow,
  fields: Record<string, string | number | boolean | null | string[]>,
): PlanningExportRecord {
  const imported = parsePlanningImportNotes(row.notes);
  const mergedFields = {
    ...imported.fields,
    ...fields,
  };
  const title = kind === "equipment_request"
    ? imported.fields.Name ?? imported.fields.Equipment ?? row.title
    : row.title;
  const record: PlanningExportRecord = {
    kind,
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id ?? null,
    title,
    fields: mergedFields,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };

  if (imported.sourcePath) {
    record.sourcePath = imported.sourcePath;
  }

  return record;
}

function parsePlanningImportNotes(notes: string | null | undefined): {
  sourcePath?: string;
  fields: Record<string, string>;
} {
  if (!notes) return { fields: {} };

  try {
    const parsed = JSON.parse(notes) as unknown;
    if (!isObjectRecord(parsed)) return { fields: {} };
    const sourcePath = typeof parsed.sourcePath === "string" && isSafeImportSourcePath(parsed.sourcePath)
      ? parsed.sourcePath.slice(0, 240)
      : undefined;
    return {
      sourcePath,
      fields: normalizePlanningImportFields(parsed.fields),
    };
  } catch {
    return { fields: { notes: notes.slice(0, 500) } };
  }
}

function compactExportFields(
  fields: Record<string, string | number | boolean | null | string[]>,
): Record<string, string | number | boolean | null | string[]> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== "";
    }),
  );
}

function parseJsonStringList(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 50);
  } catch {
    return [];
  }
}

function planningField(fields: Record<string, string>, aliases: string[], maxLength: number): string | null {
  for (const alias of aliases) {
    const key = Object.keys(fields).find((candidate) => candidate.trim().toLowerCase() === alias.toLowerCase());
    const value = key ? fields[key]?.trim() : "";
    if (value) return value.slice(0, maxLength);
  }
  return null;
}

function planningList(fields: Record<string, string>, aliases: string[]): string[] {
  const value = planningField(fields, aliases, 500);
  if (!value) return [];
  return relationTextValues(value).slice(0, 20);
}

function relationTextValues(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function planningEquipmentRequestStatus(fields: Record<string, string>): string {
  const value = planningField(fields, ["Status"], 80)?.toLowerCase() ?? "";
  if (["approved", "declined", "checked_out", "returned", "canceled"].includes(value)) return value;
  if (value.includes("approve")) return "approved";
  if (value.includes("decline")) return "declined";
  if (value.includes("return")) return "returned";
  if (value.includes("cancel")) return "canceled";
  if (value.includes("out")) return "checked_out";
  return "requested";
}

function planningQuantity(fields: Record<string, string>): number {
  const rawValue = planningField(fields, ["Quantity", "Qty", "Count"], 40) ?? "0";
  const parsed = Number.parseInt(rawValue.replace(/[^0-9-]/g, ""), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 1_000_000) : 0;
}

function planningImportNotes(record: NotionPlanningImportRecord): string {
  return JSON.stringify({
    source: "notion_export",
    sourcePath: record.sourcePath,
    projectTitles: record.projectTitles,
    fields: record.fields,
  }).slice(0, 4000);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidWorkspaceId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(value);
}

function isValidRecordId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(value);
}

function isValidAuditActionPrefix(value: string): boolean {
  return /^[a-z0-9][a-z0-9._:-]{0,79}$/.test(value);
}

function isValidGoogleDriveId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,256}$/.test(value);
}

function isValidGooglePageToken(value: string): boolean {
  return value.length <= 2_048 && /^[\x21-\x7E]+$/.test(value);
}

function isValidPaginationOffset(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 100_000;
}

function parseIntegerHeader(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function restoreConfirmationPhrase(workspaceId: string): string {
  return `RESTORE ${workspaceId}`;
}

function backupRestorePointMetadata(
  workspaceId: string,
  createdAt: string,
  snapshotRef = `r2://dry-run-backups/${safeObjectSegment(workspaceId)}/${safeTimestampSegment(createdAt)}.filmbackup.zip`,
  id = `restore_${crypto.randomUUID()}`,
): BackupRestorePointMetadata {
  return {
    id,
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(new Date(createdAt)),
    snapshotRef,
    createdAt,
  };
}

async function storeBackupObject(
  bucket: R2Bucket,
  workspaceId: string,
  createdAt: string,
  sha256: string,
  bytes: ArrayBuffer,
): Promise<BackupObjectStoreResult> {
  const objectKey = backupObjectKey(workspaceId, createdAt, sha256);
  const identityHash = await sha256Hex(["backup_object", workspaceId, createdAt, objectKey, sha256].join(":"));
  const restorePoint = backupRestorePointMetadata(
    workspaceId,
    createdAt,
    backupSnapshotRef(objectKey),
    `restore_${identityHash.slice(0, 32)}`,
  );
  let object: R2Object | null;
  try {
    object = await bucket.head(objectKey);
  } catch {
    return { ok: false, error: "backup_object_check_unavailable", status: 503 };
  }
  let idempotent = Boolean(object);
  if (!object) {
    try {
      object = await bucket.put(objectKey, bytes, {
        onlyIf: { etagDoesNotMatch: "*" },
        httpMetadata: {
          contentType: "application/zip",
        },
        customMetadata: {
          workspaceId,
          createdAt,
          sha256,
          sizeBytes: String(bytes.byteLength),
          backupFormat: "film.encrypted-backup.zip",
        },
      });
      if (!object) {
        idempotent = true;
        object = await bucket.head(objectKey);
      }
    } catch {
      return { ok: false, error: "backup_object_upload_failed", status: 503 };
    }
  }
  if (!object || !backupR2ObjectMatches(object, workspaceId, createdAt, sha256, bytes.byteLength)) {
    return { ok: false, error: "backup_object_state_mismatch", status: 409 };
  }

  return {
    ok: true,
    workspaceId,
    createdAt,
    objectKey,
    sizeBytes: bytes.byteLength,
    sha256,
    idempotent,
    restorePoint,
  };
}

function backupR2ObjectMatches(
  object: R2Object,
  workspaceId: string,
  createdAt: string,
  sha256: string,
  sizeBytes: number,
): boolean {
  return object.size === sizeBytes
    && object.customMetadata?.workspaceId === workspaceId
    && object.customMetadata?.createdAt === createdAt
    && object.customMetadata?.sha256 === sha256
    && object.customMetadata?.sizeBytes === String(sizeBytes)
    && object.customMetadata?.backupFormat === "film.encrypted-backup.zip";
}

async function finalizeBackupObjectMetadata(
  db: D1Database,
  workspaceId: string,
  actorMemberId: string | null,
  backup: Extract<BackupObjectStoreResult, { ok: true }>,
): Promise<
  | {
    ok: true;
    restorePointPersistence: "d1_restore_point_metadata";
    auditPersistence: "d1_audit_events";
  }
  | {
    ok: false;
    error: "backup_object_metadata_finalize_failed";
    status: 503;
  }
> {
  const auditId = `audit_backup_${backup.restorePoint.id.slice("restore_".length)}`;
  const statements = [
    db.prepare(`
      SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM restore_points WHERE id = ?)
          OR EXISTS (
            SELECT 1
            FROM restore_points
            WHERE id = ?
              AND workspace_id = ?
              AND snapshot_ref = ?
              AND created_at = ?
          )
        THEN 1 ELSE abs(-9223372036854775808)
      END AS backup_assertion
    `).bind(
      backup.restorePoint.id,
      backup.restorePoint.id,
      workspaceId,
      backup.restorePoint.snapshotRef,
      backup.restorePoint.createdAt,
    ),
    db.prepare(`
      INSERT INTO restore_points (
        id,
        workspace_id,
        label,
        snapshot_ref,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).bind(
      backup.restorePoint.id,
      workspaceId,
      backup.restorePoint.label,
      backup.restorePoint.snapshotRef,
      backup.restorePoint.createdAt,
    ),
    db.prepare(`
      DELETE FROM restore_points
      WHERE workspace_id = ?
        AND id NOT IN (
          SELECT id
          FROM restore_points
          WHERE workspace_id = ?
          ORDER BY created_at DESC
          LIMIT 5
        )
    `).bind(workspaceId, workspaceId),
    db.prepare(`
      INSERT INTO audit_events (
        id,
        workspace_id,
        project_id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).bind(
      auditId,
      workspaceId,
      null,
      actorMemberId,
      "backup.object_stored",
      JSON.stringify({
        restorePointId: backup.restorePoint.id,
        snapshotRef: backup.restorePoint.snapshotRef,
        objectKey: backup.objectKey,
        sizeBytes: backup.sizeBytes,
        sha256: backup.sha256,
        persistence: "r2_backup_object",
        restorePointPersistence: "d1_restore_point_metadata",
        idempotent: backup.idempotent,
      }),
      new Date().toISOString(),
    ),
  ];
  try {
    const results = await db.batch(statements);
    if (results.length !== statements.length || results.some((result) => !result.success)) {
      throw new Error("Backup metadata batch did not commit every statement.");
    }
    return {
      ok: true,
      restorePointPersistence: "d1_restore_point_metadata",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return { ok: false, error: "backup_object_metadata_finalize_failed", status: 503 };
  }
}

function backupObjectKey(workspaceId: string, createdAt: string, sha256: string): string {
  return [
    "workspaces",
    safeObjectSegment(workspaceId),
    "backups",
    `${safeTimestampSegment(createdAt)}-${sha256.slice(0, 16)}.filmbackup.zip`,
  ].join("/");
}

function backupSnapshotRef(objectKey: string): string {
  return `r2://film-backups/${objectKey}`;
}

function backupSnapshotRefPrefix(workspaceId: string): string {
  return backupSnapshotRef(`workspaces/${safeObjectSegment(workspaceId)}/backups/`);
}

function backupObjectKeyFromSnapshotRef(snapshotRef: string): string | null {
  const prefix = "r2://film-backups/";
  return snapshotRef.startsWith(prefix) ? snapshotRef.slice(prefix.length) : null;
}

function isValidBackupObjectKey(workspaceId: string, objectKey: string): boolean {
  return objectKey.startsWith(`workspaces/${safeObjectSegment(workspaceId)}/backups/`)
    && objectKey.endsWith(".filmbackup.zip")
    && !objectKey.includes("..")
    && !objectKey.includes("\0")
    && objectKey.length <= 1024;
}

function safeBackupDownloadName(createdAt: string): string {
  const day = Number.isNaN(Date.parse(createdAt)) ? "unknown" : createdAt.slice(0, 10);
  return `film-backup-${safeObjectSegment(day)}.filmbackup.zip`;
}

function safeTimestampSegment(value: string): string {
  return value.replace(/[:.]/g, "-").replace(/[^0-9TZ-]/g, "_");
}

async function recordBackupRestorePointMetadata(
  db: D1Database | undefined,
  workspaceId: string,
  restorePoint: BackupRestorePointMetadata,
): Promise<BackupPersistence> {
  if (!db) {
    return "dry_run_memoryless";
  }

  try {
    await ensureWorkspaceRow(db, workspaceId, restorePoint.createdAt);
    await db.prepare(`
      INSERT INTO restore_points (
        id,
        workspace_id,
        label,
        snapshot_ref,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      restorePoint.id,
      workspaceId,
      restorePoint.label,
      restorePoint.snapshotRef,
      restorePoint.createdAt,
    ).run();

    await db.prepare(`
      DELETE FROM restore_points
      WHERE workspace_id = ?
        AND id NOT IN (
          SELECT id
          FROM restore_points
          WHERE workspace_id = ?
          ORDER BY created_at DESC
          LIMIT 5
        )
    `).bind(workspaceId, workspaceId).run();

    return "d1_restore_point_metadata";
  } catch {
    return "d1_unavailable_dry_run";
  }
}

async function recordAuditEvent(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string | null,
  actorMemberId: string | null,
  action: string,
  metadata: Record<string, unknown>,
): Promise<AuditPersistence> {
  if (!db) {
    return "dry_run_memoryless";
  }

  try {
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    await db.prepare(`
      INSERT INTO audit_events (
        id,
        workspace_id,
        project_id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `audit_${crypto.randomUUID()}`,
      workspaceId,
      projectId,
      actorMemberId,
      action,
      JSON.stringify(metadata),
      createdAt,
    ).run();
    return "d1_audit_events";
  } catch {
    return "d1_unavailable_dry_run";
  }
}

async function listAuditEventManifest(
  db: D1Database | undefined,
  workspaceId: string,
  limit: number,
  offset: number,
  actionPrefix: string | null,
): Promise<AuditEventManifestResult> {
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      events: [],
      rowCount: 0,
      truncated: false,
      offset,
      nextOffset: null,
      actionPrefix,
    };
  }

  try {
    const actionFilter = actionPrefix ? "AND instr(action, ?) = 1" : "";
    const bindValues = actionPrefix
      ? [workspaceId, actionPrefix, limit + 1, offset]
      : [workspaceId, limit + 1, offset];
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        project_id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      FROM audit_events
      WHERE workspace_id = ?
        ${actionFilter}
      ORDER BY created_at DESC, id DESC
      LIMIT ?
      OFFSET ?
    `).bind(...bindValues).all<AuditEventManifestRow>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);
    const truncated = allRows.length > limit;

    return {
      persistence: "d1_audit_events",
      events: visibleRows.map(auditEventManifestEntry),
      rowCount: visibleRows.length,
      truncated,
      offset,
      nextOffset: truncated ? offset + visibleRows.length : null,
      actionPrefix,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      events: [],
      rowCount: 0,
      truncated: false,
      offset,
      nextOffset: null,
      actionPrefix,
    };
  }
}

function auditEventManifestEntry(row: AuditEventManifestRow): AuditEventManifestEntry {
  const metadataKeys = auditMetadataKeys(row.metadata_json);
  return {
    id: row.id,
    action: row.action,
    projectId: row.project_id,
    actorMemberId: row.actor_member_id,
    createdAt: row.created_at,
    metadataKeys: metadataKeys.slice(0, 20),
    metadataKeyCount: metadataKeys.length,
  };
}

function auditMetadataKeys(metadataJson: string): string[] {
  try {
    const metadata = JSON.parse(metadataJson) as unknown;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return [];
    }
    return Object.keys(metadata as Record<string, unknown>).sort();
  } catch {
    return [];
  }
}

function normalizeRestoreCommitPreview(preview: RestoreCommitPreviewRequest | undefined): RestoreCommitPreview | null {
  if (!preview || typeof preview !== "object") {
    return null;
  }

  const incomingRecordCount = preview.incomingRecordCount;
  const changedRecordCount = preview.changedRecordCount;
  const newRecordCount = preview.newRecordCount;
  const fieldConflictCount = preview.fieldConflictCount;
  const warnings = preview.warnings ?? [];

  if (
    !isValidRestoreCount(incomingRecordCount)
    || !isValidRestoreCount(changedRecordCount)
    || !isValidRestoreCount(newRecordCount)
    || !isValidRestoreCount(fieldConflictCount)
    || changedRecordCount + newRecordCount > incomingRecordCount
    || !Array.isArray(warnings)
    || warnings.length > 20
    || warnings.some((warning) => typeof warning !== "string" || warning.length > 240)
  ) {
    return null;
  }

  return {
    incomingRecordCount,
    changedRecordCount,
    newRecordCount,
    fieldConflictCount,
    warnings,
  };
}

function normalizeRestoreApplicationTablePlan(
  tablePlan: RestoreApplicationTablePlanRequest[] | undefined,
): RestoreApplicationTablePlan[] | null {
  if (tablePlan === undefined) return [];
  if (!Array.isArray(tablePlan) || tablePlan.length > RESTORE_TABLE_PLAN_MAX_ROWS) {
    return null;
  }

  const rows: RestoreApplicationTablePlan[] = [];
  for (const row of tablePlan) {
    if (!row || typeof row !== "object") {
      return null;
    }
    const tableName = row.tableName ?? "";
    const source = row.source;
    const entityType = row.entityType;
    const operationCount = row.operationCount;
    const createCount = row.createCount;
    const updateCount = row.updateCount;
    const skipCount = row.skipCount;
    const previewOnlyCount = row.previewOnlyCount;
    const fieldConflictCount = row.fieldConflictCount;
    const restoreSupport = row.restoreSupport;
    const blockers = row.blockers ?? [];

    if (
      !isValidRestoreTableName(tableName)
      || (source !== "workspace_snapshot" && source !== "d1_planning_export")
      || !isValidRestoreApplicationEntityType(entityType)
      || !isValidRestoreCount(operationCount)
      || !isValidRestoreCount(createCount)
      || !isValidRestoreCount(updateCount)
      || !isValidRestoreCount(skipCount)
      || !isValidRestoreCount(previewOnlyCount)
      || !isValidRestoreCount(fieldConflictCount)
      || createCount + updateCount + skipCount + previewOnlyCount !== operationCount
      || (restoreSupport !== "blocked" && restoreSupport !== "preview_only" && restoreSupport !== "commit_supported")
      || !Array.isArray(blockers)
      || blockers.length > RESTORE_TABLE_PLAN_MAX_BLOCKERS
      || blockers.some((blocker) => typeof blocker !== "string" || blocker.length > 160)
    ) {
      return null;
    }

    rows.push({
      tableName,
      source,
      entityType,
      operationCount,
      createCount,
      updateCount,
      skipCount,
      previewOnlyCount,
      fieldConflictCount,
      restoreSupport,
      blockers,
    });
  }
  return rows;
}

function normalizeRestoreAttachmentPackagePlan(
  plan: RestoreAttachmentPackagePlanRequest | undefined,
): RestoreAttachmentPackagePlan | null {
  if (!plan || typeof plan !== "object") {
    return null;
  }

  const policy = plan.policy;
  const packageRequired = plan.packageRequired;
  const byteRestoreSupport = plan.byteRestoreSupport;
  const metadataRecordCount = plan.metadataRecordCount;
  const stagedLocalRecordCount = plan.stagedLocalRecordCount;
  const r2DryRunRecordCount = plan.r2DryRunRecordCount;
  const storedR2RecordCount = plan.storedR2RecordCount;
  const totalSourceBytes = plan.totalSourceBytes;
  const blockers = plan.blockers ?? [];

  if (
    (policy !== "metadata_only" && policy !== "not_included")
    || typeof packageRequired !== "boolean"
    || (byteRestoreSupport !== "blocked" && byteRestoreSupport !== "not_included")
    || !isValidRestoreCount(metadataRecordCount)
    || !isValidRestoreCount(stagedLocalRecordCount)
    || !isValidRestoreCount(r2DryRunRecordCount)
    || !isValidRestoreCount(storedR2RecordCount)
    || !isValidRestoreCount(totalSourceBytes)
    || metadataRecordCount > 1000
    || totalSourceBytes > ATTACHMENT_PACKAGE_MAX_BYTES
    || stagedLocalRecordCount + r2DryRunRecordCount + storedR2RecordCount > metadataRecordCount
    || (metadataRecordCount === 0 && policy !== "not_included")
    || (metadataRecordCount > 0 && policy !== "metadata_only")
    || (metadataRecordCount === 0 && packageRequired)
    || (metadataRecordCount > 0 && !packageRequired)
    || (packageRequired && byteRestoreSupport !== "blocked")
    || (!packageRequired && byteRestoreSupport !== "not_included")
    || !Array.isArray(blockers)
    || blockers.length > 5
    || blockers.some((blocker) => typeof blocker !== "string" || blocker.length > 180)
  ) {
    return null;
  }

  return {
    policy,
    packageRequired,
    byteRestoreSupport,
    metadataRecordCount,
    stagedLocalRecordCount,
    r2DryRunRecordCount,
    storedR2RecordCount,
    totalSourceBytes,
    blockers,
  };
}

function normalizeRestoreAttachmentPackageManifest(
  workspaceId: string,
  manifest: RestoreAttachmentPackageManifestRequest | undefined,
): RestoreAttachmentPackageManifest | null {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }

  const objects = manifest.objects ?? [];
  if (
    manifest.format !== "film.attachment-package"
    || manifest.version !== 1
    || manifest.workspaceId !== workspaceId
    || !isValidRestoreCount(manifest.objectCount)
    || manifest.objectCount <= 0
    || manifest.objectCount > 1000
    || !isValidRestoreCount(manifest.totalSourceBytes)
    || manifest.totalSourceBytes <= 0
    || manifest.totalSourceBytes > ATTACHMENT_PACKAGE_MAX_BYTES
    || !Array.isArray(objects)
    || objects.length !== manifest.objectCount
    || (typeof manifest.createdAt === "string" && Number.isNaN(Date.parse(manifest.createdAt)))
    || (manifest.createdAt !== undefined && typeof manifest.createdAt !== "string")
  ) {
    return null;
  }

  const paths = new Set<string>();
  const objectKeys = new Set<string>();
  const normalizedObjects: RestoreAttachmentPackageManifestObject[] = [];
  let totalSourceBytes = 0;

  for (const object of objects) {
    const normalized = normalizeRestoreAttachmentPackageManifestObject(workspaceId, object);
    if (!normalized || paths.has(normalized.path) || objectKeys.has(normalized.objectKey)) {
      return null;
    }
    paths.add(normalized.path);
    objectKeys.add(normalized.objectKey);
    totalSourceBytes += normalized.sizeBytes;
    normalizedObjects.push(normalized);
  }

  if (totalSourceBytes !== manifest.totalSourceBytes) {
    return null;
  }

  return {
    format: "film.attachment-package",
    version: 1,
    workspaceId,
    createdAt: manifest.createdAt ?? null,
    objectCount: manifest.objectCount,
    totalSourceBytes: manifest.totalSourceBytes,
    objects: normalizedObjects,
  };
}

function normalizeRestoreAttachmentPackageManifestObject(
  workspaceId: string,
  object: RestoreAttachmentPackageManifestObjectRequest,
): RestoreAttachmentPackageManifestObject | null {
  if (!object || typeof object !== "object") {
    return null;
  }

  const path = typeof object.path === "string" ? object.path : "";
  const docId = typeof object.docId === "string" ? object.docId.trim() : "";
  const objectKey = typeof object.objectKey === "string" ? object.objectKey.trim() : "";
  const name = typeof object.name === "string" ? object.name.trim() : "";
  const sourcePath = object.sourcePath === null || object.sourcePath === undefined
    ? null
    : typeof object.sourcePath === "string"
      ? object.sourcePath.trim()
      : "";
  const contentType = object.contentType === null || object.contentType === undefined
    ? null
    : typeof object.contentType === "string"
      ? object.contentType.trim()
      : "";
  const committedAt = object.committedAt === null || object.committedAt === undefined
    ? null
    : typeof object.committedAt === "string"
      ? object.committedAt.trim()
      : "";
  const sha256 = typeof object.sha256 === "string" ? object.sha256.trim().toLowerCase() : "";
  const sizeBytes = typeof object.sizeBytes === "number" ? object.sizeBytes : null;

  let safePath = "";
  try {
    safePath = attachmentPackageSafeZipPath(path);
  } catch {
    return null;
  }

  if (
    !isValidRecordId(docId)
    || !isValidAttachmentObjectKey(workspaceId, objectKey)
    || !name
    || name.length > 240
    || name.includes("/")
    || name.includes("\0")
    || sourcePath === ""
    || (sourcePath !== null && !isSafeImportSourcePath(sourcePath))
    || contentType === ""
    || (contentType !== null && contentType.length > 160)
    || committedAt === ""
    || (committedAt !== null && Number.isNaN(Date.parse(committedAt)))
    || !Number.isSafeInteger(sizeBytes)
    || sizeBytes === null
    || sizeBytes <= 0
    || sizeBytes > ATTACHMENT_PACKAGE_MAX_BYTES
    || !isValidSha256Hex(sha256)
  ) {
    return null;
  }

  return {
    path: safePath,
    docId,
    objectKey,
    name,
    sourcePath,
    sizeBytes,
    contentType,
    sha256,
    committedAt,
  };
}

function restoreAttachmentPackageManifestMatchesPlan(
  manifest: RestoreAttachmentPackageManifest,
  attachmentPackagePlan: RestoreAttachmentPackagePlan,
): boolean {
  return attachmentPackagePlan.packageRequired
    && manifest.objectCount === attachmentPackagePlan.metadataRecordCount
    && manifest.totalSourceBytes === attachmentPackagePlan.totalSourceBytes;
}

function isValidRestoreTableName(value: string): boolean {
  return /^[a-z][a-z0-9_]{0,63}$/.test(value);
}

function isValidRestoreApplicationEntityType(value: unknown): value is RestoreApplicationTablePlan["entityType"] {
  return value === "workspace"
    || value === "project"
    || value === "task"
    || value === "document"
    || value === "person"
    || value === "equipment"
    || value === "expense"
    || value === "planning";
}

function isValidRestoreCoreEntityType(value: unknown): value is RestoreCoreRecord["entityType"] {
  return value === "workspace"
    || value === "project"
    || value === "task"
    || value === "document"
    || value === "person"
    || value === "equipment"
    || value === "expense";
}

function normalizeRestoreCoreRecords(records: RestoreCoreRecordRequest[] | undefined): RestoreCoreRecord[] | null {
  if (!Array.isArray(records) || records.length === 0 || records.length > RESTORE_CORE_RECORD_MAX_RECORDS) {
    return null;
  }

  const normalized: RestoreCoreRecord[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    if (!record || typeof record !== "object" || !isValidRestoreCoreEntityType(record.entityType)) {
      return null;
    }
    const entityId = typeof record.entityId === "string" ? record.entityId.trim() : "";
    if (!isValidRecordId(entityId)) {
      return null;
    }
    const dedupeKey = `${record.entityType}:${entityId}`;
    if (seen.has(dedupeKey)) {
      return null;
    }
    seen.add(dedupeKey);

    const action = record.action;
    if (action !== "create" && action !== "update" && action !== "skip") {
      return null;
    }
    const projectId = normalizeOptionalRestoreRecordId(record.projectId);
    if (projectId === undefined) {
      return null;
    }
    const title = boundedRestoreString(
      record.title ?? record.name ?? record.category,
      record.entityType === "project" || record.entityType === "workspace" ? 160 : 180,
    );
    if (!title) {
      return null;
    }
    const phase = record.entityType === "project" ? normalizeRestoreProjectPhase(record.phase) : null;
    const status = record.entityType === "task" ? normalizeRestoreTaskStatus(record.status) : null;
    const equipmentStatus = record.entityType === "equipment" ? boundedRestoreString(record.status, 80) : null;
    const statusTone = record.entityType === "equipment" ? normalizeRestoreTone(record.statusTone) : null;
    if (statusTone === undefined) {
      return null;
    }
    const priority = record.entityType === "task" ? normalizeRestoreTaskPriority(record.priority) : null;
    const dueAt = record.entityType === "task" ? nullableBoundedRestoreString(record.dueAt, 80) : null;
    if (dueAt === undefined) {
      return null;
    }
    const documentType = record.entityType === "document" ? normalizeRestoreDocumentType(record.documentType) : null;
    const markdownSnapshot = record.entityType === "document"
      ? nullableBoundedRestoreString(record.markdownSnapshot, RESTORE_CORE_MARKDOWN_MAX_CHARS)
      : null;
    if (markdownSnapshot === undefined) {
      return null;
    }
    const backupPolicy = record.entityType === "workspace" ? nullableBoundedRestoreString(record.backupPolicy, 160) : null;
    const nextBackup = record.entityType === "workspace" ? nullableBoundedRestoreString(record.nextBackup, 160) : null;
    const role = record.entityType === "person" ? boundedRestoreString(record.role, 120) : null;
    const initials = record.entityType === "person" ? nullableBoundedRestoreString(record.initials, 24) : null;
    const archivedProjectCount = record.entityType === "workspace" ? normalizeRestoreInteger(record.archivedProjectCount, 0, 100000) : null;
    const spent = record.entityType === "expense" ? normalizeRestoreMoney(record.spent) : null;
    const budget = record.entityType === "expense" ? normalizeRestoreMoney(record.budget) : null;
    const percent = record.entityType === "expense" ? normalizeRestoreInteger(record.percent, 0, 100) : null;
    const childRequiresProject = record.entityType !== "workspace" && record.entityType !== "project";
    if (
      backupPolicy === undefined
      || nextBackup === undefined
      || initials === undefined
      || archivedProjectCount === undefined
      || spent === undefined
      || budget === undefined
      || percent === undefined
      || (record.entityType === "project" && !phase)
      || (record.entityType === "task" && (!status || !priority))
      || (record.entityType === "document" && !documentType)
      || (record.entityType === "person" && !role)
      || (record.entityType === "equipment" && !equipmentStatus)
      || (childRequiresProject && !projectId)
      || (!childRequiresProject && projectId !== null)
      || (record.entityType === "document" && documentType !== "markdown" && markdownSnapshot !== null)
      || (record.sensitive !== undefined && typeof record.sensitive !== "boolean")
    ) {
      return null;
    }

    normalized.push({
      entityType: record.entityType,
      entityId,
      action,
      projectId: projectId ?? null,
      title,
      phase,
      status: record.entityType === "equipment" ? equipmentStatus : status,
      statusTone,
      priority,
      dueAt,
      documentType,
      markdownSnapshot,
      sensitive: record.sensitive === true,
      archivedProjectCount,
      backupPolicy,
      nextBackup,
      role,
      initials,
      spent,
      budget,
      percent,
    });
  }

  return normalized;
}

function normalizeOptionalRestoreRecordId(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return isValidRecordId(trimmed) ? trimmed : undefined;
}

function boundedRestoreString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function nullableBoundedRestoreString(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  if (value.length > maxLength) return undefined;
  return value;
}

function normalizeRestoreInteger(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return undefined;
  return value;
}

function normalizeRestoreMoney(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) return undefined;
  return Math.round(value * 100) / 100;
}

function normalizeRestoreProjectPhase(value: unknown): string | null {
  const phase = boundedRestoreString(value, 40)?.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  return phase && ["development", "pre_production", "production", "post_production"].includes(phase) ? phase : null;
}

function normalizeRestoreTaskStatus(value: unknown): string | null {
  const status = boundedRestoreString(value, 40)?.toLowerCase();
  return status && ["overdue", "pending", "ready"].includes(status) ? status : null;
}

function normalizeRestoreTaskPriority(value: unknown): string | null {
  const priority = boundedRestoreString(value, 40)?.toLowerCase();
  return priority && ["low", "normal", "high", "urgent"].includes(priority) ? priority : null;
}

function normalizeRestoreDocumentType(value: unknown): string | null {
  const type = boundedRestoreString(value, 40)?.toLowerCase();
  if (!type) return null;
  if (type === "md" || type === "markdown" || type === "native") return type === "native" ? "native" : "markdown";
  if (type === "screenplay") return "screenplay";
  if (["pdf", "xlsx", "csv", "asset", "uploaded_file"].includes(type)) return "uploaded_file";
  if (type === "google_doc") return "google_doc";
  return null;
}

function normalizeRestoreTone(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  const tone = boundedRestoreString(value, 40)?.toLowerCase();
  if (!tone || !["teal", "amber", "blue", "gray", "red"].includes(tone)) return undefined;
  return tone;
}

function restoreCoreRecordSummary(records: RestoreCoreRecord[]): Record<string, number> {
  return {
    recordCount: records.length,
    createCount: records.filter((record) => record.action === "create").length,
    updateCount: records.filter((record) => record.action === "update").length,
    skipCount: records.filter((record) => record.action === "skip").length,
    projectCount: records.filter((record) => record.entityType === "project").length,
    taskCount: records.filter((record) => record.entityType === "task").length,
    documentCount: records.filter((record) => record.entityType === "document").length,
    workspaceCount: records.filter((record) => record.entityType === "workspace").length,
    personCount: records.filter((record) => record.entityType === "person").length,
    equipmentCount: records.filter((record) => record.entityType === "equipment").length,
    expenseCount: records.filter((record) => record.entityType === "expense").length,
  };
}

function restoreCoreRecordSummaryFitsPreview(summary: Record<string, number>, preview: RestoreCommitPreview): boolean {
  return summary.recordCount <= preview.incomingRecordCount
    && summary.createCount <= preview.newRecordCount
    && summary.updateCount <= preview.changedRecordCount
    && summary.createCount + summary.updateCount + summary.skipCount === summary.recordCount;
}

function restoreCoreRecordsMatchApplicationTablePlan(
  records: RestoreCoreRecord[],
  applicationTablePlan: RestoreApplicationTablePlan[],
): boolean {
  const actualRows = restoreCoreRecordApplicationTableRows(records);
  const expectedRows = applicationTablePlan
    .filter((row) => row.source === "workspace_snapshot")
    .map((row) => ({
      tableName: row.tableName,
      source: "workspace_snapshot" as const,
      entityType: row.entityType,
      operationCount: row.operationCount,
      createCount: row.createCount,
      updateCount: row.updateCount,
      skipCount: row.skipCount,
      previewOnlyCount: row.previewOnlyCount,
      restoreSupport: row.restoreSupport,
    }));

  return restoreApplicationTableRowCountsEqual(actualRows, expectedRows);
}

function restoreCoreRecordApplicationTableRows(records: RestoreCoreRecord[]): Array<{
  tableName: string;
  source: "workspace_snapshot";
  entityType: RestoreCoreRecord["entityType"];
  operationCount: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  previewOnlyCount: number;
  restoreSupport: "commit_supported";
}> {
  const entityTypes: RestoreCoreRecord["entityType"][] = [
    "workspace",
    "project",
    "task",
    "document",
    "person",
    "equipment",
    "expense",
  ];

  return entityTypes
    .map((entityType) => {
      const matchingRecords = records.filter((record) => record.entityType === entityType);
      return {
        tableName: restoreCoreRecordApplicationTableName(entityType),
        source: "workspace_snapshot" as const,
        entityType,
        operationCount: matchingRecords.length,
        createCount: matchingRecords.filter((record) => record.action === "create").length,
        updateCount: matchingRecords.filter((record) => record.action === "update").length,
        skipCount: matchingRecords.filter((record) => record.action === "skip").length,
        previewOnlyCount: 0,
        restoreSupport: "commit_supported" as const,
      };
    })
    .filter((row) => row.operationCount > 0)
    .sort(restoreApplicationTableRowSort);
}

function restoreApplicationTableRowCountsEqual(
  left: Array<{
    tableName: string;
    source: "workspace_snapshot";
    entityType: RestoreApplicationTablePlan["entityType"];
    operationCount: number;
    createCount: number;
    updateCount: number;
    skipCount: number;
    previewOnlyCount: number;
    restoreSupport: RestoreApplicationTablePlan["restoreSupport"];
  }>,
  right: Array<{
    tableName: string;
    source: "workspace_snapshot";
    entityType: RestoreApplicationTablePlan["entityType"];
    operationCount: number;
    createCount: number;
    updateCount: number;
    skipCount: number;
    previewOnlyCount: number;
    restoreSupport: RestoreApplicationTablePlan["restoreSupport"];
  }>,
): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort(restoreApplicationTableRowSort);
  const sortedRight = [...right].sort(restoreApplicationTableRowSort);
  return sortedLeft.every((leftRow, index) => {
    const rightRow = sortedRight[index];
    return Boolean(rightRow)
      && leftRow.tableName === rightRow.tableName
      && leftRow.source === rightRow.source
      && leftRow.entityType === rightRow.entityType
      && leftRow.operationCount === rightRow.operationCount
      && leftRow.createCount === rightRow.createCount
      && leftRow.updateCount === rightRow.updateCount
      && leftRow.skipCount === rightRow.skipCount
      && leftRow.previewOnlyCount === rightRow.previewOnlyCount
      && leftRow.restoreSupport === rightRow.restoreSupport;
  });
}

function restoreApplicationTableRowSort(
  left: { tableName: string; source: string; entityType: string },
  right: { tableName: string; source: string; entityType: string },
): number {
  return left.source.localeCompare(right.source)
    || left.tableName.localeCompare(right.tableName)
    || left.entityType.localeCompare(right.entityType);
}

function restoreCoreRecordApplicationTableName(entityType: RestoreCoreRecord["entityType"]): string {
  switch (entityType) {
    case "workspace":
      return "workspaces";
    case "project":
      return "projects";
    case "task":
      return "tasks";
    case "document":
      return "documents";
    case "person":
      return "people";
    case "equipment":
      return "equipment";
    case "expense":
      return "expenses";
  }
}

async function verifyPreRestoreBackupProof(
  db: D1Database | undefined,
  workspaceId: string,
  restorePointId: string,
): Promise<PreRestoreBackupProof> {
  if (!restorePointId) {
    return {
      restorePointId: null,
      verified: false,
      persistence: "not_provided",
      blocker: "A stored R2 pre-restore backup restore point is required before destructive restore commits can be enabled.",
    };
  }
  if (!db) {
    return {
      restorePointId,
      verified: false,
      persistence: "d1_unavailable_dry_run",
      blocker: "D1 restore-point metadata is required to verify the pre-restore backup.",
    };
  }

  const row = await findStoredBackupObject(db, workspaceId, restorePointId);
  if (!row) {
    return {
      restorePointId,
      verified: false,
      persistence: "d1_restore_point_metadata",
      blocker: "Pre-restore backup proof must reference a stored R2 restore point for this workspace.",
    };
  }

  return {
    restorePointId: row.id,
    verified: true,
    persistence: "d1_restore_point_metadata",
    blocker: null,
  };
}

async function recordRestoreApproval(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  snapshotWorkspaceId: string,
  backupCreatedAt: string | null,
  preRestoreBackup: PreRestoreBackupProof,
  preview: RestoreCommitPreview,
): Promise<{
  approvalId: string | null;
  status: "blocked" | "approved_pending_commit";
  persistence: RestoreApprovalPersistence;
  auditPersistence: AuditPersistence;
  blockers: string[];
}> {
  const blockers = preRestoreBackup.verified
    ? []
    : [preRestoreBackup.blocker ?? "A verified pre-restore backup is required before approval can advance."];
  const status = blockers.length === 0 ? "approved_pending_commit" : "blocked";
  const approvalId = `restore_approval_${crypto.randomUUID()}`;

  if (!db) {
    return {
      approvalId: null,
      status,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      blockers,
    };
  }

  try {
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements: D1PreparedStatement[] = [];
    if (preRestoreBackup.verified && preRestoreBackup.restorePointId) {
      statements.push(storedR2RestorePointAssertion(db, workspaceId, preRestoreBackup.restorePointId));
    }
    const approvalIndex = statements.length;
    statements.push(db.prepare(`
      INSERT INTO restore_approvals (
        id,
        workspace_id,
        actor_member_id,
        snapshot_workspace_id,
        backup_created_at,
        pre_restore_backup_id,
        preview_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      approvalId,
      workspaceId,
      actorMemberId,
      snapshotWorkspaceId,
      backupCreatedAt,
      preRestoreBackup.restorePointId,
      JSON.stringify(preview),
      status,
      createdAt,
    ));
    const auditIndex = statements.length;
    statements.push(auditEventInsertStatement(
      db,
      `audit_restore_approval_${crypto.randomUUID()}`,
      workspaceId,
      null,
      actorMemberId,
      "restore.approval_dry_run_created",
      {
        approvalId,
        approvalStatus: status,
        snapshotWorkspaceId,
        backupCreatedAt,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: preRestoreBackup.verified,
        destructiveWrite: false,
      },
      createdAt,
    ));
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[approvalIndex]?.meta?.changes ?? 0) !== 1
      || Number(results[auditIndex]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore approval batch did not apply exactly once");
    }
    return {
      approvalId,
      status,
      persistence: "d1_restore_approvals",
      auditPersistence: "d1_audit_events",
      blockers,
    };
  } catch {
    return {
      approvalId: null,
      status,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
      blockers,
    };
  }
}

async function findRestoreApproval(
  db: D1Database,
  workspaceId: string,
  approvalId: string,
): Promise<RestoreApprovalRow | null> {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      actor_member_id,
      snapshot_workspace_id,
      backup_created_at,
      pre_restore_backup_id,
      preview_json,
      status,
      destructive_write,
      created_at
    FROM restore_approvals
    WHERE workspace_id = ? AND id = ?
    LIMIT 1
  `).bind(workspaceId, approvalId).first<RestoreApprovalRow>();
}

async function recordRestoreCommitAttempt(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  approval: RestoreApprovalRow,
  preRestoreBackup: PreRestoreBackupProof,
  preview: RestoreCommitPreview,
): Promise<{
  commitAttemptId: string | null;
  status: "blocked_until_restore_apply";
  persistence: RestoreCommitAttemptPersistence;
  auditPersistence: AuditPersistence;
}> {
  const status = "blocked_until_restore_apply";
  const commitAttemptId = `restore_commit_attempt_${crypto.randomUUID()}`;
  if (!db) {
    return {
      commitAttemptId: null,
      status,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
    };
  }

  try {
    if (!preRestoreBackup.verified || !preRestoreBackup.restorePointId) {
      throw new Error("verified pre-restore backup proof is required");
    }
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      storedR2RestorePointAssertion(db, workspaceId, preRestoreBackup.restorePointId),
      restoreApprovalStateAssertion(db, approval),
      db.prepare(`
      INSERT INTO restore_commit_attempts (
        id,
        workspace_id,
        approval_id,
        actor_member_id,
        pre_restore_backup_id,
        preview_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      commitAttemptId,
      workspaceId,
      approval.id,
      actorMemberId,
      preRestoreBackup.restorePointId,
      JSON.stringify(preview),
      status,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_restore_commit_attempt_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.commit_storage_dry_run_created",
        {
          approvalId: approval.id,
          commitAttemptId,
          commitAttemptStatus: status,
          snapshotWorkspaceId: approval.snapshot_workspace_id,
          backupCreatedAt: approval.backup_created_at,
          preRestoreBackupId: preRestoreBackup.restorePointId,
          destructiveWrite: false,
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[2]?.meta?.changes ?? 0) !== 1
      || Number(results[3]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore commit attempt batch did not apply exactly once");
    }
    return {
      commitAttemptId,
      status,
      persistence: "d1_restore_commit_attempts",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return {
      commitAttemptId: null,
      status,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }
}

async function findRestoreCommitAttempt(
  db: D1Database,
  workspaceId: string,
  commitAttemptId: string,
): Promise<RestoreCommitAttemptRow | null> {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      approval_id,
      actor_member_id,
      pre_restore_backup_id,
      preview_json,
      status,
      destructive_write,
      created_at
    FROM restore_commit_attempts
    WHERE workspace_id = ? AND id = ?
    LIMIT 1
  `).bind(workspaceId, commitAttemptId).first<RestoreCommitAttemptRow>();
}

async function recordRestoreApplicationPreflight(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  approval: RestoreApprovalRow,
  commitAttempt: RestoreCommitAttemptRow,
  preRestoreBackup: PreRestoreBackupProof,
  preview: RestoreCommitPreview,
  applicationTablePlan: RestoreApplicationTablePlan[],
): Promise<{
  applicationPreflightId: string | null;
  status: "blocked_until_restore_apply_implementation";
  persistence: RestoreApplicationPreflightPersistence;
  auditPersistence: AuditPersistence;
  rollbackGuidance: Record<string, unknown>;
}> {
  const status = "blocked_until_restore_apply_implementation";
  const applicationPreflightId = `restore_application_preflight_${crypto.randomUUID()}`;
  const rollbackGuidance = restoreRollbackGuidance(preRestoreBackup, preview, applicationTablePlan);
  if (!db) {
    return {
      applicationPreflightId: null,
      status,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
      rollbackGuidance,
    };
  }

  try {
    if (!preRestoreBackup.verified || !preRestoreBackup.restorePointId) {
      throw new Error("verified pre-restore backup proof is required");
    }
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      storedR2RestorePointAssertion(db, workspaceId, preRestoreBackup.restorePointId),
      restoreApprovalStateAssertion(db, approval),
      restoreCommitAttemptStateAssertion(db, commitAttempt),
      db.prepare(`
      INSERT INTO restore_application_preflights (
        id,
        workspace_id,
        approval_id,
        commit_attempt_id,
        actor_member_id,
        pre_restore_backup_id,
        preview_json,
        rollback_guidance_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      applicationPreflightId,
      workspaceId,
      approval.id,
      commitAttempt.id,
      actorMemberId,
      preRestoreBackup.restorePointId,
      JSON.stringify(preview),
      JSON.stringify(rollbackGuidance),
      status,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_restore_application_preflight_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.application_dry_run_created",
        {
          approvalId: approval.id,
          commitAttemptId: commitAttempt.id,
          applicationPreflightId,
          applicationPreflightStatus: status,
          snapshotWorkspaceId: approval.snapshot_workspace_id,
          backupCreatedAt: approval.backup_created_at,
          preRestoreBackupId: preRestoreBackup.restorePointId,
          destructiveWrite: false,
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[3]?.meta?.changes ?? 0) !== 1
      || Number(results[4]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore application preflight batch did not apply exactly once");
    }
    return {
      applicationPreflightId,
      status,
      persistence: "d1_restore_application_preflights",
      auditPersistence: "d1_audit_events",
      rollbackGuidance,
    };
  } catch {
    return {
      applicationPreflightId: null,
      status,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
      rollbackGuidance,
    };
  }
}

function storedR2RestorePointAssertion(
  db: D1Database,
  workspaceId: string,
  restorePointId: string,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM restore_points
        WHERE workspace_id = ?
          AND id = ?
          AND instr(snapshot_ref, ?) = 1
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS stored_r2_restore_point_assertion
  `).bind(workspaceId, restorePointId, backupSnapshotRefPrefix(workspaceId));
}

function restoreApprovalStateAssertion(
  db: D1Database,
  approval: RestoreApprovalRow,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM restore_approvals
        WHERE id = ?
          AND workspace_id = ?
          AND actor_member_id IS ?
          AND snapshot_workspace_id = ?
          AND backup_created_at IS ?
          AND pre_restore_backup_id IS ?
          AND preview_json = ?
          AND status = ?
          AND destructive_write = ?
          AND created_at = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_approval_state_assertion
  `).bind(
    approval.id,
    approval.workspace_id,
    approval.actor_member_id,
    approval.snapshot_workspace_id,
    approval.backup_created_at,
    approval.pre_restore_backup_id,
    approval.preview_json,
    approval.status,
    approval.destructive_write,
    approval.created_at,
  );
}

function restoreCommitAttemptStateAssertion(
  db: D1Database,
  commitAttempt: RestoreCommitAttemptRow,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM restore_commit_attempts
        WHERE id = ?
          AND workspace_id = ?
          AND approval_id = ?
          AND actor_member_id IS ?
          AND pre_restore_backup_id IS ?
          AND preview_json = ?
          AND status = ?
          AND destructive_write = ?
          AND created_at = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_commit_attempt_state_assertion
  `).bind(
    commitAttempt.id,
    commitAttempt.workspace_id,
    commitAttempt.approval_id,
    commitAttempt.actor_member_id,
    commitAttempt.pre_restore_backup_id,
    commitAttempt.preview_json,
    commitAttempt.status,
    commitAttempt.destructive_write,
    commitAttempt.created_at,
  );
}

async function findRestoreApplicationPreflight(
  db: D1Database,
  workspaceId: string,
  applicationPreflightId: string,
): Promise<RestoreApplicationPreflightRow | null> {
  return db.prepare(`
    SELECT
      id,
      workspace_id,
      approval_id,
      commit_attempt_id,
      actor_member_id,
      pre_restore_backup_id,
      preview_json,
      rollback_guidance_json,
      status,
      destructive_write,
      created_at
    FROM restore_application_preflights
    WHERE workspace_id = ? AND id = ?
    LIMIT 1
  `).bind(workspaceId, applicationPreflightId).first<RestoreApplicationPreflightRow>();
}

async function restoreCoreRecordConflictRejections(
  db: D1Database,
  workspaceId: string,
  records: RestoreCoreRecord[],
): Promise<Array<{ entityType: string; entityId: string; reason: string }>> {
  const rejected: Array<{ entityType: string; entityId: string; reason: string }> = [];
  const includedProjectIds = new Set(
    records
      .filter((record) => record.entityType === "project" && record.action !== "skip")
      .map((record) => record.entityId),
  );

  for (const record of records) {
    if (record.entityType === "workspace" && record.entityId !== workspaceId) {
      rejected.push({ entityType: record.entityType, entityId: record.entityId, reason: "workspace_id_mismatch" });
      continue;
    }
    const targetWorkspaceId = await restoreCoreRecordWorkspaceId(db, record.entityType, record.entityId);
    if (targetWorkspaceId && targetWorkspaceId !== workspaceId) {
      rejected.push({ entityType: record.entityType, entityId: record.entityId, reason: "target_workspace_mismatch" });
      continue;
    }
    if (record.action === "create" && targetWorkspaceId === workspaceId) {
      rejected.push({ entityType: record.entityType, entityId: record.entityId, reason: "target_already_exists" });
      continue;
    }
    if (record.action === "update" && targetWorkspaceId !== workspaceId) {
      rejected.push({ entityType: record.entityType, entityId: record.entityId, reason: "target_missing" });
      continue;
    }
    if (
      (record.entityType === "person" || record.entityType === "equipment" || record.entityType === "expense")
      && record.action !== "skip"
      && !record.projectId
    ) {
      rejected.push({ entityType: record.entityType, entityId: record.entityId, reason: "project_required" });
      continue;
    }
    if (record.projectId && !includedProjectIds.has(record.projectId)) {
      const projectWorkspaceId = await restoreCoreRecordWorkspaceId(db, "project", record.projectId);
      if (projectWorkspaceId !== workspaceId) {
        rejected.push({ entityType: record.entityType, entityId: record.entityId, reason: "project_scope_not_found" });
      }
    }
  }

  return rejected;
}

async function restoreCoreRecordWorkspaceId(
  db: D1Database,
  entityType: RestoreCoreRecord["entityType"],
  entityId: string,
): Promise<string | null> {
  if (entityType === "workspace") {
    const row = await db.prepare("SELECT id FROM workspaces WHERE id = ? LIMIT 1").bind(entityId).first<{ id: string }>();
    return row?.id ?? null;
  }
  const tableName = restoreCoreRecordTableName(entityType);
  const row = await db.prepare(`SELECT workspace_id FROM ${tableName} WHERE id = ? LIMIT 1`).bind(entityId).first<{ workspace_id: string }>();
  return row?.workspace_id ?? null;
}

function restoreCoreRecordTableName(entityType: Exclude<RestoreCoreRecord["entityType"], "workspace">): "projects" | "tasks" | "documents" | "people" | "equipment" | "expenses" {
  if (entityType === "project") return "projects";
  if (entityType === "task") return "tasks";
  if (entityType === "document") return "documents";
  if (entityType === "person") return "people";
  if (entityType === "equipment") return "equipment";
  return "expenses";
}

async function commitRestoreCoreRecords(
  db: D1Database,
  workspaceId: string,
  actorMemberId: string | null,
  approval: RestoreApprovalRow,
  commitAttempt: RestoreCommitAttemptRow,
  applicationPreflight: RestoreApplicationPreflightRow,
  preRestoreBackup: PreRestoreBackupProof,
  preview: RestoreCommitPreview,
  records: RestoreCoreRecord[],
  recordSummary: Record<string, number>,
  timestamp: string,
): Promise<
  | {
    ok: true;
    applicationCommitId: string;
    applicationCommitStatus: "applied_workspace_snapshot_records";
    persistence: "d1_restore_application_commits";
    auditPersistence: "d1_audit_events";
    applicationResult: Record<string, unknown>;
  }
  | {
    ok: false;
    error: "restore_application_batch_too_large" | "restore_application_commit_storage_unavailable";
    persistence: "d1_unavailable_restore_blocked";
    status: 422 | 503;
  }
> {
  const orderedRecords = [
    ...records.filter((record) => record.entityType === "workspace"),
    ...records.filter((record) => record.entityType === "project"),
    ...records.filter((record) => record.entityType === "task"),
    ...records.filter((record) => record.entityType === "document"),
    ...records.filter((record) => record.entityType === "person"),
    ...records.filter((record) => record.entityType === "equipment"),
    ...records.filter((record) => record.entityType === "expense"),
  ];
  const applied = records.filter((record) => record.action !== "skip").map((record) => record.entityId);
  const skipped = records.filter((record) => record.action === "skip").map((record) => record.entityId);
  const applicationResult: Record<string, unknown> = {
    applied,
    skipped,
    appliedCount: applied.length,
    skippedCount: skipped.length,
    createCount: records.filter((record) => record.action === "create").length,
    updateCount: records.filter((record) => record.action === "update").length,
    workspaceCount: records.filter((record) => record.entityType === "workspace").length,
    projectCount: records.filter((record) => record.entityType === "project").length,
    taskCount: records.filter((record) => record.entityType === "task").length,
    documentCount: records.filter((record) => record.entityType === "document").length,
    personCount: records.filter((record) => record.entityType === "person").length,
    equipmentCount: records.filter((record) => record.entityType === "equipment").length,
    expenseCount: records.filter((record) => record.entityType === "expense").length,
  };
  const applicationCommitId = `restore_application_commit_${crypto.randomUUID()}`;
  const applicationCommitStatus = "applied_workspace_snapshot_records" as const;
  const auditId = `audit_${crypto.randomUUID()}`;
  const statements: D1PreparedStatement[] = [
    ...orderedRecords.flatMap((record) => restoreCoreRecordStatements(db, workspaceId, record, timestamp)),
    db.prepare(`
      INSERT INTO restore_application_commits (
        id,
        workspace_id,
        approval_id,
        commit_attempt_id,
        application_preflight_id,
        actor_member_id,
        pre_restore_backup_id,
        preview_json,
        request_summary_json,
        result_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      applicationCommitId,
      workspaceId,
      approval.id,
      commitAttempt.id,
      applicationPreflight.id,
      actorMemberId,
      preRestoreBackup.restorePointId,
      JSON.stringify(preview),
      JSON.stringify(recordSummary),
      JSON.stringify(applicationResult),
      applicationCommitStatus,
      timestamp,
    ),
    db.prepare(`
      INSERT INTO audit_events (
        id,
        workspace_id,
        project_id,
        actor_member_id,
        action,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auditId,
      workspaceId,
      null,
      actorMemberId,
      "restore.application_workspace_snapshot_records_committed",
      JSON.stringify({
        approvalId: approval.id,
        commitAttemptId: commitAttempt.id,
        applicationPreflightId: applicationPreflight.id,
        applicationCommitId,
        preRestoreBackupId: preRestoreBackup.restorePointId,
        destructiveWrite: true,
        ...recordSummary,
      }),
      timestamp,
    ),
  ];

  if (statements.length > RESTORE_CORE_BATCH_MAX_STATEMENTS) {
    return {
      ok: false,
      error: "restore_application_batch_too_large",
      persistence: "d1_unavailable_restore_blocked",
      status: 422,
    };
  }

  try {
    const results = await db.batch(statements);
    if (results.length !== statements.length || results.some((result) => !result.success)) {
      throw new Error("Restore application batch did not commit every statement.");
    }
    return {
      ok: true,
      applicationCommitId,
      applicationCommitStatus,
      persistence: "d1_restore_application_commits",
      auditPersistence: "d1_audit_events",
      applicationResult,
    };
  } catch {
    return {
      ok: false,
      error: "restore_application_commit_storage_unavailable",
      persistence: "d1_unavailable_restore_blocked",
      status: 503,
    };
  }
}

function restoreCoreRecordStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
  timestamp: string,
): D1PreparedStatement[] {
  if (record.action === "skip") return [];
  const assertions = [restoreTargetActionAssertion(db, workspaceId, record)];
  if (record.projectId) assertions.push(restoreProjectScopeAssertion(db, workspaceId, record.projectId));
  if (record.entityType === "workspace") {
    return [...assertions, ...restoreWorkspaceMetadataStatements(db, workspaceId, record, timestamp)];
  }
  if (record.entityType === "project") {
    return [...assertions, ...restoreProjectStatements(db, workspaceId, record, timestamp)];
  }
  if (record.entityType === "task") {
    return [...assertions, ...restoreTaskStatements(db, workspaceId, record, timestamp)];
  }
  if (record.entityType === "document") {
    return [...assertions, ...restoreDocumentStatements(db, workspaceId, record, timestamp)];
  }
  if (record.entityType === "person") {
    return [...assertions, ...restorePersonStatements(db, workspaceId, record)];
  }
  if (record.entityType === "equipment") {
    return [...assertions, ...restoreEquipmentStatements(db, workspaceId, record)];
  }
  return [...assertions, ...restoreExpenseStatements(db, workspaceId, record)];
}

// SQLite's minimum signed integer makes abs() fail. These fixed-query guards turn a
// stale create/update or project relationship into a transactional batch rollback.
function restoreTargetActionAssertion(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
): D1PreparedStatement {
  if (record.entityType === "workspace") {
    return db.prepare(`
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM workspaces WHERE id = ?)
        THEN 1 ELSE abs(-9223372036854775808)
      END AS restore_assertion
    `).bind(workspaceId);
  }
  const tableName = restoreCoreRecordTableName(record.entityType);
  if (record.action === "create") {
    return db.prepare(`
      SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM ${tableName} WHERE id = ?)
        THEN 1 ELSE abs(-9223372036854775808)
      END AS restore_assertion
    `).bind(record.entityId);
  }
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM ${tableName} WHERE id = ? AND workspace_id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_assertion
  `).bind(record.entityId, workspaceId);
}

function restoreProjectScopeAssertion(
  db: D1Database,
  workspaceId: string,
  projectId: string,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM projects WHERE id = ? AND workspace_id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_assertion
  `).bind(projectId, workspaceId);
}

function restoreWorkspaceMetadataStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
  timestamp: string,
): D1PreparedStatement[] {
  return [db.prepare(`
    UPDATE workspaces
    SET
      name = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(record.title, timestamp, workspaceId),

  db.prepare(`
    INSERT INTO workspace_restore_metadata (
      workspace_id,
      archived_project_count,
      backup_policy,
      next_backup,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id) DO UPDATE SET
      archived_project_count = excluded.archived_project_count,
      backup_policy = excluded.backup_policy,
      next_backup = excluded.next_backup,
      updated_at = excluded.updated_at
  `).bind(
    workspaceId,
    record.archivedProjectCount ?? 0,
    record.backupPolicy,
    record.nextBackup,
    timestamp,
  )];
}

function restoreProjectStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
  timestamp: string,
): D1PreparedStatement[] {
  return [db.prepare(`
    INSERT INTO projects (
      id,
      workspace_id,
      title,
      project_type,
      status,
      phase,
      logline,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, 'film', 'active', ?, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      phase = excluded.phase,
      updated_at = excluded.updated_at
    WHERE projects.workspace_id = excluded.workspace_id
  `).bind(
    record.entityId,
    workspaceId,
    record.title,
    record.phase ?? "development",
    timestamp,
    timestamp,
  ),

  db.prepare(`
    INSERT OR IGNORE INTO film_profiles (
      project_id,
      runtime_minutes,
      format,
      budget_cents,
      spent_cents,
      created_at,
      updated_at
    )
    VALUES (?, NULL, NULL, 0, 0, ?, ?)
  `).bind(record.entityId, timestamp, timestamp)];
}

function restoreTaskStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
  timestamp: string,
): D1PreparedStatement[] {
  return [db.prepare(`
    INSERT INTO tasks (
      id,
      workspace_id,
      project_id,
      title,
      status,
      priority,
      due_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      title = excluded.title,
      status = excluded.status,
      priority = excluded.priority,
      due_at = excluded.due_at,
      updated_at = excluded.updated_at
    WHERE tasks.workspace_id = excluded.workspace_id
  `).bind(
    record.entityId,
    workspaceId,
    record.projectId,
    record.title,
    record.status ?? "todo",
    record.priority ?? "normal",
    record.dueAt,
    timestamp,
    timestamp,
  )];
}

function restoreDocumentStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
  timestamp: string,
): D1PreparedStatement[] {
  return [db.prepare(`
    INSERT INTO documents (
      id,
      workspace_id,
      project_id,
      folder_id,
      title,
      document_type,
      markdown_snapshot,
      external_url,
      sensitive,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      title = excluded.title,
      document_type = excluded.document_type,
      markdown_snapshot = excluded.markdown_snapshot,
      sensitive = excluded.sensitive,
      updated_at = excluded.updated_at
    WHERE documents.workspace_id = excluded.workspace_id
  `).bind(
    record.entityId,
    workspaceId,
    record.projectId,
    record.title,
    record.documentType ?? "uploaded_file",
    record.markdownSnapshot,
    record.sensitive ? 1 : 0,
    timestamp,
    timestamp,
  )];
}

function restorePersonStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
): D1PreparedStatement[] {
  const roleTags = JSON.stringify([record.role].filter(Boolean));
  const notes = record.initials ? `Initials: ${record.initials}` : null;
  const statements = [db.prepare(`
    INSERT INTO people (
      id,
      workspace_id,
      display_name,
      role_tags,
      email_encrypted,
      phone_encrypted,
      notes,
      sensitive
    )
    VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      role_tags = excluded.role_tags,
      notes = excluded.notes,
      sensitive = excluded.sensitive
    WHERE people.workspace_id = excluded.workspace_id
  `).bind(
    record.entityId,
    workspaceId,
    record.title,
    roleTags,
    notes,
  )];

  if (record.projectId) {
    statements.push(db.prepare(`
      INSERT INTO project_people (
        project_id,
        person_id,
        project_role
      )
      VALUES (?, ?, ?)
      ON CONFLICT(project_id, person_id) DO UPDATE SET
        project_role = excluded.project_role
    `).bind(record.projectId, record.entityId, record.role));
  }
  return statements;
}

function restoreEquipmentStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
): D1PreparedStatement[] {
  return [db.prepare(`
    INSERT INTO equipment (
      id,
      workspace_id,
      project_id,
      name,
      equipment_type,
      status,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      name = excluded.name,
      equipment_type = excluded.equipment_type,
      status = excluded.status,
      notes = excluded.notes
    WHERE equipment.workspace_id = excluded.workspace_id
  `).bind(
    record.entityId,
    workspaceId,
    record.projectId,
    record.title,
    record.statusTone,
    record.status ?? "available",
  )];
}

function restoreExpenseStatements(
  db: D1Database,
  workspaceId: string,
  record: RestoreCoreRecord,
): D1PreparedStatement[] {
  const budget = record.budget ?? 0;
  const percent = record.percent ?? 0;
  return [db.prepare(`
    INSERT INTO expenses (
      id,
      workspace_id,
      project_id,
      category,
      amount_cents,
      purchased_at,
      comment
    )
    VALUES (?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      category = excluded.category,
      amount_cents = excluded.amount_cents,
      comment = excluded.comment
    WHERE expenses.workspace_id = excluded.workspace_id
  `).bind(
    record.entityId,
    workspaceId,
    record.projectId,
    record.title,
    Math.round((record.spent ?? 0) * 100),
    JSON.stringify({ budget, percent }),
  )];
}

async function recordRestoreAttachmentPackagePreflight(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  snapshotWorkspaceId: string,
  backupCreatedAt: string | null,
  attachmentPackagePlan: RestoreAttachmentPackagePlan,
  status: "blocked_until_attachment_package_verification" | "not_required",
): Promise<{
  attachmentPackagePreflightId: string | null;
  persistence: RestoreAttachmentPackagePreflightPersistence;
  auditPersistence: AuditPersistence;
}> {
  const attachmentPackagePreflightId = `restore_attachment_package_preflight_${crypto.randomUUID()}`;
  if (!db) {
    return {
      attachmentPackagePreflightId: null,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
    };
  }

  try {
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      db.prepare(`
      INSERT INTO restore_attachment_package_preflights (
        id,
        workspace_id,
        actor_member_id,
        snapshot_workspace_id,
        backup_created_at,
        metadata_record_count,
        staged_local_count,
        r2_dry_run_count,
        stored_r2_count,
        total_source_bytes,
        package_plan_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      attachmentPackagePreflightId,
      workspaceId,
      actorMemberId,
      snapshotWorkspaceId,
      backupCreatedAt,
      attachmentPackagePlan.metadataRecordCount,
      attachmentPackagePlan.stagedLocalRecordCount,
      attachmentPackagePlan.r2DryRunRecordCount,
      attachmentPackagePlan.storedR2RecordCount,
      attachmentPackagePlan.totalSourceBytes,
      JSON.stringify(attachmentPackagePlan),
      status,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_restore_attachment_package_preflight_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.attachment_package_dry_run_created",
        {
          attachmentPackagePreflightId,
          attachmentPackagePreflightPersistence: "d1_restore_attachment_package_preflights",
          attachmentPackagePreflightStatus: status,
          metadataRecordCount: attachmentPackagePlan.metadataRecordCount,
          totalSourceBytes: attachmentPackagePlan.totalSourceBytes,
          destructiveWrite: false,
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[0]?.meta?.changes ?? 0) !== 1
      || Number(results[1]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore attachment package preflight batch did not apply exactly once");
    }
    return {
      attachmentPackagePreflightId,
      persistence: "d1_restore_attachment_package_preflights",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return {
      attachmentPackagePreflightId: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }
}

async function restoreAttachmentPackagePreflightForVerification(
  db: D1Database | undefined,
  attachmentPackagePreflightId: string,
  workspaceId: string,
): Promise<RestoreAttachmentPackagePreflightRow | null> {
  if (!db) return null;
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      actor_member_id,
      snapshot_workspace_id,
      backup_created_at,
      metadata_record_count,
      staged_local_count,
      r2_dry_run_count,
      stored_r2_count,
      total_source_bytes,
      package_plan_json,
      status,
      destructive_write,
      created_at
    FROM restore_attachment_package_preflights
    WHERE id = ?
      AND workspace_id = ?
  `).bind(attachmentPackagePreflightId, workspaceId).first<RestoreAttachmentPackagePreflightRow>();
}

function restoreAttachmentPackagePreflightMatchesVerification(
  preflight: RestoreAttachmentPackagePreflightRow,
  snapshotWorkspaceId: string,
  backupCreatedAt: string | null,
  attachmentPackagePlan: RestoreAttachmentPackagePlan,
): boolean {
  return preflight.snapshot_workspace_id === snapshotWorkspaceId
    && preflight.backup_created_at === backupCreatedAt
    && preflight.metadata_record_count === attachmentPackagePlan.metadataRecordCount
    && preflight.staged_local_count === attachmentPackagePlan.stagedLocalRecordCount
    && preflight.r2_dry_run_count === attachmentPackagePlan.r2DryRunRecordCount
    && preflight.stored_r2_count === attachmentPackagePlan.storedR2RecordCount
    && preflight.total_source_bytes === attachmentPackagePlan.totalSourceBytes
    && preflight.status === "blocked_until_attachment_package_verification"
    && preflight.destructive_write === 0;
}

async function recordRestoreAttachmentPackageVerification(
  db: D1Database | undefined,
  workspaceId: string,
  attachmentPackagePreflightId: string,
  actorMemberId: string | null,
  snapshotWorkspaceId: string,
  backupCreatedAt: string | null,
  attachmentPackagePlan: RestoreAttachmentPackagePlan,
  packageManifest: RestoreAttachmentPackageManifest,
  packageSha256: string,
  manifestSha256: string,
  status: "verified_until_destination_rules",
  preflight: RestoreAttachmentPackagePreflightRow | null,
): Promise<{
  attachmentPackageVerificationId: string | null;
  persistence: RestoreAttachmentPackageVerificationPersistence;
  auditPersistence: AuditPersistence;
}> {
  const attachmentPackageVerificationId = `restore_attachment_package_verification_${crypto.randomUUID()}`;
  if (!db) {
    return {
      attachmentPackageVerificationId: null,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
    };
  }

  try {
    if (!preflight) {
      throw new Error("attachment package preflight proof is required");
    }
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      restoreAttachmentPackagePreflightStateAssertion(db, preflight),
      db.prepare(`
      INSERT INTO restore_attachment_package_verifications (
        id,
        workspace_id,
        attachment_package_preflight_id,
        actor_member_id,
        snapshot_workspace_id,
        backup_created_at,
        metadata_record_count,
        total_source_bytes,
        package_object_count,
        package_total_source_bytes,
        package_sha256,
        manifest_sha256,
        package_manifest_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      attachmentPackageVerificationId,
      workspaceId,
      attachmentPackagePreflightId,
      actorMemberId,
      snapshotWorkspaceId,
      backupCreatedAt,
      attachmentPackagePlan.metadataRecordCount,
      attachmentPackagePlan.totalSourceBytes,
      packageManifest.objectCount,
      packageManifest.totalSourceBytes,
      packageSha256,
      manifestSha256,
      JSON.stringify(packageManifest),
      status,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_restore_attachment_package_verification_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.attachment_package_verification_created",
        {
          attachmentPackagePreflightId,
          attachmentPackageVerificationId,
          attachmentPackageVerificationPersistence: "d1_restore_attachment_package_verifications",
          packageObjectCount: packageManifest.objectCount,
          packageTotalSourceBytes: packageManifest.totalSourceBytes,
          packageSha256,
          manifestSha256,
          destructiveWrite: false,
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore attachment package verification batch did not apply exactly once");
    }
    return {
      attachmentPackageVerificationId,
      persistence: "d1_restore_attachment_package_verifications",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return {
      attachmentPackageVerificationId: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }
}

async function restoreAttachmentPackageVerificationForObjectPlan(
  db: D1Database | undefined,
  attachmentPackageVerificationId: string,
  workspaceId: string,
): Promise<RestoreAttachmentPackageVerificationRow | null> {
  if (!db) return null;
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      attachment_package_preflight_id,
      actor_member_id,
      snapshot_workspace_id,
      backup_created_at,
      metadata_record_count,
      total_source_bytes,
      package_object_count,
      package_total_source_bytes,
      package_sha256,
      manifest_sha256,
      package_manifest_json,
      status,
      destructive_write,
      created_at
    FROM restore_attachment_package_verifications
    WHERE id = ?
      AND workspace_id = ?
  `).bind(attachmentPackageVerificationId, workspaceId).first<RestoreAttachmentPackageVerificationRow>();
}

function restoreAttachmentPackageVerificationMatchesObjectPlan(
  verification: RestoreAttachmentPackageVerificationRow,
  packageManifest: RestoreAttachmentPackageManifest,
  packageSha256: string,
  manifestSha256: string,
): boolean {
  return verification.package_object_count === packageManifest.objectCount
    && verification.package_total_source_bytes === packageManifest.totalSourceBytes
    && verification.package_sha256 === packageSha256
    && verification.manifest_sha256 === manifestSha256
    && verification.status === "verified_until_destination_rules"
    && verification.destructive_write === 0;
}

function createRestoreAttachmentObjectPlan(
  workspaceId: string,
  packageManifest: RestoreAttachmentPackageManifest,
): RestoreAttachmentObjectPlan {
  const objects = packageManifest.objects.map((object): RestoreAttachmentObjectPlanItem => ({
    docId: object.docId,
    name: object.name,
    sourceObjectKey: object.objectKey,
    destinationObjectKey: attachmentObjectKey(workspaceId, {
      docId: object.docId,
      name: object.name,
      sourcePath: object.sourcePath ?? undefined,
      sizeBytes: object.sizeBytes,
      contentType: object.contentType ?? undefined,
      sha256: object.sha256,
    }),
    sizeBytes: object.sizeBytes,
    sha256: object.sha256,
    destinationStatus: "candidate_workspace_key",
    overwriteStatus: "blocked_until_overwrite_policy",
    byteSourceStatus: "requires_package_object_bytes_at_commit",
    sourceVerificationStatus: "sha256_declared_in_verified_manifest",
    action: "blocked_destination_write_rules",
    blocker: "Attachment destination write rules are required before byte restore.",
  }));
  return {
    objectCount: packageManifest.objectCount,
    totalSourceBytes: packageManifest.totalSourceBytes,
    blockedDestinationCount: objects.length,
    destinationPolicy: "workspace_scoped_deterministic_object_keys",
    overwritePolicy: "blocked_until_explicit_overwrite_rules",
    byteSourcePolicy: "verified_package_manifest_only",
    sourceVerificationStatus: "metadata_hash_verified_without_bytes",
    objects,
  };
}

async function recordRestoreAttachmentObjectPlan(
  db: D1Database | undefined,
  workspaceId: string,
  attachmentPackageVerificationId: string,
  actorMemberId: string | null,
  objectPlan: RestoreAttachmentObjectPlan,
  status: "blocked_until_attachment_destination_write_rules",
  verification: RestoreAttachmentPackageVerificationRow | null,
): Promise<{
  attachmentObjectPlanId: string | null;
  persistence: RestoreAttachmentObjectPlanPersistence;
  auditPersistence: AuditPersistence;
}> {
  const attachmentObjectPlanId = `restore_attachment_object_plan_${crypto.randomUUID()}`;
  if (!db) {
    return {
      attachmentObjectPlanId: null,
      persistence: "dry_run_memoryless",
      auditPersistence: "dry_run_memoryless",
    };
  }

  try {
    if (!verification) {
      throw new Error("attachment package verification proof is required");
    }
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      restoreAttachmentPackageVerificationStateAssertion(db, verification),
      db.prepare(`
      INSERT INTO restore_attachment_object_plans (
        id,
        workspace_id,
        attachment_package_verification_id,
        actor_member_id,
        object_count,
        total_source_bytes,
        blocked_destination_count,
        plan_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      attachmentObjectPlanId,
      workspaceId,
      attachmentPackageVerificationId,
      actorMemberId,
      objectPlan.objectCount,
      objectPlan.totalSourceBytes,
      objectPlan.blockedDestinationCount,
      JSON.stringify(objectPlan),
      status,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_restore_attachment_object_plan_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.attachment_object_plan_created",
        {
          attachmentPackageVerificationId,
          attachmentObjectPlanId,
          attachmentObjectPlanPersistence: "d1_restore_attachment_object_plans",
          objectCount: objectPlan.objectCount,
          totalSourceBytes: objectPlan.totalSourceBytes,
          blockedDestinationCount: objectPlan.blockedDestinationCount,
          destinationPolicy: objectPlan.destinationPolicy,
          overwritePolicy: objectPlan.overwritePolicy,
          byteSourcePolicy: objectPlan.byteSourcePolicy,
          sourceVerificationStatus: objectPlan.sourceVerificationStatus,
          destructiveWrite: false,
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore attachment object plan batch did not apply exactly once");
    }
    return {
      attachmentObjectPlanId,
      persistence: "d1_restore_attachment_object_plans",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return {
      attachmentObjectPlanId: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
	  }
	}

async function restoreAttachmentObjectPlanForCommitPreflight(
  db: D1Database,
  attachmentObjectPlanId: string,
  workspaceId: string,
): Promise<RestoreAttachmentObjectPlanRow | null> {
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      attachment_package_verification_id,
      actor_member_id,
      object_count,
      total_source_bytes,
      blocked_destination_count,
      plan_json,
      status,
      destructive_write,
      created_at
    FROM restore_attachment_object_plans
    WHERE id = ?
      AND workspace_id = ?
  `).bind(attachmentObjectPlanId, workspaceId).first<RestoreAttachmentObjectPlanRow>();
}

function restoreAttachmentObjectPlanFromJson(value: string): RestoreAttachmentObjectPlan | null {
  try {
    const parsed = JSON.parse(value) as RestoreAttachmentObjectPlan;
    if (
      !parsed
      || typeof parsed !== "object"
      || !Array.isArray(parsed.objects)
      || typeof parsed.objectCount !== "number"
      || typeof parsed.totalSourceBytes !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function restoreAttachmentObjectPlansEqual(
  left: RestoreAttachmentObjectPlan,
  right: RestoreAttachmentObjectPlan,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function createRestoreAttachmentObjectCommitPreflight(
  db: D1Database,
  bucket: R2Bucket | undefined,
  workspaceId: string,
  objectPlan: RestoreAttachmentObjectPlan,
): Promise<RestoreAttachmentObjectCommitPreflight> {
  const objects: RestoreAttachmentObjectCommitPreflightItem[] = [];
  const blockers = new Set<string>();

  for (const object of objectPlan.objects) {
    const storedRecord = await findAttachmentObjectRecord(db, workspaceId, object.destinationObjectKey);
    if (!bucket) {
      const blocker = "ATTACHMENTS R2 binding is required before attachment byte restore destinations can be verified.";
      blockers.add(blocker);
      objects.push({
        docId: object.docId,
        name: object.name,
        sourceObjectKey: object.sourceObjectKey,
        destinationObjectKey: object.destinationObjectKey,
        sizeBytes: object.sizeBytes,
        sha256: object.sha256,
        destinationStatus: "r2_binding_missing",
        overwriteStatus: "overwrite_unknown_without_r2",
        byteSourceStatus: "requires_package_object_bytes_at_commit",
        sourceVerificationStatus: "sha256_declared_in_verified_manifest",
        action: "blocked_missing_r2_binding",
        existingR2Object: null,
        existingStoredRecord: Boolean(storedRecord),
        blocker,
      });
      continue;
    }

    let existingR2Object: boolean | null = null;
    try {
      existingR2Object = Boolean(await bucket.head(object.destinationObjectKey));
    } catch {
      const blocker = "Attachment destination existence check failed; byte restore remains blocked.";
      blockers.add(blocker);
      objects.push({
        docId: object.docId,
        name: object.name,
        sourceObjectKey: object.sourceObjectKey,
        destinationObjectKey: object.destinationObjectKey,
        sizeBytes: object.sizeBytes,
        sha256: object.sha256,
        destinationStatus: "destination_check_failed",
        overwriteStatus: "overwrite_check_failed",
        byteSourceStatus: "requires_package_object_bytes_at_commit",
        sourceVerificationStatus: "sha256_declared_in_verified_manifest",
        action: "blocked_destination_check",
        existingR2Object: null,
        existingStoredRecord: Boolean(storedRecord),
        blocker,
      });
      continue;
    }

    if (existingR2Object || storedRecord) {
      const blocker = "Destination attachment object already exists; overwrite restore is blocked.";
      blockers.add(blocker);
      objects.push({
        docId: object.docId,
        name: object.name,
        sourceObjectKey: object.sourceObjectKey,
        destinationObjectKey: object.destinationObjectKey,
        sizeBytes: object.sizeBytes,
        sha256: object.sha256,
        destinationStatus: "destination_exists",
        overwriteStatus: "overwrite_blocked_existing_destination",
        byteSourceStatus: "requires_package_object_bytes_at_commit",
        sourceVerificationStatus: "sha256_declared_in_verified_manifest",
        action: "blocked_existing_destination",
        existingR2Object,
        existingStoredRecord: Boolean(storedRecord),
        blocker,
      });
      continue;
    }

    objects.push({
      docId: object.docId,
      name: object.name,
      sourceObjectKey: object.sourceObjectKey,
      destinationObjectKey: object.destinationObjectKey,
      sizeBytes: object.sizeBytes,
      sha256: object.sha256,
      destinationStatus: "destination_absent",
      overwriteStatus: "new_object_allowed",
      byteSourceStatus: "requires_package_object_bytes_at_commit",
      sourceVerificationStatus: "sha256_declared_in_verified_manifest",
      action: "ready_for_explicit_byte_commit",
      existingR2Object,
      existingStoredRecord: false,
      blocker: null,
    });
  }

  const blockedDestinationCount = objects.filter((object) => object.action !== "ready_for_explicit_byte_commit").length;

  return {
    objectCount: objectPlan.objectCount,
    totalSourceBytes: objectPlan.totalSourceBytes,
    readyDestinationCount: objectPlan.objectCount - blockedDestinationCount,
    blockedDestinationCount,
    destinationPolicy: "workspace_scoped_new_object_keys_only",
    overwritePolicy: "overwrite_blocked_existing_destinations",
    byteSourcePolicy: "package_object_bytes_required_at_commit",
    sourceVerificationStatus: objectPlan.sourceVerificationStatus,
    objects,
    blockers: Array.from(blockers),
  };
}

function restoreAttachmentObjectCommitPreflightStatus(
  preflight: RestoreAttachmentObjectCommitPreflight,
): RestoreAttachmentObjectCommitPreflightStatus {
  if (preflight.objects.some((object) => object.action === "blocked_missing_r2_binding")) {
    return "blocked_by_missing_attachment_bucket";
  }
  if (preflight.objects.some((object) => object.action === "blocked_destination_check")) {
    return "blocked_by_attachment_destination_check";
  }
  if (preflight.objects.some((object) => object.action === "blocked_existing_destination")) {
    return "blocked_by_existing_attachment_destination";
  }
  return "ready_for_attachment_byte_commit";
}

async function recordRestoreAttachmentObjectCommitPreflight(
  db: D1Database | undefined,
  workspaceId: string,
  attachmentPackageVerificationId: string,
  attachmentObjectPlanId: string,
  actorMemberId: string | null,
  packageSha256: string,
  manifestSha256: string,
  commitPreflight: RestoreAttachmentObjectCommitPreflight,
  status: RestoreAttachmentObjectCommitPreflightStatus,
  verification: RestoreAttachmentPackageVerificationRow,
  objectPlanRow: RestoreAttachmentObjectPlanRow,
): Promise<{
  attachmentObjectCommitPreflightId: string | null;
  persistence: RestoreAttachmentObjectCommitPreflightPersistence;
  auditPersistence: AuditPersistence;
}> {
  const attachmentObjectCommitPreflightId = `restore_attachment_object_commit_preflight_${crypto.randomUUID()}`;
  if (!db) {
    return {
      attachmentObjectCommitPreflightId: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }

  try {
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      restoreAttachmentPackageVerificationStateAssertion(db, verification),
      restoreAttachmentObjectPlanStateAssertion(db, objectPlanRow),
      db.prepare(`
      INSERT INTO restore_attachment_object_commit_preflights (
        id,
        workspace_id,
        attachment_package_verification_id,
        attachment_object_plan_id,
        actor_member_id,
        object_count,
        total_source_bytes,
        ready_destination_count,
        blocked_destination_count,
        package_sha256,
        manifest_sha256,
        preflight_json,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      attachmentObjectCommitPreflightId,
      workspaceId,
      attachmentPackageVerificationId,
      attachmentObjectPlanId,
      actorMemberId,
      commitPreflight.objectCount,
      commitPreflight.totalSourceBytes,
      commitPreflight.readyDestinationCount,
      commitPreflight.blockedDestinationCount,
      packageSha256,
      manifestSha256,
      JSON.stringify(commitPreflight),
      status,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_restore_attachment_object_commit_preflight_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.attachment_object_commit_preflight_created",
        {
          attachmentPackageVerificationId,
          attachmentObjectPlanId,
          attachmentObjectCommitPreflightId,
          attachmentObjectCommitPreflightStatus: status,
          attachmentObjectCommitPreflightPersistence: "d1_restore_attachment_object_commit_preflights",
          objectCount: commitPreflight.objectCount,
          totalSourceBytes: commitPreflight.totalSourceBytes,
          readyDestinationCount: commitPreflight.readyDestinationCount,
          blockedDestinationCount: commitPreflight.blockedDestinationCount,
          destructiveWrite: false,
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[2]?.meta?.changes ?? 0) !== 1
      || Number(results[3]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("restore attachment object commit preflight batch did not apply exactly once");
    }
    return {
      attachmentObjectCommitPreflightId,
      persistence: "d1_restore_attachment_object_commit_preflights",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return {
      attachmentObjectCommitPreflightId: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }
}

function restoreAttachmentPackagePreflightStateAssertion(
  db: D1Database,
  preflight: RestoreAttachmentPackagePreflightRow,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM restore_attachment_package_preflights
        WHERE id = ?
          AND workspace_id = ?
          AND actor_member_id IS ?
          AND snapshot_workspace_id = ?
          AND backup_created_at IS ?
          AND metadata_record_count = ?
          AND staged_local_count = ?
          AND r2_dry_run_count = ?
          AND stored_r2_count = ?
          AND total_source_bytes = ?
          AND package_plan_json = ?
          AND status = ?
          AND destructive_write = ?
          AND created_at = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_attachment_package_preflight_state_assertion
  `).bind(
    preflight.id,
    preflight.workspace_id,
    preflight.actor_member_id,
    preflight.snapshot_workspace_id,
    preflight.backup_created_at,
    preflight.metadata_record_count,
    preflight.staged_local_count,
    preflight.r2_dry_run_count,
    preflight.stored_r2_count,
    preflight.total_source_bytes,
    preflight.package_plan_json,
    preflight.status,
    preflight.destructive_write,
    preflight.created_at,
  );
}

function restoreAttachmentPackageVerificationStateAssertion(
  db: D1Database,
  verification: RestoreAttachmentPackageVerificationRow,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM restore_attachment_package_verifications
        WHERE id = ?
          AND workspace_id = ?
          AND attachment_package_preflight_id = ?
          AND actor_member_id IS ?
          AND snapshot_workspace_id = ?
          AND backup_created_at IS ?
          AND metadata_record_count = ?
          AND total_source_bytes = ?
          AND package_object_count = ?
          AND package_total_source_bytes = ?
          AND package_sha256 = ?
          AND manifest_sha256 = ?
          AND package_manifest_json = ?
          AND status = ?
          AND destructive_write = ?
          AND created_at = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_attachment_package_verification_state_assertion
  `).bind(
    verification.id,
    verification.workspace_id,
    verification.attachment_package_preflight_id,
    verification.actor_member_id,
    verification.snapshot_workspace_id,
    verification.backup_created_at,
    verification.metadata_record_count,
    verification.total_source_bytes,
    verification.package_object_count,
    verification.package_total_source_bytes,
    verification.package_sha256,
    verification.manifest_sha256,
    verification.package_manifest_json,
    verification.status,
    verification.destructive_write,
    verification.created_at,
  );
}

function restoreAttachmentObjectPlanStateAssertion(
  db: D1Database,
  objectPlan: RestoreAttachmentObjectPlanRow,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM restore_attachment_object_plans
        WHERE id = ?
          AND workspace_id = ?
          AND attachment_package_verification_id = ?
          AND actor_member_id IS ?
          AND object_count = ?
          AND total_source_bytes = ?
          AND blocked_destination_count = ?
          AND plan_json = ?
          AND status = ?
          AND destructive_write = ?
          AND created_at = ?
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS restore_attachment_object_plan_state_assertion
  `).bind(
    objectPlan.id,
    objectPlan.workspace_id,
    objectPlan.attachment_package_verification_id,
    objectPlan.actor_member_id,
    objectPlan.object_count,
    objectPlan.total_source_bytes,
    objectPlan.blocked_destination_count,
    objectPlan.plan_json,
    objectPlan.status,
    objectPlan.destructive_write,
    objectPlan.created_at,
  );
}

async function restoreAttachmentObjectCommitPreflightForCommit(
  db: D1Database,
  id: string,
  workspaceId: string,
): Promise<RestoreAttachmentObjectCommitPreflightRow | null> {
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      attachment_package_verification_id,
      attachment_object_plan_id,
      actor_member_id,
      object_count,
      total_source_bytes,
      ready_destination_count,
      blocked_destination_count,
      package_sha256,
      manifest_sha256,
      preflight_json,
      status,
      destructive_write,
      created_at
    FROM restore_attachment_object_commit_preflights
    WHERE id = ?
      AND workspace_id = ?
    LIMIT 1
  `).bind(id, workspaceId).first<RestoreAttachmentObjectCommitPreflightRow>();
}

function restoreAttachmentPackageManifestFromJson(value: string): RestoreAttachmentPackageManifest | null {
  try {
    const parsed = JSON.parse(value) as RestoreAttachmentPackageManifestRequest;
    const workspaceId = typeof parsed.workspaceId === "string" ? parsed.workspaceId : "";
    return normalizeRestoreAttachmentPackageManifest(workspaceId, parsed);
  } catch {
    return null;
  }
}

function restoreAttachmentObjectCommitPreflightFromJson(value: string): RestoreAttachmentObjectCommitPreflight | null {
  try {
    const parsed = JSON.parse(value) as RestoreAttachmentObjectCommitPreflight;
    if (
      !parsed
      || typeof parsed !== "object"
      || !Array.isArray(parsed.objects)
      || typeof parsed.objectCount !== "number"
      || parsed.objects.length !== parsed.objectCount
      || typeof parsed.readyDestinationCount !== "number"
      || typeof parsed.blockedDestinationCount !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function restoreAttachmentObjectCommitForRetry(
  db: D1Database,
  attachmentObjectCommitPreflightId: string,
  docId: string,
): Promise<RestoreAttachmentObjectCommitRow | null> {
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      attachment_package_verification_id,
      attachment_object_plan_id,
      attachment_object_commit_preflight_id,
      actor_member_id,
      doc_id,
      source_object_key,
      destination_object_key,
      size_bytes,
      content_type,
      sha256,
      package_sha256,
      manifest_sha256,
      status,
      destructive_write,
      created_at
    FROM restore_attachment_object_commits
    WHERE attachment_object_commit_preflight_id = ?
      AND doc_id = ?
    LIMIT 1
  `).bind(attachmentObjectCommitPreflightId, docId).first<RestoreAttachmentObjectCommitRow>();
}

async function restoreDocumentExists(db: D1Database, workspaceId: string, docId: string): Promise<boolean> {
  const row = await db.prepare(`
    SELECT id
    FROM documents
    WHERE workspace_id = ?
      AND id = ?
    LIMIT 1
  `).bind(workspaceId, docId).first<{ id: string }>();
  return Boolean(row);
}

async function storeRestoredAttachmentObject(
  db: D1Database,
  bucket: R2Bucket,
  actorMemberId: string | null,
  workspaceId: string,
  attachmentPackageVerificationId: string,
  attachmentObjectPlanId: string,
  attachmentObjectCommitPreflightId: string,
  manifestObject: RestoreAttachmentPackageManifestObject,
  plannedObject: RestoreAttachmentObjectPlanItem,
  packageSha256: string,
  manifestSha256: string,
  bytes: ArrayBuffer,
  committedAt: string,
  reservationIdentity: RestoreAttachmentReservationIdentity,
): Promise<
  | {
    ok: true;
    persistence: RestoreAttachmentObjectCommitPersistence;
    auditPersistence: "d1_audit_events";
    idempotent: boolean;
    commit: RestoreAttachmentObjectCommitRow;
  }
  | { ok: false; persistence: RestoreAttachmentObjectCommitPersistence; error: string; status: number }
> {
  const contentType = manifestObject.contentType ?? "application/octet-stream";
  const reservationExpiresAt = new Date(Date.parse(committedAt) + 24 * 60 * 60 * 1000).toISOString();
  try {
    await db.prepare(`
      INSERT INTO attachment_upload_intents (
        id,
        workspace_id,
        doc_id,
        object_key,
        name,
        source_path,
        size_bytes,
        content_type,
        sha256,
        storage_key,
        commit_token_hash,
        status,
        prepared_at,
        expires_at,
        committed_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prepared', ?, ?, NULL, ?)
    `).bind(
      reservationIdentity.intentId,
      workspaceId,
      manifestObject.docId,
      plannedObject.destinationObjectKey,
      manifestObject.name,
      manifestObject.sourcePath,
      manifestObject.sizeBytes,
      contentType,
      manifestObject.sha256,
      reservationIdentity.storageKey,
      reservationIdentity.commitTokenHash,
      committedAt,
      reservationExpiresAt,
      committedAt,
    ).run();
  } catch {
    const reservation = await findAttachmentObjectRecord(db, workspaceId, plannedObject.destinationObjectKey);
    if (
      !reservation
      || !restoreAttachmentReservationMatches(
        reservation as RestoreAttachmentReservationRow,
        reservationIdentity,
        workspaceId,
        attachmentObjectCommitPreflightId,
        manifestObject.docId,
        plannedObject.destinationObjectKey,
        manifestObject.sizeBytes,
        manifestObject.sha256,
      )
    ) {
      return {
        ok: false,
        persistence: "d1_unavailable_restore_blocked",
        error: "restore_attachment_reservation_failed",
        status: 503,
      };
    }
  }

  let r2Object: R2Object | null;
  try {
    r2Object = await bucket.head(plannedObject.destinationObjectKey);
  } catch {
    return {
      ok: false,
      persistence: "d1_unavailable_restore_blocked",
      error: "restore_attachment_destination_check_unavailable",
      status: 503,
    };
  }
  if (!r2Object) {
    try {
      r2Object = await bucket.put(plannedObject.destinationObjectKey, bytes, {
        onlyIf: { etagDoesNotMatch: "*" },
        httpMetadata: { contentType },
        customMetadata: {
          workspaceId,
          docId: manifestObject.docId,
          sha256: manifestObject.sha256,
          restorePreflightId: attachmentObjectCommitPreflightId,
        },
        sha256: manifestObject.sha256,
      });
    } catch {
      r2Object = null;
    }
    if (!r2Object) {
      try {
        r2Object = await bucket.head(plannedObject.destinationObjectKey);
      } catch {
        return {
          ok: false,
          persistence: "r2_restore_compensation_pending",
          error: "restore_attachment_upload_state_unavailable",
          status: 503,
        };
      }
    }
  }
  if (!r2Object) {
    await releaseRestoreAttachmentReservation(db, reservationIdentity.intentId);
    return {
      ok: false,
      persistence: "d1_unavailable_restore_blocked",
      error: "r2_restore_upload_failed",
      status: 503,
    };
  }
  if (!restoreAttachmentR2ObjectMatches(
    r2Object,
    workspaceId,
    manifestObject.docId,
    manifestObject.sha256,
    attachmentObjectCommitPreflightId,
    manifestObject.sizeBytes,
  )) {
    await releaseRestoreAttachmentReservation(db, reservationIdentity.intentId);
    return {
      ok: false,
      persistence: "d1_restore_attachment_object_commits",
      error: "restore_attachment_destination_exists",
      status: 409,
    };
  }

  const commit: RestoreAttachmentObjectCommitRow = {
    id: reservationIdentity.commitId,
    workspace_id: workspaceId,
    attachment_package_verification_id: attachmentPackageVerificationId,
    attachment_object_plan_id: attachmentObjectPlanId,
    attachment_object_commit_preflight_id: attachmentObjectCommitPreflightId,
    actor_member_id: actorMemberId,
    doc_id: manifestObject.docId,
    source_object_key: manifestObject.objectKey,
    destination_object_key: plannedObject.destinationObjectKey,
    size_bytes: manifestObject.sizeBytes,
    content_type: contentType,
    sha256: manifestObject.sha256,
    package_sha256: packageSha256,
    manifest_sha256: manifestSha256,
    status: "stored_r2",
    destructive_write: 1,
    created_at: committedAt,
  };

  try {
    const batchResults = await db.batch([
      db.prepare(`
        UPDATE attachment_upload_intents
        SET
          status = 'stored_r2',
          committed_at = ?,
          updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND doc_id = ?
          AND object_key = ?
          AND sha256 = ?
          AND storage_key = ?
          AND commit_token_hash = ?
          AND status = 'prepared'
      `).bind(
        committedAt,
        committedAt,
        reservationIdentity.intentId,
        workspaceId,
        manifestObject.docId,
        plannedObject.destinationObjectKey,
        manifestObject.sha256,
        reservationIdentity.storageKey,
        reservationIdentity.commitTokenHash,
      ),
      db.prepare(`
      INSERT INTO restore_attachment_object_commits (
        id,
        workspace_id,
        attachment_package_verification_id,
        attachment_object_plan_id,
        attachment_object_commit_preflight_id,
        actor_member_id,
        doc_id,
        source_object_key,
        destination_object_key,
        size_bytes,
        content_type,
        sha256,
        package_sha256,
        manifest_sha256,
        status,
        destructive_write,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stored_r2', 1, ?)
      `).bind(
        commit.id,
        commit.workspace_id,
        commit.attachment_package_verification_id,
        commit.attachment_object_plan_id,
        commit.attachment_object_commit_preflight_id,
        commit.actor_member_id,
        commit.doc_id,
        commit.source_object_key,
        commit.destination_object_key,
        commit.size_bytes,
        commit.content_type,
        commit.sha256,
        commit.package_sha256,
        commit.manifest_sha256,
        commit.created_at,
      ),
      db.prepare(`
        INSERT INTO audit_events (
          id,
          workspace_id,
          project_id,
          actor_member_id,
          action,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `audit_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "restore.attachment_object_committed",
        JSON.stringify({
          attachmentObjectCommitId: commit.id,
          attachmentObjectCommitPreflightId,
          docId: manifestObject.docId,
          destinationObjectKey: plannedObject.destinationObjectKey,
          sizeBytes: manifestObject.sizeBytes,
          sha256: manifestObject.sha256,
          destructiveWrite: true,
          idempotent: false,
        }),
        committedAt,
      ),
    ]);
    if (
      batchResults.length !== 3
      || batchResults.some((result) => !result.success)
      || Number(batchResults[0]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("Restore attachment finalize batch did not commit every statement.");
    }
  } catch {
    try {
      const existingCommit = await restoreAttachmentObjectCommitForRetry(
        db,
        attachmentObjectCommitPreflightId,
        manifestObject.docId,
      );
      if (
        existingCommit
        && existingCommit.id === reservationIdentity.commitId
        && existingCommit.workspace_id === workspaceId
        && existingCommit.destination_object_key === plannedObject.destinationObjectKey
        && existingCommit.size_bytes === manifestObject.sizeBytes
        && existingCommit.sha256 === manifestObject.sha256
        && existingCommit.status === "stored_r2"
        && existingCommit.destructive_write === 1
      ) {
        return {
          ok: true,
          persistence: "d1_restore_attachment_object_commits",
          auditPersistence: "d1_audit_events",
          idempotent: true,
          commit: existingCommit,
        };
      }
    } catch {
      // Fall through to compensation when durable commit state cannot be confirmed.
    }

    const compensated = await compensateRestoredAttachmentObject(
      db,
      bucket,
      reservationIdentity.intentId,
      workspaceId,
      manifestObject.docId,
      plannedObject.destinationObjectKey,
      manifestObject.sizeBytes,
      manifestObject.sha256,
      attachmentObjectCommitPreflightId,
    );
    return compensated
      ? {
        ok: false,
        persistence: "d1_unavailable_restore_blocked",
        error: "restore_attachment_finalize_failed_compensated",
        status: 503,
      }
      : {
        ok: false,
        persistence: "r2_restore_compensation_pending",
        error: "restore_attachment_compensation_required",
        status: 503,
      };
  }

  return {
    ok: true,
    persistence: "r2_restore_attachment_object",
    auditPersistence: "d1_audit_events",
    idempotent: false,
    commit,
  };
}

async function restoreAttachmentReservationIdentity(
  workspaceId: string,
  attachmentObjectCommitPreflightId: string,
  docId: string,
  destinationObjectKey: string,
  sha256: string,
): Promise<RestoreAttachmentReservationIdentity> {
  const identityHash = await sha256Hex([
    "restore_attachment_object",
    workspaceId,
    attachmentObjectCommitPreflightId,
    docId,
    destinationObjectKey,
    sha256,
  ].join(":"));
  return {
    intentId: `attachment_restore_${identityHash.slice(0, 32)}`,
    commitId: `restore_attachment_object_commit_${identityHash.slice(0, 32)}`,
    commitTokenHash: await sha256Hex(`restore_attachment_commit:${identityHash}`),
    storageKey: `restore:${attachmentObjectCommitPreflightId}`,
  };
}

function restoreAttachmentReservationMatches(
  row: RestoreAttachmentReservationRow,
  identity: RestoreAttachmentReservationIdentity,
  workspaceId: string,
  attachmentObjectCommitPreflightId: string,
  docId: string,
  destinationObjectKey: string,
  sizeBytes: number,
  sha256: string,
): boolean {
  return row.id === identity.intentId
    && row.workspace_id === workspaceId
    && row.doc_id === docId
    && row.object_key === destinationObjectKey
    && row.size_bytes === sizeBytes
    && row.sha256 === sha256
    && row.storage_key === `restore:${attachmentObjectCommitPreflightId}`
    && row.commit_token_hash === identity.commitTokenHash
    && row.status === "prepared";
}

function restoreAttachmentR2ObjectMatches(
  object: R2Object,
  workspaceId: string,
  docId: string,
  sha256: string,
  attachmentObjectCommitPreflightId: string,
  sizeBytes: number,
): boolean {
  return object.size === sizeBytes
    && object.customMetadata?.workspaceId === workspaceId
    && object.customMetadata?.docId === docId
    && object.customMetadata?.sha256 === sha256
    && object.customMetadata?.restorePreflightId === attachmentObjectCommitPreflightId;
}

async function releaseRestoreAttachmentReservation(db: D1Database, intentId: string): Promise<void> {
  await db.prepare(`
    DELETE FROM attachment_upload_intents
    WHERE id = ?
      AND status = 'prepared'
  `).bind(intentId).run().catch(() => undefined);
}

async function compensateRestoredAttachmentObject(
  db: D1Database,
  bucket: R2Bucket,
  intentId: string,
  workspaceId: string,
  docId: string,
  destinationObjectKey: string,
  sizeBytes: number,
  sha256: string,
  attachmentObjectCommitPreflightId: string,
): Promise<boolean> {
  try {
    const currentObject = await bucket.head(destinationObjectKey);
    if (
      currentObject
      && !restoreAttachmentR2ObjectMatches(
        currentObject,
        workspaceId,
        docId,
        sha256,
        attachmentObjectCommitPreflightId,
        sizeBytes,
      )
    ) {
      return false;
    }
    if (currentObject) await bucket.delete(destinationObjectKey);
    if (await bucket.head(destinationObjectKey)) return false;
    await releaseRestoreAttachmentReservation(db, intentId);
    return true;
  } catch {
    return false;
  }
}

function restoreAttachmentObjectCommitSummary(row: RestoreAttachmentObjectCommitRow): Record<string, unknown> {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    attachmentPackageVerificationId: row.attachment_package_verification_id,
    attachmentObjectPlanId: row.attachment_object_plan_id,
    attachmentObjectCommitPreflightId: row.attachment_object_commit_preflight_id,
    docId: row.doc_id,
    sourceObjectKey: row.source_object_key,
    destinationObjectKey: row.destination_object_key,
    sizeBytes: row.size_bytes,
    contentType: row.content_type,
    sha256: row.sha256,
    status: row.status,
    destructiveWrite: true,
    createdAt: row.created_at,
  };
}

function restoreRollbackGuidance(
  preRestoreBackup: PreRestoreBackupProof,
  preview: RestoreCommitPreview,
  applicationTablePlan: RestoreApplicationTablePlan[],
): Record<string, unknown> {
  return {
    rollbackMode: "pre_restore_backup_required",
    preRestoreBackupId: preRestoreBackup.restorePointId,
    destructiveWrite: false,
    requiredBeforeApply: [
      "create_new_pre_restore_backup",
      "validate_matching_restore_approval",
      "validate_matching_commit_attempt",
      "rerun_record_conflict_checks",
      "write_per_table_audit_events",
    ],
    blockers: [
      "Workspace snapshot writes require the Worker application commit gate after approval and preflight.",
      "Per-table rollback execution is not implemented.",
    ],
    previewCounts: {
      incomingRecordCount: preview.incomingRecordCount,
      changedRecordCount: preview.changedRecordCount,
      newRecordCount: preview.newRecordCount,
      fieldConflictCount: preview.fieldConflictCount,
      warningCount: preview.warnings.length,
    },
    applicationTablePlan,
  };
}

function restoreApprovalPreviewMatches(approval: RestoreApprovalRow, preview: RestoreCommitPreview): boolean {
  const approvedPreview = restorePreviewFromJson(approval.preview_json);
  return Boolean(approvedPreview && restorePreviewsEqual(approvedPreview, preview));
}

async function loadRestoreApprovalProof(
  db: D1Database,
  identity: RestoreProofIdentity,
  approvalId: string,
): Promise<RestoreApprovalProof> {
  const preRestoreBackup = await verifyPreRestoreBackupProof(
    db,
    identity.workspaceId,
    identity.preRestoreBackupId,
  );
  if (!preRestoreBackup.verified) {
    return {
      ok: false,
      response: json({
        error: "restore_pre_restore_backup_required",
        preRestoreBackupId: preRestoreBackup.restorePointId,
        preRestoreBackupVerified: false,
        preRestoreBackupPersistence: preRestoreBackup.persistence,
        preRestoreBackupBlocker: preRestoreBackup.blocker,
      }, 422),
    };
  }

  const approval = await findRestoreApproval(db, identity.workspaceId, approvalId);
  if (!approval) {
    return { ok: false, response: json({ error: "restore_approval_not_found" }, 404) };
  }
  if (approval.status !== "approved_pending_commit" || approval.destructive_write !== 0) {
    return {
      ok: false,
      response: json({
        error: "restore_approval_not_ready",
        approvalStatus: approval.status,
        destructiveWrite: approval.destructive_write === 1,
      }, 422),
    };
  }
  if (approval.snapshot_workspace_id !== identity.snapshotWorkspaceId) {
    return { ok: false, response: json({ error: "restore_approval_snapshot_mismatch" }, 422) };
  }
  if ((approval.backup_created_at ?? "") !== identity.backupCreatedAt) {
    return { ok: false, response: json({ error: "restore_approval_backup_mismatch" }, 422) };
  }
  if (approval.pre_restore_backup_id !== preRestoreBackup.restorePointId) {
    return {
      ok: false,
      response: json({
        error: "restore_approval_pre_restore_backup_mismatch",
        approvalPreRestoreBackupId: approval.pre_restore_backup_id,
        preRestoreBackupId: preRestoreBackup.restorePointId,
      }, 422),
    };
  }
  if (!restoreApprovalPreviewMatches(approval, identity.preview)) {
    return { ok: false, response: json({ error: "restore_approval_preview_mismatch" }, 422) };
  }
  return { ok: true, preRestoreBackup, approval };
}

async function loadRestoreCommitAttemptProof(
  db: D1Database,
  identity: RestoreProofIdentity,
  approval: RestoreApprovalRow,
  preRestoreBackup: PreRestoreBackupProof,
  commitAttemptId: string,
): Promise<RestoreCommitAttemptProof> {
  const commitAttempt = await findRestoreCommitAttempt(db, identity.workspaceId, commitAttemptId);
  if (!commitAttempt) {
    return { ok: false, response: json({ error: "restore_commit_attempt_not_found" }, 404) };
  }
  if (commitAttempt.status !== "blocked_until_restore_apply" || commitAttempt.destructive_write !== 0) {
    return {
      ok: false,
      response: json({
        error: "restore_commit_attempt_not_ready",
        commitAttemptStatus: commitAttempt.status,
        destructiveWrite: commitAttempt.destructive_write === 1,
      }, 422),
    };
  }
  if (commitAttempt.approval_id !== approval.id) {
    return { ok: false, response: json({ error: "restore_commit_attempt_approval_mismatch" }, 422) };
  }
  if (commitAttempt.pre_restore_backup_id !== preRestoreBackup.restorePointId) {
    return {
      ok: false,
      response: json({
        error: "restore_commit_attempt_pre_restore_backup_mismatch",
        commitAttemptPreRestoreBackupId: commitAttempt.pre_restore_backup_id,
        preRestoreBackupId: preRestoreBackup.restorePointId,
      }, 422),
    };
  }
  const commitAttemptPreview = restorePreviewFromJson(commitAttempt.preview_json);
  if (!commitAttemptPreview || !restorePreviewsEqual(commitAttemptPreview, identity.preview)) {
    return { ok: false, response: json({ error: "restore_commit_attempt_preview_mismatch" }, 422) };
  }
  return { ok: true, commitAttempt };
}

async function loadRestoreApplicationPreflightProof(
  db: D1Database,
  identity: RestoreProofIdentity,
  approval: RestoreApprovalRow,
  commitAttempt: RestoreCommitAttemptRow,
  preRestoreBackup: PreRestoreBackupProof,
  applicationPreflightId: string,
  applicationTablePlan?: RestoreApplicationTablePlan[],
): Promise<RestoreApplicationPreflightProof> {
  const applicationPreflight = await findRestoreApplicationPreflight(
    db,
    identity.workspaceId,
    applicationPreflightId,
  );
  if (!applicationPreflight) {
    return { ok: false, response: json({ error: "restore_application_preflight_not_found" }, 404) };
  }
  if (
    applicationPreflight.status !== "blocked_until_restore_apply_implementation"
    || applicationPreflight.destructive_write !== 0
  ) {
    return {
      ok: false,
      response: json({
        error: "restore_application_preflight_not_ready",
        applicationPreflightStatus: applicationPreflight.status,
        destructiveWrite: applicationPreflight.destructive_write === 1,
      }, 422),
    };
  }
  if (applicationPreflight.approval_id !== approval.id) {
    return { ok: false, response: json({ error: "restore_application_preflight_approval_mismatch" }, 422) };
  }
  if (applicationPreflight.commit_attempt_id !== commitAttempt.id) {
    return { ok: false, response: json({ error: "restore_application_preflight_commit_attempt_mismatch" }, 422) };
  }
  if (applicationPreflight.pre_restore_backup_id !== preRestoreBackup.restorePointId) {
    return {
      ok: false,
      response: json({
        error: "restore_application_preflight_pre_restore_backup_mismatch",
        applicationPreflightPreRestoreBackupId: applicationPreflight.pre_restore_backup_id,
        preRestoreBackupId: preRestoreBackup.restorePointId,
      }, 422),
    };
  }
  const preflightPreview = restorePreviewFromJson(applicationPreflight.preview_json);
  if (!preflightPreview || !restorePreviewsEqual(preflightPreview, identity.preview)) {
    return { ok: false, response: json({ error: "restore_application_preflight_preview_mismatch" }, 422) };
  }
  if (applicationTablePlan) {
    const storedPlan = restoreApplicationTablePlanFromRollbackGuidance(applicationPreflight.rollback_guidance_json);
    if (storedPlan === null) {
      return { ok: false, response: json({ error: "restore_application_preflight_table_plan_invalid" }, 422) };
    }
    if (storedPlan.length > 0 && !restoreApplicationTablePlansEqual(storedPlan, applicationTablePlan)) {
      return {
        ok: false,
        response: json({
          error: "restore_application_preflight_table_plan_mismatch",
          destructiveWrite: false,
        }, 422),
      };
    }
  }
  return { ok: true, applicationPreflight };
}

function restoreRollbackGuidanceFromJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function restoreApplicationTablePlanFromRollbackGuidance(value: string): RestoreApplicationTablePlan[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const tablePlan = (parsed as { applicationTablePlan?: unknown }).applicationTablePlan;
    if (tablePlan === undefined) return [];
    return normalizeRestoreApplicationTablePlan(tablePlan as RestoreApplicationTablePlanRequest[] | undefined);
  } catch {
    return null;
  }
}

function restoreApplicationTablePlansEqual(
  left: RestoreApplicationTablePlan[],
  right: RestoreApplicationTablePlan[],
): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort(restoreApplicationTablePlanSort);
  const sortedRight = [...right].sort(restoreApplicationTablePlanSort);
  return sortedLeft.every((leftRow, index) => {
    const rightRow = sortedRight[index];
    return Boolean(rightRow)
      && leftRow.tableName === rightRow.tableName
      && leftRow.source === rightRow.source
      && leftRow.entityType === rightRow.entityType
      && leftRow.operationCount === rightRow.operationCount
      && leftRow.createCount === rightRow.createCount
      && leftRow.updateCount === rightRow.updateCount
      && leftRow.skipCount === rightRow.skipCount
      && leftRow.previewOnlyCount === rightRow.previewOnlyCount
      && leftRow.fieldConflictCount === rightRow.fieldConflictCount
      && leftRow.restoreSupport === rightRow.restoreSupport
      && leftRow.blockers.length === rightRow.blockers.length
      && leftRow.blockers.every((blocker, blockerIndex) => blocker === rightRow.blockers[blockerIndex]);
  });
}

function restoreApplicationTablePlanSort(
  left: RestoreApplicationTablePlan,
  right: RestoreApplicationTablePlan,
): number {
  return left.source.localeCompare(right.source)
    || left.tableName.localeCompare(right.tableName)
    || left.entityType.localeCompare(right.entityType);
}

function restorePreviewFromJson(value: string): RestoreCommitPreview | null {
  try {
    return normalizeRestoreCommitPreview(JSON.parse(value) as RestoreCommitPreviewRequest);
  } catch {
    return null;
  }
}

function restorePreviewsEqual(left: RestoreCommitPreview, right: RestoreCommitPreview): boolean {
  return left.incomingRecordCount === right.incomingRecordCount
    && left.changedRecordCount === right.changedRecordCount
    && left.newRecordCount === right.newRecordCount
    && left.fieldConflictCount === right.fieldConflictCount
    && left.warnings.length === right.warnings.length
    && left.warnings.every((warning, index) => warning === right.warnings[index]);
}

function isValidRestoreCount(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= RESTORE_PREVIEW_MAX_RECORDS;
}

function operationReplayPersistenceMode(env: Env): OperationReplayPersistence {
  return env.DB ? "d1_operation_log" : "dry_run_memoryless";
}

function auditWorkspaceIdForOperations(operations: unknown[]): string {
  for (const operation of operations) {
    if (!operation || typeof operation !== "object") continue;
    const workspaceId = (operation as { workspaceId?: unknown }).workspaceId;
    if (typeof workspaceId === "string" && isValidWorkspaceId(workspaceId)) {
      return workspaceId;
    }
  }
  return seedWorkspace.id;
}

function operationRoleRejections(
  operations: OperationRecord[],
  role: AuthRole,
): Array<{ id: string; reason: string }> {
  return operations
    .filter((operation) => !isOperationReplayAllowed(operation, role))
    .map((operation) => ({ id: operation.id, reason: "insufficient_operation_role" }));
}

function isOperationReplayAllowed(operation: OperationRecord, role: AuthRole): boolean {
  return Boolean(OPERATION_REPLAY_ROLES[operation.kind]?.includes(role));
}

function requiresOperationEntityConflictGuard(kind: OperationRecord["kind"]): boolean {
  return kind === "project.created"
    || kind === "task.created"
    || kind === "document.created"
    || kind === "person.created"
    || kind === "equipment.created"
    || kind === "expense.created";
}

function appliesCanonicalOperation(kind: OperationRecord["kind"]): boolean {
  return requiresOperationEntityConflictGuard(kind)
    || kind === "task.updated"
    || kind === "task.completed";
}

async function replayOperationBatch(
  db: D1Database | undefined,
  operations: OperationRecord[],
  role: AuthRole,
  actorMemberId: string | null,
): Promise<OperationReplayResult> {
  const accepted = operations.map((operation) => operation.id);
  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      accepted,
      rejected: [],
      replayed: [],
      idempotent: [],
      canonicalApplied: [],
      metadataOnly: [],
    };
  }

  try {
    await db.prepare("SELECT id FROM operation_log LIMIT 1").bind().first();

    const idempotent: string[] = [];
    const rejected: Array<{ id: string; reason: string }> = [];
    const planned: PlannedOperationReplay[] = [];
    const plannedTaskStates = new Map<string, PlannedTaskState>();
    const plannedEntityCreates = new Set<string>();
    const batchProjectIds = new Set(
      operations
        .filter((operation) => operation.kind === "project.created")
        .map((operation) => operation.entityId),
    );
    const seedProjects = new Map<string, (typeof seedWorkspace.projects)[number]>();

    for (const operation of operations) {
      const payloadJson = operationLogPayloadJson(operation);
      const existing = await db.prepare(`
        SELECT id, workspace_id, kind, entity_type, entity_id, payload_json, status, created_at, applied_at
        FROM operation_log
        WHERE id = ?
        LIMIT 1
      `).bind(operation.id).first<OperationLogRow>();

      if (existing) {
        if (isSameOperationLogEntry(existing, operation, payloadJson)) {
          idempotent.push(operation.id);
        } else {
          rejected.push({ id: operation.id, reason: "operation_conflict" });
        }
        continue;
      }

      if (requiresOperationEntityConflictGuard(operation.kind)) {
        const entityConflict = await db.prepare(`
          SELECT id, workspace_id, kind, entity_type, entity_id, payload_json, status, created_at, applied_at
          FROM operation_log
          WHERE workspace_id = ?
            AND entity_type = ?
            AND entity_id = ?
            AND kind = ?
            AND status = 'applied'
          LIMIT 1
        `).bind(
          operation.workspaceId,
          operation.entityType,
          operation.entityId,
          operation.kind,
        ).first<OperationLogRow>();

        if (entityConflict) {
          rejected.push({ id: operation.id, reason: "entity_conflict" });
          continue;
        }
      }

      const canonicalAuthorization = await authorizeCanonicalCreateOperation(db, operation, role, actorMemberId);
      if (!canonicalAuthorization.ok) {
        rejected.push({ id: operation.id, reason: canonicalAuthorization.reason });
        continue;
      }

      const projectReference = await planCanonicalOperationProjectReference(
        db,
        operation,
        batchProjectIds,
        seedProjects,
      );
      if (!projectReference.ok) {
        rejected.push({ id: operation.id, reason: projectReference.reason });
        continue;
      }

      const taskMutation = await planCanonicalTaskMutation(
        db,
        operation,
        projectReference.projectId,
        plannedTaskStates,
      );
      if (!taskMutation.ok) {
        rejected.push({ id: operation.id, reason: taskMutation.reason });
        continue;
      }

      if (requiresOperationEntityConflictGuard(operation.kind)) {
        const entityKey = `${operation.entityType}:${operation.entityId}`;
        if (plannedEntityCreates.has(entityKey)) {
          rejected.push({ id: operation.id, reason: "entity_conflict" });
          continue;
        }
        const existingWorkspaceId = await canonicalOperationEntityWorkspaceId(db, operation);
        if (existingWorkspaceId) {
          rejected.push({ id: operation.id, reason: "entity_conflict" });
          continue;
        }
        plannedEntityCreates.add(entityKey);
      }

      planned.push({
        operation,
        payloadJson,
        appliedAt: new Date().toISOString(),
        projectId: projectReference.projectId,
        canonicalApplication: appliesCanonicalOperation(operation.kind) ? "applied" : "metadata_only",
      });
      if (operation.kind === "task.created") {
        plannedTaskStates.set(operation.entityId, {
          workspaceId: operation.workspaceId,
          projectId: projectReference.projectId,
          status: "pending",
        });
      } else if (taskMutation.nextState) {
        plannedTaskStates.set(operation.entityId, taskMutation.nextState);
      }
    }

    const orderedPlanned = [
      ...planned.filter((entry) => entry.operation.kind === "project.created"),
      ...planned.filter((entry) => entry.operation.kind !== "project.created" && requiresOperationEntityConflictGuard(entry.operation.kind)),
      ...planned.filter((entry) => entry.operation.kind === "task.updated" || entry.operation.kind === "task.completed"),
      ...planned.filter((entry) => !requiresOperationEntityConflictGuard(entry.operation.kind)
        && entry.operation.kind !== "task.updated"
        && entry.operation.kind !== "task.completed"),
    ];
    const workspaceTimestamps = new Map<string, string>();
    for (const entry of orderedPlanned) {
      if (!workspaceTimestamps.has(entry.operation.workspaceId)) {
        workspaceTimestamps.set(entry.operation.workspaceId, entry.appliedAt);
      }
    }
    const statements: D1PreparedStatement[] = [
      ...Array.from(workspaceTimestamps, ([workspaceId, timestamp]) => operationReplayWorkspaceStatement(db, workspaceId, timestamp)),
      ...Array.from(seedProjects.values()).flatMap((project) => operationReplaySeedProjectStatements(db, operations[0]?.workspaceId ?? seedWorkspace.id, project, new Date().toISOString())),
      ...orderedPlanned.flatMap((entry) => operationReplayStatements(db, entry, actorMemberId)),
    ];
    if (statements.length > OPERATION_REPLAY_BATCH_MAX_STATEMENTS) {
      throw new Error("Operation replay batch exceeds the bounded statement cap.");
    }
    if (statements.length > 0) {
      const results = await db.batch(statements);
      if (results.length !== statements.length || results.some((result) => !result.success)) {
        throw new Error("Operation replay batch did not commit every statement.");
      }
    }

    const replayed = planned.map((entry) => entry.operation.id);
    const canonicalApplied = planned
      .filter((entry) => entry.canonicalApplication === "applied")
      .map((entry) => entry.operation.id);
    const metadataOnly = planned
      .filter((entry) => entry.canonicalApplication === "metadata_only")
      .map((entry) => entry.operation.id);

    return {
      persistence: "d1_operation_log",
      accepted: operations
        .map((operation) => operation.id)
        .filter((id) => !rejected.some((rejection) => rejection.id === id)),
      rejected,
      replayed,
      idempotent,
      canonicalApplied,
      metadataOnly,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      accepted,
      rejected: [],
      replayed: [],
      idempotent: [],
      canonicalApplied: [],
      metadataOnly: [],
    };
  }
}

async function planCanonicalOperationProjectReference(
  db: D1Database,
  operation: OperationRecord,
  batchProjectIds: Set<string>,
  seedProjects: Map<string, (typeof seedWorkspace.projects)[number]>,
): Promise<
  | { ok: true; projectId: string | null }
  | { ok: false; reason: "project_scope_mismatch" }
> {
  if (operation.kind === "project.created") return { ok: true, projectId: null };
  const projectId = payloadString(operation.payload, "projectId", 120);
  if (!projectId) return { ok: true, projectId: null };

  const existing = await db.prepare("SELECT workspace_id FROM projects WHERE id = ? LIMIT 1")
    .bind(projectId)
    .first<{ workspace_id: string }>();
  if (existing) {
    return existing.workspace_id === operation.workspaceId
      ? { ok: true, projectId }
      : { ok: false, reason: "project_scope_mismatch" };
  }
  if (batchProjectIds.has(projectId)) return { ok: true, projectId };

  const seedProject = seedWorkspace.projects.find((project) => project.id === projectId);
  if (seedProject) {
    seedProjects.set(projectId, seedProject);
    return { ok: true, projectId };
  }
  return { ok: true, projectId: null };
}

async function planCanonicalTaskMutation(
  db: D1Database,
  operation: OperationRecord,
  projectId: string | null,
  plannedTaskStates: Map<string, PlannedTaskState>,
): Promise<
  | { ok: true; nextState: PlannedTaskState | null }
  | { ok: false; reason: string }
> {
  if (operation.kind !== "task.updated" && operation.kind !== "task.completed") {
    return { ok: true, nextState: null };
  }
  if (!projectId) return { ok: false, reason: "project_scope_not_found" };

  const previousStatus = localTaskOperationStatus(payloadString(operation.payload, "previousStatus", 40));
  const nextStatus = operation.kind === "task.completed"
    ? "completed"
    : localTaskOperationStatus(
      payloadString(operation.payload, "newStatus", 40)
      || payloadString(operation.payload, "status", 40),
    );
  if (!previousStatus || !nextStatus || previousStatus === "completed") {
    return { ok: false, reason: "invalid_task_transition" };
  }
  if (operation.kind === "task.completed") {
    const completedAt = payloadString(operation.payload, "completedAt", 80) || operation.createdAt;
    if (!completedAt || Number.isNaN(Date.parse(completedAt))) {
      return { ok: false, reason: "invalid_task_completion_time" };
    }
  }

  let current = plannedTaskStates.get(operation.entityId) ?? null;
  if (!current) {
    const row = await db.prepare(`
      SELECT id, workspace_id, project_id, status
      FROM tasks
      WHERE id = ?
      LIMIT 1
    `).bind(operation.entityId).first<{
      id: string;
      workspace_id: string;
      project_id: string | null;
      status: string;
    }>();
    if (!row) return { ok: false, reason: "canonical_task_not_found" };
    const status = canonicalTaskOperationStatus(row.status);
    if (!status) return { ok: false, reason: "invalid_canonical_task_status" };
    current = {
      workspaceId: row.workspace_id,
      projectId: row.project_id,
      status,
    };
  }
  if (current.workspaceId !== operation.workspaceId || current.projectId !== projectId) {
    return { ok: false, reason: "canonical_task_scope_mismatch" };
  }
  if (current.status !== previousStatus) {
    return { ok: false, reason: "stale_task_status" };
  }
  return {
    ok: true,
    nextState: {
      workspaceId: operation.workspaceId,
      projectId,
      status: nextStatus,
    },
  };
}

function localTaskOperationStatus(value: string): PlannedTaskState["status"] | null {
  if (value === "pending" || value === "ready" || value === "overdue" || value === "completed") return value;
  return null;
}

function canonicalTaskOperationStatus(value: string): PlannedTaskState["status"] | null {
  if (value === "todo") return "pending";
  if (value === "done") return "completed";
  return localTaskOperationStatus(value);
}

async function canonicalOperationEntityWorkspaceId(
  db: D1Database,
  operation: OperationRecord,
): Promise<string | null> {
  const table = canonicalOperationEntityTable(operation.entityType);
  if (!table) return null;
  const row = await db.prepare(`SELECT workspace_id FROM ${table} WHERE id = ? LIMIT 1`)
    .bind(operation.entityId)
    .first<{ workspace_id: string }>();
  return row?.workspace_id ?? null;
}

function canonicalOperationEntityTable(
  entityType: OperationRecord["entityType"],
): "projects" | "tasks" | "documents" | "people" | "equipment" | "expenses" | null {
  if (entityType === "project") return "projects";
  if (entityType === "task") return "tasks";
  if (entityType === "document") return "documents";
  if (entityType === "person") return "people";
  if (entityType === "equipment") return "equipment";
  if (entityType === "expense") return "expenses";
  return null;
}

function operationReplayWorkspaceStatement(
  db: D1Database,
  workspaceId: string,
  timestamp: string,
): D1PreparedStatement {
  const seedName = seedWorkspace.id === workspaceId ? seedWorkspace.name : "Film Workspace";
  return db.prepare(`
    INSERT OR IGNORE INTO workspaces (
      id,
      name,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?)
  `).bind(workspaceId, seedName, timestamp, timestamp);
}

function operationReplaySeedProjectStatements(
  db: D1Database,
  workspaceId: string,
  project: (typeof seedWorkspace.projects)[number],
  timestamp: string,
): D1PreparedStatement[] {
  return [
    db.prepare(`
      SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id = ?)
          OR EXISTS (SELECT 1 FROM projects WHERE id = ? AND workspace_id = ?)
        THEN 1 ELSE abs(-9223372036854775808)
      END AS operation_assertion
    `).bind(project.id, project.id, workspaceId),
    db.prepare(`
      INSERT OR IGNORE INTO projects (
        id,
        workspace_id,
        title,
        project_type,
        status,
        phase,
        logline,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'film', 'active', ?, ?, ?, ?)
    `).bind(
      project.id,
      workspaceId,
      project.title,
      canonicalProjectPhase(project.phase),
      project.description,
      timestamp,
      timestamp,
    ),
    db.prepare(`
      INSERT OR IGNORE INTO film_profiles (
        project_id,
        runtime_minutes,
        format,
        budget_cents,
        spent_cents,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      project.id,
      project.runtimeMinutes,
      project.format,
      Math.round(project.totalBudget * 100),
      Math.round(project.spentBudget * 100),
      timestamp,
      timestamp,
    ),
  ];
}

function operationReplayStatements(
  db: D1Database,
  planned: PlannedOperationReplay,
  actorMemberId: string | null,
): D1PreparedStatement[] {
  const { operation, payloadJson, appliedAt, projectId } = planned;
  const statements: D1PreparedStatement[] = [operationReplayIdAssertion(db, operation.id)];
  if (requiresOperationEntityConflictGuard(operation.kind)) {
    statements.push(operationReplayEntityLogAssertion(db, operation));
    const table = canonicalOperationEntityTable(operation.entityType);
    if (table) statements.push(operationReplayTargetAssertion(db, table, operation.entityId));
    if (projectId) statements.push(restoreProjectScopeAssertion(db, operation.workspaceId, projectId));
    statements.push(...canonicalOperationCreateStatements(db, operation, projectId, appliedAt, actorMemberId));
  } else if (operation.kind === "task.updated" || operation.kind === "task.completed") {
    statements.push(...canonicalTaskMutationStatements(db, operation, projectId, appliedAt));
  }
  statements.push(db.prepare(`
    INSERT INTO operation_log (
      id,
      workspace_id,
      actor_member_id,
      kind,
      entity_type,
      entity_id,
      payload_json,
      status,
      created_at,
      applied_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'applied', ?, ?)
  `).bind(
    operation.id,
    operation.workspaceId,
    actorMemberId,
    operation.kind,
    operation.entityType,
    operation.entityId,
    payloadJson,
    operation.createdAt,
    appliedAt,
  ));
  return statements;
}

function canonicalTaskMutationStatements(
  db: D1Database,
  operation: OperationRecord,
  projectId: string | null,
  appliedAt: string,
): D1PreparedStatement[] {
  const previousStatus = localTaskOperationStatus(payloadString(operation.payload, "previousStatus", 40));
  const nextStatus = operation.kind === "task.completed"
    ? "completed"
    : localTaskOperationStatus(
      payloadString(operation.payload, "newStatus", 40)
      || payloadString(operation.payload, "status", 40),
    );
  if (!projectId || !previousStatus || !nextStatus) return [];
  const expectedStatuses = taskStorageStatuses(previousStatus);
  const placeholders = expectedStatuses.map(() => "?").join(", ");
  return [
    db.prepare(`
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM tasks
          WHERE id = ?
            AND workspace_id = ?
            AND project_id = ?
            AND status IN (${placeholders})
        )
        THEN 1 ELSE abs(-9223372036854775808)
      END AS task_operation_state_assertion
    `).bind(operation.entityId, operation.workspaceId, projectId, ...expectedStatuses),
    db.prepare(`
      UPDATE tasks /* canonical_task_operation_replay */
      SET status = ?,
        updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
        AND project_id = ?
        AND status IN (${placeholders})
    `).bind(nextStatus, appliedAt, operation.entityId, operation.workspaceId, projectId, ...expectedStatuses),
  ];
}

function taskStorageStatuses(status: PlannedTaskState["status"]): string[] {
  if (status === "pending") return ["pending", "todo"];
  if (status === "completed") return ["completed", "done"];
  return [status];
}

function operationReplayIdAssertion(db: D1Database, operationId: string): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN NOT EXISTS (SELECT 1 FROM operation_log WHERE id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS operation_assertion
  `).bind(operationId);
}

function operationReplayEntityLogAssertion(db: D1Database, operation: OperationRecord): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM operation_log
        WHERE workspace_id = ?
          AND entity_type = ?
          AND entity_id = ?
          AND kind = ?
          AND status = 'applied'
      )
      THEN 1 ELSE abs(-9223372036854775808)
    END AS operation_assertion
  `).bind(operation.workspaceId, operation.entityType, operation.entityId, operation.kind);
}

function operationReplayTargetAssertion(
  db: D1Database,
  table: Exclude<ReturnType<typeof canonicalOperationEntityTable>, null>,
  entityId: string,
): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN NOT EXISTS (SELECT 1 FROM ${table} WHERE id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS operation_assertion
  `).bind(entityId);
}

function canonicalOperationCreateStatements(
  db: D1Database,
  operation: OperationRecord,
  projectId: string | null,
  timestamp: string,
  actorMemberId: string | null,
): D1PreparedStatement[] {
  if (operation.kind === "project.created") {
    const title = payloadString(operation.payload, "title", 160) || operation.summary.replace(/^Project created:\s*/i, "") || "Untitled Film";
    const projectType = payloadString(operation.payload, "projectType", 80) || "film";
    return [
      db.prepare(`
        INSERT INTO projects (
          id, workspace_id, title, project_type, status, phase, logline,
          owner_member_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'active', 'development', NULL, ?, ?, ?)
      `).bind(operation.entityId, operation.workspaceId, title, projectType, actorMemberId, operation.createdAt, timestamp),
      db.prepare(`
        INSERT INTO film_profiles (
          project_id, runtime_minutes, format, budget_cents, spent_cents, created_at, updated_at
        )
        VALUES (?, NULL, NULL, 0, 0, ?, ?)
      `).bind(operation.entityId, operation.createdAt, timestamp),
    ];
  }
  if (operation.kind === "task.created") {
    const title = payloadString(operation.payload, "title", 180) || operation.summary.replace(/^Task created:\s*/i, "") || "Untitled task";
    const dueAtValue = payloadString(operation.payload, "dueAt", 80);
    const dueAt = dueAtValue && dueAtValue !== "Unscheduled" ? dueAtValue : null;
    return [db.prepare(`
      INSERT INTO tasks (
        id, workspace_id, project_id, title, status, priority, due_at,
        owner_member_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'todo', 'normal', ?, ?, ?, ?)
    `).bind(operation.entityId, operation.workspaceId, projectId, title, dueAt, actorMemberId, operation.createdAt, timestamp)];
  }
  if (operation.kind === "document.created") {
    const title = payloadString(operation.payload, "name", 180)
      || payloadString(operation.payload, "title", 180)
      || operation.summary.replace(/^Document created:\s*/i, "")
      || "Untitled document.md";
    return [db.prepare(`
      INSERT INTO documents (
        id, workspace_id, project_id, folder_id, title, document_type,
        markdown_snapshot, external_url, sensitive, owner_member_id, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?, ?, ?)
    `).bind(
      operation.entityId,
      operation.workspaceId,
      projectId,
      title,
      canonicalDocumentType(payloadString(operation.payload, "type", 20)),
      payloadBoolean(operation.payload, "sensitive") ? 1 : 0,
      actorMemberId,
      operation.createdAt,
      timestamp,
    )];
  }
  if (operation.kind === "person.created") {
    const name = payloadString(operation.payload, "name", 120) || operation.summary.replace(/^Person created:\s*/i, "") || "New person";
    const role = payloadString(operation.payload, "role", 80) || "Crew";
    const initials = payloadString(operation.payload, "initials", 8);
    const statements = [db.prepare(`
      INSERT INTO people (
        id, workspace_id, display_name, role_tags, email_encrypted, phone_encrypted,
        notes, sensitive, owner_member_id
      )
      VALUES (?, ?, ?, ?, NULL, NULL, ?, 1, ?)
    `).bind(
      operation.entityId,
      operation.workspaceId,
      name,
      JSON.stringify([role]),
      initials ? `Initials: ${initials}` : null,
      actorMemberId,
    )];
    if (projectId) {
      statements.push(db.prepare(`
        INSERT INTO project_people (project_id, person_id, project_role)
        VALUES (?, ?, ?)
      `).bind(projectId, operation.entityId, role));
    }
    return statements;
  }
  if (operation.kind === "equipment.created") {
    const name = payloadString(operation.payload, "name", 120) || operation.summary.replace(/^Equipment created:\s*/i, "") || "New equipment";
    const status = payloadString(operation.payload, "status", 80) || "planned";
    const equipmentType = payloadString(operation.payload, "statusTone", 40) || null;
    return [db.prepare(`
      INSERT INTO equipment (
        id, workspace_id, project_id, name, equipment_type, status, notes, owner_member_id
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    `).bind(operation.entityId, operation.workspaceId, projectId, name, equipmentType, status, actorMemberId)];
  }
  if (operation.kind === "expense.created") {
    const category = payloadString(operation.payload, "category", 80) || operation.summary.replace(/^Expense created:\s*/i, "") || "Other";
    const spent = payloadNumber(operation.payload, "spent", 0, 1_000_000);
    const budget = payloadNumber(operation.payload, "budget", 0, 1_000_000);
    const percent = payloadNumber(operation.payload, "percent", 0, 1_000);
    return [db.prepare(`
      INSERT INTO expenses (
        id, workspace_id, project_id, category, amount_cents, purchased_at, comment, owner_member_id
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
    `).bind(
      operation.entityId,
      operation.workspaceId,
      projectId,
      category,
      Math.round(spent * 100),
      JSON.stringify({ budget, percent }),
      actorMemberId,
    )];
  }
  return [];
}

async function authorizeCanonicalCreateOperation(
  db: D1Database,
  operation: OperationRecord,
  role: AuthRole,
  actorMemberId: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (role === "owner" || role === "producer" || role === "director") {
    return { ok: true };
  }

  const needsProjectScope = operation.kind === "task.created"
    || operation.kind === "task.updated"
    || operation.kind === "task.completed"
    || operation.kind === "document.created"
    || operation.kind === "document.updated"
    || operation.kind === "person.created"
    || operation.kind === "equipment.created"
    || operation.kind === "expense.created";
  if (!needsProjectScope) {
    return { ok: true };
  }

  const projectId = payloadString(operation.payload, "projectId", 120);
  if (!projectId) {
    return { ok: true };
  }

  const projectExists = await canonicalProjectExists(db, operation.workspaceId, projectId);
  if (!projectExists && !seedWorkspace.projects.some((project) => project.id === projectId)) {
    return { ok: false, reason: "project_scope_not_found" };
  }

  if (!actorMemberId) {
    return { ok: false, reason: "project_membership_required" };
  }

  const membership = await projectMembershipFor(db, projectId, actorMemberId);
  const membershipCanWrite = Boolean(membership && isProjectWriteRole(membership.project_role));
  const projectOwnerCanWrite = membershipCanWrite
    ? false
    : await recordOwnedByMember(db, operation.workspaceId, "project", projectId, actorMemberId);
  const projectPermission = membershipCanWrite
    || projectOwnerCanWrite
    ? null
    : await recordWritePermissionFor(db, operation.workspaceId, "project", projectId, actorMemberId);
  const directPermissionEntityType = membershipCanWrite || projectOwnerCanWrite || projectPermission
    ? null
    : directRecordPermissionEntityTypeFor(operation);
  const directRecordPermission = directPermissionEntityType
    ? await recordWritePermissionFor(db, operation.workspaceId, directPermissionEntityType, operation.entityId, actorMemberId)
    : null;
  const directRecordOwnerCanWrite = directPermissionEntityType
    ? await recordOwnedByMember(db, operation.workspaceId, directPermissionEntityType, operation.entityId, actorMemberId)
    : false;
  if (!membershipCanWrite && !projectOwnerCanWrite && !projectPermission && !directRecordPermission && !directRecordOwnerCanWrite) {
    return { ok: false, reason: "project_membership_required" };
  }
  if (payloadBoolean(operation.payload, "sensitive")) {
    return { ok: false, reason: "sensitive_record_requires_operator" };
  }
  const departmentAuthorization = membershipCanWrite && membership
    ? authorizeProjectDepartmentScope(operation, membership)
    : projectOwnerCanWrite || directRecordOwnerCanWrite
      ? { ok: true } as const
      : authorizeRecordPermissionDepartmentScope(operation, role, projectPermission ?? directRecordPermission);
  if (!departmentAuthorization.ok) {
    return departmentAuthorization;
  }

  return { ok: true };
}

async function recordOwnedByMember(
  db: D1Database,
  workspaceId: string,
  entityType: "project" | "task" | "document" | "equipment",
  entityId: string,
  memberId: string,
): Promise<boolean> {
  const tableName = recordOwnershipTableName(entityType);
  if (!tableName) return false;
  const row = await db.prepare(`
    SELECT id
    FROM ${tableName}
    WHERE workspace_id = ?
      AND id = ?
      AND owner_member_id = ?
    LIMIT 1
  `).bind(workspaceId, entityId, memberId).first<{ id: string }>();
  return Boolean(row);
}

function recordOwnershipTableName(entityType: "project" | "task" | "document" | "equipment"): "projects" | "tasks" | "documents" | "equipment" | null {
  if (entityType === "project") return "projects";
  if (entityType === "task") return "tasks";
  if (entityType === "document") return "documents";
  if (entityType === "equipment") return "equipment";
  return null;
}

function directRecordPermissionEntityTypeFor(operation: OperationRecord): "task" | "document" | "equipment" | null {
  if ((operation.kind === "task.created" || operation.kind === "task.updated" || operation.kind === "task.completed") && operation.entityType === "task") return "task";
  if ((operation.kind === "document.created" || operation.kind === "document.updated") && operation.entityType === "document") return "document";
  if (operation.kind === "equipment.created" && operation.entityType === "equipment") return "equipment";
  return null;
}

function authorizeRecordPermissionDepartmentScope(
  operation: OperationRecord,
  role: AuthRole,
  permission: RecordPermissionRow | null,
): { ok: true } | { ok: false; reason: string } {
  if (!permission || (permission.permission !== "write" && permission.permission !== "admin")) {
    return { ok: false, reason: "project_membership_required" };
  }

  const permissionDepartment = normalizeDepartmentScope(permission.department);
  const operationDepartment = normalizeDepartmentScope(payloadString(operation.payload, "department", 80));

  if (role === "department_lead") {
    if (!permissionDepartment || !operationDepartment) {
      return { ok: false, reason: "department_scope_required" };
    }
    if (permissionDepartment !== operationDepartment) {
      return { ok: false, reason: "department_scope_mismatch" };
    }
  }

  if (permissionDepartment && operationDepartment && permissionDepartment !== operationDepartment) {
    return { ok: false, reason: "department_scope_mismatch" };
  }

  return { ok: true };
}

function authorizeProjectDepartmentScope(
  operation: OperationRecord,
  membership: ProjectMembershipRow,
): { ok: true } | { ok: false; reason: string } {
  const membershipDepartment = normalizeDepartmentScope(membership.department);
  const operationDepartment = normalizeDepartmentScope(payloadString(operation.payload, "department", 80));

  if (membership.project_role === "department_lead") {
    if (!membershipDepartment || !operationDepartment) {
      return { ok: false, reason: "department_scope_required" };
    }
    if (membershipDepartment !== operationDepartment) {
      return { ok: false, reason: "department_scope_mismatch" };
    }
  }

  if (membership.project_role === "contributor" && membershipDepartment && operationDepartment && membershipDepartment !== operationDepartment) {
    return { ok: false, reason: "department_scope_mismatch" };
  }

  return { ok: true };
}

async function projectMembershipFor(
  db: D1Database,
  projectId: string,
  memberId: string,
): Promise<ProjectMembershipRow | null> {
  return await db.prepare(`
    SELECT project_id, member_id, project_role, department
    FROM project_memberships
    WHERE project_id = ?
      AND member_id = ?
    LIMIT 1
  `).bind(projectId, memberId).first<ProjectMembershipRow>();
}

async function recordWritePermissionFor(
  db: D1Database,
  workspaceId: string,
  entityType: RecordPermissionEntityType,
  entityId: string,
  memberId: string,
): Promise<RecordPermissionRow | null> {
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      entity_type,
      entity_id,
      member_id,
      permission,
      department,
      expires_at
    FROM record_permissions
    WHERE workspace_id = ?
      AND entity_type = ?
      AND entity_id = ?
      AND member_id = ?
      AND permission IN ('write', 'admin')
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY
      CASE permission WHEN 'admin' THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT 1
  `).bind(workspaceId, entityType, entityId, memberId, new Date().toISOString()).first<RecordPermissionRow>();
}

async function recordCommentPermissionFor(
  db: D1Database,
  workspaceId: string,
  entityType: RecordCommentEntityType,
  entityId: string,
  memberId: string,
): Promise<RecordPermissionRow | null> {
  return await db.prepare(`
    SELECT
      id,
      workspace_id,
      entity_type,
      entity_id,
      member_id,
      permission,
      department,
      expires_at
    FROM record_permissions
    WHERE workspace_id = ?
      AND entity_type = ?
      AND entity_id = ?
      AND member_id = ?
      AND permission IN ('comment', 'write', 'admin')
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY
      CASE permission WHEN 'admin' THEN 0 WHEN 'write' THEN 1 ELSE 2 END,
      updated_at DESC
    LIMIT 1
  `).bind(workspaceId, entityType, entityId, memberId, new Date().toISOString()).first<RecordPermissionRow>();
}

function isProjectWriteRole(role: string): boolean {
  return ["owner", "producer", "director", "department_lead", "contributor"].includes(role);
}

async function ensureWorkspaceRow(db: D1Database, workspaceId: string, timestamp: string): Promise<void> {
  const seedName = seedWorkspace.id === workspaceId ? seedWorkspace.name : "Film Workspace";
  await db.prepare(`
    INSERT OR IGNORE INTO workspaces (
      id,
      name,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?)
  `).bind(workspaceId, seedName, timestamp, timestamp).run();
}

async function canonicalProjectExists(db: D1Database, workspaceId: string, projectId: string): Promise<boolean> {
  const existing = await db.prepare("SELECT id FROM projects WHERE workspace_id = ? AND id = ? LIMIT 1")
    .bind(workspaceId, projectId)
    .first<{ id: string }>();
  return Boolean(existing);
}

function payloadString(payload: Record<string, unknown>, key: string, maxLength: number): string {
  const value = payload[key];
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function payloadBoolean(payload: Record<string, unknown>, key: string): boolean {
  return payload[key] === true;
}

function payloadNumber(payload: Record<string, unknown>, key: string, min: number, max: number): number {
  const value = payload[key];
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(numberValue)) return min;
  return Math.min(max, Math.max(min, numberValue));
}

function normalizeDepartmentScope(value: string | null | undefined): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 80)
    : "";
}

function canonicalDocumentType(type: string): "native" | "uploaded_file" | "screenplay" | "markdown" {
  const normalized = type.toLowerCase();
  if (normalized === "md" || normalized === "markdown") return "markdown";
  if (normalized === "screenplay") return "screenplay";
  return "uploaded_file";
}

function canonicalProjectPhase(phase: string): string {
  return phase.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") || "development";
}

function operationLogPayloadJson(operation: OperationRecord): string {
  return JSON.stringify({
    summary: operation.summary,
    payload: operation.payload,
  });
}

function isSameOperationLogEntry(
  existing: OperationLogRow,
  operation: OperationRecord,
  payloadJson: string,
): boolean {
  return existing.workspace_id === operation.workspaceId
    && existing.kind === operation.kind
    && existing.entity_type === operation.entityType
    && existing.entity_id === operation.entityId
    && existing.payload_json === payloadJson
    && existing.status === "applied";
}

function validateAttachmentCandidate(attachment: AttachmentStorageCandidate): string | null {
  if (attachment.bytes !== undefined || attachment.blob !== undefined || attachment.payload !== undefined) {
    return "raw_bytes_not_allowed";
  }
  if (!attachment.docId || !/^doc_[A-Za-z0-9_-]+$/.test(attachment.docId)) {
    return "invalid_doc_id";
  }
  if (!attachment.name || attachment.name.length > 240 || attachment.name.includes("/") || attachment.name.includes("\0")) {
    return "invalid_name";
  }
  if (!Number.isSafeInteger(attachment.sizeBytes) || (attachment.sizeBytes ?? 0) <= 0 || (attachment.sizeBytes ?? 0) > 25 * 1024 * 1024) {
    return "invalid_size";
  }
  if (!attachment.sha256 || !isValidSha256Hex(attachment.sha256)) {
    return "invalid_sha256";
  }
  if (attachment.sourcePath && (attachment.sourcePath.includes("..") || attachment.sourcePath.startsWith("/") || attachment.sourcePath.includes("\0"))) {
    return "invalid_source_path";
  }
  if (attachment.contentType && attachment.contentType.length > 160) {
    return "invalid_content_type";
  }
  return null;
}

function attachmentObjectKey(workspaceId: string, attachment: AttachmentStorageCandidate): string {
  return [
    "workspaces",
    safeObjectSegment(workspaceId),
    "attachments",
    safeObjectSegment(attachment.docId ?? "unknown"),
    `${attachment.sha256}-${safeObjectSegment(attachment.name ?? "attachment")}`,
  ].join("/");
}

async function createUploadIntent(
  workspaceId: string,
  attachment: AttachmentStorageCandidate,
): Promise<AttachmentUploadIntent> {
  const objectKey = attachmentObjectKey(workspaceId, attachment);
  const contentType = attachment.contentType ?? "application/octet-stream";
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  const commitToken = await attachmentCommitToken(
    workspaceId,
    attachment.docId ?? "",
    objectKey,
    attachment.sha256 ?? "",
    attachment.sizeBytes ?? 0,
  );

  return {
    docId: attachment.docId,
    objectKey,
    sizeBytes: attachment.sizeBytes,
    contentType,
    uploadMethod: "PUT",
    uploadUrl: null,
    signedUrlStatus: "not_configured",
    expiresAt,
    requiredHeaders: {
      "content-type": contentType,
      "x-film-sha256": attachment.sha256 ?? "",
    },
    commitToken,
    idempotencyKey: await attachmentIntentId(workspaceId, attachment.docId ?? "", attachment.sha256 ?? ""),
  };
}

function attachmentPersistenceMode(env: Env): AttachmentPersistence {
  return env.DB ? "d1_attachment_intents" : "dry_run_memoryless";
}

function combineAttachmentPersistence(current: AttachmentPersistence, next: AttachmentPersistence): AttachmentPersistence {
  if (current === "d1_unavailable_dry_run" || next === "d1_unavailable_dry_run") {
    return "d1_unavailable_dry_run";
  }
  if (current === "d1_attachment_intents" || next === "d1_attachment_intents") {
    return "d1_attachment_intents";
  }
  return "dry_run_memoryless";
}

async function recordUploadIntent(
  db: D1Database | undefined,
  workspaceId: string,
  attachment: AttachmentStorageCandidate,
  intent: AttachmentUploadIntent,
): Promise<AttachmentPersistence> {
  if (!db) {
    return "dry_run_memoryless";
  }

  try {
    const preparedAt = new Date().toISOString();
    const commitTokenHash = await sha256Hex(intent.commitToken);
    await db.prepare(`
      INSERT INTO attachment_upload_intents (
        id,
        workspace_id,
        doc_id,
        object_key,
        name,
        source_path,
        size_bytes,
        content_type,
        sha256,
        storage_key,
        commit_token_hash,
        status,
        prepared_at,
        expires_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prepared', ?, ?, ?)
      ON CONFLICT(workspace_id, doc_id, sha256) DO UPDATE SET
        object_key = excluded.object_key,
        name = excluded.name,
        source_path = excluded.source_path,
        size_bytes = excluded.size_bytes,
        content_type = excluded.content_type,
        storage_key = excluded.storage_key,
        commit_token_hash = excluded.commit_token_hash,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at,
        status = CASE
          WHEN attachment_upload_intents.status IN ('committed_dry_run', 'stored_r2')
            THEN attachment_upload_intents.status
          ELSE 'prepared'
        END
    `).bind(
      intent.idempotencyKey,
      workspaceId,
      attachment.docId ?? "",
      intent.objectKey,
      attachment.name ?? "",
      attachment.sourcePath ?? null,
      attachment.sizeBytes ?? 0,
      intent.contentType,
      attachment.sha256 ?? "",
      attachment.storageKey ?? null,
      commitTokenHash,
      preparedAt,
      intent.expiresAt,
      preparedAt,
    ).run();

    return "d1_attachment_intents";
  } catch {
    return "d1_unavailable_dry_run";
  }
}

async function recordAttachmentCommit(
  db: D1Database | undefined,
  workspaceId: string,
  commit: AttachmentUploadCommit,
  committedAt: string,
): Promise<AttachmentCommitPersistenceResult> {
  const fallbackAccepted: AttachmentCommitAcceptance = {
    docId: commit.docId,
    objectKey: commit.objectKey,
    status: "r2_dry_run",
    committedAt,
    idempotencyKey: await attachmentIntentId(workspaceId, commit.docId ?? "", commit.sha256 ?? ""),
    idempotent: false,
  };

  if (!db) {
    return {
      accepted: fallbackAccepted,
      persistence: "dry_run_memoryless",
    };
  }

  try {
    const commitTokenHash = await sha256Hex(commit.commitToken ?? "");
    const row = await db.prepare(`
      SELECT id, status, expires_at, committed_at
      FROM attachment_upload_intents
      WHERE workspace_id = ?
        AND doc_id = ?
        AND object_key = ?
        AND size_bytes = ?
        AND sha256 = ?
        AND commit_token_hash = ?
      LIMIT 1
    `).bind(
      workspaceId,
      commit.docId ?? "",
      commit.objectKey ?? "",
      commit.sizeBytes ?? 0,
      commit.sha256 ?? "",
      commitTokenHash,
    ).first<AttachmentUploadIntentRow>();

    if (!row) {
      return {
        rejected: { docId: commit.docId ?? "unknown", reason: "upload_intent_not_prepared" },
        persistence: "d1_attachment_intents",
      };
    }

    if ((row.status === "committed_dry_run" || row.status === "stored_r2") && row.committed_at) {
      return {
        accepted: {
          ...fallbackAccepted,
          committedAt: row.committed_at,
          idempotencyKey: row.id,
          idempotent: true,
        },
        persistence: "d1_attachment_intents",
      };
    }

    if (Date.parse(row.expires_at) < Date.now()) {
      return {
        rejected: { docId: commit.docId ?? "unknown", reason: "upload_intent_expired" },
        persistence: "d1_attachment_intents",
      };
    }

    await db.prepare(`
      UPDATE attachment_upload_intents
      SET status = 'committed_dry_run',
        committed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(committedAt, committedAt, row.id).run();

    return {
      accepted: {
        ...fallbackAccepted,
        idempotencyKey: row.id,
      },
      persistence: "d1_attachment_intents",
    };
  } catch {
    return {
      accepted: fallbackAccepted,
      persistence: "d1_unavailable_dry_run",
    };
  }
}

async function storeAttachmentObject(
  db: D1Database,
  bucket: R2Bucket,
  workspaceId: string,
  actorMemberId: string | null,
  commit: AttachmentUploadCommit,
  contentType: string,
  bytes: ArrayBuffer,
  committedAt: string,
): Promise<AttachmentObjectStoreResult> {
  const fallbackAccepted: AttachmentObjectStoreAcceptance = {
    docId: commit.docId,
    objectKey: commit.objectKey,
    status: "stored_r2",
    committedAt,
    idempotencyKey: await attachmentIntentId(workspaceId, commit.docId ?? "", commit.sha256 ?? ""),
    idempotent: false,
    sizeBytes: bytes.byteLength,
  };

  let row: AttachmentUploadIntentRow | null = null;
  try {
    const commitTokenHash = await sha256Hex(commit.commitToken ?? "");
    row = await db.prepare(`
      SELECT id, content_type, status, expires_at, committed_at
      FROM attachment_upload_intents
      WHERE workspace_id = ?
        AND doc_id = ?
        AND object_key = ?
        AND size_bytes = ?
        AND sha256 = ?
        AND commit_token_hash = ?
      LIMIT 1
    `).bind(
      workspaceId,
      commit.docId ?? "",
      commit.objectKey ?? "",
      commit.sizeBytes ?? 0,
      commit.sha256 ?? "",
      commitTokenHash,
    ).first<AttachmentUploadIntentRow>();
  } catch {
    return {
      rejected: { docId: commit.docId ?? "unknown", reason: "attachment_intent_storage_unavailable" },
      persistence: "d1_unavailable_dry_run",
      status: 503,
    };
  }

  if (!row) {
    return {
      rejected: { docId: commit.docId ?? "unknown", reason: "upload_intent_not_prepared" },
      persistence: "d1_attachment_intents",
      status: 422,
    };
  }
  if (row.status === "stored_r2" && row.committed_at) {
    let existingObject: R2Object | null;
    try {
      existingObject = await bucket.head(commit.objectKey ?? "");
    } catch {
      return {
        rejected: { docId: commit.docId ?? "unknown", reason: "attachment_object_check_unavailable" },
        persistence: "r2_unavailable_dry_run",
        status: 503,
      };
    }
    if (!existingObject || !attachmentR2ObjectMatches(existingObject, row.id, workspaceId, commit, bytes.byteLength)) {
      return {
        rejected: { docId: commit.docId ?? "unknown", reason: "attachment_object_state_mismatch" },
        persistence: "d1_attachment_intents",
        status: 409,
      };
    }
    return {
      accepted: {
        ...fallbackAccepted,
        committedAt: row.committed_at,
        idempotencyKey: row.id,
        idempotent: true,
      },
      persistence: "r2_attachment_object",
    };
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    return {
      rejected: { docId: commit.docId ?? "unknown", reason: "upload_intent_expired" },
      persistence: "d1_attachment_intents",
      status: 422,
    };
  }

  const storedContentType = row.content_type || contentType;
  let object: R2Object | null;
  try {
    object = await bucket.head(commit.objectKey ?? "");
  } catch {
    return {
      rejected: { docId: commit.docId ?? "unknown", reason: "attachment_object_check_unavailable" },
      persistence: "r2_unavailable_dry_run",
      status: 503,
    };
  }
  if (!object) {
    try {
      object = await bucket.put(commit.objectKey ?? "", bytes, {
        onlyIf: { etagDoesNotMatch: "*" },
        httpMetadata: { contentType: storedContentType },
        customMetadata: {
          workspaceId,
          docId: commit.docId ?? "",
          sha256: commit.sha256 ?? "",
          uploadIntentId: row.id,
        },
      });
      if (!object) object = await bucket.head(commit.objectKey ?? "");
    } catch {
      return {
        rejected: { docId: commit.docId ?? "unknown", reason: "r2_upload_failed" },
        persistence: "r2_unavailable_dry_run",
        status: 503,
      };
    }
  }
  if (!object || !attachmentR2ObjectMatches(object, row.id, workspaceId, commit, bytes.byteLength)) {
    return {
      rejected: { docId: commit.docId ?? "unknown", reason: "attachment_destination_exists" },
      persistence: "d1_attachment_intents",
      status: 409,
    };
  }

  try {
    const statements = [
      db.prepare(`
        UPDATE attachment_upload_intents
        SET status = 'stored_r2',
          committed_at = ?,
          updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND doc_id = ?
          AND object_key = ?
          AND size_bytes = ?
          AND sha256 = ?
          AND status = 'prepared'
      `).bind(
        committedAt,
        committedAt,
        row.id,
        workspaceId,
        commit.docId ?? "",
        commit.objectKey ?? "",
        commit.sizeBytes ?? 0,
        commit.sha256 ?? "",
      ),
      db.prepare(`
        INSERT INTO audit_events (
          id,
          workspace_id,
          project_id,
          actor_member_id,
          action,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `).bind(
        `audit_attachment_${row.id}`,
        workspaceId,
        null,
        actorMemberId,
        "attachment.object_stored",
        JSON.stringify({
          uploadIntentId: row.id,
          docId: commit.docId ?? "",
          objectKey: commit.objectKey ?? "",
          sizeBytes: commit.sizeBytes ?? 0,
          sha256: commit.sha256 ?? "",
          destructiveWrite: true,
        }),
        committedAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[0]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("Attachment metadata batch did not finalize the prepared intent.");
    }
  } catch {
    return {
      rejected: { docId: commit.docId ?? "unknown", reason: "attachment_metadata_finalize_required" },
      persistence: "r2_attachment_metadata_pending",
      status: 503,
    };
  }

  return {
    accepted: {
      ...fallbackAccepted,
      idempotencyKey: row.id,
    },
    persistence: "r2_attachment_object",
  };
}

function attachmentR2ObjectMatches(
  object: R2Object,
  uploadIntentId: string,
  workspaceId: string,
  commit: AttachmentUploadCommit,
  sizeBytes: number,
): boolean {
  return object.size === sizeBytes
    && object.customMetadata?.workspaceId === workspaceId
    && object.customMetadata?.docId === (commit.docId ?? "")
    && object.customMetadata?.sha256 === (commit.sha256 ?? "")
    && (
      object.customMetadata?.uploadIntentId === undefined
      || object.customMetadata.uploadIntentId === uploadIntentId
    );
}

async function listStoredBackupObjects(
  db: D1Database | undefined,
  workspaceId: string,
  limit: number,
): Promise<{
  persistence: BackupPersistence;
  truncated: boolean;
  objects: StoredBackupExportObject[];
}> {
  if (!db) {
    return { persistence: "dry_run_memoryless", truncated: false, objects: [] };
  }

  try {
    const rows = await db.prepare(`
      SELECT id, workspace_id, label, snapshot_ref, created_at
      FROM restore_points
      WHERE workspace_id = ?
        AND instr(snapshot_ref, ?) = 1
      ORDER BY created_at DESC, id
      LIMIT ?
    `).bind(workspaceId, backupSnapshotRefPrefix(workspaceId), limit + 1).all<StoredBackupObjectRow>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);

    return {
      persistence: "d1_restore_point_metadata",
      truncated: allRows.length > limit,
      objects: visibleRows.flatMap((row) => {
        const objectKey = backupObjectKeyFromSnapshotRef(row.snapshot_ref);
        if (!objectKey || !isValidBackupObjectKey(workspaceId, objectKey)) return [];
        return [{
          restorePointId: row.id,
          label: row.label,
          snapshotRef: row.snapshot_ref,
          objectKey,
          createdAt: row.created_at,
        }];
      }),
    };
  } catch {
    return { persistence: "d1_unavailable_dry_run", truncated: false, objects: [] };
	  }
	}

async function createBackupObjectDownloadPlan(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  restorePointId: string,
  objectKey: string,
): Promise<{
  backupDownloadPlanId: string | null;
  backupDownloadToken: string | null;
  backupDownloadTokenExpiresAt: string | null;
  persistence: BackupObjectDownloadPlanPersistence;
  auditPersistence: AuditPersistence;
}> {
  if (!db) {
    return {
      backupDownloadPlanId: null,
      backupDownloadToken: null,
      backupDownloadTokenExpiresAt: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }

  try {
    const backupDownloadPlanId = `backup_object_download_plan_${crypto.randomUUID()}`;
    const backupDownloadToken = `bdl_${crypto.randomUUID()}`;
    const backupDownloadTokenExpiresAt = new Date(Date.now() + BACKUP_OBJECT_DOWNLOAD_TOKEN_TTL_SECONDS * 1000).toISOString();
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      storedR2RestorePointAssertion(db, workspaceId, restorePointId),
      db.prepare(`
      INSERT INTO backup_object_download_plans (
        id,
        workspace_id,
        restore_point_id,
        actor_member_id,
        object_key,
        download_token_hash,
        expires_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      backupDownloadPlanId,
      workspaceId,
      restorePointId,
      actorMemberId,
      objectKey,
      await sha256Hex(backupDownloadToken),
      backupDownloadTokenExpiresAt,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_backup_object_download_plan_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "backup.object_download_plan_created",
        {
          restorePointId,
          backupDownloadPlanId,
          objectKey,
          expiresAt: backupDownloadTokenExpiresAt,
          persistence: "d1_backup_object_download_plans",
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("backup object download plan batch did not apply exactly once");
    }
    return {
      backupDownloadPlanId,
      backupDownloadToken,
      backupDownloadTokenExpiresAt,
      persistence: "d1_backup_object_download_plans",
      auditPersistence: "d1_audit_events",
    };
  } catch {
    return {
      backupDownloadPlanId: null,
      backupDownloadToken: null,
      backupDownloadTokenExpiresAt: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    };
  }
}

async function verifyBackupObjectDownloadPlan(
  db: D1Database,
  workspaceId: string,
  restorePointId: string,
  objectKey: string,
  backupDownloadPlanId: string,
  backupDownloadToken: string,
): Promise<
  | { ok: true; expiresAt: string }
  | { ok: false; error: string; status: number }
> {
  const row = await db.prepare(`
    SELECT id, workspace_id, restore_point_id, actor_member_id, object_key, download_token_hash, expires_at, created_at
    FROM backup_object_download_plans
    WHERE id = ?
      AND workspace_id = ?
      AND restore_point_id = ?
    LIMIT 1
  `).bind(backupDownloadPlanId, workspaceId, restorePointId).first<BackupObjectDownloadPlanRow>();

  if (!row || row.download_token_hash !== await sha256Hex(backupDownloadToken)) {
    return { ok: false, error: "backup_download_plan_invalid", status: 403 };
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    return { ok: false, error: "backup_download_plan_expired", status: 410 };
  }
  if (row.object_key !== objectKey || !isValidBackupObjectKey(workspaceId, row.object_key)) {
    return { ok: false, error: "backup_download_plan_mismatch", status: 422 };
  }

  return { ok: true, expiresAt: row.expires_at };
}

async function findStoredBackupObject(
  db: D1Database,
  workspaceId: string,
  restorePointId: string,
): Promise<StoredBackupObjectRow | null> {
  try {
    return await db.prepare(`
      SELECT id, workspace_id, label, snapshot_ref, created_at
      FROM restore_points
      WHERE workspace_id = ?
        AND id = ?
        AND instr(snapshot_ref, ?) = 1
      LIMIT 1
    `).bind(workspaceId, restorePointId, backupSnapshotRefPrefix(workspaceId)).first<StoredBackupObjectRow>();
  } catch {
    return null;
  }
}

async function listStoredAttachmentObjects(
  db: D1Database | undefined,
  workspaceId: string,
  limit: number,
  offset = 0,
): Promise<{
  persistence: "dry_run_memoryless" | "d1_attachment_intents" | "d1_unavailable_dry_run";
  truncated: boolean;
  nextOffset: number | null;
  objects: Array<{
    docId: string;
    objectKey: string;
    name: string;
    sourcePath: string | null;
    sizeBytes: number;
    contentType: string;
    sha256: string;
    committedAt: string | null;
  }>;
}> {
  if (!db) {
    return { persistence: "dry_run_memoryless", truncated: false, nextOffset: null, objects: [] };
  }

  try {
    const rows = await db.prepare(`
      SELECT
        id,
        workspace_id,
        doc_id,
        object_key,
        name,
        source_path,
        size_bytes,
        content_type,
        sha256,
        storage_key,
        commit_token_hash,
        status,
        prepared_at,
        expires_at,
        committed_at,
        updated_at
      FROM attachment_upload_intents
      WHERE workspace_id = ?
        AND status = 'stored_r2'
      ORDER BY committed_at DESC, updated_at DESC, id
      LIMIT ?
      OFFSET ?
    `).bind(workspaceId, limit + 1, offset).all<StoredAttachmentObjectRow>();
    const allRows = rows.results ?? [];
    const visibleRows = allRows.slice(0, limit);
    const truncated = allRows.length > limit;

    return {
      persistence: "d1_attachment_intents",
      truncated,
      nextOffset: truncated ? offset + visibleRows.length : null,
      objects: visibleRows.map((row) => ({
        docId: row.doc_id,
        objectKey: row.object_key,
        name: row.name,
        sourcePath: row.source_path,
        sizeBytes: row.size_bytes,
        contentType: row.content_type,
        sha256: row.sha256,
        committedAt: row.committed_at,
      })),
    };
  } catch {
    return { persistence: "d1_unavailable_dry_run", truncated: false, nextOffset: null, objects: [] };
  }
}

async function listSelectedStoredAttachmentObjects(
  db: D1Database | undefined,
  workspaceId: string,
  objectKeys: string[],
  limit: number,
): ReturnType<typeof listStoredAttachmentObjects> {
  if (!db) {
    return { persistence: "dry_run_memoryless", truncated: false, nextOffset: null, objects: [] };
  }

  const selectedKeys = objectKeys.slice(0, limit);
  const objects: Awaited<ReturnType<typeof listStoredAttachmentObjects>>["objects"] = [];

  for (const objectKey of selectedKeys) {
    const row = await findStoredAttachmentObject(db, workspaceId, objectKey);
    if (!row) {
      return { persistence: "d1_attachment_intents", truncated: false, nextOffset: null, objects: [] };
    }
    objects.push({
      docId: row.doc_id,
      objectKey: row.object_key,
      name: row.name,
      sourcePath: row.source_path,
      sizeBytes: row.size_bytes,
      contentType: row.content_type,
      sha256: row.sha256,
      committedAt: row.committed_at,
    });
  }

  return {
    persistence: "d1_attachment_intents",
    truncated: objectKeys.length > limit,
    nextOffset: objectKeys.length > limit ? limit : null,
    objects,
  };
}

async function findStoredAttachmentObject(
  db: D1Database,
  workspaceId: string,
  objectKey: string,
): Promise<StoredAttachmentObjectRow | null> {
  try {
    return await db.prepare(`
      SELECT id, workspace_id, doc_id, object_key, name, source_path, size_bytes, content_type, sha256, status, committed_at, updated_at
      FROM attachment_upload_intents
      WHERE workspace_id = ?
        AND object_key = ?
        AND status = 'stored_r2'
      LIMIT 1
    `).bind(workspaceId, objectKey).first<StoredAttachmentObjectRow>();
  } catch {
    return null;
  }
}

async function findAttachmentObjectRecord(
  db: D1Database,
  workspaceId: string,
  objectKey: string,
): Promise<RestoreAttachmentReservationRow | null> {
  try {
    return await db.prepare(`
      SELECT
        id,
        workspace_id,
        doc_id,
        object_key,
        name,
        source_path,
        size_bytes,
        content_type,
        sha256,
        storage_key,
        commit_token_hash,
        status,
        prepared_at,
        expires_at,
        committed_at,
        updated_at
      FROM attachment_upload_intents
      WHERE workspace_id = ?
        AND object_key = ?
      LIMIT 1
    `).bind(workspaceId, objectKey).first<RestoreAttachmentReservationRow>();
  } catch {
    return null;
  }
}

async function createAttachmentPackagePlan(
  db: D1Database | undefined,
  workspaceId: string,
  actorMemberId: string | null,
  objects: Awaited<ReturnType<typeof listStoredAttachmentObjects>>["objects"],
  totalSizeBytes: number,
  auditContext: {
    truncated: boolean;
    offset: number;
    nextOffset: number | null;
    persistence: AttachmentPersistence;
  },
): Promise<{
  packagePlanId: string | null;
  packageToken: string | null;
  packageTokenExpiresAt: string | null;
  persistence: AttachmentPackagePlanPersistence;
  auditPersistence: AuditPersistence;
  blocker: string | null;
}> {
  if (!db) {
    return {
      packagePlanId: null,
      packageToken: null,
      packageTokenExpiresAt: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
      blocker: "D1 package plan storage is required before attachment package bytes can be downloaded.",
    };
  }

  try {
    const packagePlanId = `attachment_package_${crypto.randomUUID()}`;
    const packageToken = `pkg_${crypto.randomUUID()}`;
    const packageTokenExpiresAt = new Date(Date.now() + ATTACHMENT_PACKAGE_TOKEN_TTL_SECONDS * 1000).toISOString();
    const createdAt = new Date().toISOString();
    await ensureWorkspaceRow(db, workspaceId, createdAt);
    const statements = [
      db.prepare(`
      INSERT INTO attachment_package_plans (
        id,
        workspace_id,
        actor_member_id,
        object_keys_json,
        object_count,
        total_size_bytes,
        package_token_hash,
        expires_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      packagePlanId,
      workspaceId,
      actorMemberId,
      JSON.stringify(objects.map((object) => object.objectKey)),
      objects.length,
      totalSizeBytes,
      await sha256Hex(packageToken),
      packageTokenExpiresAt,
      createdAt,
      ),
      auditEventInsertStatement(
        db,
        `audit_attachment_package_plan_${crypto.randomUUID()}`,
        workspaceId,
        null,
        actorMemberId,
        "attachment.export_package_dry_run_created",
        {
          objectCount: objects.length,
          totalSizeBytes,
          truncated: auditContext.truncated,
          offset: auditContext.offset,
          nextOffset: auditContext.nextOffset,
          persistence: auditContext.persistence,
          packagePlanId,
          packagePlanPersistence: "d1_attachment_package_plans",
        },
        createdAt,
      ),
    ];
    const results = await db.batch(statements);
    if (
      results.length !== statements.length
      || results.some((result) => !result.success)
      || Number(results[0]?.meta?.changes ?? 0) !== 1
      || Number(results[1]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("attachment package plan batch did not apply exactly once");
    }

    return {
      packagePlanId,
      packageToken,
      packageTokenExpiresAt,
      persistence: "d1_attachment_package_plans",
      auditPersistence: "d1_audit_events",
      blocker: null,
    };
  } catch {
    return {
      packagePlanId: null,
      packageToken: null,
      packageTokenExpiresAt: null,
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
      blocker: "D1 package plan storage is required before attachment package bytes can be downloaded.",
    };
  }
}

async function verifyAttachmentPackagePlan(
  db: D1Database,
  workspaceId: string,
  packagePlanId: string,
  packageToken: string,
  selectedObjectKeys: string[],
  limit: number,
): Promise<
  | { ok: true; objectKeys: string[]; totalSizeBytes: number; expiresAt: string }
  | { ok: false; error: string; status: number }
> {
  const row = await db.prepare(`
    SELECT id, workspace_id, object_keys_json, object_count, total_size_bytes, package_token_hash, expires_at
    FROM attachment_package_plans
    WHERE id = ?
      AND workspace_id = ?
    LIMIT 1
  `).bind(packagePlanId, workspaceId).first<AttachmentPackagePlanRow>();

  if (!row || row.package_token_hash !== await sha256Hex(packageToken)) {
    return { ok: false, error: "attachment_package_plan_invalid", status: 403 };
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    return { ok: false, error: "attachment_package_plan_expired", status: 410 };
  }

  const objectKeys = parseAttachmentPackagePlanKeys(row.object_keys_json, workspaceId);
  if (!objectKeys || objectKeys.length !== row.object_count) {
    return { ok: false, error: "attachment_package_plan_stale", status: 409 };
  }
  if (objectKeys.length > limit) {
    return { ok: false, error: "attachment_package_limit_too_low", status: 422 };
  }
  if (selectedObjectKeys.length > 0 && !sameStringArray(selectedObjectKeys, objectKeys)) {
    return { ok: false, error: "attachment_package_plan_mismatch", status: 422 };
  }

  return {
    ok: true,
    objectKeys,
    totalSizeBytes: row.total_size_bytes,
    expiresAt: row.expires_at,
  };
}

function parseAttachmentPackagePlanKeys(value: string, workspaceId: string): string[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    const objectKeys = parsed.map((item) => typeof item === "string" ? item : null);
    if (objectKeys.some((item) => !item || !isValidAttachmentObjectKey(workspaceId, item))) return null;
    return objectKeys as string[];
  } catch {
    return null;
  }
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function validateAttachmentCommit(workspaceId: string, commit: AttachmentUploadCommit): Promise<string | null> {
  if (commit.bytes !== undefined || commit.blob !== undefined || commit.payload !== undefined) {
    return "raw_bytes_not_allowed";
  }
  if (!commit.docId || !/^doc_[A-Za-z0-9_-]+$/.test(commit.docId)) {
    return "invalid_doc_id";
  }
  if (!commit.objectKey || !commit.objectKey.startsWith(`workspaces/${safeObjectSegment(workspaceId)}/attachments/`)) {
    return "invalid_object_key";
  }
  if (!Number.isSafeInteger(commit.sizeBytes) || (commit.sizeBytes ?? 0) <= 0 || (commit.sizeBytes ?? 0) > 25 * 1024 * 1024) {
    return "invalid_size";
  }
  const sizeBytes = commit.sizeBytes ?? 0;
  if (!commit.sha256 || !isValidSha256Hex(commit.sha256)) {
    return "invalid_sha256";
  }
  const expectedToken = await attachmentCommitToken(
    workspaceId,
    commit.docId,
    commit.objectKey,
    commit.sha256,
    sizeBytes,
  );
  if (commit.commitToken !== expectedToken) {
    return "invalid_commit_token";
  }
  return null;
}

async function attachmentCommitToken(
  workspaceId: string,
  docId: string,
  objectKey: string,
  sha256: string,
  sizeBytes: number,
): Promise<string> {
  return `dry_commit_${await sha256Hex([workspaceId, docId, objectKey, sha256, sizeBytes].join(":"))}`;
}

async function attachmentIntentId(workspaceId: string, docId: string, sha256: string): Promise<string> {
  return `dry_intent_${await sha256Hex([workspaceId, docId, sha256].join(":"))}`;
}

function safeObjectSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function isValidAttachmentObjectKey(workspaceId: string, objectKey: string): boolean {
  return objectKey.startsWith(`workspaces/${safeObjectSegment(workspaceId)}/attachments/`)
    && !objectKey.includes("..")
    && !objectKey.includes("\0")
    && objectKey.length <= 1024;
}

function isValidAttachmentPackageToken(token: string): boolean {
  return token.startsWith("pkg_") && token.length >= 20 && token.length <= 120;
}

function isValidBackupObjectDownloadToken(token: string): boolean {
  return token.startsWith("bdl_") && token.length >= 20 && token.length <= 120;
}

function parseAttachmentObjectRange(
  headerValue: string | null,
  sizeBytes: number,
): { ok: true; range: { start: number; end: number; length: number } | null } | { ok: false; error: string } {
  return parseBoundedByteRange(headerValue, sizeBytes, ATTACHMENT_OBJECT_RANGE_MAX_BYTES, "attachment_range_too_large");
}

function parseBoundedByteRange(
  headerValue: string | null,
  sizeBytes: number,
  maxRangeBytes: number,
  rangeTooLargeError: string,
): { ok: true; range: { start: number; end: number; length: number } | null } | { ok: false; error: string } {
  if (!headerValue) {
    return { ok: true, range: null };
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "invalid_attachment_range" };
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(headerValue.trim());
  if (!match || headerValue.includes(",")) {
    return { ok: false, error: "invalid_attachment_range" };
  }

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) {
    return { ok: false, error: "invalid_attachment_range" };
  }

  let start: number;
  let end: number;
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { ok: false, error: "invalid_attachment_range" };
    }
    start = Math.max(sizeBytes - suffixLength, 0);
    end = sizeBytes - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : sizeBytes - 1;
  }

  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(end)
    || start < 0
    || end < start
    || start >= sizeBytes
  ) {
    return { ok: false, error: "invalid_attachment_range" };
  }

  end = Math.min(end, sizeBytes - 1);
  const length = end - start + 1;
  if (length > maxRangeBytes) {
    return { ok: false, error: rangeTooLargeError };
  }
  return { ok: true, range: { start, end, length } };
}

async function createAttachmentPackageZip(
  bucket: R2Bucket,
  workspaceId: string,
  objects: Awaited<ReturnType<typeof listStoredAttachmentObjects>>["objects"],
): Promise<
  | {
    bytes: Uint8Array;
    objectCount: number;
    totalSourceBytes: number;
  }
  | {
    error: string;
    status: number;
    objectKey: string;
  }
> {
  const entries: StoredZipSourceEntry[] = [];
  const manifestObjects: Array<Record<string, string | number | null>> = [];
  let totalSourceBytes = 0;

  for (const [index, object] of objects.entries()) {
    if (!isValidAttachmentObjectKey(workspaceId, object.objectKey)) {
      return { error: "invalid_attachment_object_key", status: 422, objectKey: object.objectKey };
    }
    const stored = await bucket.get(object.objectKey);
    if (!stored?.body) {
      return { error: "attachment_object_bytes_missing", status: 404, objectKey: object.objectKey };
    }

    const bytes = new Uint8Array(await new Response(stored.body).arrayBuffer());
    if (bytes.byteLength !== object.sizeBytes) {
      return { error: "attachment_object_size_mismatch", status: 409, objectKey: object.objectKey };
    }
    if ((await sha256HexBytes(bytes)) !== object.sha256.toLowerCase()) {
      return { error: "attachment_object_sha256_mismatch", status: 409, objectKey: object.objectKey };
    }

    const path = attachmentPackageEntryPath(index, object.docId, object.name);
    entries.push({ path, bytes });
    manifestObjects.push({
      path,
      docId: object.docId,
      objectKey: object.objectKey,
      name: object.name,
      sourcePath: object.sourcePath,
      sizeBytes: object.sizeBytes,
      contentType: object.contentType,
      sha256: object.sha256,
      committedAt: object.committedAt,
    });
    totalSourceBytes += object.sizeBytes;
  }

  entries.unshift({
    path: "manifest.json",
    bytes: new TextEncoder().encode(JSON.stringify({
      format: "film.attachment-package",
      version: 1,
      workspaceId,
      createdAt: new Date().toISOString(),
      objectCount: objects.length,
      totalSourceBytes,
      objects: manifestObjects,
    }, null, 2)),
  });

  return {
    bytes: createStoredZipArchive(entries),
    objectCount: objects.length,
    totalSourceBytes,
  };
}

type StoredZipSourceEntry = {
  path: string;
  bytes: Uint8Array;
};

function createStoredZipArchive(entries: StoredZipSourceEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localFiles: Uint8Array[] = [];
  const centralDirectoryEntries: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const path = attachmentPackageSafeZipPath(entry.path);
    const pathBytes = encoder.encode(path);
    const crc = crc32(entry.bytes);

    const localHeader = new Uint8Array(30 + pathBytes.length + entry.bytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, ZIP_LOCAL_FILE_SIGNATURE, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.bytes.length, true);
    localView.setUint32(22, entry.bytes.length, true);
    localView.setUint16(26, pathBytes.length, true);
    localHeader.set(pathBytes, 30);
    localHeader.set(entry.bytes, 30 + pathBytes.length);
    localFiles.push(localHeader);

    const centralHeader = new Uint8Array(46 + pathBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, ZIP_CENTRAL_FILE_SIGNATURE, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.bytes.length, true);
    centralView.setUint32(24, entry.bytes.length, true);
    centralView.setUint16(28, pathBytes.length, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(pathBytes, 46);
    centralDirectoryEntries.push(centralHeader);

    localOffset += localHeader.length;
  }

  const centralDirectory = concatBytes(centralDirectoryEntries);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, ZIP_EOCD_SIGNATURE, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralDirectory.length, true);
  eocdView.setUint32(16, localOffset, true);

  return concatBytes([...localFiles, centralDirectory, eocd]);
}

function attachmentPackageEntryPath(index: number, docId: string, name: string): string {
  const prefix = String(index + 1).padStart(3, "0");
  return `attachments/${prefix}-${safeObjectSegment(docId)}-${safeDownloadName(name)}`;
}

function attachmentPackageSafeZipPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.includes("\\") || trimmed.startsWith("/") || trimmed.endsWith("/")) {
    throw new Error("Attachment package contains an unsafe path.");
  }
  const segments = trimmed.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Attachment package contains an unsafe path.");
  }
  return trimmed;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((total, part) => total + part.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = new Uint32Array(
  Array.from({ length: 256 }, (_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    return crc >>> 0;
  }),
);

function safeDownloadName(value: string): string {
  return safeObjectSegment(value).slice(0, 160) || "attachment";
}

function safeAttachmentPackageName(workspaceId: string): string {
  return `film-attachments-${safeObjectSegment(workspaceId)}.zip`;
}

function isValidSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return sha256HexBytes(bytes);
}

async function verifySvixSignature(
  payload: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  webhookSecret: string,
): Promise<
  | { ok: true; svixId: string }
  | { ok: false; error: string; status: number }
> {
  const id = svixId?.trim() ?? "";
  const timestamp = svixTimestamp?.trim() ?? "";
  const signatureHeader = svixSignature?.trim() ?? "";
  if (!id || !timestamp || !signatureHeader) {
    return { ok: false, error: "resend_webhook_signature_headers_required", status: 400 };
  }
  if (!/^msg_[A-Za-z0-9_-]{8,120}$/.test(id)) {
    return { ok: false, error: "resend_webhook_invalid_message_id", status: 400 };
  }
  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(timestampSeconds)
    || Math.abs(nowSeconds - timestampSeconds) > RESEND_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS
  ) {
    return { ok: false, error: "resend_webhook_timestamp_out_of_tolerance", status: 400 };
  }

  const secretBytes = svixSecretBytes(webhookSecret);
  if (!secretBytes) {
    return { ok: false, error: "resend_webhook_secret_invalid", status: 503 };
  }
  const signedContent = `${id}.${timestamp}.${payload}`;
  const expectedSignature = await hmacSha256Base64(secretBytes, signedContent);
  const signatures = signatureHeader
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.startsWith("v1,") ? value.slice(3) : "")
    .filter(Boolean);
  if (signatures.length === 0) {
    return { ok: false, error: "resend_webhook_signature_missing_v1", status: 400 };
  }
  if (!signatures.some((signature) => timingSafeEqualText(signature, expectedSignature))) {
    return { ok: false, error: "resend_webhook_signature_invalid", status: 401 };
  }

  return { ok: true, svixId: id };
}

function svixSecretBytes(secret: string): Uint8Array | null {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : "";
  if (!encoded) return null;
  return base64ToBytes(encoded);
}

async function hmacSha256Base64(secretBytes: Uint8Array, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    copyArrayBuffer(secretBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(signature));
}

function timingSafeEqualText(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return diff === 0;
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function sha256HexBytes(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const source = bytes instanceof ArrayBuffer ? bytes : copyArrayBuffer(bytes);
  const hash = await crypto.subtle.digest("SHA-256", source);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
