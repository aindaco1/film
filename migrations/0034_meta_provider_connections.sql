-- Worker-owned Meta OAuth, Page, and linked Instagram connection state.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta_provider_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connected_by_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_page_selection' CHECK (
    status IN ('pending_page_selection', 'active', 'disconnected', 'error')
  ),
  scopes_json TEXT NOT NULL DEFAULT '[]',
  user_access_token_ciphertext TEXT,
  page_access_token_ciphertext TEXT,
  token_expires_at TEXT,
  token_key_version TEXT NOT NULL DEFAULT 'v1',
  meta_user_id TEXT,
  page_id TEXT,
  page_name TEXT,
  instagram_account_id TEXT,
  instagram_username TEXT,
  last_error_code TEXT,
  connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disconnected_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_connections_workspace_status
  ON meta_provider_connections(workspace_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_meta_connections_user_status
  ON meta_provider_connections(meta_user_id, status, updated_at);
