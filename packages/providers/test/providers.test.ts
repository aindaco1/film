import { describe, expect, it } from "vitest";
import {
  TELNYX_SMS_CATEGORIES,
  TELNYX_SMS_CATEGORY_LABELS,
  TELNYX_SMS_CONSENT_DISCLOSURE,
  TELNYX_SMS_PROGRAM_NAME,
  TELNYX_SMS_SENDER_PREFIX,
  createGoogleDriveSyncDryRunStatus,
  createTelnyxSmsSendDryRunPlan,
  getProviderDryRunStatus,
  listProviderDryRunStatuses,
} from "../src/index";

describe("provider dry-run statuses", () => {
  it("lists every MVP provider without secrets", () => {
    const statuses = listProviderDryRunStatuses();

    expect(statuses.map((status) => status.key).sort()).toEqual(["google", "pool", "resend", "sms", "social", "store", "stripe"]);
    expect(statuses.every((status) => status.secretsPolicy === "worker_only")).toBe(true);
  });

  it("returns cloned provider status objects", () => {
    const status = getProviderDryRunStatus("pool");
    expect(status?.capabilities).toContain("campaign_status");

    status?.capabilities.push("mutated");

    expect(getProviderDryRunStatus("pool")?.capabilities).not.toContain("mutated");
  });

  it("keeps Stripe live reads behind Pool and Store summary adapters", () => {
    const status = getProviderDryRunStatus("stripe");

    expect(status?.productionReadPolicy).toMatchObject({
      mode: "summary_adapter_first",
      source: "pool_store_summary_adapter",
      liveReadAllowed: false,
      dataBoundary: "summary_only",
    });
    expect(status?.productionReadPolicy?.blockers).toContain("Define Pool/Store summary adapter fields and project mappings.");
    expect(status?.nextStep).toContain("Pool/Store Stripe summary adapters");
  });

  it("clones nested provider production policy blockers", () => {
    const status = getProviderDryRunStatus("stripe");
    status?.productionReadPolicy?.blockers.push("mutated");

    expect(getProviderDryRunStatus("stripe")?.productionReadPolicy?.blockers).not.toContain("mutated");
  });

  it("rejects unknown providers", () => {
    expect(getProviderDryRunStatus("airtable")).toBeNull();
  });

  it("selects Telnyx for crew-only transactional SMS while live delivery remains blocked", () => {
    const status = getProviderDryRunStatus("sms");

    expect(status).toMatchObject({
      label: "Telnyx SMS",
      mode: "dry-run",
      status: "needs_scope",
      secretsPolicy: "worker_only",
    });
    expect(status?.capabilities).toEqual([
      "crew_transactional_messages",
      "delivery_status_webhooks",
      "opt_out_tracking",
    ]);
    expect(status?.capabilities).not.toContain("investor_updates");
    expect(status?.nextStep).toContain("Telnyx");
  });

  it("owns one sender identity, consent disclosure, and category catalog", () => {
    expect(TELNYX_SMS_PROGRAM_NAME).toBe("Film by Dust Wave");
    expect(TELNYX_SMS_SENDER_PREFIX).toBe(`${TELNYX_SMS_PROGRAM_NAME}:`);
    expect(TELNYX_SMS_CATEGORIES).toEqual(["call_sheet", "schedule_change", "safety_location_alert"]);
    expect(TELNYX_SMS_CATEGORIES.map((category) => TELNYX_SMS_CATEGORY_LABELS[category])).toEqual([
      "Call sheets",
      "Schedule changes",
      "Safety and location updates",
    ]);
    expect(TELNYX_SMS_CONSENT_DISCLOSURE).toContain(`messages from ${TELNYX_SMS_PROGRAM_NAME}`);
    expect(TELNYX_SMS_CONSENT_DISCLOSURE).toContain("Reply STOP to opt out or HELP for help");
  });

  it("plans only aggregate, consented Telnyx crew sends and keeps live delivery disabled", () => {
    const plan = createTelnyxSmsSendDryRunPlan({
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      category: "schedule_change",
      recipientCount: 12,
      consentedRecipientCount: 12,
      estimatedSegments: 24,
    });

    expect(plan).toMatchObject({
      key: "sms",
      label: "Telnyx SMS",
      mode: "dry-run",
      consentCoverageComplete: true,
      withinRecipientCap: true,
      withinSegmentCap: true,
      policyEligible: true,
      liveSendAllowed: false,
      contentPolicy: "message_body_not_accepted_by_dry_run",
      recipientPolicy: "aggregate_counts_only",
    });
    expect(plan).not.toHaveProperty("recipients");
    expect(plan).not.toHaveProperty("messageBody");
  });

  it("blocks missing consent, excessive volume, and non-safety emergency overrides", () => {
    const plan = createTelnyxSmsSendDryRunPlan({
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      category: "call_sheet",
      recipientCount: 51,
      consentedRecipientCount: 49,
      estimatedSegments: 151,
      emergencyOverride: true,
    });

    expect(plan.policyEligible).toBe(false);
    expect(plan.emergencyOverrideAllowed).toBe(false);
    expect(plan.blockers.join(" ")).toContain("Every planned recipient");
    expect(plan.blockers.join(" ")).toContain("Emergency override");
  });

  it("keeps Meta analytics read-only and excludes publishing permissions", () => {
    const status = getProviderDryRunStatus("social");

    expect(status).toMatchObject({
      label: "Meta Insights",
      status: "needs_scope",
      capabilities: [
        "facebook_page_insights",
        "instagram_account_insights",
        "instagram_media_calendar",
      ],
    });
    expect(status?.requiredScopes).toEqual([
      "pages_show_list",
      "pages_read_engagement",
      "read_insights",
      "instagram_basic",
      "instagram_manage_insights",
    ]);
    expect(status?.requiredScopes).not.toEqual(expect.arrayContaining([
      "pages_manage_posts",
      "instagram_content_publish",
      "ads_management",
      "ads_read",
    ]));
  });

  it("plans Google Drive sync without live reads or browser secrets", () => {
    const status = createGoogleDriveSyncDryRunStatus({
      workspaceId: "workspace_acme",
      rootFolderId: "folder_abc123456",
      includeDocsExport: true,
      includeCalendarSync: true,
    });

    expect(status).toMatchObject({
      key: "google",
      mode: "dry-run",
      syncMode: "metadata_preflight_only",
      rootFolderConfigured: true,
      oauthPolicy: "worker_encrypted_oauth_ready",
      webhookPolicy: "not_configured",
      secretsPolicy: "worker_only",
    });
    expect(status.requiredScopes).toContain("drive.metadata.readonly");
    expect(status.requiredScopes).toContain("documents.readonly");
    expect(status.requiredScopes).toContain("calendar.events.readonly");
    expect(status.plannedActions.map((action) => action.id)).toEqual([
      "link_root_folder",
      "import_drive_manifest",
      "export_docs_markdown",
      "read_calendar_events",
    ]);
    expect(status.plannedActions.every((action) => action.liveReadAllowed === false)).toBe(true);
    expect(status.blockers).toContain("Configure the Google OAuth client secrets and explicit live-mode gate.");
    expect(status.blockers).not.toContain("Select a Drive root folder before live sync.");
  });

  it("keeps Google Drive sync blocked without a root folder", () => {
    const status = createGoogleDriveSyncDryRunStatus({
      workspaceId: "workspace_acme",
      includeDocsExport: false,
    });

    expect(status.rootFolderConfigured).toBe(false);
    expect(status.rootFolderId).toBeNull();
    expect(status.requiredScopes).not.toContain("documents.readonly");
    expect(status.blockers).toContain("Select a Drive root folder before live sync.");
  });
});
