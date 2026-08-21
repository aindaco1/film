-- Durable non-destructive attachment restore object commit preflight records.

CREATE TABLE IF NOT EXISTS restore_attachment_object_commit_preflights (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  attachment_package_verification_id TEXT NOT NULL REFERENCES restore_attachment_package_verifications(id) ON DELETE CASCADE,
  attachment_object_plan_id TEXT NOT NULL REFERENCES restore_attachment_object_plans(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  object_count INTEGER NOT NULL DEFAULT 0 CHECK (object_count >= 0),
  total_source_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_source_bytes >= 0),
  ready_destination_count INTEGER NOT NULL DEFAULT 0 CHECK (ready_destination_count >= 0),
  blocked_destination_count INTEGER NOT NULL DEFAULT 0 CHECK (blocked_destination_count >= 0),
  package_sha256 TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  preflight_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'blocked_by_missing_attachment_bucket' CHECK (
    status IN (
      'ready_for_attachment_byte_commit',
      'blocked_by_missing_attachment_bucket',
      'blocked_by_existing_attachment_destination',
      'blocked_by_attachment_destination_check'
    )
  ),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ready_destination_count + blocked_destination_count = object_count)
);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_object_commit_preflights_workspace_created
  ON restore_attachment_object_commit_preflights(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_object_commit_preflights_plan
  ON restore_attachment_object_commit_preflights(attachment_object_plan_id, created_at);
