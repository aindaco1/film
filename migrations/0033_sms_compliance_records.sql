-- Worker-owned SMS recipient, consent, delivery, and redacted Telnyx event records.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sms_recipients (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  recipient_hash TEXT NOT NULL,
  recipient_ciphertext TEXT NOT NULL,
  encryption_key_version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'revoked' CHECK (status IN ('active', 'revoked')),
  current_disclosure_version TEXT,
  categories_json TEXT NOT NULL DEFAULT '[]',
  consent_source TEXT,
  consented_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, recipient_hash)
);

CREATE INDEX IF NOT EXISTS idx_sms_recipients_workspace_status
  ON sms_recipients(workspace_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_sms_recipients_member
  ON sms_recipients(workspace_id, member_id, updated_at);

CREATE TABLE IF NOT EXISTS sms_consent_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sms_recipient_id TEXT NOT NULL REFERENCES sms_recipients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('consented', 'revoked', 'opt_in_received', 'help_requested')),
  source TEXT NOT NULL CHECK (source IN ('workspace_form', 'telnyx_webhook', 'operator')),
  disclosure_version TEXT,
  categories_json TEXT NOT NULL DEFAULT '[]',
  source_event_id TEXT UNIQUE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_consent_events_recipient
  ON sms_consent_events(workspace_id, sms_recipient_id, occurred_at);

CREATE TABLE IF NOT EXISTS sms_delivery_attempts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sms_recipient_id TEXT NOT NULL REFERENCES sms_recipients(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('call_sheet', 'schedule_change', 'safety_location_alert')),
  provider TEXT NOT NULL DEFAULT 'telnyx' CHECK (provider IN ('telnyx')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'queued', 'sent', 'delivered', 'failed', 'suppressed')),
  recipient_hash TEXT NOT NULL,
  segment_count INTEGER NOT NULL CHECK (segment_count >= 1 AND segment_count <= 100),
  provider_message_id TEXT,
  error_codes_json TEXT NOT NULL DEFAULT '[]',
  emergency_override INTEGER NOT NULL DEFAULT 0 CHECK (emergency_override IN (0, 1)),
  created_by_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  source_webhook_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_delivery_attempts_project_status
  ON sms_delivery_attempts(workspace_id, project_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_sms_delivery_attempts_recipient
  ON sms_delivery_attempts(workspace_id, recipient_hash, created_at);

CREATE TABLE IF NOT EXISTS telnyx_webhook_events (
  id TEXT PRIMARY KEY,
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('message.received', 'message.sent', 'message.finalized')),
  occurred_at TEXT NOT NULL,
  message_id TEXT,
  direction TEXT CHECK (direction IS NULL OR direction IN ('inbound', 'outbound')),
  delivery_status TEXT CHECK (
    delivery_status IS NULL OR delivery_status IN (
      'queued',
      'sending',
      'sent',
      'delivered',
      'sending_failed',
      'delivery_failed',
      'delivery_unconfirmed'
    )
  ),
  error_codes_json TEXT NOT NULL DEFAULT '[]',
  autoresponse_type TEXT CHECK (autoresponse_type IS NULL OR autoresponse_type IN ('START', 'STOP', 'HELP')),
  recipient_hash TEXT,
  part_count INTEGER CHECK (part_count IS NULL OR (part_count >= 0 AND part_count <= 100)),
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telnyx_webhook_events_message
  ON telnyx_webhook_events(message_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_telnyx_webhook_events_recipient
  ON telnyx_webhook_events(recipient_hash, occurred_at);
