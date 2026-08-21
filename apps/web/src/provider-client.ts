import type { IntegrationKey } from "@film/schema";
import type { GoogleDriveSyncDryRunStatus, ProviderDryRunStatus } from "@film/providers";

type ProviderDryRunResponse = {
  dryRun: boolean;
  auditPersistence?: string;
  provider: ProviderDryRunStatus;
  error?: string;
};

export type StripeSummaryReadiness = {
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

type StripeSummaryReadinessResponse = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  readiness: StripeSummaryReadiness;
  error?: string;
};

export type ProviderRuntimeReadinessItem = {
  key: IntegrationKey;
  label: string;
  status: "live" | "partial_live" | "blocked";
  runtimeMode: "live_summary_only" | "live_transactional_email" | "live_transactional_sms" | "live_oauth" | "dry_run_only";
  liveCapabilities: string[];
  blockers: string[];
  requiredDecisions: string[];
  dataBoundary: string;
};

export type ProviderRuntimeReadiness = {
  policy: "explicit_provider_live_gates";
  secretValuesExposed: false;
  liveCount: number;
  partialLiveCount: number;
  blockedCount: number;
  providers: ProviderRuntimeReadinessItem[];
};

type ProviderRuntimeReadinessResponse = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  readiness: ProviderRuntimeReadiness;
  error?: string;
};

export type TelnyxProviderReadiness = {
  provider: "telnyx";
  mode: "read_only_provider_preflight";
  status:
    | "blocked_configuration"
    | "blocked_provider"
    | "pending_campaign_review"
    | "ready_for_number_assignment"
    | "pending_number_assignment"
    | "ready_for_owned_number_smoke";
  providerApiChecked: boolean;
  profile: {
    reachable: boolean;
    enabled: boolean;
    nameMatches: boolean;
    webhookMatches: boolean;
    webhookApiV2: boolean;
  };
  campaign: {
    reachable: boolean;
    status: string | null;
    active: boolean;
    rejectedOrSuspended: boolean;
    mno: { approved: number; review: number; rejected: number; other: number; total: number };
  };
  number: {
    reachable: boolean;
    smsCapable: boolean;
    profileAssigned: boolean;
    campaignAssigned: boolean;
    assignmentStatus: string | null;
  };
  configured: {
    apiKey: boolean;
    messagingProfile: boolean;
    campaign: boolean;
    senderMapping: boolean;
    webhookPublicKey: boolean;
    recipientEncryptionKey: boolean;
    recipientHashKey: boolean;
    quietHours: boolean;
    retention: boolean;
    d1: boolean;
  };
  activationGates: { webhookLive: boolean; sendLive: boolean };
  readyForOwnedNumberSmoke: boolean;
  blockers: string[];
  secretValuesExposed: false;
};

type TelnyxProviderReadinessResponse = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  readiness?: TelnyxProviderReadiness;
  error?: string;
};

export type SmsConsentManifestRecipient = {
  id: string;
  memberId: string | null;
  status: "active" | "revoked";
  disclosureVersion: string | null;
  categories: Array<"call_sheet" | "schedule_change" | "safety_location_alert">;
  consentedAt: string | null;
  revokedAt: string | null;
  updatedAt: string;
};

export type SmsConsentManifest = {
  persistence: "d1_sms_compliance";
  recipients: SmsConsentManifestRecipient[];
  count: number;
  truncated: boolean;
  secretValuesExposed: false;
};

export type SmsConsentCategory = "call_sheet" | "schedule_change" | "safety_location_alert";

export type SmsSelfConsentRequest = {
  workspaceId: string;
  recipientE164: string;
  categories: SmsConsentCategory[];
  disclosureVersion: string;
};

export type SmsConsentMutationResult = {
  persistence: "d1_sms_compliance";
  auditPersistence: "d1_audit_events";
  destructiveWrite: boolean;
  idempotent: boolean;
  recipient: SmsConsentManifestRecipient;
  eventType: "consented";
  secretValuesExposed: false;
};

type SmsConsentManifestResponse = Partial<SmsConsentManifest> & {
  error?: string;
};

type SmsConsentMutationResponse = Partial<SmsConsentMutationResult> & {
  ok?: boolean;
  error?: string;
};

export type SmsSendRequest = {
  workspaceId: string;
  projectId: string;
  recipientIds: string[];
  category: "call_sheet" | "schedule_change" | "safety_location_alert";
  messageBody: string;
  requestKey: string;
  emergencyOverride: boolean;
  emergencyReasonCode: "immediate_safety" | "location_emergency" | null;
};

export type SmsSendResult = {
  status: "sent" | "partial" | "replayed" | "blocked";
  persistence: "d1_sms_delivery_attempts";
  recipientCount: number;
  segmentCountPerRecipient: number;
  totalSegmentCount: number;
  queuedCount: number;
  failedCount: number;
  replayedCount: number;
  emergencyOverrideApplied: boolean;
  attempts: Array<{ id: string; status: "queued" | "failed" | "replayed" }>;
  secretValuesExposed: false;
};

type SmsSendResponse = {
  ok?: boolean;
  provider?: SmsSendResult;
  error?: string;
};

export type StripeSummaryTotals = {
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

export type StripeSummaryCounts = {
  paymentCount: number;
  paymentFailedCount: number;
  refundCount: number;
  disputeCount: number;
  invoiceCount: number;
  payoutCount: number;
};

export type StripeSummaryAdapterSummary = {
  source: "pool" | "store";
  status: "available" | "empty" | "blocked_not_mapped" | "failed" | "invalid_response";
  mappedRefCount: number;
  generatedAt: string | null;
  currency: string;
  totals: StripeSummaryTotals;
  counts: StripeSummaryCounts;
  errorCode: string | null;
};

export type StripeSummaryResult = {
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

type StripeSummaryResponse = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  summary: StripeSummaryResult;
  readiness?: StripeSummaryReadiness;
  error?: string;
};

export type GoogleDriveSyncDryRunRequest = {
  workspaceId: string;
  rootFolderId?: string;
  includeDocsExport?: boolean;
  includeCalendarSync?: boolean;
};

export type GoogleOAuthRuntimeReadiness = {
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

export type GoogleProviderConnection = {
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

export type GoogleDriveManifestFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  sizeBytes: number | null;
  webViewLink: string | null;
};

export type GoogleDriveManifestResult = {
  manifest: {
    rootFolderId: string;
    files: GoogleDriveManifestFile[];
    nextPageToken: string | null;
    truncated: boolean;
  };
  tokenRefreshed: boolean;
  persistence: string;
  connectionPersistence: string;
  auditPersistence: string;
};

type GoogleDriveManifestResponse = Partial<GoogleDriveManifestResult> & {
  error?: string;
};

export type GoogleConnectionStatus = {
  readiness: GoogleOAuthRuntimeReadiness;
  connection: GoogleProviderConnection | null;
  persistence: string;
  auditPersistence: string | null;
};

type GoogleConnectionStatusResponse = {
  readiness: GoogleOAuthRuntimeReadiness;
  connection: GoogleProviderConnection | null;
  persistence: string;
  auditPersistence?: string;
  error?: string;
};

type GoogleOAuthStartResponse = {
  authorizationUrl?: string;
  scopes?: string[];
  expiresAt?: string;
  persistence?: string;
  auditPersistence?: string;
  error?: string;
};

type GoogleDisconnectResponse = {
  connection?: GoogleProviderConnection;
  providerRevoked?: boolean;
  persistence?: string;
  auditPersistence?: string;
  error?: string;
};

export type MetaOAuthRuntimeReadiness = {
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

export type MetaProviderConnection = {
  provider: "meta";
  status: "pending_page_selection" | "active" | "disconnected" | "error";
  scopes: string[];
  tokenExpiresAt: string | null;
  page: { id: string; name: string } | null;
  instagramAccount: { id: string; username: string | null } | null;
  connectedAt: string;
  disconnectedAt: string | null;
  updatedAt: string;
};

export type MetaConnectionStatus = {
  readiness: MetaOAuthRuntimeReadiness;
  connection: MetaProviderConnection | null;
  persistence: string;
  auditPersistence: string | null;
};

export type MetaPageCandidate = {
  id: string;
  name: string;
  tasks: string[];
  instagramAccount: { id: string; username: string | null } | null;
};

export type MetaCalendarItem = {
  provider: "facebook" | "instagram";
  id: string;
  label: string;
  publishedAt: string;
  permalink: string | null;
  mediaType: string | null;
  engagement: { reactions: number; comments: number; shares: number };
};

export type MetaInsightSeries = {
  provider: "facebook" | "instagram";
  metric: string;
  period: string;
  values: Array<{ endTime: string | null; value: number }>;
};

export type MetaAnalyticsResult = {
  status: "complete" | "partial" | "unavailable";
  since: string;
  until: string;
  calendar: MetaCalendarItem[];
  insights: MetaInsightSeries[];
  warnings: string[];
  dataBoundary: "read_only_calendar_and_bounded_engagement_summaries";
  secretValuesExposed: false;
};

type MetaConnectionStatusResponse = Partial<MetaConnectionStatus> & { error?: string };
type MetaOAuthStartResponse = {
  authorizationUrl?: string;
  scopes?: string[];
  expiresAt?: string;
  persistence?: string;
  auditPersistence?: string;
  error?: string;
};
type MetaPageCandidatesResponse = {
  pages?: MetaPageCandidate[];
  persistence?: string;
  connectionPersistence?: string;
  auditPersistence?: string;
  secretValuesExposed?: false;
  error?: string;
};
type MetaPageSelectionResponse = {
  connection?: MetaProviderConnection;
  persistence?: string;
  auditPersistence?: string;
  secretValuesExposed?: false;
  error?: string;
};
type MetaAnalyticsResponse = {
  analytics?: MetaAnalyticsResult;
  persistence?: string;
  connectionPersistence?: string;
  auditPersistence?: string;
  error?: string;
};
type MetaDisconnectResponse = {
  connection?: MetaProviderConnection;
  providerRevoked?: boolean;
  persistence?: string;
  auditPersistence?: string;
  error?: string;
};

type GoogleDriveSyncDryRunResponse = {
  dryRun: boolean;
  auditPersistence?: string;
  provider: GoogleDriveSyncDryRunStatus;
  error?: string;
};

type Fetcher = typeof fetch;

export async function runProviderDryRun(
  workerUrl: string,
  key: IntegrationKey,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<ProviderDryRunStatus & { auditPersistence: string | null }> {
  const response = await fetcher(`${workerUrl}/api/providers/${key}/dry-run`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
  });
  const body = (await response.json()) as ProviderDryRunResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Provider dry run failed with ${response.status}`);
  }
  return {
    ...body.provider,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function checkProviderRuntimeReadiness(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<ProviderRuntimeReadiness & { persistence: string; auditPersistence: string | null }> {
  const response = await fetcher(`${workerUrl}/api/providers/runtime-readiness`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  });
  const body = (await response.json()) as ProviderRuntimeReadinessResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Provider runtime readiness failed with ${response.status}`);
  }
  return {
    ...body.readiness,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function checkTelnyxProviderStatus(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<TelnyxProviderReadiness & { persistence: string; auditPersistence: string | null }> {
  const response = await providerPost(
    fetcher,
    workerUrl,
    "/api/providers/sms/provider-readiness",
    csrfToken,
    { workspaceId },
  );
  const body = (await response.json()) as TelnyxProviderReadinessResponse;
  if (!response.ok || !body.readiness || body.readiness.secretValuesExposed !== false) {
    throw new Error(body.error ?? `Telnyx readiness failed with ${response.status}`);
  }
  return {
    ...body.readiness,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function fetchSmsConsentManifest(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  limit = 100,
  fetcher: Fetcher = fetch,
): Promise<SmsConsentManifest> {
  const response = await fetcher(`${workerUrl}/api/providers/sms/consent/manifest`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId, limit }),
  });
  const body = (await response.json()) as SmsConsentManifestResponse;
  if (
    !response.ok
    || body.persistence !== "d1_sms_compliance"
    || !Array.isArray(body.recipients)
    || typeof body.count !== "number"
    || typeof body.truncated !== "boolean"
    || body.secretValuesExposed !== false
  ) {
    throw new Error(body.error ?? `SMS consent manifest failed with ${response.status}`);
  }
  return body as SmsConsentManifest;
}

export async function commitSmsSelfConsent(
  workerUrl: string,
  csrfToken: string,
  request: SmsSelfConsentRequest,
  fetcher: Fetcher = fetch,
): Promise<SmsConsentMutationResult> {
  const response = await fetcher(`${workerUrl}/api/providers/sms/consent/commit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({
      ...request,
      evidenceId: `workspace-form:${crypto.randomUUID()}`,
      source: "workspace_form",
      disclosureAcknowledged: true,
    }),
  });
  const body = (await response.json()) as SmsConsentMutationResponse;
  if (
    !response.ok
    || body.ok !== true
    || body.persistence !== "d1_sms_compliance"
    || body.auditPersistence !== "d1_audit_events"
    || body.eventType !== "consented"
    || !body.recipient
    || body.secretValuesExposed !== false
  ) {
    throw new Error(body.error ?? `SMS consent enrollment failed with ${response.status}`);
  }
  return body as SmsConsentMutationResult;
}

export async function sendSmsBatch(
  workerUrl: string,
  csrfToken: string,
  request: SmsSendRequest,
  fetcher: Fetcher = fetch,
): Promise<SmsSendResult> {
  const response = await fetcher(`${workerUrl}/api/providers/sms/send`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as SmsSendResponse;
  if (!response.ok || !body.provider || body.provider.secretValuesExposed !== false) {
    throw new Error(body.error ?? `SMS send failed with ${response.status}`);
  }
  return body.provider;
}

export async function checkStripeSummaryReadiness(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<StripeSummaryReadiness & { persistence: string; auditPersistence: string | null }> {
  const response = await fetcher(`${workerUrl}/api/providers/stripe/summary-readiness`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  });
  const body = (await response.json()) as StripeSummaryReadinessResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Stripe summary readiness failed with ${response.status}`);
  }
  return {
    ...body.readiness,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function fetchStripeSummary(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  projectId: string,
  fetcher: Fetcher = fetch,
): Promise<StripeSummaryResult & { persistence: string; auditPersistence: string | null }> {
  const response = await fetcher(`${workerUrl}/api/providers/stripe/summary`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId, projectId }),
  });
  const body = (await response.json()) as StripeSummaryResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Stripe summary failed with ${response.status}`);
  }
  return {
    ...body.summary,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function runGoogleDriveSyncDryRun(
  workerUrl: string,
  csrfToken: string,
  request: GoogleDriveSyncDryRunRequest,
  fetcher: Fetcher = fetch,
): Promise<GoogleDriveSyncDryRunStatus & { auditPersistence: string | null }> {
  const response = await fetcher(`${workerUrl}/api/providers/google/drive-sync-dry-run`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as GoogleDriveSyncDryRunResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Google Drive sync dry run failed with ${response.status}`);
  }
  return {
    ...body.provider,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function checkGoogleConnection(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<GoogleConnectionStatus> {
  const response = await fetcher(`${workerUrl}/api/providers/google/connection`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  });
  const body = (await response.json()) as GoogleConnectionStatusResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Google connection status failed with ${response.status}`);
  }
  return {
    readiness: body.readiness,
    connection: body.connection,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function startGoogleOAuth(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  options: { includeDocsExport?: boolean; includeCalendarSync?: boolean } = {},
  fetcher: Fetcher = fetch,
): Promise<{
  authorizationUrl: string;
  scopes: string[];
  expiresAt: string;
  persistence: string;
  auditPersistence: string | null;
}> {
  const response = await fetcher(`${workerUrl}/api/providers/google/oauth/start`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId, ...options }),
  });
  const body = (await response.json()) as GoogleOAuthStartResponse;
  if (!response.ok || !body.authorizationUrl || !body.scopes || !body.expiresAt || !body.persistence) {
    throw new Error(body.error ?? `Google connection start failed with ${response.status}`);
  }
  return {
    authorizationUrl: body.authorizationUrl,
    scopes: body.scopes,
    expiresAt: body.expiresAt,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function disconnectGoogle(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<{
  connection: GoogleProviderConnection;
  providerRevoked: boolean;
  persistence: string;
  auditPersistence: string | null;
}> {
  const response = await fetcher(`${workerUrl}/api/providers/google/disconnect`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId }),
  });
  const body = (await response.json()) as GoogleDisconnectResponse;
  if (!response.ok || !body.connection || !body.persistence) {
    throw new Error(body.error ?? `Google disconnect failed with ${response.status}`);
  }
  return {
    connection: body.connection,
    providerRevoked: body.providerRevoked ?? false,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function fetchGoogleDriveManifest(
  workerUrl: string,
  csrfToken: string,
  request: { workspaceId: string; rootFolderId?: string; pageToken?: string },
  fetcher: Fetcher = fetch,
): Promise<GoogleDriveManifestResult> {
  const response = await fetcher(`${workerUrl}/api/providers/google/drive-manifest`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as GoogleDriveManifestResponse;
  if (
    !response.ok
    || !body.manifest
    || typeof body.tokenRefreshed !== "boolean"
    || !body.persistence
    || !body.connectionPersistence
    || !body.auditPersistence
  ) {
    throw new Error(body.error ?? `Google Drive manifest failed with ${response.status}`);
  }
  return body as GoogleDriveManifestResult;
}

export async function checkMetaConnection(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<MetaConnectionStatus> {
  const response = await providerPost(fetcher, workerUrl, "/api/providers/meta/connection", csrfToken, { workspaceId });
  const body = (await response.json()) as MetaConnectionStatusResponse;
  if (!response.ok || !body.readiness || !body.persistence) {
    throw new Error(body.error ?? `Meta connection status failed with ${response.status}`);
  }
  return {
    readiness: body.readiness,
    connection: body.connection ?? null,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function startMetaOAuth(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<{ authorizationUrl: string; scopes: string[]; expiresAt: string; persistence: string; auditPersistence: string | null }> {
  const response = await providerPost(fetcher, workerUrl, "/api/providers/meta/oauth/start", csrfToken, { workspaceId });
  const body = (await response.json()) as MetaOAuthStartResponse;
  if (!response.ok || !body.authorizationUrl || !body.scopes || !body.expiresAt || !body.persistence) {
    throw new Error(body.error ?? `Meta connection start failed with ${response.status}`);
  }
  return {
    authorizationUrl: body.authorizationUrl,
    scopes: body.scopes,
    expiresAt: body.expiresAt,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function fetchMetaPageCandidates(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<{ pages: MetaPageCandidate[]; persistence: string; connectionPersistence: string; auditPersistence: string | null }> {
  const response = await providerPost(fetcher, workerUrl, "/api/providers/meta/pages", csrfToken, { workspaceId });
  const body = (await response.json()) as MetaPageCandidatesResponse;
  if (!response.ok || !body.pages || !body.persistence || !body.connectionPersistence || body.secretValuesExposed !== false) {
    throw new Error(body.error ?? `Meta Page discovery failed with ${response.status}`);
  }
  return {
    pages: body.pages,
    persistence: body.persistence,
    connectionPersistence: body.connectionPersistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function selectMetaPage(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  pageId: string,
  fetcher: Fetcher = fetch,
): Promise<{ connection: MetaProviderConnection; persistence: string; auditPersistence: string | null }> {
  const response = await providerPost(fetcher, workerUrl, "/api/providers/meta/select-page", csrfToken, { workspaceId, pageId });
  const body = (await response.json()) as MetaPageSelectionResponse;
  if (!response.ok || !body.connection || !body.persistence || body.secretValuesExposed !== false) {
    throw new Error(body.error ?? `Meta Page selection failed with ${response.status}`);
  }
  return { connection: body.connection, persistence: body.persistence, auditPersistence: body.auditPersistence ?? null };
}

export async function fetchMetaAnalytics(
  workerUrl: string,
  csrfToken: string,
  request: { workspaceId: string; since: string; until: string },
  fetcher: Fetcher = fetch,
): Promise<MetaAnalyticsResult & { persistence: string; connectionPersistence: string; auditPersistence: string | null }> {
  const response = await providerPost(fetcher, workerUrl, "/api/providers/meta/analytics", csrfToken, request);
  const body = (await response.json()) as MetaAnalyticsResponse;
  if (!response.ok || !body.analytics || !body.persistence || !body.connectionPersistence) {
    throw new Error(body.error ?? `Meta analytics failed with ${response.status}`);
  }
  return {
    ...body.analytics,
    persistence: body.persistence,
    connectionPersistence: body.connectionPersistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

export async function disconnectMeta(
  workerUrl: string,
  csrfToken: string,
  workspaceId: string,
  fetcher: Fetcher = fetch,
): Promise<{ connection: MetaProviderConnection; providerRevoked: boolean; persistence: string; auditPersistence: string | null }> {
  const response = await providerPost(fetcher, workerUrl, "/api/providers/meta/disconnect", csrfToken, { workspaceId });
  const body = (await response.json()) as MetaDisconnectResponse;
  if (!response.ok || !body.connection || !body.persistence) {
    throw new Error(body.error ?? `Meta disconnect failed with ${response.status}`);
  }
  return {
    connection: body.connection,
    providerRevoked: body.providerRevoked ?? false,
    persistence: body.persistence,
    auditPersistence: body.auditPersistence ?? null,
  };
}

function providerPost(
  fetcher: Fetcher,
  workerUrl: string,
  path: string,
  csrfToken: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetcher(`${workerUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", "x-film-csrf": csrfToken },
    body: JSON.stringify(body),
  });
}
