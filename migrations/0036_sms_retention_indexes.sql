-- Bounded scans for the configurable terminal SMS metadata retention job.

PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_sms_delivery_attempts_retention
  ON sms_delivery_attempts(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_telnyx_webhook_events_retention
  ON telnyx_webhook_events(received_at);
