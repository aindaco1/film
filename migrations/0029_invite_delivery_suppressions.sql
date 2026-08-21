-- Materialized invite delivery webhook state and hash-only suppressions.

ALTER TABLE invite_delivery_attempts
  ADD COLUMN last_event_status TEXT;

ALTER TABLE invite_delivery_attempts
  ADD COLUMN last_event_at TEXT;

CREATE INDEX IF NOT EXISTS idx_invite_delivery_attempts_last_event
  ON invite_delivery_attempts(workspace_id, last_event_at);

CREATE TABLE IF NOT EXISTS invite_delivery_suppressions (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider = 'resend'),
  target_hash TEXT NOT NULL,
  suppression_reason TEXT NOT NULL CHECK (suppression_reason IN ('bounced', 'complained', 'suppressed')),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  invite_id TEXT REFERENCES workspace_invites(id) ON DELETE SET NULL,
  delivery_attempt_id TEXT REFERENCES invite_delivery_attempts(id) ON DELETE SET NULL,
  provider_message_id TEXT,
  source_webhook_event_id TEXT REFERENCES invite_delivery_webhook_events(id) ON DELETE SET NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, target_hash, suppression_reason)
);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_suppressions_workspace
  ON invite_delivery_suppressions(workspace_id, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_suppressions_attempt
  ON invite_delivery_suppressions(delivery_attempt_id, last_seen_at);
