-- Durable non-destructive restore commit validation attempts.

CREATE TABLE IF NOT EXISTS restore_commit_attempts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  approval_id TEXT NOT NULL REFERENCES restore_approvals(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  pre_restore_backup_id TEXT REFERENCES restore_points(id) ON DELETE SET NULL,
  preview_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'blocked_until_restore_apply' CHECK (status IN ('blocked_until_restore_apply')),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_commit_attempts_workspace_status
  ON restore_commit_attempts(workspace_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_commit_attempts_approval
  ON restore_commit_attempts(approval_id, created_at);
