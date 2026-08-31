import type { IntegrationKey } from "@film/schema";

export type ProviderDryRunStatus = {
  key: IntegrationKey;
  label: string;
  mode: "dry-run";
  status: "ready" | "needs_scope";
  capabilities: string[];
  requiredScopes: string[];
  secretsPolicy: "worker_only";
  nextStep: string;
  complianceNotes: string[];
  productionReadPolicy?: ProviderProductionReadPolicy;
};

export type ProviderProductionReadPolicy = {
  mode: "summary_adapter_first";
  source: "pool_store_summary_adapter";
  liveReadAllowed: boolean;
  dataBoundary: "summary_only";
  blockers: string[];
};

export type GoogleDriveSyncDryRunInput = {
  workspaceId: string;
  rootFolderId?: string | null;
  includeDocsExport?: boolean;
  includeCalendarSync?: boolean;
};

export type GoogleDrivePlannedAction = {
  id: "link_root_folder" | "import_drive_manifest" | "export_docs_markdown" | "read_calendar_events";
  label: string;
  mode: "dry-run";
  liveReadAllowed: false;
};

export type GoogleDriveSyncDryRunStatus = {
  key: "google";
  label: "Google Drive";
  mode: "dry-run";
  workspaceId: string;
  syncMode: "metadata_preflight_only";
  rootFolderId: string | null;
  rootFolderConfigured: boolean;
  oauthPolicy: "worker_encrypted_oauth_ready";
  webhookPolicy: "not_configured";
  secretsPolicy: "worker_only";
  requiredScopes: string[];
  plannedActions: GoogleDrivePlannedAction[];
  blockers: string[];
  complianceNotes: string[];
};

export const TELNYX_SMS_DRY_RUN_RECIPIENT_CAP = 50;
export const TELNYX_SMS_DRY_RUN_SEGMENT_CAP = 150;

export const TELNYX_SMS_PROGRAM_NAME = "Film by Dust Wave";
export const TELNYX_SMS_SENDER_PREFIX = `${TELNYX_SMS_PROGRAM_NAME}:`;
export const TELNYX_SMS_DISCLOSURE_VERSION = "crew-sms-v1-2026-07-13";
export const TELNYX_SMS_CATEGORIES = ["call_sheet", "schedule_change", "safety_location_alert"] as const;

export type TelnyxSmsCategory = typeof TELNYX_SMS_CATEGORIES[number];

export const TELNYX_SMS_CATEGORY_LABELS: Record<TelnyxSmsCategory, string> = {
  call_sheet: "Call sheets",
  schedule_change: "Schedule changes",
  safety_location_alert: "Safety and location updates",
};

export const TELNYX_SMS_CONSENT_DISCLOSURE = `I agree to receive recurring production operations text messages from ${TELNYX_SMS_PROGRAM_NAME} for the categories selected above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of employment or participation.`;

export type TelnyxSmsSendDryRunInput = {
  workspaceId: string;
  projectId: string;
  category: TelnyxSmsCategory;
  recipientCount: number;
  consentedRecipientCount: number;
  estimatedSegments: number;
  emergencyOverride?: boolean;
};

export type TelnyxSmsSendDryRunPlan = {
  key: "sms";
  label: "Telnyx SMS";
  mode: "dry-run";
  workspaceId: string;
  projectId: string;
  category: TelnyxSmsCategory;
  recipientCount: number;
  consentedRecipientCount: number;
  estimatedSegments: number;
  consentCoverageComplete: boolean;
  withinRecipientCap: boolean;
  withinSegmentCap: boolean;
  emergencyOverrideRequested: boolean;
  emergencyOverrideAllowed: boolean;
  policyEligible: boolean;
  liveSendAllowed: false;
  contentPolicy: "message_body_not_accepted_by_dry_run";
  recipientPolicy: "aggregate_counts_only";
  plannedActions: string[];
  blockers: string[];
};

const providerStatuses: Record<IntegrationKey, ProviderDryRunStatus> = {
  pool: {
    key: "pool",
    label: "Pool",
    mode: "dry-run",
    status: "ready",
    capabilities: ["campaign_status", "supporter_aggregate_analytics"],
    requiredScopes: ["campaign:read", "supporters:aggregate"],
    secretsPolicy: "worker_only",
    nextStep: "Map campaign IDs to Film projects before live Pool reads.",
    complianceNotes: ["Do not import individual donor contact data in v1."],
  },
  store: {
    key: "store",
    label: "Store",
    mode: "dry-run",
    status: "ready",
    capabilities: ["order_summaries", "attendee_lists"],
    requiredScopes: ["orders:read", "events:attendees:read"],
    secretsPolicy: "worker_only",
    nextStep: "Map Store event/product IDs to Film projects before live reads.",
    complianceNotes: ["Attendee exports are sensitive and must stay out of browser logs."],
  },
  stripe: {
    key: "stripe",
    label: "Stripe",
    mode: "dry-run",
    status: "needs_scope",
    capabilities: ["payment_summary", "payout_summary", "invoice_status"],
    requiredScopes: ["balance:read", "charges:read", "payouts:read", "invoices:read"],
    secretsPolicy: "worker_only",
    nextStep: "Implement Pool/Store Stripe summary adapters before adding direct Stripe reads or secrets.",
    complianceNotes: ["Do not store card data, raw payment method details, or unrestricted customer exports in Film."],
    productionReadPolicy: {
      mode: "summary_adapter_first",
      source: "pool_store_summary_adapter",
      liveReadAllowed: false,
      dataBoundary: "summary_only",
      blockers: [
        "Define Pool/Store summary adapter fields and project mappings.",
        "Configure Worker-only Stripe restricted keys or OAuth scopes before any direct fallback.",
        "Register production webhooks and redacted audit logging before live Stripe reads.",
      ],
    },
  },
  social: {
    key: "social",
    label: "Meta Insights",
    mode: "dry-run",
    status: "needs_scope",
    capabilities: ["facebook_page_insights", "instagram_account_insights", "instagram_media_calendar"],
    requiredScopes: [
      "pages_show_list",
      "pages_read_engagement",
      "read_insights",
      "instagram_basic",
      "instagram_manage_insights",
    ],
    secretsPolicy: "worker_only",
    nextStep: "Create the Meta app, connect one owned Facebook Page and linked Instagram professional account, and complete the read-only scope review.",
    complianceNotes: [
      "Publishing remains in the Social application; Film never posts or schedules provider-side content in v1.",
      "Advertising, messaging, moderation, and publishing permissions are excluded from v1.",
    ],
  },
  google: {
    key: "google",
    label: "Google",
    mode: "dry-run",
    status: "needs_scope",
    capabilities: ["drive_metadata_import"],
    requiredScopes: ["drive.metadata.readonly"],
    secretsPolicy: "worker_only",
    nextStep: "Create OAuth app, consent copy, and least-privilege scope review.",
    complianceNotes: ["Drive content and Calendar require separate incremental consent; native Film docs remain canonical."],
  },
  resend: {
    key: "resend",
    label: "Resend",
    mode: "dry-run",
    status: "needs_scope",
    capabilities: ["transactional_email", "magic_link_delivery", "crew_call_sheet_notifications"],
    requiredScopes: ["emails:send", "domains:read", "audiences:read"],
    secretsPolicy: "worker_only",
    nextStep: "Configure sender domain, templates, suppression handling, and rate limits before live email delivery.",
    complianceNotes: ["Bulk or marketing email requires consent, unsubscribe handling, and audit trails before live sends."],
  },
  sms: {
    key: "sms",
    label: "Telnyx SMS",
    mode: "dry-run",
    status: "needs_scope",
    capabilities: ["crew_transactional_messages", "delivery_status_webhooks", "opt_out_tracking"],
    requiredScopes: ["messages:send", "messages:read", "webhooks:verify"],
    secretsPolicy: "worker_only",
    nextStep: "Create the Telnyx messaging profile and 10DLC campaign, approve the crew disclosure, and configure the existing signed webhook gate.",
    complianceNotes: [
      "Consent, opt-out, and bounded delivery audit trails are mandatory before live SMS.",
      "Investor, fundraising, promotional, and bulk marketing messages are outside SMS v1.",
    ],
  },
};

export function listProviderDryRunStatuses(): ProviderDryRunStatus[] {
  return Object.values(providerStatuses).map(cloneStatus);
}

export function getProviderDryRunStatus(key: string): ProviderDryRunStatus | null {
  if (!isIntegrationKey(key)) return null;
  return cloneStatus(providerStatuses[key]);
}

export function createGoogleDriveSyncDryRunStatus(input: GoogleDriveSyncDryRunInput): GoogleDriveSyncDryRunStatus {
  const includeDocsExport = input.includeDocsExport ?? false;
  const includeCalendarSync = input.includeCalendarSync ?? false;
  const rootFolderId = input.rootFolderId?.trim() || null;
  const plannedActions: GoogleDrivePlannedAction[] = [
    {
      id: "link_root_folder",
      label: "Link a workspace root folder",
      mode: "dry-run",
      liveReadAllowed: false,
    },
    {
      id: "import_drive_manifest",
      label: "Import Drive file metadata",
      mode: "dry-run",
      liveReadAllowed: false,
    },
  ];
  if (includeDocsExport) {
    plannedActions.push({
      id: "export_docs_markdown",
      label: "Export Google Docs as Markdown snapshots",
      mode: "dry-run",
      liveReadAllowed: false,
    });
  }
  if (includeCalendarSync) {
    plannedActions.push({
      id: "read_calendar_events",
      label: "Read calendar events for production schedules",
      mode: "dry-run",
      liveReadAllowed: false,
    });
  }

  const requiredScopes = [
    "drive.metadata.readonly",
    ...(includeDocsExport ? ["drive.readonly", "documents.readonly"] : []),
    ...(includeCalendarSync ? ["calendar.events.readonly"] : []),
  ];
  const blockers = [
    "Configure the Google OAuth client secrets and explicit live-mode gate.",
    "Complete Google consent review and connect this workspace.",
    "Drive webhook channel validation is still required before background sync.",
  ];
  if (!rootFolderId) {
    blockers.push("Select a Drive root folder before live sync.");
  }

  return {
    key: "google",
    label: "Google Drive",
    mode: "dry-run",
    workspaceId: input.workspaceId,
    syncMode: "metadata_preflight_only",
    rootFolderId,
    rootFolderConfigured: Boolean(rootFolderId),
    oauthPolicy: "worker_encrypted_oauth_ready",
    webhookPolicy: "not_configured",
    secretsPolicy: "worker_only",
    requiredScopes,
    plannedActions,
    blockers,
    complianceNotes: [
      "Native Film documents remain canonical.",
      "Drive and Docs sync must stay opt-in per workspace.",
      "Do not store OAuth refresh tokens in browser storage or backups.",
    ],
  };
}

export function createTelnyxSmsSendDryRunPlan(input: TelnyxSmsSendDryRunInput): TelnyxSmsSendDryRunPlan {
  const emergencyOverrideRequested = input.emergencyOverride === true;
  const consentCoverageComplete = input.recipientCount > 0
    && input.consentedRecipientCount === input.recipientCount;
  const withinRecipientCap = input.recipientCount > 0
    && input.recipientCount <= TELNYX_SMS_DRY_RUN_RECIPIENT_CAP;
  const withinSegmentCap = input.estimatedSegments > 0
    && input.estimatedSegments <= TELNYX_SMS_DRY_RUN_SEGMENT_CAP;
  const emergencyOverrideAllowed = !emergencyOverrideRequested
    || input.category === "safety_location_alert";
  const policyEligible = consentCoverageComplete
    && withinRecipientCap
    && withinSegmentCap
    && emergencyOverrideAllowed;
  const blockers = [
    "Live Telnyx sends remain disabled until the account, messaging profile, dedicated number, and 10DLC campaign are approved.",
    "Approved recipient enrollment, retention/quiet-hour policy, explicit live gate, and an approved live-number smoke are still required.",
  ];
  if (!consentCoverageComplete) {
    blockers.push("Every planned recipient must have current consent for the selected crew message category.");
  }
  if (!withinRecipientCap) {
    blockers.push(`Dry-run recipient count must be between 1 and ${TELNYX_SMS_DRY_RUN_RECIPIENT_CAP}.`);
  }
  if (!withinSegmentCap) {
    blockers.push(`Estimated SMS segments must be between 1 and ${TELNYX_SMS_DRY_RUN_SEGMENT_CAP}.`);
  }
  if (!emergencyOverrideAllowed) {
    blockers.push("Emergency override is available only for safety or location alerts.");
  }

  return {
    key: "sms",
    label: "Telnyx SMS",
    mode: "dry-run",
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    category: input.category,
    recipientCount: input.recipientCount,
    consentedRecipientCount: input.consentedRecipientCount,
    estimatedSegments: input.estimatedSegments,
    consentCoverageComplete,
    withinRecipientCap,
    withinSegmentCap,
    emergencyOverrideRequested,
    emergencyOverrideAllowed,
    policyEligible,
    liveSendAllowed: false,
    contentPolicy: "message_body_not_accepted_by_dry_run",
    recipientPolicy: "aggregate_counts_only",
    plannedActions: [
      "Resolve consented crew recipients inside the Worker.",
      "Apply category, project, quiet-hours, recipient, and segment policy gates.",
      "Use the disabled-by-default Worker adapter to create idempotent content-free delivery attempts only after the explicit live gate is enabled.",
    ],
    blockers,
  };
}

export function isTelnyxSmsCategory(value: string): value is TelnyxSmsCategory {
  return TELNYX_SMS_CATEGORIES.includes(value as TelnyxSmsCategory);
}

function isIntegrationKey(value: string): value is IntegrationKey {
  return value === "pool"
    || value === "store"
    || value === "stripe"
    || value === "social"
    || value === "google"
    || value === "resend"
    || value === "sms";
}

function cloneStatus(value: ProviderDryRunStatus): ProviderDryRunStatus {
  return {
    ...value,
    capabilities: [...value.capabilities],
    requiredScopes: [...value.requiredScopes],
    complianceNotes: [...value.complianceNotes],
    productionReadPolicy: value.productionReadPolicy
      ? {
          ...value.productionReadPolicy,
          blockers: [...value.productionReadPolicy.blockers],
        }
      : undefined,
  };
}
