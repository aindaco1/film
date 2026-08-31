import { afterEach, describe, expect, it, vi } from "vitest";
import { TELNYX_SMS_SENDER_PREFIX } from "@film/providers";
import { commitSmsConsent, revokeSmsConsent } from "../src/sms-consent";
import {
  estimateSmsSegments,
  formatFilmSmsMessage,
  isWithinQuietHours,
  parseTelnyxOutboundNumber,
  sendTelnyxSmsBatch,
} from "../src/telnyx-send";
import { base64Key, createSmsTestD1, seedSmsTestWorkspace } from "./sqlite-d1";

const cleanups: Array<() => void> = [];
const profileId = "4000eba1-a0c0-4563-9925-b25e842a7cb6";

afterEach(() => {
  vi.restoreAllMocks();
  while (cleanups.length) cleanups.pop()?.();
});

describe("Telnyx outbound SMS", () => {
  it("estimates GSM and Unicode segments and applies overnight quiet hours", () => {
    expect(estimateSmsSegments("A".repeat(160))).toBe(1);
    expect(estimateSmsSegments("A".repeat(161))).toBe(2);
    expect(estimateSmsSegments("{".repeat(81))).toBe(2);
    expect(estimateSmsSegments("🎬".repeat(36))).toBe(2);
    expect(isWithinQuietHours(new Date("2026-07-11T05:30:00.000Z"), "America/Denver", "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours(new Date("2026-07-10T18:00:00.000Z"), "America/Denver", "22:00", "07:00")).toBe(false);
  });

  it("normalizes the registered sender identity before delivery", () => {
    expect(formatFilmSmsMessage("Big Sword call sheet is ready."))
      .toBe("Film by Dust Wave: Big Sword call sheet is ready.");
    expect(formatFilmSmsMessage("film by dust wave: Schedule changed."))
      .toBe("Film by Dust Wave: Schedule changed.");
    expect(formatFilmSmsMessage("Film by Dust Wave:"))
      .toBe("");
  });

  it("derives exactly one workspace sender from the secret inbound mapping", () => {
    expect(parseTelnyxOutboundNumber('{"+15555550999":"workspace_acme"}', "workspace_acme"))
      .toBe("+15555550999");
    expect(parseTelnyxOutboundNumber('{"+15555550999":"workspace_acme","+15555550888":"workspace_acme"}', "workspace_acme"))
      .toBeNull();
    expect(parseTelnyxOutboundNumber("not-json", "workspace_acme")).toBeNull();
  });

  it("sends consented recipients once, stores no body, and replays without another provider call", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const encryptionKey = base64Key(17);
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme",
      memberId: "member_producer",
      recipientE164: "+15555550110",
      evidenceId: "consent-send-001",
      disclosureVersion: "crew-sms-v1",
      categories: ["call_sheet"],
      source: "operator",
      actorMemberId: "member_producer",
      encryptionKey,
      hashKey: base64Key(23),
      now: "2026-07-10T17:00:00.000Z",
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: { id: "40385f64-5717-4562-b3fc-2c963f66afa6" },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const input = {
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      recipientIds: [consent.recipient?.id ?? ""],
      category: "call_sheet" as const,
      messageBody: "Big Sword call sheet is ready. Reply STOP to opt out.",
      requestKey: "send_request_0001",
      emergencyOverride: false,
      emergencyReasonCode: null,
      actorMemberId: "member_producer",
    };
    const configuration = {
      apiKey: "test_telnyx_key_fixture_123456789",
      messagingProfileId: profileId,
      fromNumber: "+15555550999",
      recipientEncryptionKey: encryptionKey,
      quietHoursTimeZone: "America/Denver",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };

    const sent = await sendTelnyxSmsBatch(db, input, configuration, {
      fetcher,
      now: new Date("2026-07-10T18:00:00.000Z"),
    });
    const replayed = await sendTelnyxSmsBatch(db, input, configuration, {
      fetcher,
      now: new Date("2026-07-10T18:01:00.000Z"),
    });
    const attempt = await db.prepare(`
      SELECT status, provider_message_id, error_codes_json, segment_count
      FROM sms_delivery_attempts
    `).first<Record<string, unknown>>();
    const auditRows = await db.prepare("SELECT metadata_json FROM audit_events WHERE action LIKE 'provider.telnyx_sms_send_%'")
      .all<{ metadata_json: string }>();

    expect(sent).toMatchObject({ status: "sent", queuedCount: 1, failedCount: 0, replayedCount: 0 });
    expect(replayed).toMatchObject({ status: "replayed", replayedCount: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.telnyx.com/v2/messages");
    expect(String(fetcher.mock.calls[0]?.[1]?.headers)).not.toContain("15555550110");
    const providerRequest = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as { text: string };
    expect(providerRequest.text).toBe(`${TELNYX_SMS_SENDER_PREFIX} ${input.messageBody}`);
    expect(attempt).toMatchObject({
      status: "queued",
      provider_message_id: "40385f64-5717-4562-b3fc-2c963f66afa6",
      error_codes_json: "[]",
      segment_count: 1,
    });
    const persisted = JSON.stringify({ attempt, auditRows });
    expect(persisted).not.toContain(input.messageBody);
    expect(persisted).not.toContain("15555550110");
  });

  it("blocks quiet-hour, revoked-category, and provider failures without exposing provider detail", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const encryptionKey = base64Key(17);
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme",
      memberId: null,
      recipientE164: "+15555550111",
      evidenceId: "consent-send-002",
      disclosureVersion: "crew-sms-v1",
      categories: ["safety_location_alert"],
      source: "operator",
      actorMemberId: "member_producer",
      encryptionKey,
      hashKey: base64Key(23),
    });
    const recipientId = consent.recipient?.id ?? "";
    const configuration = {
      apiKey: "test_telnyx_key_fixture_123456789",
      messagingProfileId: profileId,
      fromNumber: "+15555550999",
      recipientEncryptionKey: encryptionKey,
      quietHoursTimeZone: "America/Denver",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };
    const baseInput = {
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      recipientIds: [recipientId],
      category: "safety_location_alert" as const,
      messageBody: "Leave the location now.",
      requestKey: "send_request_0002",
      emergencyOverride: false,
      emergencyReasonCode: null,
      actorMemberId: "member_producer",
    };
    const providerFailure = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      errors: [{ code: "40300", detail: "recipient detail must not escape" }],
    }), { status: 403 }));

    const quiet = await sendTelnyxSmsBatch(db, baseInput, configuration, {
      fetcher: providerFailure,
      now: new Date("2026-07-11T05:30:00.000Z"),
    });
    const failed = await sendTelnyxSmsBatch(db, {
      ...baseInput,
      emergencyOverride: true,
      emergencyReasonCode: "immediate_safety",
    }, configuration, {
      fetcher: providerFailure,
      now: new Date("2026-07-11T05:30:00.000Z"),
    });
    await revokeSmsConsent(db, {
      workspaceId: "workspace_acme",
      recipientId,
      evidenceId: "revoke-send-002",
      source: "operator",
      actorMemberId: "member_producer",
    });
    const revoked = await sendTelnyxSmsBatch(db, {
      ...baseInput,
      requestKey: "send_request_0003",
    }, configuration, {
      fetcher: providerFailure,
      now: new Date("2026-07-10T18:00:00.000Z"),
    });

    expect(quiet).toEqual({ error: "sms_quiet_hours_active", errorStatus: 409 });
    expect(failed).toMatchObject({ status: "blocked", failedCount: 1, secretValuesExposed: false });
    expect(JSON.stringify(failed)).not.toContain("recipient detail");
    expect(revoked).toEqual({ error: "sms_recipient_not_consented", errorStatus: 409 });
    expect(providerFailure).toHaveBeenCalledTimes(1);
  });
});
