-- Expiring attachment package download plans.

CREATE TABLE IF NOT EXISTS attachment_package_plans (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  object_keys_json TEXT NOT NULL,
  object_count INTEGER NOT NULL CHECK (object_count >= 0),
  total_size_bytes INTEGER NOT NULL CHECK (total_size_bytes >= 0),
  package_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachment_package_plans_workspace_expires
  ON attachment_package_plans(workspace_id, expires_at);
