-- Durable destructive restore planning commit records.

CREATE TABLE IF NOT EXISTS restore_planning_commits (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  approval_id TEXT NOT NULL REFERENCES restore_approvals(id) ON DELETE RESTRICT,
  commit_attempt_id TEXT NOT NULL REFERENCES restore_commit_attempts(id) ON DELETE RESTRICT,
  application_preflight_id TEXT NOT NULL REFERENCES restore_application_preflights(id) ON DELETE RESTRICT,
  planning_preview_id TEXT NOT NULL REFERENCES restore_planning_previews(id) ON DELETE RESTRICT,
  pre_restore_backup_id TEXT NOT NULL REFERENCES restore_points(id) ON DELETE RESTRICT,
  snapshot_workspace_id TEXT NOT NULL,
  backup_created_at TEXT,
  request_summary_json TEXT NOT NULL DEFAULT '{}',
  table_summary_json TEXT NOT NULL DEFAULT '[]',
  result_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'applied_planning_records' CHECK (status IN ('applied_planning_records')),
  destructive_write INTEGER NOT NULL DEFAULT 1 CHECK (destructive_write = 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_planning_commits_workspace_created
  ON restore_planning_commits(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_planning_commits_planning_preview
  ON restore_planning_commits(planning_preview_id);
