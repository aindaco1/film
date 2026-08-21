-- Durable non-destructive attachment restore object planning records.

CREATE TABLE IF NOT EXISTS restore_attachment_object_plans (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  attachment_package_verification_id TEXT NOT NULL REFERENCES restore_attachment_package_verifications(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  object_count INTEGER NOT NULL DEFAULT 0 CHECK (object_count >= 0),
  total_source_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_source_bytes >= 0),
  blocked_destination_count INTEGER NOT NULL DEFAULT 0 CHECK (blocked_destination_count >= 0),
  plan_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'blocked_until_attachment_destination_write_rules' CHECK (status IN ('blocked_until_attachment_destination_write_rules')),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_object_plans_workspace_created
  ON restore_attachment_object_plans(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_object_plans_verification
  ON restore_attachment_object_plans(attachment_package_verification_id, created_at);
