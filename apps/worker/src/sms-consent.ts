import {
  TELNYX_SMS_CATEGORIES,
  type TelnyxSmsCategory,
} from "@film/providers";
import {
  SMS_RECIPIENT_KEY_VERSION,
  encryptSmsRecipient,
  hashSmsRecipient,
  hasValidSmsRecipientEncryptionKey,
  hasValidSmsRecipientHashKey,
  normalizeSmsRecipient,
  smsRecipientAdditionalData,
} from "./sms-identity";

export const SMS_CONSENT_CATEGORIES = TELNYX_SMS_CATEGORIES;
export const SMS_CONSENT_MANIFEST_MAX_ROWS = 100;

export type SmsConsentCategory = TelnyxSmsCategory;
export type SmsConsentSource = "workspace_form" | "operator";
export type SmsConsentRecipient = {
  id: string;
  memberId: string | null;
  status: "active" | "revoked";
  disclosureVersion: string | null;
  categories: SmsConsentCategory[];
  consentedAt: string | null;
  revokedAt: string | null;
  updatedAt: string;
};
export type SmsConsentManifestResult = {
  persistence: "d1_sms_compliance" | "d1_unavailable_dry_run";
  recipients: SmsConsentRecipient[];
  count: number;
  truncated: boolean;
  secretValuesExposed: false;
};

type SmsConsentKeys = {
  encryptionKey: string;
  hashKey: string;
};

type SmsConsentCommitInput = SmsConsentKeys & {
  workspaceId: string;
  memberId: string | null;
  recipientE164: string;
  evidenceId: string;
  disclosureVersion: string;
  categories: string[];
  source: SmsConsentSource;
  actorMemberId: string;
  now?: string;
};

type SmsConsentRevokeInput = {
  workspaceId: string;
  recipientId: string;
  evidenceId: string;
  source: "operator";
  actorMemberId: string;
  now?: string;
};

export type SmsConsentMutationResult = {
  persistence: "d1_sms_compliance" | "d1_unavailable_dry_run";
  auditPersistence: "d1_audit_events" | "d1_unavailable_dry_run";
  destructiveWrite: boolean;
  idempotent: boolean;
  recipient: SmsConsentRecipient | null;
  eventType: "consented" | "revoked";
  pendingAttemptsSuppressed: number;
  error?: string;
  errorStatus?: 400 | 404 | 409 | 422 | 503;
};

type SmsRecipientRow = {
  id: string;
  workspace_id: string;
  member_id: string | null;
  status: "active" | "revoked";
  current_disclosure_version: string | null;
  categories_json: string;
  consented_at: string | null;
  revoked_at: string | null;
  updated_at: string;
};

type SmsConsentEventRow = {
  sms_recipient_id: string;
  event_type: "consented" | "revoked" | "opt_in_received" | "help_requested";
  source: "workspace_form" | "telnyx_webhook" | "operator";
  disclosure_version: string | null;
  categories_json: string;
};

export async function commitSmsConsent(
  db: D1Database | undefined,
  input: SmsConsentCommitInput,
): Promise<SmsConsentMutationResult> {
  const normalized = normalizeSmsConsentInput(input);
  if (!normalized) return mutationError("invalid_sms_consent_request", 400, "consented");
  if (!db || !hasValidSmsRecipientEncryptionKey(input.encryptionKey) || !hasValidSmsRecipientHashKey(input.hashKey)) {
    return mutationError("sms_consent_storage_unavailable", 503, "consented");
  }

  try {
    const workspace = await db.prepare("SELECT id FROM workspaces WHERE id = ? LIMIT 1")
      .bind(normalized.workspaceId)
      .first<{ id: string }>();
    if (!workspace) return mutationError("sms_consent_workspace_required", 422, "consented", "d1_sms_compliance");
    if (normalized.memberId) {
      const member = await db.prepare(`
        SELECT wm.id
        FROM workspace_members wm
        LEFT JOIN workspace_member_statuses wms
          ON wms.member_id = wm.id AND wms.workspace_id = wm.workspace_id
        WHERE wm.id = ? AND wm.workspace_id = ? AND COALESCE(wms.status, 'active') = 'active'
        LIMIT 1
      `).bind(normalized.memberId, normalized.workspaceId).first<{ id: string }>();
      if (!member) return mutationError("sms_consent_active_member_required", 422, "consented", "d1_sms_compliance");
    }

    const recipientHash = await hashSmsRecipient(normalized.recipientE164, input.hashKey, normalized.workspaceId);
    const recipientId = `sms_recipient_${recipientHash.slice(0, 32)}`;
    const duplicate = await readConsentEvidence(db, normalized.evidenceId);
    if (duplicate) {
      const exact = duplicate.sms_recipient_id === recipientId
        && duplicate.event_type === "consented"
        && duplicate.source === normalized.source
        && duplicate.disclosure_version === normalized.disclosureVersion
        && sameCategories(duplicate.categories_json, normalized.categories);
      if (!exact) return mutationError("sms_consent_evidence_conflict", 409, "consented", "d1_sms_compliance");
      const recipient = await readSmsRecipient(db, normalized.workspaceId, recipientId);
      return mutationSuccess(recipient, "consented", false, true, 0);
    }

    const ciphertext = await encryptSmsRecipient(
      normalized.recipientE164,
      input.encryptionKey,
      smsRecipientAdditionalData(normalized.workspaceId, recipientId),
    );
    const now = normalized.now;
    const categoriesJson = JSON.stringify(normalized.categories);
    const eventId = `sms_consent_${crypto.randomUUID()}`;
    const auditId = `audit_sms_consent_${crypto.randomUUID()}`;
    const results = await db.batch([
      db.prepare(`
        INSERT INTO sms_recipients (
          id, workspace_id, member_id, recipient_hash, recipient_ciphertext,
          encryption_key_version, status, current_disclosure_version,
          categories_json, consent_source, consented_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, NULL, ?, ?)
        ON CONFLICT(workspace_id, recipient_hash) DO UPDATE SET
          member_id = COALESCE(excluded.member_id, sms_recipients.member_id),
          recipient_ciphertext = excluded.recipient_ciphertext,
          encryption_key_version = excluded.encryption_key_version,
          status = 'active',
          current_disclosure_version = excluded.current_disclosure_version,
          categories_json = excluded.categories_json,
          consent_source = excluded.consent_source,
          consented_at = excluded.consented_at,
          revoked_at = NULL,
          updated_at = excluded.updated_at
      `).bind(
        recipientId,
        normalized.workspaceId,
        normalized.memberId,
        recipientHash,
        ciphertext,
        SMS_RECIPIENT_KEY_VERSION,
        normalized.disclosureVersion,
        categoriesJson,
        normalized.source,
        now,
        now,
        now,
      ),
      db.prepare(`
        INSERT INTO sms_consent_events (
          id, workspace_id, sms_recipient_id, event_type, source,
          disclosure_version, categories_json, source_event_id,
          actor_member_id, occurred_at, created_at
        ) VALUES (?, ?, ?, 'consented', ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        eventId,
        normalized.workspaceId,
        recipientId,
        normalized.source,
        normalized.disclosureVersion,
        categoriesJson,
        normalized.evidenceId,
        normalized.actorMemberId,
        now,
        now,
      ),
      db.prepare(`
        INSERT INTO audit_events (
          id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
        ) VALUES (?, ?, NULL, ?, 'sms.consent_recorded', ?, ?)
      `).bind(auditId, normalized.workspaceId, normalized.actorMemberId, JSON.stringify({
        categoryCount: normalized.categories.length,
        disclosureVersion: normalized.disclosureVersion,
        memberLinked: Boolean(normalized.memberId),
        source: normalized.source,
      }), now),
    ]);
    if (!batchAppliedExactly(results, [1, 1, 1])) throw new Error("sms consent batch failed");
    const recipient = await readSmsRecipient(db, normalized.workspaceId, recipientId);
    if (!recipient) throw new Error("sms consent recipient missing");
    return mutationSuccess(recipient, "consented", true, false, 0);
  } catch {
    const duplicate = await safeReadConsentEvidence(db, normalized.evidenceId);
    if (duplicate?.event_type === "consented") {
      const recipient = await safeReadSmsRecipient(db, normalized.workspaceId, duplicate.sms_recipient_id);
      return mutationSuccess(recipient, "consented", false, true, 0);
    }
    return mutationError("sms_consent_storage_unavailable", 503, "consented");
  }
}

export async function revokeSmsConsent(
  db: D1Database | undefined,
  input: SmsConsentRevokeInput,
): Promise<SmsConsentMutationResult> {
  const normalized = normalizeSmsRevocationInput(input);
  if (!normalized) return mutationError("invalid_sms_revocation_request", 400, "revoked");
  if (!db) return mutationError("sms_consent_storage_unavailable", 503, "revoked");

  try {
    const recipient = await readSmsRecipient(db, normalized.workspaceId, normalized.recipientId);
    if (!recipient) return mutationError("sms_consent_recipient_not_found", 404, "revoked", "d1_sms_compliance");
    const duplicate = await readConsentEvidence(db, normalized.evidenceId);
    if (duplicate) {
      const exact = duplicate.sms_recipient_id === normalized.recipientId
        && duplicate.event_type === "revoked"
        && duplicate.source === normalized.source;
      if (!exact) return mutationError("sms_consent_evidence_conflict", 409, "revoked", "d1_sms_compliance");
      return mutationSuccess(recipient, "revoked", false, true, 0);
    }

    const now = normalized.now;
    const categoriesJson = JSON.stringify(recipient.categories);
    const results = await db.batch([
      db.prepare(`
        UPDATE sms_recipients
        SET status = 'revoked', categories_json = '[]', revoked_at = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).bind(now, now, normalized.recipientId, normalized.workspaceId),
      db.prepare(`
        INSERT INTO sms_consent_events (
          id, workspace_id, sms_recipient_id, event_type, source,
          disclosure_version, categories_json, source_event_id,
          actor_member_id, occurred_at, created_at
        ) VALUES (?, ?, ?, 'revoked', ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `sms_consent_${crypto.randomUUID()}`,
        normalized.workspaceId,
        normalized.recipientId,
        normalized.source,
        recipient.disclosureVersion,
        categoriesJson,
        normalized.evidenceId,
        normalized.actorMemberId,
        now,
        now,
      ),
      db.prepare(`
        UPDATE sms_delivery_attempts
        SET status = 'suppressed', updated_at = ?
        WHERE workspace_id = ? AND sms_recipient_id = ? AND status IN ('planned', 'queued')
      `).bind(now, normalized.workspaceId, normalized.recipientId),
      db.prepare(`
        INSERT INTO audit_events (
          id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
        ) VALUES (?, ?, NULL, ?, 'sms.consent_revoked', ?, ?)
      `).bind(
        `audit_sms_revoke_${crypto.randomUUID()}`,
        normalized.workspaceId,
        normalized.actorMemberId,
        JSON.stringify({ categoryCount: recipient.categories.length, source: normalized.source }),
        now,
      ),
    ]);
    if (!batchAppliedAtLeast(results, [1, 1, 0, 1])) throw new Error("sms revocation batch failed");
    const updated = await readSmsRecipient(db, normalized.workspaceId, normalized.recipientId);
    if (!updated) throw new Error("sms revoked recipient missing");
    return mutationSuccess(updated, "revoked", true, false, Number(results[2]?.meta?.changes ?? 0));
  } catch {
    const duplicate = await safeReadConsentEvidence(db, normalized.evidenceId);
    if (duplicate?.event_type === "revoked") {
      const recipient = await safeReadSmsRecipient(db, normalized.workspaceId, duplicate.sms_recipient_id);
      return mutationSuccess(recipient, "revoked", false, true, 0);
    }
    return mutationError("sms_consent_storage_unavailable", 503, "revoked");
  }
}

export async function listSmsConsentManifest(
  db: D1Database | undefined,
  workspaceId: string,
  limit = SMS_CONSENT_MANIFEST_MAX_ROWS,
): Promise<SmsConsentManifestResult> {
  if (!db) return emptyManifest("d1_unavailable_dry_run");
  const boundedLimit = Number.isSafeInteger(limit) && limit >= 1
    ? Math.min(limit, SMS_CONSENT_MANIFEST_MAX_ROWS)
    : SMS_CONSENT_MANIFEST_MAX_ROWS;
  try {
    const result = await db.prepare(`
      SELECT
        id, workspace_id, member_id, status, current_disclosure_version,
        categories_json, consented_at, revoked_at, updated_at
      FROM sms_recipients
      WHERE workspace_id = ?
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
    `).bind(workspaceId, boundedLimit + 1).all<SmsRecipientRow>();
    const rows = result.results ?? [];
    return {
      persistence: "d1_sms_compliance",
      recipients: rows.slice(0, boundedLimit).map(smsConsentRecipientFromRow),
      count: Math.min(rows.length, boundedLimit),
      truncated: rows.length > boundedLimit,
      secretValuesExposed: false,
    };
  } catch {
    return emptyManifest("d1_unavailable_dry_run");
  }
}

function normalizeSmsConsentInput(input: SmsConsentCommitInput) {
  const workspaceId = safeId(input.workspaceId);
  const memberId = input.memberId ? safeId(input.memberId) : null;
  const actorMemberId = safeId(input.actorMemberId);
  const recipientE164 = normalizeSmsRecipient(input.recipientE164);
  const evidenceId = safeEvidenceId(input.evidenceId);
  const disclosureVersion = safeLabel(input.disclosureVersion, 80);
  const categories = normalizeCategories(input.categories);
  const now = normalizedTimestamp(input.now);
  if (!workspaceId || (input.memberId && !memberId) || !actorMemberId || !recipientE164 || !evidenceId || !disclosureVersion || categories.length === 0 || !now) return null;
  if (input.source !== "workspace_form" && input.source !== "operator") return null;
  return { workspaceId, memberId, actorMemberId, recipientE164, evidenceId, disclosureVersion, categories, source: input.source, now };
}

function normalizeSmsRevocationInput(input: SmsConsentRevokeInput) {
  const workspaceId = safeId(input.workspaceId);
  const recipientId = safeId(input.recipientId);
  const actorMemberId = safeId(input.actorMemberId);
  const evidenceId = safeEvidenceId(input.evidenceId);
  const now = normalizedTimestamp(input.now);
  return workspaceId && recipientId && actorMemberId && evidenceId && input.source === "operator" && now
    ? { workspaceId, recipientId, actorMemberId, evidenceId, source: input.source, now }
    : null;
}

async function readSmsRecipient(db: D1Database, workspaceId: string, recipientId: string): Promise<SmsConsentRecipient | null> {
  const row = await db.prepare(`
    SELECT
      id, workspace_id, member_id, status, current_disclosure_version,
      categories_json, consented_at, revoked_at, updated_at
    FROM sms_recipients
    WHERE workspace_id = ? AND id = ?
    LIMIT 1
  `).bind(workspaceId, recipientId).first<SmsRecipientRow>();
  return row ? smsConsentRecipientFromRow(row) : null;
}

async function readConsentEvidence(db: D1Database, evidenceId: string): Promise<SmsConsentEventRow | null> {
  return db.prepare(`
    SELECT sms_recipient_id, event_type, source, disclosure_version, categories_json
    FROM sms_consent_events
    WHERE source_event_id = ?
    LIMIT 1
  `).bind(evidenceId).first<SmsConsentEventRow>();
}

async function safeReadSmsRecipient(db: D1Database, workspaceId: string, recipientId: string) {
  try {
    return await readSmsRecipient(db, workspaceId, recipientId);
  } catch {
    return null;
  }
}

async function safeReadConsentEvidence(db: D1Database, evidenceId: string) {
  try {
    return await readConsentEvidence(db, evidenceId);
  } catch {
    return null;
  }
}

function smsConsentRecipientFromRow(row: SmsRecipientRow): SmsConsentRecipient {
  return {
    id: row.id,
    memberId: row.member_id,
    status: row.status,
    disclosureVersion: row.current_disclosure_version,
    categories: parseCategories(row.categories_json),
    consentedAt: row.consented_at,
    revokedAt: row.revoked_at,
    updatedAt: row.updated_at,
  };
}

function mutationSuccess(
  recipient: SmsConsentRecipient | null,
  eventType: "consented" | "revoked",
  destructiveWrite: boolean,
  idempotent: boolean,
  pendingAttemptsSuppressed: number,
): SmsConsentMutationResult {
  return {
    persistence: "d1_sms_compliance",
    auditPersistence: "d1_audit_events",
    destructiveWrite,
    idempotent,
    recipient,
    eventType,
    pendingAttemptsSuppressed,
  };
}

function mutationError(
  error: string,
  errorStatus: 400 | 404 | 409 | 422 | 503,
  eventType: "consented" | "revoked",
  persistence: SmsConsentMutationResult["persistence"] = "d1_unavailable_dry_run",
): SmsConsentMutationResult {
  return {
    persistence,
    auditPersistence: "d1_unavailable_dry_run",
    destructiveWrite: false,
    idempotent: false,
    recipient: null,
    eventType,
    pendingAttemptsSuppressed: 0,
    error,
    errorStatus,
  };
}

function emptyManifest(persistence: SmsConsentManifestResult["persistence"]): SmsConsentManifestResult {
  return { persistence, recipients: [], count: 0, truncated: false, secretValuesExposed: false };
}

function batchAppliedExactly(results: D1Result[], expectedChanges: number[]): boolean {
  return results.length === expectedChanges.length
    && results.every((result, index) => result.success && Number(result.meta?.changes ?? 0) === expectedChanges[index]);
}

function batchAppliedAtLeast(results: D1Result[], minimumChanges: number[]): boolean {
  return results.length === minimumChanges.length
    && results.every((result, index) => result.success && Number(result.meta?.changes ?? 0) >= minimumChanges[index]);
}

function normalizeCategories(values: unknown): SmsConsentCategory[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is SmsConsentCategory => (
    typeof value === "string" && SMS_CONSENT_CATEGORIES.includes(value as SmsConsentCategory)
  )))].sort();
}

function parseCategories(value: string): SmsConsentCategory[] {
  try {
    return normalizeCategories(JSON.parse(value));
  } catch {
    return [];
  }
}

function sameCategories(value: string, categories: SmsConsentCategory[]): boolean {
  return JSON.stringify(parseCategories(value)) === JSON.stringify(categories);
}

function safeId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{1,119}$/.test(value.trim()) ? value.trim() : null;
}

function safeEvidenceId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/.test(value.trim()) ? value.trim() : null;
}

function safeLabel(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value.trim()) && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

function normalizedTimestamp(value: string | undefined): string | null {
  const timestamp = value ?? new Date().toISOString();
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
