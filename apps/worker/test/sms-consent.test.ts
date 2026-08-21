import { afterEach, describe, expect, it } from "vitest";
import {
  commitSmsConsent,
  listSmsConsentManifest,
  revokeSmsConsent,
} from "../src/sms-consent";
import { base64Key, createSmsTestD1, seedSmsTestWorkspace } from "./sqlite-d1";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("SMS consent storage", () => {
  it("atomically stores encrypted consent and handles exact evidence replays", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const input = {
      workspaceId: "workspace_acme",
      memberId: "member_producer",
      recipientE164: "+15555550100",
      evidenceId: "consent-evidence-001",
      disclosureVersion: "crew-sms-v1",
      categories: ["schedule_change", "call_sheet"],
      source: "workspace_form" as const,
      actorMemberId: "member_producer",
      encryptionKey: base64Key(17),
      hashKey: base64Key(23),
      now: "2026-07-10T16:01:00.000Z",
    };

    const created = await commitSmsConsent(db, input);
    const replayed = await commitSmsConsent(db, input);
    const conflict = await commitSmsConsent(db, { ...input, categories: ["call_sheet"] });
    const stored = await db.prepare(`
      SELECT recipient_hash, recipient_ciphertext, status, categories_json
      FROM sms_recipients
      WHERE workspace_id = ?
    `).bind("workspace_acme").first<Record<string, unknown>>();
    const eventCount = await db.prepare("SELECT COUNT(*) AS count FROM sms_consent_events")
      .first<{ count: number }>();
    const auditCount = await db.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action = 'sms.consent_recorded'")
      .first<{ count: number }>();

    expect(created).toMatchObject({ destructiveWrite: true, idempotent: false, eventType: "consented" });
    expect(created.recipient).toMatchObject({
      memberId: "member_producer",
      status: "active",
      disclosureVersion: "crew-sms-v1",
      categories: ["call_sheet", "schedule_change"],
    });
    expect(replayed).toMatchObject({ destructiveWrite: false, idempotent: true });
    expect(conflict).toMatchObject({ error: "sms_consent_evidence_conflict", errorStatus: 409 });
    expect(stored?.recipient_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(String(stored?.recipient_ciphertext)).not.toContain("15555550100");
    expect(stored?.status).toBe("active");
    expect(eventCount?.count).toBe(1);
    expect(auditCount?.count).toBe(1);
    expect(JSON.stringify({ created, replayed, stored })).not.toContain("+15555550100");
  });

  it("revokes by opaque recipient ID, suppresses pending attempts, and returns a redacted manifest", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme",
      memberId: null,
      recipientE164: "+15555550101",
      evidenceId: "consent-evidence-002",
      disclosureVersion: "crew-sms-v1",
      categories: ["call_sheet"],
      source: "operator",
      actorMemberId: "member_producer",
      encryptionKey: base64Key(17),
      hashKey: base64Key(23),
      now: "2026-07-10T16:02:00.000Z",
    });
    const recipientId = consent.recipient?.id ?? "";
    await db.prepare(`
      INSERT INTO sms_delivery_attempts (
        id, workspace_id, project_id, sms_recipient_id, category, status,
        recipient_hash, segment_count, created_by_member_id, created_at, updated_at
      ) SELECT ?, workspace_id, ?, id, 'call_sheet', 'planned', recipient_hash, 1, ?, ?, ?
        FROM sms_recipients WHERE id = ?
    `).bind(
      "sms_attempt_001",
      "project_big_sword",
      "member_producer",
      "2026-07-10T16:02:30.000Z",
      "2026-07-10T16:02:30.000Z",
      recipientId,
    ).run();

    const revoked = await revokeSmsConsent(db, {
      workspaceId: "workspace_acme",
      recipientId,
      evidenceId: "revoke-evidence-002",
      source: "operator",
      actorMemberId: "member_producer",
      now: "2026-07-10T16:03:00.000Z",
    });
    const replayed = await revokeSmsConsent(db, {
      workspaceId: "workspace_acme",
      recipientId,
      evidenceId: "revoke-evidence-002",
      source: "operator",
      actorMemberId: "member_producer",
      now: "2026-07-10T16:03:00.000Z",
    });
    const manifest = await listSmsConsentManifest(db, "workspace_acme", 10);
    const attempt = await db.prepare("SELECT status FROM sms_delivery_attempts WHERE id = ?")
      .bind("sms_attempt_001")
      .first<{ status: string }>();

    expect(revoked).toMatchObject({
      destructiveWrite: true,
      idempotent: false,
      pendingAttemptsSuppressed: 1,
      recipient: { status: "revoked", categories: [] },
    });
    expect(replayed).toMatchObject({ destructiveWrite: false, idempotent: true });
    expect(attempt?.status).toBe("suppressed");
    expect(manifest).toMatchObject({ count: 1, truncated: false, secretValuesExposed: false });
    expect(JSON.stringify(manifest)).not.toContain("recipient_hash");
    expect(JSON.stringify(manifest)).not.toContain("ciphertext");
    expect(JSON.stringify(manifest)).not.toContain("15555550101");
  });

  it("rejects disabled member links and unavailable key material without partial writes", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    await db.prepare("UPDATE workspace_member_statuses SET status = 'disabled' WHERE member_id = ?")
      .bind("member_producer")
      .run();
    const baseInput = {
      workspaceId: "workspace_acme",
      memberId: "member_producer",
      recipientE164: "+15555550102",
      evidenceId: "consent-evidence-003",
      disclosureVersion: "crew-sms-v1",
      categories: ["call_sheet"],
      source: "operator" as const,
      actorMemberId: "member_producer",
      encryptionKey: base64Key(17),
      hashKey: base64Key(23),
    };

    const disabled = await commitSmsConsent(db, baseInput);
    const missingKey = await commitSmsConsent(db, { ...baseInput, memberId: null, encryptionKey: "" });
    const count = await db.prepare("SELECT COUNT(*) AS count FROM sms_recipients").first<{ count: number }>();

    expect(disabled).toMatchObject({ error: "sms_consent_active_member_required", errorStatus: 422 });
    expect(missingKey).toMatchObject({ error: "sms_consent_storage_unavailable", errorStatus: 503 });
    expect(count?.count).toBe(0);
  });
});
