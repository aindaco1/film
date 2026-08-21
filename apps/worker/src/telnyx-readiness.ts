import { isValidTelnyxMessagingProfileId } from "./telnyx-send";

const TELNYX_API_ORIGIN = "https://api.telnyx.com";
const TELNYX_READINESS_MAX_RESPONSE_BYTES = 256 * 1024;

type Fetcher = typeof fetch;

type TelnyxReadinessConfiguration = {
  apiKey: string;
  messagingProfileId: string;
  campaignId: string;
  fromNumber: string;
  expectedProfileName: string;
  expectedWebhookUrl: string;
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
    mno: {
      approved: number;
      review: number;
      rejected: number;
      other: number;
      total: number;
    };
  };
  number: {
    reachable: boolean;
    smsCapable: boolean;
    profileAssigned: boolean;
    campaignAssigned: boolean;
    assignmentStatus: string | null;
  };
  blockers: string[];
  secretValuesExposed: false;
};

type TelnyxResponse = {
  ok: boolean;
  status: number;
  body: unknown;
};

export async function checkTelnyxProviderReadiness(
  configuration: TelnyxReadinessConfiguration,
  fetcher: Fetcher = fetch,
): Promise<TelnyxProviderReadiness> {
  const configurationBlockers = validateConfiguration(configuration);
  if (configurationBlockers.length > 0) {
    return emptyReadiness("blocked_configuration", configurationBlockers);
  }

  const headers = {
    accept: "application/json",
    authorization: `Bearer ${configuration.apiKey}`,
  };
  const profileId = encodeURIComponent(configuration.messagingProfileId);
  const campaignId = encodeURIComponent(configuration.campaignId);
  const number = encodeURIComponent(configuration.fromNumber);
  const [profileResponse, campaignResponse, mnoResponse, numberResponse, assignmentResponse] = await Promise.all([
    telnyxGet(fetcher, `${TELNYX_API_ORIGIN}/v2/messaging_profiles/${profileId}`, headers),
    telnyxGet(fetcher, `${TELNYX_API_ORIGIN}/v2/10dlc/campaign/${campaignId}`, headers),
    telnyxGet(fetcher, `${TELNYX_API_ORIGIN}/v2/10dlc/campaign/${campaignId}/operationStatus`, headers),
    telnyxGet(fetcher, `${TELNYX_API_ORIGIN}/v2/messaging_phone_numbers/${number}`, headers),
    telnyxGet(fetcher, `${TELNYX_API_ORIGIN}/v2/10dlc/phone_number_campaigns/${number}`, headers),
  ]);

  const profileBody = unwrapData(profileResponse.body);
  const campaignBody = unwrapData(campaignResponse.body);
  const numberBody = unwrapData(numberResponse.body);
  const assignmentBody = unwrapData(assignmentResponse.body);
  const campaignStatus = campaignStatusFrom(campaignBody);
  const assignmentStatus = boundedProviderStatus(valueAt(assignmentBody, "assignmentStatus"));
  const mno = summarizeMnoStatuses(mnoResponse.body);
  const profile = {
    reachable: profileResponse.ok && isRecord(profileBody),
    enabled: profileResponse.ok && valueAt(profileBody, "enabled") === true,
    nameMatches: profileResponse.ok
      && boundedString(valueAt(profileBody, "name"), 128) === configuration.expectedProfileName,
    webhookMatches: profileResponse.ok
      && normalizedUrl(valueAt(profileBody, "webhook_url")) === configuration.expectedWebhookUrl,
    webhookApiV2: profileResponse.ok && String(valueAt(profileBody, "webhook_api_version") ?? "") === "2",
  };
  const campaign = {
    reachable: campaignResponse.ok && isRecord(campaignBody),
    status: campaignStatus,
    active: campaignStatus === "ACTIVE",
    rejectedOrSuspended: isRejectedCampaignStatus(campaignStatus),
    mno,
  };
  const assignmentCampaignId = boundedString(
    valueAt(assignmentBody, "telnyxCampaignId") ?? valueAt(assignmentBody, "campaignId"),
    128,
  );
  const numberResult = {
    reachable: numberResponse.ok && isRecord(numberBody),
    smsCapable: hasSmsCapability(numberBody),
    profileAssigned: boundedString(valueAt(numberBody, "messaging_profile_id"), 128) === configuration.messagingProfileId,
    campaignAssigned: assignmentResponse.ok
      && assignmentStatus === "ASSIGNED"
      && assignmentCampaignId === configuration.campaignId,
    assignmentStatus,
  };
  const blockers = providerBlockers({
    profileResponse,
    campaignResponse,
    mnoResponse,
    numberResponse,
    assignmentResponse,
    profile,
    campaign,
    number: numberResult,
  });

  return {
    provider: "telnyx",
    mode: "read_only_provider_preflight",
    status: readinessStatus(profile, campaign, numberResult, blockers),
    providerApiChecked: true,
    profile,
    campaign,
    number: numberResult,
    blockers,
    secretValuesExposed: false,
  };
}

function validateConfiguration(configuration: TelnyxReadinessConfiguration): string[] {
  return [
    ...((configuration.apiKey.trim().length >= 16) ? [] : ["The Telnyx API key is not configured."]),
    ...(isValidTelnyxMessagingProfileId(configuration.messagingProfileId)
      ? []
      : ["The Telnyx messaging profile ID is not configured."]),
    ...(/^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/.test(configuration.campaignId)
      ? []
      : ["The Telnyx campaign ID is not configured."]),
    ...(/^\+[1-9][0-9]{7,14}$/.test(configuration.fromNumber)
      ? []
      : ["Exactly one Telnyx sender must map to the workspace."]),
    ...(configuration.expectedProfileName ? [] : ["The expected messaging profile name is not configured."]),
    ...(normalizedUrl(configuration.expectedWebhookUrl)
      ? []
      : ["The expected Telnyx webhook URL is not configured."]),
  ];
}

function providerBlockers(input: {
  profileResponse: TelnyxResponse;
  campaignResponse: TelnyxResponse;
  mnoResponse: TelnyxResponse;
  numberResponse: TelnyxResponse;
  assignmentResponse: TelnyxResponse;
  profile: TelnyxProviderReadiness["profile"];
  campaign: TelnyxProviderReadiness["campaign"];
  number: TelnyxProviderReadiness["number"];
}): string[] {
  const blockers: string[] = [];
  if (!input.profileResponse.ok) blockers.push(providerFailure("messaging profile", input.profileResponse));
  if (!input.campaignResponse.ok) blockers.push(providerFailure("campaign", input.campaignResponse));
  if (!input.mnoResponse.ok) blockers.push(providerFailure("carrier review", input.mnoResponse));
  if (!input.numberResponse.ok) blockers.push(providerFailure("messaging number", input.numberResponse));
  if (!input.assignmentResponse.ok && input.assignmentResponse.status !== 404) {
    blockers.push(providerFailure("number campaign assignment", input.assignmentResponse));
  }
  if (input.profile.reachable) {
    if (!input.profile.enabled) blockers.push("The Film messaging profile is disabled.");
    if (!input.profile.nameMatches) blockers.push("The configured messaging profile is not named Film.");
    if (!input.profile.webhookMatches) blockers.push("The Film messaging profile webhook does not target the Film Worker.");
    if (!input.profile.webhookApiV2) blockers.push("The Film messaging profile must use webhook API v2.");
  }
  if (input.number.reachable) {
    if (!input.number.smsCapable) blockers.push("The configured sender does not report SMS capability.");
    if (!input.number.profileAssigned) blockers.push("The configured sender is not assigned to the Film messaging profile.");
  }
  if (input.campaign.rejectedOrSuspended) blockers.push("The Telnyx campaign is rejected, suspended, expired, or failed.");
  if (input.campaign.mno.rejected > 0) blockers.push("At least one carrier has rejected the campaign.");
  return blockers.slice(0, 12);
}

function readinessStatus(
  profile: TelnyxProviderReadiness["profile"],
  campaign: TelnyxProviderReadiness["campaign"],
  number: TelnyxProviderReadiness["number"],
  blockers: string[],
): TelnyxProviderReadiness["status"] {
  if (!profile.reachable || !campaign.reachable || !number.reachable) return "blocked_provider";
  if (campaign.rejectedOrSuspended || campaign.mno.rejected > 0) return "blocked_provider";
  if (!profile.enabled || !profile.nameMatches || !profile.webhookMatches || !profile.webhookApiV2
    || !number.smsCapable || !number.profileAssigned) {
    return "blocked_configuration";
  }
  if (!campaign.active || campaign.mno.review > 0) return "pending_campaign_review";
  if (!number.campaignAssigned) {
    return number.assignmentStatus?.includes("PENDING")
      ? "pending_number_assignment"
      : "ready_for_number_assignment";
  }
  return blockers.length > 0 ? "blocked_provider" : "ready_for_owned_number_smoke";
}

async function telnyxGet(
  fetcher: Fetcher,
  url: string,
  headers: Record<string, string>,
): Promise<TelnyxResponse> {
  try {
    const response = await fetcher(url, { method: "GET", headers });
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > TELNYX_READINESS_MAX_RESPONSE_BYTES) {
      return { ok: false, status: 502, body: null };
    }
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        return { ok: false, status: 502, body: null };
      }
    }
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 503, body: null };
  }
}

function emptyReadiness(
  status: TelnyxProviderReadiness["status"],
  blockers: string[],
): TelnyxProviderReadiness {
  return {
    provider: "telnyx",
    mode: "read_only_provider_preflight",
    status,
    providerApiChecked: false,
    profile: { reachable: false, enabled: false, nameMatches: false, webhookMatches: false, webhookApiV2: false },
    campaign: {
      reachable: false,
      status: null,
      active: false,
      rejectedOrSuspended: false,
      mno: { approved: 0, review: 0, rejected: 0, other: 0, total: 0 },
    },
    number: {
      reachable: false,
      smsCapable: false,
      profileAssigned: false,
      campaignAssigned: false,
      assignmentStatus: null,
    },
    blockers,
    secretValuesExposed: false,
  };
}

function summarizeMnoStatuses(value: unknown): TelnyxProviderReadiness["campaign"]["mno"] {
  const body = unwrapData(value);
  if (!isRecord(body)) return { approved: 0, review: 0, rejected: 0, other: 0, total: 0 };
  const statuses = Object.values(body)
    .map((candidate) => boundedProviderStatus(candidate))
    .filter((candidate): candidate is string => Boolean(candidate))
    .slice(0, 20);
  let approved = 0;
  let review = 0;
  let rejected = 0;
  let other = 0;
  for (const status of statuses) {
    if (["APPROVED", "ACCEPTED", "ACTIVE", "REGISTERED", "SUCCESS"].includes(status)) approved += 1;
    else if (status.includes("REVIEW") || status.includes("PENDING") || status.includes("SUBMITTED")) review += 1;
    else if (isRejectedCampaignStatus(status)) rejected += 1;
    else other += 1;
  }
  return { approved, review, rejected, other, total: statuses.length };
}

function campaignStatusFrom(value: unknown): string | null {
  const statuses = [
    boundedProviderStatus(valueAt(value, "campaignStatus")),
    boundedProviderStatus(valueAt(value, "status")),
    boundedProviderStatus(valueAt(value, "submissionStatus")),
  ].filter((candidate): candidate is string => Boolean(candidate));
  return statuses.find((status) => status === "ACTIVE") ?? statuses[0] ?? null;
}

function isRejectedCampaignStatus(value: string | null): boolean {
  if (!value) return false;
  return ["REJECT", "SUSPEND", "EXPIRED", "FAILED", "DORMANT"].some((part) => value.includes(part));
}

function hasSmsCapability(value: unknown): boolean {
  const features = valueAt(value, "features");
  if (isRecord(features) && valueAt(features, "sms") !== null && valueAt(features, "sms") !== undefined) return true;
  const products = valueAt(value, "eligible_messaging_products");
  return Array.isArray(products) && products.some((product) => String(product).toUpperCase() === "A2P");
}

function providerFailure(resource: string, response: TelnyxResponse): string {
  if (response.status === 401 || response.status === 403) return `Telnyx denied access to the ${resource}.`;
  if (response.status === 404) return `Telnyx could not find the configured ${resource}.`;
  if (response.status === 429) return `Telnyx rate-limited the ${resource} check.`;
  return `The Telnyx ${resource} check is unavailable.`;
}

function unwrapData(value: unknown): unknown {
  return isRecord(value) && "data" in value ? value.data : value;
}

function valueAt(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function normalizedUrl(value: unknown): string | null {
  const raw = boundedString(value, 2_048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function boundedProviderStatus(value: unknown): string | null {
  const status = boundedString(value, 64);
  return status && /^[A-Za-z0-9 _-]+$/.test(status) ? status.trim().replaceAll(" ", "_").toUpperCase() : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
