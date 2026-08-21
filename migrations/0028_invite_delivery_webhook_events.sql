-- Verified Resend invite-delivery webhook metadata.

CREATE TABLE IF NOT EXISTS invite_delivery_webhook_events (
  id TEXT PRIMARY KEY,
  svix_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider = 'resend'),
  event_type TEXT NOT NULL,
  provider_message_id TEXT,
  delivery_attempt_id TEXT REFERENCES invite_delivery_attempts(id) ON DELETE SET NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  invite_id TEXT REFERENCES workspace_invites(id) ON DELETE SET NULL,
  delivery_status TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_created_at TEXT,
  metadata_keys_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_webhook_events_workspace_received
  ON invite_delivery_webhook_events(workspace_id, received_at);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_webhook_events_attempt
  ON invite_delivery_webhook_events(delivery_attempt_id, received_at);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_webhook_events_provider_message
  ON invite_delivery_webhook_events(provider_message_id, received_at);
