-- Expiring stored backup object download plans.

CREATE TABLE IF NOT EXISTS backup_object_download_plans (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  restore_point_id TEXT NOT NULL REFERENCES restore_points(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  object_key TEXT NOT NULL,
  download_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_object_download_plans_workspace_expires
  ON backup_object_download_plans(workspace_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_backup_object_download_plans_restore_point
  ON backup_object_download_plans(restore_point_id, created_at);
