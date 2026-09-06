import { afterEach, describe, expect, it, vi } from "vitest";
import { commitSmsConsent, revokeSmsConsent } from "../src/sms-consent";
import { applyTelnyxComplianceEvent } from "../src/telnyx-compliance";
import { reconcileTelnyxDelivery } from "../src/telnyx-delivery";
import { sendTelnyxSmsBatch, type TelnyxSendInput } from "../src/telnyx-send";
import { normalizeTelnyxMessagingWebhookEvent } from "../src/telnyx-webhook";
import { base64Key, createSmsTestD1, seedSmsTestWorkspace } from "./sqlite-d1";

const cleanups: Array<() => void> = [];
const messageId = "40385f64-5717-4562-b3fc-2c963f66afa6";
const now = new Date("2026-07-10T18:00:00.000Z");
const configuration = {
  apiKey: "test_telnyx_key_fixture_123456789",
  messagingProfileId: "4000eba1-a0c0-4563-9925-b25e842a7cb6",
  fromNumber: "+15555550999",
  recipientEncryptionKey: base64Key(17),
  quietHoursTimeZone: "America/Denver",
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

afterEach(() => {
  vi.restoreAllMocks();
  while (cleanups.length) cleanups.pop()?.();
});

async function setup(count = 1) {
  const { db, close } = createSmsTestD1();
  cleanups.push(close);
  await seedSmsTestWorkspace(db);
  const recipientIds: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme", memberId: "member_producer",
      recipientE164: `+1555555011${index}`, evidenceId: `consent-lifecycle-${index}`,
      disclosureVersion: "crew-sms-v1", categories: ["call_sheet"], source: "operator",
      actorMemberId: "member_producer", encryptionKey: configuration.recipientEncryptionKey,
      hashKey: base64Key(23), now: now.toISOString(),
    });
    expect(consent.recipient?.id).toBeTruthy();
    recipientIds.push(consent.recipient!.id);
  }
  const input: TelnyxSendInput = {
    workspaceId: "workspace_acme", projectId: "project_big_sword", recipientIds,
    category: "call_sheet", messageBody: "Private fixture: call sheet ready. Reply STOP to opt out.",
    requestKey: "send_lifecycle_0001", emergencyOverride: false, emergencyReasonCode: null,
    actorMemberId: "member_producer",
  };
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ data: { id: messageId } })));
  return { db, input, fetcher };
}

async function callback(db: D1Database, eventId: string, status: string, occurredAt = "2026-07-10T18:01:00.000Z") {
  const rawBody = JSON.stringify({ data: {
    id: eventId, event_type: status === "sent" ? "message.sent" : "message.finalized",
    occurred_at: occurredAt,
    payload: { id: messageId, direction: "outbound", to: [{ status }], errors: [], parts: 1 },
  } });
  return applyTelnyxComplianceEvent({
    db, rawBody, event: normalizeTelnyxMessagingWebhookEvent(rawBody)!,
    recipientHashKey: base64Key(23), inboundNumberMappings: '{"+15555550999":"workspace_acme"}',
  });
}

function attempt(db: D1Database) {
  return db.prepare("SELECT status, source_webhook_event_id, provider_message_id FROM sms_delivery_attempts ORDER BY id")
    .first<{ status: string; source_webhook_event_id: string | null; provider_message_id: string | null }>();
}

describe("Telnyx live lifecycle", () => {
  it("reconciles a delivery callback arriving before the provider send response", async () => {
    const { db, input, fetcher } = await setup();
    fetcher.mockImplementationOnce(async () => {
      expect(await callback(db, "early_delivery", "delivered")).not.toHaveProperty("error");
      expect((await attempt(db))?.provider_message_id).toBeNull();
      return new Response(JSON.stringify({ data: { id: messageId } }));
    });
    await sendTelnyxSmsBatch(db, input, configuration, { fetcher, now });
    expect(await attempt(db)).toMatchObject({ status: "delivered", source_webhook_event_id: "early_delivery", provider_message_id: messageId });
    expect(await callback(db, "early_delivery", "delivered")).toMatchObject({ duplicate: true });
    const audit = await db.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action = 'provider.telnyx_delivery_updated'")
      .first<{ count: number }>();
    expect(audit?.count).toBe(1);
  });

  it.each(["delivered", "delivery_failed"])("does not downgrade %s when transit callbacks arrive late", async (terminal) => {
    const { db, input, fetcher } = await setup();
    await sendTelnyxSmsBatch(db, input, configuration, { fetcher, now });
    await callback(db, "terminal_delivery", terminal);
    await callback(db, "old_sent", "sent", "2026-07-10T18:00:30.000Z");
    await callback(db, "late_sent", "sent", "2026-07-10T18:02:00.000Z");
    await callback(db, "unknown_status", "unrecognized");
    expect(await attempt(db)).toMatchObject({ status: terminal === "delivered" ? "delivered" : "failed", source_webhook_event_id: "terminal_delivery" });
  });

  it("orders terminal corrections by provider timestamp, not callback arrival", async () => {
    const { db, input, fetcher } = await setup();
    await sendTelnyxSmsBatch(db, input, configuration, { fetcher, now });
    await callback(db, "new_delivery", "delivered", "2026-07-10T18:02:00.000Z");
    await callback(db, "old_failure", "delivery_unconfirmed", "2026-07-10T18:01:00.000Z");
    expect(await attempt(db)).toMatchObject({ status: "delivered", source_webhook_event_id: "new_delivery" });
  });

  it.each(["revocation", "membership", "STOP"])("blocks remaining recipients after mid-batch %s", async (change) => {
    const { db, input, fetcher } = await setup(2);
    fetcher.mockImplementationOnce(async () => {
      if (change === "revocation") {
        for (const recipientId of input.recipientIds) await revokeSmsConsent(db, {
          workspaceId: input.workspaceId, recipientId, evidenceId: `revoke-${recipientId}`,
          source: "operator", actorMemberId: input.actorMemberId,
        });
      } else if (change === "membership") {
        await db.prepare("UPDATE workspace_member_statuses SET status = 'disabled'").run();
      } else {
        for (let index = 0; index < 2; index += 1) {
          const rawBody = JSON.stringify({ data: {
            id: `stop_during_send_${index}`, event_type: "message.received", occurred_at: now.toISOString(),
            payload: { id: `inbound_stop_${index}`, direction: "inbound", autoresponse_type: "STOP",
              from: { phone_number: `+1555555011${index}` }, to: [{ phone_number: configuration.fromNumber }], text: "STOP" },
          } });
          expect(await applyTelnyxComplianceEvent({ db, rawBody,
            event: normalizeTelnyxMessagingWebhookEvent(rawBody)!, recipientHashKey: base64Key(23),
            inboundNumberMappings: '{"+15555550999":"workspace_acme"}',
          })).toMatchObject({ recipientRevoked: true });
        }
      }
      return new Response(JSON.stringify({ data: { id: messageId } }));
    });
    expect(await sendTelnyxSmsBatch(db, input, configuration, { fetcher, now }))
      .toMatchObject({ status: "partial", queuedCount: 1, suppressedCount: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    if (change === "STOP") {
      await callback(db, "delivery_after_stop", "delivered");
      const rows = await db.prepare("SELECT status, provider_message_id FROM sms_delivery_attempts").all();
      expect(rows.results.every((row) => row.status === "suppressed")).toBe(true);
      expect(rows.results.filter((row) => row.provider_message_id === messageId)).toHaveLength(1);
    }
  });

  it("fails closed if consent cannot be rechecked immediately before dispatch", async () => {
    const { db, input, fetcher } = await setup();
    const prepare = db.prepare.bind(db);
    let reads = 0;
    vi.spyOn(db, "prepare").mockImplementation((sql) => {
      if (sql.includes("FROM sms_recipients AS recipient") && ++reads > 1) throw new Error("storage unavailable");
      return prepare(sql);
    });
    expect(await sendTelnyxSmsBatch(db, input, configuration, { fetcher, now }))
      .toMatchObject({ status: "blocked", queuedCount: 0, failedCount: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("retries reconciliation after persistence failure instead of acknowledging lost delivery state", async () => {
    const { db, input, fetcher } = await setup();
    await sendTelnyxSmsBatch(db, input, configuration, { fetcher, now });
    const batch = vi.spyOn(db, "batch").mockRejectedValue(new Error("D1 temporarily unavailable"));
    expect(await callback(db, "retry_delivery", "delivered"))
      .toMatchObject({ errorStatus: 503 });
    batch.mockRestore();
    expect(await callback(db, "retry_delivery", "delivered")).toMatchObject({ duplicate: true });
    await reconcileTelnyxDelivery(db, messageId);
    expect(await attempt(db)).toMatchObject({ status: "delivered", source_webhook_event_id: "retry_delivery" });
  });
});
