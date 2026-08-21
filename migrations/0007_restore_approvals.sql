-- Durable non-destructive restore approval records.

CREATE TABLE IF NOT EXISTS restore_approvals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  snapshot_workspace_id TEXT NOT NULL,
  backup_created_at TEXT,
  pre_restore_backup_id TEXT REFERENCES restore_points(id) ON DELETE SET NULL,
  preview_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'blocked' CHECK (status IN ('blocked', 'approved_pending_commit')),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_approvals_workspace_status
  ON restore_approvals(workspace_id, status, created_at);
