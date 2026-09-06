// Reconcile stored, content-free callbacks both on receipt and after the send response.
// Final delivery outcomes outrank transit events, regardless of callback arrival order.
export async function reconcileTelnyxDelivery(db: D1Database, messageId: string): Promise<void> {
  const results = await db.batch([
    db.prepare(`
      WITH latest AS (
        SELECT *, CASE delivery_status
          WHEN 'delivered' THEN 'delivered'
          WHEN 'sending_failed' THEN 'failed'
          WHEN 'delivery_failed' THEN 'failed'
          WHEN 'delivery_unconfirmed' THEN 'failed'
          WHEN 'sent' THEN 'sent'
          ELSE 'queued'
        END AS attempt_status
        FROM telnyx_webhook_events
        WHERE message_id = ? AND direction = 'outbound' AND autoresponse_type IS NULL
          AND delivery_status IS NOT NULL
        ORDER BY CASE
          WHEN delivery_status IN ('delivered', 'sending_failed', 'delivery_failed', 'delivery_unconfirmed') THEN 2
          WHEN delivery_status = 'sent' THEN 1 ELSE 0
        END DESC, julianday(occurred_at) DESC, provider_event_id DESC
        LIMIT 1
      )
      UPDATE sms_delivery_attempts
      SET (status, error_codes_json, source_webhook_event_id, updated_at) = (
        SELECT attempt_status, error_codes_json, provider_event_id, received_at FROM latest
      )
      WHERE provider_message_id = ? AND status != 'suppressed'
        AND EXISTS (SELECT 1 FROM latest)
        AND COALESCE(source_webhook_event_id, '') != (SELECT provider_event_id FROM latest)
        AND (status NOT IN ('delivered', 'failed') OR (SELECT attempt_status FROM latest) IN ('delivered', 'failed'))
        AND (status != 'sent' OR (SELECT attempt_status FROM latest) != 'queued')
    `).bind(messageId, messageId),
    db.prepare(`
      INSERT INTO audit_events (
        id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
      )
      SELECT 'audit_telnyx_delivery_' || event.id, attempt.workspace_id, attempt.project_id,
        NULL, 'provider.telnyx_delivery_updated',
        json_object('deliveryStatus', attempt.status,
          'providerErrorCodeCount', json_array_length(event.error_codes_json),
          'messageBodyStored', json('false'), 'recipientValuesStoredInAudit', json('false')),
        event.received_at
      FROM sms_delivery_attempts AS attempt
      JOIN telnyx_webhook_events AS event ON event.provider_event_id = attempt.source_webhook_event_id
      WHERE attempt.provider_message_id = ? AND attempt.status != 'suppressed'
        AND event.direction = 'outbound'
      ON CONFLICT(id) DO NOTHING
    `).bind(messageId),
  ]);
  if (results.length !== 2 || results.some((result) => !result.success)) {
    throw new Error("telnyx_delivery_storage_unavailable");
  }
}
