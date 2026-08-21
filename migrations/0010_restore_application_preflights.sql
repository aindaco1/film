-- Durable non-destructive restore application preflight records.

CREATE TABLE IF NOT EXISTS restore_application_preflights (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  approval_id TEXT NOT NULL REFERENCES restore_approvals(id) ON DELETE CASCADE,
  commit_attempt_id TEXT NOT NULL REFERENCES restore_commit_attempts(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  pre_restore_backup_id TEXT REFERENCES restore_points(id) ON DELETE SET NULL,
  preview_json TEXT NOT NULL DEFAULT '{}',
  rollback_guidance_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'blocked_until_restore_apply_implementation' CHECK (status IN ('blocked_until_restore_apply_implementation')),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_application_preflights_workspace_status
  ON restore_application_preflights(workspace_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_application_preflights_commit_attempt
  ON restore_application_preflights(commit_attempt_id, created_at);
