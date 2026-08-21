-- Worker-owned OAuth connection metadata and encrypted token storage.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS provider_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  connected_by_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
  scopes_json TEXT NOT NULL DEFAULT '[]',
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  token_expires_at TEXT,
  token_type TEXT,
  token_key_version TEXT NOT NULL DEFAULT 'v1',
  root_folder_id TEXT,
  last_error_code TEXT,
  connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disconnected_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_provider_connections_workspace_status
  ON provider_connections(workspace_id, status, provider);

CREATE INDEX IF NOT EXISTS idx_provider_connections_token_expiry
  ON provider_connections(provider, status, token_expires_at);
