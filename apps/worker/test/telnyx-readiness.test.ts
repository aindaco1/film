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
    expect(fetcher).toHaveBeenCalledTimes(5);
    const serialized = JSON.stringify(result);
    for (const privateValue of [
      configuration.apiKey,
      configuration.messagingProfileId,
      configuration.campaignId,
      configuration.fromNumber,
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

function telnyxFetcher(input: { campaignStatus: string; assignmentStatus: string | null }) {
  return vi.fn<typeof fetch>(async (request, init) => {
    const url = new URL(String(request));
    expect(init?.method).toBe("GET");
    expect((init?.headers as Record<string, string>).authorization).toBe(`Bearer ${configuration.apiKey}`);
    if (url.pathname.startsWith("/v2/messaging_profiles/")) {
      return json({ data: {
        name: "Film",
        enabled: true,
        webhook_url: configuration.expectedWebhookUrl,
        webhook_api_version: "2",
      } });
    }
    if (url.pathname.endsWith("/operationStatus")) {
      return json(input.campaignStatus === "ACTIVE"
        ? { "10017": "APPROVED", "10035": "APPROVED" }
        : { "10017": "APPROVED", "10035": "REVIEW" });
    }
    if (url.pathname.startsWith("/v2/10dlc/campaign/")) {
      return json({ campaignStatus: input.campaignStatus });
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
