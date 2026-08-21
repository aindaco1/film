import { hashSmsRecipient, normalizeSmsRecipient } from "./sms-identity";
import type { TelnyxMessagingWebhookEvent } from "./telnyx-webhook";

export const TELNYX_WEBHOOK_MAX_BYTES = 256 * 1024;

export type TelnyxInboundIdentity = {
  senderE164: string;
  destinationE164: string;
};

export type TelnyxComplianceResult = {
  persistence: "d1_telnyx_webhook" | "d1_unavailable_dry_run";
  duplicate: boolean;
  eventType: TelnyxMessagingWebhookEvent["eventType"];
  autoresponseType: TelnyxMessagingWebhookEvent["autoresponseType"];
  recipientMatched: boolean;
  recipientRevoked: boolean;
  pendingAttemptsSuppressed: number;
  secretValuesExposed: false;
  error?: string;
  errorStatus?: 400 | 503;
};

type TelnyxComplianceInput = {
  db: D1Database | undefined;
  rawBody: string;
  event: TelnyxMessagingWebhookEvent;
  recipientHashKey: string;
  inboundNumberMappings: string;
  receivedAt?: string;
};

type SmsRecipientLookupRow = {
  id: string;
  current_disclosure_version: string | null;
  categories_json: string;
};

export function extractTelnyxInboundIdentity(rawBody: string): TelnyxInboundIdentity | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.data) || !isRecord(parsed.data.payload)) return null;
    const payload = parsed.data.payload;
    const from = isRecord(payload.from) ? payload.from : null;
    const to = Array.isArray(payload.to) && isRecord(payload.to[0]) ? payload.to[0] : null;
    const senderE164 = normalizeSmsRecipient(typeof from?.phone_number === "string" ? from.phone_number : "");
    const destinationE164 = normalizeSmsRecipient(typeof to?.phone_number === "string" ? to.phone_number : "");
    return senderE164 && destinationE164 ? { senderE164, destinationE164 } : null;
  } catch {
    return null;
  }
}

export function parseTelnyxInboundNumberMappings(value: string): Map<string, string> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) return null;
    const mappings = new Map<string, string>();
    for (const [rawNumber, rawWorkspaceId] of Object.entries(parsed)) {
      const number = normalizeSmsRecipient(rawNumber);
      const workspaceId = typeof rawWorkspaceId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{1,119}$/.test(rawWorkspaceId.trim())
        ? rawWorkspaceId.trim()
        : null;
      if (!number || !workspaceId || mappings.has(number)) return null;
      mappings.set(number, workspaceId);
    }
    return mappings.size > 0 && mappings.size <= 20 ? mappings : null;
  } catch {
    return null;
  }
}

export async function applyTelnyxComplianceEvent(input: TelnyxComplianceInput): Promise<TelnyxComplianceResult> {
  const { db, event } = input;
  if (!db) return complianceError(event, "telnyx_webhook_storage_unavailable", 503);
  const receivedAt = normalizedTimestamp(input.receivedAt) ?? new Date().toISOString();
  const eventId = `telnyx_event_${(await sha256Hex(event.providerEventId)).slice(0, 32)}`;

  try {
    const existing = await db.prepare("SELECT id FROM telnyx_webhook_events WHERE provider_event_id = ? LIMIT 1")
      .bind(event.providerEventId)
      .first<{ id: string }>();
    if (existing) return complianceSuccess(event, true, false, false, 0);

    if (!event.autoresponseType) {
      const attempt = event.messageId && event.direction === "outbound"
        ? await db.prepare(`
            SELECT id, workspace_id, project_id
            FROM sms_delivery_attempts
            WHERE provider_message_id = ?
            ORDER BY created_at DESC
            LIMIT 1
          `).bind(event.messageId).first<{ id: string; workspace_id: string; project_id: string }>()
        : null;
      const eventInsert = db.prepare(`
        INSERT INTO telnyx_webhook_events (
          id, provider_event_id, event_type, occurred_at, message_id, direction,
          delivery_status, error_codes_json, autoresponse_type, recipient_hash,
          part_count, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
      `).bind(
        eventId,
        event.providerEventId,
        event.eventType,
        event.occurredAt,
        event.messageId,
        event.direction,
        event.deliveryStatus,
        JSON.stringify(event.errorCodes),
        event.parts,
        receivedAt,
      );
      if (!attempt) {
        const result = await eventInsert.run();
        if (!result.success || Number(result.meta?.changes ?? 0) !== 1) throw new Error("telnyx event insert failed");
        return complianceSuccess(event, false, false, false, 0);
      }
      const deliveryStatus = smsAttemptStatus(event.deliveryStatus);
      const results = await db.batch([
        eventInsert,
        db.prepare(`
          UPDATE sms_delivery_attempts
          SET status = ?, error_codes_json = ?, source_webhook_event_id = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND provider_message_id = ?
        `).bind(
          deliveryStatus,
          JSON.stringify(event.errorCodes),
          event.providerEventId,
          receivedAt,
          attempt.id,
          attempt.workspace_id,
          event.messageId,
        ),
        db.prepare(`
          INSERT INTO audit_events (
            id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
          ) VALUES (?, ?, ?, NULL, 'provider.telnyx_delivery_updated', ?, ?)
        `).bind(
          `audit_telnyx_delivery_${(await sha256Hex(event.providerEventId)).slice(0, 32)}`,
          attempt.workspace_id,
          attempt.project_id,
          JSON.stringify({
            deliveryStatus,
            providerErrorCodeCount: event.errorCodes.length,
            messageBodyStored: false,
            recipientValuesStoredInAudit: false,
          }),
          receivedAt,
        ),
      ]);
      if (results.some((result) => !result.success) || Number(results[0]?.meta?.changes ?? 0) !== 1) {
        throw new Error("telnyx delivery update failed");
      }
      return complianceSuccess(event, false, false, false, 0);
    }

    if (event.eventType !== "message.received" || event.direction !== "inbound") {
      return complianceError(event, "invalid_telnyx_autoresponse_event", 400);
    }
    const identity = extractTelnyxInboundIdentity(input.rawBody);
    const mappings = parseTelnyxInboundNumberMappings(input.inboundNumberMappings);
    const workspaceId = identity && mappings ? mappings.get(identity.destinationE164) : null;
    if (!identity || !mappings || !workspaceId) {
      return complianceError(event, "telnyx_webhook_workspace_mapping_required", 503);
    }
    const workspace = await db.prepare("SELECT id FROM workspaces WHERE id = ? LIMIT 1")
      .bind(workspaceId)
      .first<{ id: string }>();
    if (!workspace) return complianceError(event, "telnyx_webhook_workspace_mapping_required", 503);

    const recipientHash = await hashSmsRecipient(identity.senderE164, input.recipientHashKey, workspaceId);
    const recipient = await db.prepare(`
      SELECT id, current_disclosure_version, categories_json
      FROM sms_recipients
      WHERE workspace_id = ? AND recipient_hash = ?
      LIMIT 1
    `).bind(workspaceId, recipientHash).first<SmsRecipientLookupRow>();
    const eventInsert = db.prepare(`
      INSERT INTO telnyx_webhook_events (
        id, provider_event_id, event_type, occurred_at, message_id, direction,
        delivery_status, error_codes_json, autoresponse_type, recipient_hash,
        part_count, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      event.providerEventId,
      event.eventType,
      event.occurredAt,
      event.messageId,
      event.direction,
      event.deliveryStatus,
      JSON.stringify(event.errorCodes),
      event.autoresponseType,
      recipientHash,
      event.parts,
      receivedAt,
    );
    const auditAction = event.autoresponseType === "STOP"
      ? "sms.telnyx_stop_applied"
      : event.autoresponseType === "START"
        ? "sms.telnyx_start_received"
        : "sms.telnyx_help_received";
    const statements: D1PreparedStatement[] = [eventInsert];
    let recipientUpdateIndex = -1;
    let suppressionIndex = -1;
    if (recipient) {
      if (event.autoresponseType === "STOP") {
        recipientUpdateIndex = statements.length;
        statements.push(db.prepare(`
          UPDATE sms_recipients
          SET status = 'revoked', categories_json = '[]', revoked_at = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ?
        `).bind(event.occurredAt, receivedAt, recipient.id, workspaceId));
      }
      statements.push(db.prepare(`
        INSERT INTO sms_consent_events (
          id, workspace_id, sms_recipient_id, event_type, source,
          disclosure_version, categories_json, source_event_id,
          actor_member_id, occurred_at, created_at
        ) VALUES (?, ?, ?, ?, 'telnyx_webhook', ?, ?, ?, NULL, ?, ?)
      `).bind(
        `sms_consent_telnyx_${(await sha256Hex(event.providerEventId)).slice(0, 32)}`,
        workspaceId,
        recipient.id,
        event.autoresponseType === "STOP"
          ? "revoked"
          : event.autoresponseType === "START"
            ? "opt_in_received"
            : "help_requested",
        recipient.current_disclosure_version,
        recipient.categories_json,
        event.providerEventId,
        event.occurredAt,
        receivedAt,
      ));
      if (event.autoresponseType === "STOP") {
        suppressionIndex = statements.length;
        statements.push(db.prepare(`
          UPDATE sms_delivery_attempts
          SET status = 'suppressed', source_webhook_event_id = ?, updated_at = ?
          WHERE workspace_id = ? AND sms_recipient_id = ? AND status IN ('planned', 'queued')
        `).bind(event.providerEventId, receivedAt, workspaceId, recipient.id));
      }
    }
    statements.push(db.prepare(`
      INSERT INTO audit_events (
        id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
      ) VALUES (?, ?, NULL, NULL, ?, ?, ?)
    `).bind(
      `audit_telnyx_${(await sha256Hex(event.providerEventId)).slice(0, 32)}`,
      workspaceId,
      auditAction,
      JSON.stringify({
        recipientMatched: Boolean(recipient),
        recipientRevoked: Boolean(recipient && event.autoresponseType === "STOP"),
        eventType: event.eventType,
      }),
      receivedAt,
    ));
    const results = await db.batch(statements);
    if (results.length !== statements.length || results.some((result) => !result.success)) {
      throw new Error("telnyx compliance batch failed");
    }
    if (Number(results[0]?.meta?.changes ?? 0) !== 1 || Number(results.at(-1)?.meta?.changes ?? 0) !== 1) {
      throw new Error("telnyx event evidence missing");
    }
    const recipientRevoked = recipientUpdateIndex >= 0 && Number(results[recipientUpdateIndex]?.meta?.changes ?? 0) === 1;
    const pendingAttemptsSuppressed = suppressionIndex >= 0 ? Number(results[suppressionIndex]?.meta?.changes ?? 0) : 0;
    return complianceSuccess(event, false, Boolean(recipient), recipientRevoked, pendingAttemptsSuppressed);
  } catch {
    try {
      const existing = await db.prepare("SELECT id FROM telnyx_webhook_events WHERE provider_event_id = ? LIMIT 1")
        .bind(event.providerEventId)
        .first<{ id: string }>();
      if (existing) return complianceSuccess(event, true, false, false, 0);
    } catch {
      // Preserve the fail-closed storage result below.
    }
    return complianceError(event, "telnyx_webhook_storage_unavailable", 503);
  }
}

function complianceSuccess(
  event: TelnyxMessagingWebhookEvent,
  duplicate: boolean,
  recipientMatched: boolean,
  recipientRevoked: boolean,
  pendingAttemptsSuppressed: number,
): TelnyxComplianceResult {
  return {
    persistence: "d1_telnyx_webhook",
    duplicate,
    eventType: event.eventType,
    autoresponseType: event.autoresponseType,
    recipientMatched,
    recipientRevoked,
    pendingAttemptsSuppressed,
    secretValuesExposed: false,
  };
}

function smsAttemptStatus(status: TelnyxMessagingWebhookEvent["deliveryStatus"]): "queued" | "sent" | "delivered" | "failed" {
  if (status === "sent") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "sending_failed" || status === "delivery_failed" || status === "delivery_unconfirmed") return "failed";
  return "queued";
}

function complianceError(
  event: TelnyxMessagingWebhookEvent,
  error: string,
  errorStatus: 400 | 503,
): TelnyxComplianceResult {
  return {
    persistence: "d1_unavailable_dry_run",
    duplicate: false,
    eventType: event.eventType,
    autoresponseType: event.autoresponseType,
    recipientMatched: false,
    recipientRevoked: false,
    pendingAttemptsSuppressed: 0,
    secretValuesExposed: false,
    error,
    errorStatus,
  };
}

function normalizedTimestamp(value: string | undefined): string | null {
  const timestamp = value ?? new Date().toISOString();
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
