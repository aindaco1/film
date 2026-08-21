import { describe, expect, it } from "vitest";
import {
  TELNYX_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
  isValidTelnyxWebhookPublicKey,
  normalizeTelnyxMessagingWebhookEvent,
  verifyTelnyxWebhookSignature,
} from "../src/telnyx-webhook";

describe("Telnyx webhook boundary", () => {
  it("validates only base64-encoded 32-byte public keys", () => {
    expect(isValidTelnyxWebhookPublicKey(bytesToBase64(new Uint8Array(32)))).toBe(true);
    expect(isValidTelnyxWebhookPublicKey(bytesToBase64(new Uint8Array(31)))).toBe(false);
    expect(isValidTelnyxWebhookPublicKey("not-base64")).toBe(false);
  });

  it("verifies the exact raw payload and rejects tampering", async () => {
    const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
    const publicKeyBase64 = bytesToBase64(publicKey);
    const nowMs = 1_783_690_000_000;
    const timestamp = String(Math.floor(nowMs / 1_000));
    const rawBody = '{"data":{"id":"event_123","event_type":"message.finalized"}}';
    const signature = new Uint8Array(await crypto.subtle.sign(
      { name: "Ed25519" },
      keyPair.privateKey,
      new TextEncoder().encode(`${timestamp}|${rawBody}`),
    ));
    const signatureBase64 = bytesToBase64(signature);

    await expect(verifyTelnyxWebhookSignature(
      rawBody,
      signatureBase64,
      timestamp,
      publicKeyBase64,
      nowMs,
    )).resolves.toEqual({ ok: true, timestamp: Number(timestamp) });
    await expect(verifyTelnyxWebhookSignature(
      `${rawBody} `,
      signatureBase64,
      timestamp,
      publicKeyBase64,
      nowMs,
    )).resolves.toMatchObject({ ok: false, error: "telnyx_webhook_signature_invalid", status: 401 });
  });

  it("rejects stale webhook timestamps before signature verification", async () => {
    const nowMs = 1_783_690_000_000;
    const stale = Math.floor(nowMs / 1_000) - TELNYX_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS - 1;
    await expect(verifyTelnyxWebhookSignature("{}", "invalid", String(stale), "invalid", nowMs)).resolves.toEqual({
      ok: false,
      error: "telnyx_webhook_timestamp_out_of_tolerance",
      status: 400,
    });
  });

  it("normalizes only bounded delivery metadata and drops phone and message content", () => {
    const event = normalizeTelnyxMessagingWebhookEvent(JSON.stringify({
      data: {
        id: "event_delivery_123",
        event_type: "message.finalized",
        occurred_at: "2026-07-10T12:00:00.000Z",
        payload: {
          id: "message_123",
          direction: "outbound",
          text: "Private call-sheet message",
          from: { phone_number: "+15555550100" },
          to: [{ phone_number: "+15555550101", status: "delivered" }],
          errors: [{ code: "40300", detail: "Private carrier detail" }],
          parts: 2,
        },
      },
    }));

    expect(event).toEqual({
      providerEventId: "event_delivery_123",
      eventType: "message.finalized",
      occurredAt: "2026-07-10T12:00:00.000Z",
      messageId: "message_123",
      direction: "outbound",
      deliveryStatus: "delivered",
      errorCodes: ["40300"],
      autoresponseType: null,
      parts: 2,
    });
    expect(JSON.stringify(event)).not.toContain("Private");
    expect(JSON.stringify(event)).not.toContain("+1555");
  });

  it("normalizes reserved opt-out metadata without retaining sender identity", () => {
    const event = normalizeTelnyxMessagingWebhookEvent(JSON.stringify({
      data: {
        id: "event_stop_123",
        event_type: "message.received",
        occurred_at: "2026-07-10T12:00:00.000Z",
        payload: {
          id: "message_stop_123",
          direction: "inbound",
          text: "STOP",
          autoresponse_type: "STOP",
          from: { phone_number: "+15555550102" },
        },
      },
    }));

    expect(event).toMatchObject({
      eventType: "message.received",
      direction: "inbound",
      autoresponseType: "STOP",
    });
    expect(JSON.stringify(event)).not.toContain("+1555");
  });
});

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
