-- Auth/session and offline operation-log foundations.

CREATE TABLE IF NOT EXISTS magic_links (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  consumed_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES workspace_members(id) ON DELETE CASCADE,
  csrf_hash TEXT NOT NULL,
  user_agent_hash TEXT,
  ip_hash TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operation_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'applied', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email_created ON magic_links(email_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace_expires ON sessions(workspace_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_operation_log_workspace_status ON operation_log(workspace_id, status, created_at);
