import {
  TELNYX_SMS_PROGRAM_NAME,
  TELNYX_SMS_SENDER_PREFIX,
  type TelnyxSmsCategory,
} from "@film/providers";
import {
  decryptSmsRecipient,
  normalizeSmsRecipient,
  smsRecipientAdditionalData,
} from "./sms-identity";

export const TELNYX_LIVE_RECIPIENT_CAP = 10;
export const TELNYX_LIVE_SEGMENT_CAP = 60;
export const TELNYX_PER_MESSAGE_SEGMENT_CAP = 6;
export const TELNYX_MESSAGE_MAX_CHARS = 1_200;
export const TELNYX_API_ORIGIN = "https://api.telnyx.com";
export const FILM_SMS_SENDER_PREFIX = TELNYX_SMS_SENDER_PREFIX;

const EMERGENCY_REASON_CODES = ["immediate_safety", "location_emergency"] as const;
type EmergencyReasonCode = typeof EMERGENCY_REASON_CODES[number];

type SmsRecipientRow = {
  id: string;
  recipient_hash: string;
  recipient_ciphertext: string;
  status: string;
  categories_json: string;
  member_id: string | null;
  member_status: string | null;
};

type SmsAttemptRow = {
  id: string;
  status: string;
};

export type TelnyxSendConfiguration = {
  apiKey: string;
  messagingProfileId: string;
  fromNumber: string;
  recipientEncryptionKey: string;
  quietHoursTimeZone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export type TelnyxSendInput = {
  workspaceId: string;
  projectId: string;
  recipientIds: string[];
  category: TelnyxSmsCategory;
  messageBody: string;
  requestKey: string;
  emergencyOverride: boolean;
  emergencyReasonCode: EmergencyReasonCode | null;
  actorMemberId: string;
};

export type TelnyxSendResult = {
  status: "sent" | "partial" | "replayed" | "blocked";
  persistence: "d1_sms_delivery_attempts";
  recipientCount: number;
  segmentCountPerRecipient: number;
  totalSegmentCount: number;
  queuedCount: number;
  failedCount: number;
  replayedCount: number;
  emergencyOverrideApplied: boolean;
  attempts: Array<{ id: string; status: "queued" | "failed" | "replayed" }>;
  secretValuesExposed: false;
};

export type TelnyxSendError = {
  error: string;
  errorStatus: number;
};

export function parseTelnyxOutboundNumber(
  rawMappings: string,
  workspaceId: string,
): string | null {
  if (!rawMappings || !workspaceId) return null;
  try {
    const parsed = JSON.parse(rawMappings) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const matches = Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => value === workspaceId)
      .map(([number]) => normalizeSmsRecipient(number))
      .filter((number): number is string => Boolean(number));
    return matches.length === 1 ? matches[0] : null;
  } catch {
    return null;
  }
}

export function isValidTelnyxMessagingProfileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidQuietHoursConfiguration(timeZone: string, start: string, end: string): boolean {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start === end) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function isEmergencyReasonCode(value: string): value is EmergencyReasonCode {
  return EMERGENCY_REASON_CODES.includes(value as EmergencyReasonCode);
}

export function estimateSmsSegments(messageBody: string): number {
  if (!messageBody) return 0;
  const gsmUnits = gsm7Units(messageBody);
  if (gsmUnits !== null) return gsmUnits <= 160 ? 1 : Math.ceil(gsmUnits / 153);
  const unicodeUnits = messageBody.length;
  return unicodeUnits <= 70 ? 1 : Math.ceil(unicodeUnits / 67);
}

export function formatFilmSmsMessage(messageBody: string): string {
  const content = messageBody.trim().replace(new RegExp(`^${escapeRegExp(TELNYX_SMS_PROGRAM_NAME)}:\\s*`, "i"), "").trim();
  return content ? `${FILM_SMS_SENDER_PREFIX} ${content}` : "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isWithinQuietHours(
  date: Date,
  timeZone: string,
  start: string,
  end: string,
): boolean {
  if (!isValidQuietHoursConfiguration(timeZone, start, end)) throw new Error("invalid_sms_quiet_hours");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const current = hour * 60 + minute;
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return startMinutes < endMinutes
    ? current >= startMinutes && current < endMinutes
    : current >= startMinutes || current < endMinutes;
}

export async function sendTelnyxSmsBatch(
  db: D1Database,
  input: TelnyxSendInput,
  configuration: TelnyxSendConfiguration,
  options: { fetcher?: typeof fetch; now?: Date } = {},
): Promise<TelnyxSendResult | TelnyxSendError> {
  const validated = validateInput(input, configuration, options.now ?? new Date());
  if (validated) return validated;
  const messageBody = formatFilmSmsMessage(input.messageBody);

  const project = await db.prepare("SELECT id FROM projects WHERE id = ? AND workspace_id = ? LIMIT 1")
    .bind(input.projectId, input.workspaceId)
    .first<{ id: string }>();
  if (!project) return sendError("sms_project_not_found", 404);

  const placeholders = input.recipientIds.map(() => "?").join(", ");
  const recipientResult = await db.prepare(`
    SELECT
      recipient.id,
      recipient.recipient_hash,
      recipient.recipient_ciphertext,
      recipient.status,
      recipient.categories_json,
      recipient.member_id,
      member_status.status AS member_status
    FROM sms_recipients AS recipient
    LEFT JOIN workspace_member_statuses AS member_status
      ON member_status.workspace_id = recipient.workspace_id
      AND member_status.member_id = recipient.member_id
    WHERE recipient.workspace_id = ? AND recipient.id IN (${placeholders})
    ORDER BY recipient.id
  `).bind(input.workspaceId, ...input.recipientIds).all<SmsRecipientRow>();
  const recipients = recipientResult.results ?? [];
  if (recipients.length !== input.recipientIds.length) return sendError("sms_recipient_not_found", 404);
  if (recipients.some((recipient) => !isEligibleRecipient(recipient, input.category))) {
    return sendError("sms_recipient_not_consented", 409);
  }

  let decryptedRecipients: Array<SmsRecipientRow & { e164: string }>;
  try {
    decryptedRecipients = await Promise.all(recipients.map(async (recipient) => ({
      ...recipient,
      e164: await decryptSmsRecipient(
        recipient.recipient_ciphertext,
        configuration.recipientEncryptionKey,
        smsRecipientAdditionalData(input.workspaceId, recipient.id),
      ),
    })));
  } catch {
    return sendError("sms_recipient_decryption_failed", 503);
  }

  const segmentCount = estimateSmsSegments(messageBody);
  const now = (options.now ?? new Date()).toISOString();
  const attempts = await Promise.all(decryptedRecipients.map(async (recipient) => ({
    id: await deterministicAttemptId(input, recipient.id),
    recipient,
  })));
  const existing = await existingAttempts(db, attempts.map((attempt) => attempt.id));
  const newAttempts = attempts.filter((attempt) => !existing.has(attempt.id));

  if (newAttempts.length > 0) {
    const auditId = `audit_sms_send_${crypto.randomUUID()}`;
    try {
      await db.batch([
        ...newAttempts.map((attempt) => db.prepare(`
          INSERT INTO sms_delivery_attempts (
            id, workspace_id, project_id, sms_recipient_id, category, provider,
            status, recipient_hash, segment_count, error_codes_json,
            emergency_override, created_by_member_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'telnyx', 'queued', ?, ?, '[]', ?, ?, ?, ?)
        `).bind(
          attempt.id,
          input.workspaceId,
          input.projectId,
          attempt.recipient.id,
          input.category,
          attempt.recipient.recipient_hash,
          segmentCount,
          input.emergencyOverride ? 1 : 0,
          input.actorMemberId,
          now,
          now,
        )),
        db.prepare(`
          INSERT INTO audit_events (
            id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
          ) VALUES (?, ?, ?, ?, 'provider.telnyx_sms_send_started', ?, ?)
        `).bind(auditId, input.workspaceId, input.projectId, input.actorMemberId, JSON.stringify({
          category: input.category,
          recipientCount: newAttempts.length,
          segmentCountPerRecipient: segmentCount,
          totalSegmentCount: segmentCount * newAttempts.length,
          emergencyOverride: input.emergencyOverride,
          emergencyReasonCode: input.emergencyReasonCode,
          messageBodyStored: false,
          recipientValuesStoredInAudit: false,
        }), now),
      ]);
    } catch {
      const raced = await existingAttempts(db, attempts.map((attempt) => attempt.id));
      if (raced.size !== attempts.length) return sendError("sms_attempt_storage_unavailable", 503);
      return replayResult(attempts, segmentCount, input.emergencyOverride);
    }
  }

  if (newAttempts.length === 0) return replayResult(attempts, segmentCount, input.emergencyOverride);

  const fetcher = options.fetcher ?? fetch;
  const outcomes: Array<{ id: string; status: "queued" | "failed" }> = [];
  for (const attempt of newAttempts) {
    const provider = await sendOne(fetcher, configuration, attempt.recipient.e164, messageBody);
    const status = provider.ok ? "queued" : "failed";
    const errorCodes = provider.ok ? [] : [provider.errorCode];
    try {
      await db.prepare(`
        UPDATE sms_delivery_attempts
        SET status = ?, provider_message_id = ?, error_codes_json = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND status = 'queued'
      `).bind(
        status,
        provider.ok ? provider.messageId : null,
        JSON.stringify(errorCodes),
        new Date().toISOString(),
        attempt.id,
        input.workspaceId,
      ).run();
    } catch {
      outcomes.push({ id: attempt.id, status: provider.ok ? "queued" : "failed" });
      continue;
    }
    outcomes.push({ id: attempt.id, status });
  }

  const replayedAttempts = attempts
    .filter((attempt) => existing.has(attempt.id))
    .map((attempt) => ({ id: attempt.id, status: "replayed" as const }));
  const failedCount = outcomes.filter((outcome) => outcome.status === "failed").length;
  const queuedCount = outcomes.length - failedCount;
  await recordCompletionAudit(db, input, queuedCount, failedCount, replayedAttempts.length, now);
  return {
    status: failedCount === 0 ? "sent" : queuedCount === 0 ? "blocked" : "partial",
    persistence: "d1_sms_delivery_attempts",
    recipientCount: attempts.length,
    segmentCountPerRecipient: segmentCount,
    totalSegmentCount: segmentCount * attempts.length,
    queuedCount,
    failedCount,
    replayedCount: replayedAttempts.length,
    emergencyOverrideApplied: input.emergencyOverride,
    attempts: [...replayedAttempts, ...outcomes],
    secretValuesExposed: false,
  };
}

function validateInput(input: TelnyxSendInput, configuration: TelnyxSendConfiguration, now: Date): TelnyxSendError | null {
  const uniqueRecipients = new Set(input.recipientIds);
  const messageBody = formatFilmSmsMessage(input.messageBody);
  const segmentCount = estimateSmsSegments(messageBody);
  if (
    !/^workspace_[A-Za-z0-9_-]{1,120}$/.test(input.workspaceId)
    || !/^[A-Za-z][A-Za-z0-9_-]{1,127}$/.test(input.projectId)
    || input.recipientIds.length < 1
    || input.recipientIds.length > TELNYX_LIVE_RECIPIENT_CAP
    || uniqueRecipients.size !== input.recipientIds.length
    || input.recipientIds.some((id) => !/^sms_recipient_[a-f0-9]{32}$/.test(id))
    || !/^[A-Za-z0-9_-]{16,128}$/.test(input.requestKey)
    || !messageBody
    || messageBody.length > TELNYX_MESSAGE_MAX_CHARS
  ) return sendError("invalid_telnyx_sms_send_request", 400);
  if (
    !configuration.apiKey
    || configuration.apiKey.length < 16
    || !isValidTelnyxMessagingProfileId(configuration.messagingProfileId)
    || !normalizeSmsRecipient(configuration.fromNumber)
    || !isValidQuietHoursConfiguration(
      configuration.quietHoursTimeZone,
      configuration.quietHoursStart,
      configuration.quietHoursEnd,
    )
  ) return sendError("telnyx_sms_send_not_configured", 503);
  if (segmentCount < 1 || segmentCount > TELNYX_PER_MESSAGE_SEGMENT_CAP) {
    return sendError("telnyx_sms_segment_cap_exceeded", 422);
  }
  if (segmentCount * input.recipientIds.length > TELNYX_LIVE_SEGMENT_CAP) {
    return sendError("telnyx_sms_batch_segment_cap_exceeded", 422);
  }
  const overrideValid = input.emergencyOverride
    && input.category === "safety_location_alert"
    && input.emergencyReasonCode !== null
    && isEmergencyReasonCode(input.emergencyReasonCode);
  if (input.emergencyOverride && !overrideValid) return sendError("invalid_sms_emergency_override", 422);
  if (!input.emergencyOverride && input.emergencyReasonCode !== null) return sendError("invalid_sms_emergency_override", 422);
  if (isWithinQuietHours(
    now,
    configuration.quietHoursTimeZone,
    configuration.quietHoursStart,
    configuration.quietHoursEnd,
  ) && !overrideValid) return sendError("sms_quiet_hours_active", 409);
  return null;
}

function isEligibleRecipient(recipient: SmsRecipientRow, category: TelnyxSmsCategory): boolean {
  if (recipient.status !== "active") return false;
  if (recipient.member_id && recipient.member_status !== "active") return false;
  try {
    const categories = JSON.parse(recipient.categories_json) as unknown;
    return Array.isArray(categories) && categories.includes(category);
  } catch {
    return false;
  }
}

async function existingAttempts(db: D1Database, ids: string[]): Promise<Map<string, SmsAttemptRow>> {
  const placeholders = ids.map(() => "?").join(", ");
  const result = await db.prepare(`
    SELECT id, status FROM sms_delivery_attempts WHERE id IN (${placeholders})
  `).bind(...ids).all<SmsAttemptRow>();
  return new Map((result.results ?? []).map((row) => [row.id, row]));
}

async function deterministicAttemptId(input: TelnyxSendInput, recipientId: string): Promise<string> {
  const source = `${input.workspaceId}|${input.projectId}|${input.requestKey}|${recipientId}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sms_attempt_${hex.slice(0, 32)}`;
}

async function sendOne(
  fetcher: typeof fetch,
  configuration: TelnyxSendConfiguration,
  recipientE164: string,
  messageBody: string,
): Promise<{ ok: true; messageId: string } | { ok: false; errorCode: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(`${TELNYX_API_ORIGIN}/v2/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${configuration.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: configuration.fromNumber,
        to: recipientE164,
        text: messageBody,
        messaging_profile_id: configuration.messagingProfileId,
        use_profile_webhooks: true,
      }),
      signal: controller.signal,
    });
    const body = await readBoundedProviderJson(response);
    if (!response.ok) return { ok: false, errorCode: providerErrorCode(response.status, body) };
    const data = isRecord(body) && isRecord(body.data) ? body.data : null;
    const messageId = data && typeof data.id === "string" ? data.id.trim() : "";
    if (!isValidTelnyxMessagingProfileId(messageId)) return { ok: false, errorCode: "invalid_provider_response" };
    return { ok: true, messageId };
  } catch {
    return { ok: false, errorCode: "provider_request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function readBoundedProviderJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length > 64 * 1024) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function providerErrorCode(status: number, body: unknown): string {
  if (isRecord(body) && Array.isArray(body.errors)) {
    const code = body.errors
      .map((error) => isRecord(error) && typeof error.code === "string" ? error.code.trim() : "")
      .find((value) => /^[A-Za-z0-9_-]{1,32}$/.test(value));
    if (code) return code;
  }
  return `http_${status >= 400 && status <= 599 ? status : 500}`;
}

async function recordCompletionAudit(
  db: D1Database,
  input: TelnyxSendInput,
  queuedCount: number,
  failedCount: number,
  replayedCount: number,
  createdAt: string,
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO audit_events (
        id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, 'provider.telnyx_sms_send_completed', ?, ?)
    `).bind(
      `audit_sms_send_complete_${crypto.randomUUID()}`,
      input.workspaceId,
      input.projectId,
      input.actorMemberId,
      JSON.stringify({
        category: input.category,
        queuedCount,
        failedCount,
        replayedCount,
        messageBodyStored: false,
        recipientValuesStoredInAudit: false,
      }),
      createdAt,
    ).run();
  } catch {
    // Delivery attempt rows remain the authoritative reconciliation record.
  }
}

function replayResult(
  attempts: Array<{ id: string }>,
  segmentCount: number,
  emergencyOverride: boolean,
): TelnyxSendResult {
  return {
    status: "replayed",
    persistence: "d1_sms_delivery_attempts",
    recipientCount: attempts.length,
    segmentCountPerRecipient: segmentCount,
    totalSegmentCount: segmentCount * attempts.length,
    queuedCount: 0,
    failedCount: 0,
    replayedCount: attempts.length,
    emergencyOverrideApplied: emergencyOverride,
    attempts: attempts.map((attempt) => ({ id: attempt.id, status: "replayed" })),
    secretValuesExposed: false,
  };
}

function gsm7Units(value: string): number | null {
  const basic = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const extended = "^{}\\[~]|€";
  let units = 0;
  for (const character of value) {
    if (basic.includes(character)) units += 1;
    else if (extended.includes(character)) units += 2;
    else return null;
  }
  return units;
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function sendError(error: string, errorStatus: number): TelnyxSendError {
  return { error, errorStatus };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
