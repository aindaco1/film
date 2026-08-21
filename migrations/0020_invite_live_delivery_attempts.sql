-- Extend invite delivery attempts for explicitly enabled live Resend sends.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS invite_delivery_attempts_next (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invite_id TEXT NOT NULL REFERENCES workspace_invites(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend', 'sms', 'dry_run')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  target_hash TEXT NOT NULL,
  template_key TEXT NOT NULL DEFAULT 'workspace_invite',
  delivery_mode TEXT NOT NULL DEFAULT 'dry_run_outbox' CHECK (delivery_mode IN ('dry_run_outbox', 'live_resend')),
  status TEXT NOT NULL DEFAULT 'queued_dry_run' CHECK (status IN ('queued_dry_run', 'blocked_provider_not_configured', 'queued_live', 'sent_live', 'failed_live_delivery')),
  provider_message_id TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO invite_delivery_attempts_next (
  id,
  workspace_id,
  invite_id,
  actor_member_id,
  provider,
  channel,
  target_hash,
  template_key,
  delivery_mode,
  status,
  provider_message_id,
  error_code,
  created_at
)
SELECT
  id,
  workspace_id,
  invite_id,
  actor_member_id,
  provider,
  channel,
  target_hash,
  template_key,
  delivery_mode,
  status,
  provider_message_id,
  error_code,
  created_at
FROM invite_delivery_attempts;

DROP TABLE invite_delivery_attempts;
ALTER TABLE invite_delivery_attempts_next RENAME TO invite_delivery_attempts;

CREATE INDEX IF NOT EXISTS idx_invite_delivery_attempts_workspace_created
  ON invite_delivery_attempts(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_attempts_invite
  ON invite_delivery_attempts(invite_id, created_at);

PRAGMA foreign_keys = ON;
