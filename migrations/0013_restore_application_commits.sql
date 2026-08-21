-- Durable restore application commit records for Worker-owned core restore writes.

CREATE TABLE IF NOT EXISTS restore_application_commits (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  approval_id TEXT NOT NULL REFERENCES restore_approvals(id) ON DELETE CASCADE,
  commit_attempt_id TEXT NOT NULL REFERENCES restore_commit_attempts(id) ON DELETE CASCADE,
  application_preflight_id TEXT NOT NULL REFERENCES restore_application_preflights(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  pre_restore_backup_id TEXT REFERENCES restore_points(id) ON DELETE SET NULL,
  preview_json TEXT NOT NULL DEFAULT '{}',
  request_summary_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'applied_core_records' CHECK (status IN ('applied_core_records')),
  destructive_write INTEGER NOT NULL DEFAULT 1 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_application_commits_workspace_status
  ON restore_application_commits(workspace_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_application_commits_preflight
  ON restore_application_commits(application_preflight_id, created_at);
