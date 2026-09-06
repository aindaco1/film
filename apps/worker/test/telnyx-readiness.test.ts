import { describe, expect, it, vi } from "vitest";
import { checkTelnyxProviderReadiness } from "../src/telnyx-readiness";

const configuration = {
  apiKey: "test_telnyx_key_fixture_123456789",
  messagingProfileId: "4000eba1-a0c0-4563-9925-b25e842a7cb6",
  campaignId: "823d6b1a-6ed6-41a3-9c50-c8ff41b682ba",
  fromNumber: "+15055550199",
  expectedProfileName: "Film",
  expectedWebhookUrl: "https://api.film.dustwave.xyz/api/webhooks/telnyx/messaging",
};

const helpRule = { op: "help", country_code: "*", keywords: ["HELP"], resp_text: "Private response text only for the provider" };

describe("Telnyx provider readiness", () => {
  it("reports carrier review without exposing configured identifiers", async () => {
    const fetcher = telnyxFetcher({ campaignStatus: "PENDING MNO REVIEW", assignmentStatus: null });

    const result = await checkTelnyxProviderReadiness(configuration, fetcher);

    expect(result).toMatchObject({
      status: "pending_campaign_review",
      providerApiChecked: true,
      campaign: {
        status: "PENDING_MNO_REVIEW",
        active: false,
        mno: { approved: 1, review: 1, rejected: 0, total: 2 },
      },
      number: { smsCapable: true, profileAssigned: true, campaignAssigned: false },
      secretValuesExposed: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(6);
    const serialized = JSON.stringify(result);
    for (const privateValue of [
      configuration.apiKey,
      configuration.messagingProfileId,
      configuration.campaignId,
      configuration.fromNumber,
      "Private response text only for the provider",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("reports readiness for an owned-number smoke only after active assignment", async () => {
    const fetcher = telnyxFetcher({ campaignStatus: "ACTIVE", assignmentStatus: "ASSIGNED" });

    const result = await checkTelnyxProviderReadiness(configuration, fetcher);

    expect(result.status).toBe("ready_for_owned_number_smoke");
    expect(result.campaign).toMatchObject({ active: true, mno: { approved: 2, review: 0, rejected: 0 } });
    expect(result.number).toMatchObject({ campaignAssigned: true, assignmentStatus: "ASSIGNED" });
    expect(result.blockers).toEqual([]);
    expect(result.profile).toMatchObject({ helpSettingsReachable: true, helpResponseConfigured: true });
  });

  it.each([
    [],
    [{ ...helpRule, resp_text: "" }],
    [{ ...helpRule, resp_text: "short" }],
    [{ ...helpRule, op: "custom" }],
    [{ ...helpRule, op: "info", keywords: ["INFO"] }],
    [{ ...helpRule, country_code: "CA" }],
    [helpRule, { ...helpRule, country_code: "US", resp_text: "" }],
    [helpRule, helpRule],
  ].map((helpRules) => ({ helpRules })))("blocks a missing or ambiguous effective US HELP response: %j", async ({ helpRules }) => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus: "ACTIVE", assignmentStatus: "ASSIGNED", helpRules,
    }));
    expect(result.status).toBe("blocked_configuration");
    expect(result.profile).toMatchObject({ helpSettingsReachable: true, helpResponseConfigured: false });
    expect(result.blockers).toContain("Configure an automatic HELP response in the Film messaging profile's keyword settings.");
  });

  it("uses a valid US override even when the global response is absent", async () => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus: "ACTIVE", assignmentStatus: "ASSIGNED",
      helpRules: [{ ...helpRule, country_code: "US", keywords: ["help"] }],
    }));
    expect(result.status).toBe("ready_for_owned_number_smoke");
  });

  it("accepts the portal's REST info operation with the HELP trigger", async () => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus: "ACTIVE", assignmentStatus: "ASSIGNED",
      helpRules: [{ ...helpRule, op: "info" }],
    }));
    expect(result.status).toBe("ready_for_owned_number_smoke");
    expect(JSON.stringify(result)).not.toContain(helpRule.resp_text);
  });

  it.each([[], ["INFO"]].map((keywords) => ({ keywords })))("accepts reserved HELP without requiring it in additional keywords: %j", async ({ keywords }) => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus: "ACTIVE", assignmentStatus: "ASSIGNED",
      helpRules: [{ ...helpRule, keywords }],
    }));
    expect(result.status).toBe("ready_for_owned_number_smoke");
  });

  it.each([
    { data: [helpRule], meta: { total_pages: 2 } },
    { data: [helpRule] },
    { data: [null], meta: { total_pages: 1 } },
    { errors: [{ detail: "private provider detail" }] },
  ])("fails closed on incomplete or malformed keyword results: %j", async (helpBody) => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus: "ACTIVE", assignmentStatus: "ASSIGNED", helpBody,
    }));
    expect(result.status).toBe("blocked_provider");
    expect(result.profile.helpSettingsReachable).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });

  it("fails closed before any provider call when local configuration is incomplete", async () => {
    const fetcher = vi.fn<typeof fetch>();

    const result = await checkTelnyxProviderReadiness({
      ...configuration,
      apiKey: "",
      campaignId: "",
    }, fetcher);

    expect(result.status).toBe("blocked_configuration");
    expect(result.providerApiChecked).toBe(false);
    expect(result.blockers).toEqual([
      "The Telnyx API key is not configured.",
      "The Telnyx campaign ID is not configured.",
    ]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["MNO_REJECTED", "TCR_SUSPENDED", "MNO_PENDING", "TCR_ACCEPTED"])("does not let generic ACTIVE override %s", async (campaignStatus) => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus, assignmentStatus: "ASSIGNED", genericStatus: "ACTIVE",
      mno: { "10017": "APPROVED" },
    }));
    expect(result.campaign.active).toBe(false);
    expect(result.status).not.toBe("ready_for_owned_number_smoke");
  });

  it.each([{}, { "10017": "UNKNOWN" }, { "10017": "APPROVED", "10035": null }])("requires affirmative, understood carrier results: %j", async (mno) => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus: "ACTIVE", assignmentStatus: "ASSIGNED", mno,
    }));
    expect(result.status).toBe("pending_campaign_review");
  });

  it("accepts a provisioned campaign with an active registration and approved carriers", async () => {
    const result = await checkTelnyxProviderReadiness(configuration, telnyxFetcher({
      campaignStatus: "MNO_PROVISIONED", genericStatus: "ACTIVE", assignmentStatus: "ASSIGNED",
      mno: { "10017": "APPROVED", "10035": "APPROVED" },
    }));
    expect(result.status).toBe("ready_for_owned_number_smoke");
  });

  it("returns bounded provider errors without Telnyx response details", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      errors: [{ detail: "private provider detail" }],
    }), { status: 403 }));

    const result = await checkTelnyxProviderReadiness(configuration, fetcher);

    expect(result.status).toBe("blocked_provider");
    expect(result.blockers).toContain("Telnyx denied access to the messaging profile.");
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });
});

function telnyxFetcher(input: {
  campaignStatus: string; assignmentStatus: string | null; genericStatus?: string;
  mno?: Record<string, unknown>; helpRules?: unknown[]; helpBody?: unknown;
}) {
  return vi.fn<typeof fetch>(async (request, init) => {
    const url = new URL(String(request));
    expect(init?.method).toBe("GET");
    expect((init?.headers as Record<string, string>).authorization).toBe(`Bearer ${configuration.apiKey}`);
    if (url.pathname.endsWith("/autoresp_configs")) {
      return json(input.helpBody ?? { data: input.helpRules ?? [helpRule], meta: { total_pages: 1 } });
    }
    if (url.pathname.startsWith("/v2/messaging_profiles/")) {
      return json({ data: {
        name: "Film",
        enabled: true,
        webhook_url: configuration.expectedWebhookUrl,
        webhook_api_version: "2",
      } });
    }
    if (url.pathname.endsWith("/operationStatus")) {
      return json(input.mno ?? (input.campaignStatus === "ACTIVE"
        ? { "10017": "APPROVED", "10035": "APPROVED" }
        : { "10017": "APPROVED", "10035": "REVIEW" }));
    }
    if (url.pathname.startsWith("/v2/10dlc/campaign/")) {
      return json({ campaignStatus: input.campaignStatus, status: input.genericStatus });
    }
    if (url.pathname.startsWith("/v2/messaging_phone_numbers/")) {
      return json({ data: {
        messaging_profile_id: configuration.messagingProfileId,
        eligible_messaging_products: ["A2P"],
        features: { sms: { domestic_two_way: true } },
      } });
    }
    if (url.pathname.startsWith("/v2/10dlc/phone_number_campaigns/")) {
      return input.assignmentStatus
        ? json({
            telnyxCampaignId: configuration.campaignId,
            assignmentStatus: input.assignmentStatus,
          })
        : json({ errors: [{ code: "not_found" }] }, 404);
    }
    return json({ errors: [{ code: "unexpected_test_path" }] }, 500);
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
