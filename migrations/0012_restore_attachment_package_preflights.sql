-- Durable non-destructive attachment restore package preflight records.

CREATE TABLE IF NOT EXISTS restore_attachment_package_preflights (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  snapshot_workspace_id TEXT NOT NULL,
  backup_created_at TEXT,
  metadata_record_count INTEGER NOT NULL DEFAULT 0 CHECK (metadata_record_count >= 0),
  staged_local_count INTEGER NOT NULL DEFAULT 0 CHECK (staged_local_count >= 0),
  r2_dry_run_count INTEGER NOT NULL DEFAULT 0 CHECK (r2_dry_run_count >= 0),
  stored_r2_count INTEGER NOT NULL DEFAULT 0 CHECK (stored_r2_count >= 0),
  total_source_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_source_bytes >= 0),
  package_plan_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'blocked_until_attachment_package_verification' CHECK (status IN ('blocked_until_attachment_package_verification', 'not_required')),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_package_preflights_workspace_created
  ON restore_attachment_package_preflights(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_package_preflights_workspace_status
  ON restore_attachment_package_preflights(workspace_id, status, created_at);
