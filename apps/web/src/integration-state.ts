import type { IntegrationKey } from "@film/schema";
import type { GoogleDriveSyncDryRunStatus, ProviderDryRunStatus } from "@film/providers";
import type { GoogleConnectionStatus, GoogleDriveManifestResult, MetaAnalyticsResult, MetaConnectionStatus, MetaPageCandidate, ProviderRuntimeReadiness, SmsConsentManifest, StripeSummaryResult, StripeSummaryReadiness, TelnyxProviderReadiness } from "./provider-client";

export type ProviderPreviewState = ProviderDryRunStatus & {
  checkedAt: string;
  auditPersistence: string | null;
};
export type ProviderRuntimeReadinessState = ProviderRuntimeReadiness & {
  checkedAt: string;
  persistence: string;
  auditPersistence: string | null;
};
export type GoogleDriveSyncState = GoogleDriveSyncDryRunStatus & {
  checkedAt: string;
  auditPersistence: string | null;
};
export type GoogleConnectionState = GoogleConnectionStatus & {
  checkedAt: string;
};
export type GoogleDriveManifestState = GoogleDriveManifestResult & {
  checkedAt: string;
};
export type MetaConnectionState = MetaConnectionStatus & {
  checkedAt: string;
};
export type MetaPageCandidatesState = {
  pages: MetaPageCandidate[];
  persistence: string;
  connectionPersistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
export type MetaAnalyticsState = MetaAnalyticsResult & {
  persistence: string;
  connectionPersistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
export type StripeSummaryState = StripeSummaryReadiness & {
  persistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
export type StripeSummaryResultState = StripeSummaryResult & {
  persistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
export type SmsConsentManifestState = SmsConsentManifest & {
  checkedAt: string;
};
export type TelnyxProviderReadinessState = TelnyxProviderReadiness & {
  persistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};

export interface IntegrationResults {
 providerPreview: ProviderPreviewState | null;
 providerRuntimeReadiness: ProviderRuntimeReadinessState | null;
 providerRuntimeCheck: { status: "checking" } | { status: "error"; message: string } | null;
 googleConnection: GoogleConnectionState | null;
 googleDriveManifest: GoogleDriveManifestState | null;
 googleDriveSync: GoogleDriveSyncState | null;
 metaConnection: MetaConnectionState | null;
 metaPageCandidates: MetaPageCandidatesState | null;
 metaAnalytics: MetaAnalyticsState | null;
 stripeSummary: StripeSummaryState | null;
 stripeSummaryResult: StripeSummaryResultState | null;
 smsConsentManifest: SmsConsentManifestState | null;
 telnyxProviderReadiness: TelnyxProviderReadinessState | null;
}

export interface IntegrationViewState extends IntegrationResults {
  demo: boolean;
  signedIn: boolean;
  canManageSmsConsent: boolean;
}

export function emptyIntegrationResults(): IntegrationResults {
  return {
    providerPreview: null, providerRuntimeReadiness: null, providerRuntimeCheck: null,
    googleConnection: null, googleDriveManifest: null, googleDriveSync: null,
    metaConnection: null, metaPageCandidates: null, metaAnalytics: null,
    stripeSummary: null, stripeSummaryResult: null,
    smsConsentManifest: null, telnyxProviderReadiness: null,
  };
}

export function captureIntegrationContext(read: () => { session: unknown; workspaceId: string }): () => boolean {
  const { session, workspaceId } = read();
  return () => {
    const current = read();
    return current.session === session && current.workspaceId === workspaceId;
  };
}

export const INTEGRATION_DEFINITIONS: Array<{ key: IntegrationKey; label: string }> = [
  { key: "pool", label: "Pool" },
  { key: "store", label: "Store" },
  { key: "stripe", label: "Stripe" },
  { key: "social", label: "Meta insights" },
  { key: "google", label: "Google" },
  { key: "resend", label: "Resend" },
  { key: "sms", label: "Telnyx SMS" },
];

export type IntegrationRuntimeState = Pick<IntegrationResults, "providerRuntimeReadiness" | "providerRuntimeCheck">;

export function integrationRuntimeStatus(state: IntegrationRuntimeState, demo = false) {
  const fallback = demo ? "Offline demo"
    : state.providerRuntimeCheck?.status === "checking" ? "Checking..."
      : state.providerRuntimeCheck?.status === "error" ? "Check failed" : "Not checked";
  const usable = !demo && !state.providerRuntimeCheck && state.providerRuntimeReadiness;
  const providers = INTEGRATION_DEFINITIONS.map(({ key, label }) => {
    const matches = usable ? usable.providers.filter(provider => provider.key === key) : [];
    const runtime = matches.length === 1 ? matches[0] : null;
    const status = runtime?.status;
    const badge = status === "live" ? "Live enabled" : status === "partial_live" ? "Partly enabled"
      : status === "blocked" ? "Live blocked" : fallback;
    return { key, label, badge, runtime };
  });
  const groups = [["Live enabled", "enabled"], ["Partly enabled", "partial"], ["Live blocked", "blocked"], ["Not checked", "unchecked"]];
  const summary = usable ? groups.flatMap(([badge, label]) => {
    const count = providers.filter(provider => provider.badge === badge).length;
    return count ? [`${count} ${label}`] : [];
  }).join(", ") : fallback;
  return { summary, providers, checking: !demo && state.providerRuntimeCheck?.status === "checking" };
}
