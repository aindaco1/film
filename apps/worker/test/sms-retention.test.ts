import { afterEach, describe, expect, it } from "vitest";
import { commitSmsConsent } from "../src/sms-consent";
import { applySmsRetention, parseSmsRetentionDays } from "../src/sms-retention";
import { base64Key, createSmsTestD1, seedSmsTestWorkspace } from "./sqlite-d1";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("SMS metadata retention", () => {
  it("requires an explicit bounded retention period", () => {
    expect(parseSmsRetentionDays("90")).toBe(90);
    expect(parseSmsRetentionDays("30")).toBe(30);
    expect(parseSmsRetentionDays("730")).toBe(730);
    expect(parseSmsRetentionDays("29")).toBeNull();
    expect(parseSmsRetentionDays("731")).toBeNull();
    expect(parseSmsRetentionDays("default")).toBeNull();
  });

  it("deletes only expired terminal attempts and webhook metadata", async () => {
    const { db, close } = createSmsTestD1();
    cleanups.push(close);
    await seedSmsTestWorkspace(db);
    const consent = await commitSmsConsent(db, {
      workspaceId: "workspace_acme",
      memberId: null,
      recipientE164: "+15555550113",
      evidenceId: "consent-retention-001",
      disclosureVersion: "crew-sms-v1",
      categories: ["call_sheet"],
      source: "operator",
      actorMemberId: "member_producer",
      encryptionKey: base64Key(17),
      hashKey: base64Key(23),
    });
    for (const [id, status, updatedAt] of [
      ["sms_attempt_expired", "delivered", "2026-01-01T00:00:00.000Z"],
      ["sms_attempt_recent", "failed", "2026-07-01T00:00:00.000Z"],
      ["sms_attempt_pending", "queued", "2026-01-01T00:00:00.000Z"],
    ] as const) {
      await db.prepare(`
        INSERT INTO sms_delivery_attempts (
          id, workspace_id, project_id, sms_recipient_id, category, status,
          recipient_hash, segment_count, created_by_member_id, created_at, updated_at
        ) SELECT ?, workspace_id, ?, id, 'call_sheet', ?, recipient_hash, 1, ?, ?, ?
          FROM sms_recipients WHERE id = ?
      `).bind(
        id,
        "project_big_sword",
        status,
        "member_producer",
        updatedAt,
        updatedAt,
        consent.recipient?.id,
      ).run();
    }
    await db.prepare(`
      INSERT INTO telnyx_webhook_events (
        id, provider_event_id, event_type, occurred_at, received_at
      ) VALUES (?, ?, 'message.finalized', ?, ?), (?, ?, 'message.finalized', ?, ?)
    `).bind(
      "event_expired", "provider_event_expired", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z",
      "event_recent", "provider_event_recent", "2026-07-01T00:00:00.000Z", "2026-07-01T00:00:00.000Z",
    ).run();

    const result = await applySmsRetention(db, 90, new Date("2026-07-10T00:00:00.000Z"));
    const attempts = await db.prepare("SELECT id FROM sms_delivery_attempts ORDER BY id").all<{ id: string }>();
    const events = await db.prepare("SELECT id FROM telnyx_webhook_events ORDER BY id").all<{ id: string }>();

    expect(result).toMatchObject({ deletedAttemptCount: 1, deletedWebhookEventCount: 1, retentionDays: 90 });
    expect(attempts.results).toEqual([{ id: "sms_attempt_pending" }, { id: "sms_attempt_recent" }]);
    expect(events.results).toEqual([{ id: "event_recent" }]);
  });
});
