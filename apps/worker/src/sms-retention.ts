export const SMS_RETENTION_MIN_DAYS = 30;
export const SMS_RETENTION_MAX_DAYS = 730;

export type SmsRetentionResult = {
  persistence: "d1_sms_retention";
  retentionDays: number;
  cutoff: string;
  deletedAttemptCount: number;
  deletedWebhookEventCount: number;
};

export function parseSmsRetentionDays(value: string): number | null {
  if (!/^\d{2,3}$/.test(value.trim())) return null;
  const days = Number(value);
  return Number.isSafeInteger(days) && days >= SMS_RETENTION_MIN_DAYS && days <= SMS_RETENTION_MAX_DAYS
    ? days
    : null;
}

export async function applySmsRetention(
  db: D1Database,
  retentionDays: number,
  now = new Date(),
): Promise<SmsRetentionResult> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < SMS_RETENTION_MIN_DAYS || retentionDays > SMS_RETENTION_MAX_DAYS) {
    throw new Error("invalid_sms_retention_days");
  }
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000).toISOString();
  const results = await db.batch([
    db.prepare(`
      DELETE FROM sms_delivery_attempts
      WHERE status IN ('delivered', 'failed', 'suppressed') AND updated_at < ?
    `).bind(cutoff),
    db.prepare("DELETE FROM telnyx_webhook_events WHERE received_at < ?").bind(cutoff),
  ]);
  if (results.length !== 2 || results.some((result) => !result.success)) {
    throw new Error("sms_retention_storage_unavailable");
  }
  return {
    persistence: "d1_sms_retention",
    retentionDays,
    cutoff,
    deletedAttemptCount: Number(results[0]?.meta?.changes ?? 0),
    deletedWebhookEventCount: Number(results[1]?.meta?.changes ?? 0),
  };
}
