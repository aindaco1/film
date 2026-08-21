import { afterEach, describe, expect, it } from "vitest";
import { commitSmsConsent } from "../src/sms-consent";
import {
  applyTelnyxComplianceEvent,
  extractTelnyxInboundIdentity,
  parseTelnyxInboundNumberMappings,
} from "../src/telnyx-compliance";
import { normalizeTelnyxMessagingWebhookEvent } from "../src/telnyx-webhook";
import { base64Key, createSmsTestD1, seedSmsTestWorkspace } from "./sqlite-d1";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("Telnyx compliance processing", () => {
  it("extracts signed-path identities and validates destination mappings", () => {
    const raw = inboundBody("event_identity", "STOP");
    expect(extractTelnyxInboundIdentity(raw)).toEqual({
      senderE164: "+15555550100",
      destinationE164: "+15555550999",
    });
    expect(parseTelnyxInboundNumberMappings('{"+15555550999":"workspace_acme"}'))
      .toEqual(new Map([["+15555550999", "workspace_acme"]]));
    expect(parseTelnyxInboundNumberMappings('{"not-a-number":"workspace_acme"}')).toBeNull();
  });

  it("atomically applies STOP, suppresses attempts, and treats retries idempotently", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const hashKey = base64Key(23);
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme",
      memberId: null,
      recipientE164: "+15555550100",
      evidenceId: "consent-evidence-webhook-001",
      disclosureVersion: "crew-sms-v1",
      categories: ["call_sheet"],
      source: "operator",
      actorMemberId: "member_producer",
      encryptionKey: base64Key(17),
      hashKey,
      now: "2026-07-10T16:05:00.000Z",
    });
    const recipientId = consent.recipient?.id ?? "";
    await db.prepare(`
      INSERT INTO sms_delivery_attempts (
        id, workspace_id, project_id, sms_recipient_id, category, status,
        recipient_hash, segment_count, created_by_member_id, created_at, updated_at
      ) SELECT ?, workspace_id, ?, id, 'call_sheet', 'queued', recipient_hash, 1, ?, ?, ?
        FROM sms_recipients WHERE id = ?
    `).bind(
      "sms_attempt_webhook_001",
      "project_big_sword",
      "member_producer",
      "2026-07-10T16:05:10.000Z",
      "2026-07-10T16:05:10.000Z",
      recipientId,
    ).run();
    const rawBody = inboundBody("event_stop_001", "STOP");
    const event = normalizeTelnyxMessagingWebhookEvent(rawBody);
    expect(event).not.toBeNull();

    const applied = await applyTelnyxComplianceEvent({
      db,
      rawBody,
      event: event!,
      recipientHashKey: hashKey,
      inboundNumberMappings: '{"+15555550999":"workspace_acme"}',
      receivedAt: "2026-07-10T16:06:01.000Z",
    });
    const replayed = await applyTelnyxComplianceEvent({
      db,
      rawBody,
      event: event!,
      recipientHashKey: hashKey,
      inboundNumberMappings: '{"+15555550999":"workspace_acme"}',
      receivedAt: "2026-07-10T16:06:02.000Z",
    });
    const recipient = await db.prepare("SELECT status, categories_json FROM sms_recipients WHERE id = ?")
      .bind(recipientId)
      .first<{ status: string; categories_json: string }>();
    const attempt = await db.prepare("SELECT status, source_webhook_event_id FROM sms_delivery_attempts WHERE id = ?")
      .bind("sms_attempt_webhook_001")
      .first<{ status: string; source_webhook_event_id: string | null }>();
    const redactedRows = await db.prepare(`
      SELECT error_codes_json, metadata_json
      FROM telnyx_webhook_events
      JOIN audit_events ON audit_events.action = 'sms.telnyx_stop_applied'
    `).all<Record<string, unknown>>();

    expect(applied).toMatchObject({
      duplicate: false,
      autoresponseType: "STOP",
      recipientMatched: true,
      recipientRevoked: true,
      pendingAttemptsSuppressed: 1,
      secretValuesExposed: false,
    });
    expect(replayed).toMatchObject({ duplicate: true, recipientRevoked: false });
    expect(recipient).toEqual({ status: "revoked", categories_json: "[]" });
    expect(attempt).toEqual({ status: "suppressed", source_webhook_event_id: "event_stop_001" });
    expect(JSON.stringify(redactedRows.results)).not.toContain("15555550100");
    expect(JSON.stringify(redactedRows.results)).not.toContain("15555550999");
  });

  it("records START as evidence without reactivating consent and fails closed on unmapped numbers", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const hashKey = base64Key(23);
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme",
      memberId: null,
      recipientE164: "+15555550100",
      evidenceId: "consent-evidence-webhook-002",
      disclosureVersion: "crew-sms-v1",
      categories: ["call_sheet"],
      source: "operator",
      actorMemberId: "member_producer",
      encryptionKey: base64Key(17),
      hashKey,
    });
    await db.prepare("UPDATE sms_recipients SET status = 'revoked', categories_json = '[]' WHERE id = ?")
      .bind(consent.recipient?.id)
      .run();
    const startBody = inboundBody("event_start_001", "START");
    const startEvent = normalizeTelnyxMessagingWebhookEvent(startBody)!;
    const start = await applyTelnyxComplianceEvent({
      db,
      rawBody: startBody,
      event: startEvent,
      recipientHashKey: hashKey,
      inboundNumberMappings: '{"+15555550999":"workspace_acme"}',
    });
    const unmappedBody = inboundBody("event_stop_unmapped", "STOP", "+15555550888");
    const unmapped = await applyTelnyxComplianceEvent({
      db,
      rawBody: unmappedBody,
      event: normalizeTelnyxMessagingWebhookEvent(unmappedBody)!,
      recipientHashKey: hashKey,
      inboundNumberMappings: '{"+15555550999":"workspace_acme"}',
    });
    const recipient = await db.prepare("SELECT status FROM sms_recipients WHERE id = ?")
      .bind(consent.recipient?.id)
      .first<{ status: string }>();
    const startEvents = await db.prepare("SELECT COUNT(*) AS count FROM sms_consent_events WHERE event_type = 'opt_in_received'")
      .first<{ count: number }>();
    const unmappedEvents = await db.prepare("SELECT COUNT(*) AS count FROM telnyx_webhook_events WHERE provider_event_id = 'event_stop_unmapped'")
      .first<{ count: number }>();

    expect(start).toMatchObject({ recipientMatched: true, recipientRevoked: false, autoresponseType: "START" });
    expect(recipient?.status).toBe("revoked");
    expect(startEvents?.count).toBe(1);
    expect(unmapped).toMatchObject({ error: "telnyx_webhook_workspace_mapping_required", errorStatus: 503 });
    expect(unmappedEvents?.count).toBe(0);
  });

  it("atomically advances an outbound attempt from signed delivery events", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme",
      memberId: null,
      recipientE164: "+15555550112",
      evidenceId: "consent-evidence-webhook-003",
      disclosureVersion: "crew-sms-v1",
      categories: ["schedule_change"],
      source: "operator",
      actorMemberId: "member_producer",
      encryptionKey: base64Key(17),
      hashKey: base64Key(23),
    });
    const messageId = "40385f64-5717-4562-b3fc-2c963f66afa6";
    await db.prepare(`
      INSERT INTO sms_delivery_attempts (
        id, workspace_id, project_id, sms_recipient_id, category, status,
        recipient_hash, segment_count, provider_message_id, created_by_member_id,
        created_at, updated_at
      ) SELECT ?, workspace_id, ?, id, 'schedule_change', 'queued', recipient_hash, 1, ?, ?, ?, ?
        FROM sms_recipients WHERE id = ?
    `).bind(
      "sms_attempt_delivery_001",
      "project_big_sword",
      messageId,
      "member_producer",
      "2026-07-10T16:07:00.000Z",
      "2026-07-10T16:07:00.000Z",
      consent.recipient?.id,
    ).run();
    const rawBody = outboundBody("event_delivery_001", messageId, "delivered");
    const event = normalizeTelnyxMessagingWebhookEvent(rawBody)!;

    const applied = await applyTelnyxComplianceEvent({
      db,
      rawBody,
      event,
      recipientHashKey: base64Key(23),
      inboundNumberMappings: '{"+15555550999":"workspace_acme"}',
      receivedAt: "2026-07-10T16:08:01.000Z",
    });
    const attempt = await db.prepare(`
      SELECT status, source_webhook_event_id, error_codes_json
      FROM sms_delivery_attempts WHERE id = ?
    `).bind("sms_attempt_delivery_001").first<Record<string, unknown>>();
    const audit = await db.prepare(`
      SELECT metadata_json FROM audit_events WHERE action = 'provider.telnyx_delivery_updated'
    `).first<{ metadata_json: string }>();

    expect(applied).toMatchObject({ duplicate: false, eventType: "message.finalized", secretValuesExposed: false });
    expect(attempt).toEqual({
      status: "delivered",
      source_webhook_event_id: "event_delivery_001",
      error_codes_json: "[]",
    });
    expect(audit?.metadata_json).toContain('"deliveryStatus":"delivered"');
    expect(JSON.stringify({ attempt, audit })).not.toContain("15555550112");
  });
});

function inboundBody(eventId: string, autoresponseType: "START" | "STOP" | "HELP", destination = "+15555550999"): string {
  return JSON.stringify({
    data: {
      id: eventId,
      event_type: "message.received",
      occurred_at: "2026-07-10T16:06:00.000Z",
      payload: {
        id: `message_${eventId}`,
        direction: "inbound",
        autoresponse_type: autoresponseType,
        from: { phone_number: "+15555550100" },
        to: [{ phone_number: destination }],
        text: autoresponseType,
        parts: 1,
      },
    },
  });
}

function outboundBody(eventId: string, messageId: string, status: "sent" | "delivered" | "delivery_failed"): string {
  return JSON.stringify({
    data: {
      id: eventId,
      event_type: "message.finalized",
      occurred_at: "2026-07-10T16:08:00.000Z",
      payload: {
        id: messageId,
        direction: "outbound",
        from: { phone_number: "+15555550999" },
        to: [{ phone_number: "+15555550112", status }],
        text: "Private content not normalized or stored",
        parts: 1,
        errors: [],
      },
    },
  });
}
