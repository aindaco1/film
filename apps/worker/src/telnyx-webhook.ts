export const TELNYX_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

const TELNYX_EVENT_TYPES = ["message.received", "message.sent", "message.finalized"] as const;
const TELNYX_DELIVERY_STATUSES = [
  "queued",
  "sending",
  "sent",
  "delivered",
  "sending_failed",
  "delivery_failed",
  "delivery_unconfirmed",
] as const;
const TELNYX_AUTORESPONSE_TYPES = ["START", "STOP", "HELP"] as const;

type TelnyxEventType = typeof TELNYX_EVENT_TYPES[number];
type TelnyxDeliveryStatus = typeof TELNYX_DELIVERY_STATUSES[number];
type TelnyxAutoresponseType = typeof TELNYX_AUTORESPONSE_TYPES[number];

export type TelnyxMessagingWebhookEvent = {
  providerEventId: string;
  eventType: TelnyxEventType;
  occurredAt: string;
  messageId: string | null;
  direction: "inbound" | "outbound" | null;
  deliveryStatus: TelnyxDeliveryStatus | null;
  errorCodes: string[];
  autoresponseType: TelnyxAutoresponseType | null;
  parts: number | null;
};

export type TelnyxWebhookVerification =
  | { ok: true; timestamp: number }
  | {
    ok: false;
    error:
      | "telnyx_webhook_signature_headers_required"
      | "telnyx_webhook_timestamp_invalid"
      | "telnyx_webhook_timestamp_out_of_tolerance"
      | "telnyx_webhook_public_key_invalid"
      | "telnyx_webhook_signature_invalid";
    status: 400 | 401 | 503;
  };

export async function verifyTelnyxWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  publicKeyBase64: string,
  nowMs = Date.now(),
): Promise<TelnyxWebhookVerification> {
  const signatureValue = signatureHeader?.trim() ?? "";
  const timestampValue = timestampHeader?.trim() ?? "";
  if (!signatureValue || !timestampValue) {
    return { ok: false, error: "telnyx_webhook_signature_headers_required", status: 400 };
  }
  if (!/^\d{10}$/.test(timestampValue)) {
    return { ok: false, error: "telnyx_webhook_timestamp_invalid", status: 400 };
  }
  const timestamp = Number(timestampValue);
  const nowSeconds = Math.floor(nowMs / 1_000);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > TELNYX_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, error: "telnyx_webhook_timestamp_out_of_tolerance", status: 400 };
  }

  const publicKey = decodeBase64(publicKeyBase64.trim(), 32);
  if (!publicKey) {
    return { ok: false, error: "telnyx_webhook_public_key_invalid", status: 503 };
  }
  const signature = decodeBase64(signatureValue, 64);
  if (!signature) {
    return { ok: false, error: "telnyx_webhook_signature_invalid", status: 401 };
  }

  try {
    const verificationKey = await crypto.subtle.importKey(
      "raw",
      ownedArrayBuffer(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const signedPayload = new TextEncoder().encode(`${timestampValue}|${rawBody}`);
    const valid = await crypto.subtle.verify(
      { name: "Ed25519" },
      verificationKey,
      ownedArrayBuffer(signature),
      signedPayload,
    );
    return valid
      ? { ok: true, timestamp }
      : { ok: false, error: "telnyx_webhook_signature_invalid", status: 401 };
  } catch {
    return { ok: false, error: "telnyx_webhook_public_key_invalid", status: 503 };
  }
}

export function isValidTelnyxWebhookPublicKey(value: string): boolean {
  return Boolean(decodeBase64(value.trim(), 32));
}

export function normalizeTelnyxMessagingWebhookEvent(rawBody: string): TelnyxMessagingWebhookEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) return null;
  const data = parsed.data;
  const payload = isRecord(data.payload) ? data.payload : {};
  const providerEventId = boundedString(data.id, 128);
  const eventType = boundedString(data.event_type, 64);
  const occurredAt = boundedString(data.occurred_at, 64);
  if (
    !providerEventId
    || !TELNYX_EVENT_TYPES.includes(eventType as TelnyxEventType)
    || !occurredAt
    || Number.isNaN(Date.parse(occurredAt))
  ) {
    return null;
  }

  const messageId = boundedString(payload.id, 128);
  const directionValue = boundedString(payload.direction, 16);
  const direction = directionValue === "inbound" || directionValue === "outbound" ? directionValue : null;
  const to = Array.isArray(payload.to) && isRecord(payload.to[0]) ? payload.to[0] : null;
  const deliveryValue = boundedString(to?.status, 32);
  const deliveryStatus = TELNYX_DELIVERY_STATUSES.includes(deliveryValue as TelnyxDeliveryStatus)
    ? deliveryValue as TelnyxDeliveryStatus
    : null;
  const autoresponseValue = boundedString(payload.autoresponse_type, 16)?.toUpperCase() ?? null;
  const autoresponseType = TELNYX_AUTORESPONSE_TYPES.includes(autoresponseValue as TelnyxAutoresponseType)
    ? autoresponseValue as TelnyxAutoresponseType
    : null;
  const errorCodes = Array.isArray(payload.errors)
    ? payload.errors
      .flatMap((entry) => isRecord(entry) ? [boundedString(entry.code, 32)] : [])
      .filter((value): value is string => Boolean(value))
      .slice(0, 10)
    : [];
  const partsValue = typeof payload.parts === "number" ? payload.parts : null;
  const parts = partsValue !== null && Number.isInteger(partsValue) && partsValue >= 0 && partsValue <= 100
    ? partsValue
    : null;

  return {
    providerEventId,
    eventType: eventType as TelnyxEventType,
    occurredAt,
    messageId,
    direction,
    deliveryStatus,
    errorCodes,
    autoresponseType,
    parts,
  };
}

function decodeBase64(value: string, exactBytes: number): Uint8Array | null {
  if (!value || value.length > 512 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const binary = atob(value);
    if (binary.length !== exactBytes) return null;
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function ownedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}
