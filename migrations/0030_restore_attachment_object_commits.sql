-- Destructive attachment byte restore commits after verified package and destination preflight.

CREATE TABLE IF NOT EXISTS restore_attachment_object_commits (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  attachment_package_verification_id TEXT NOT NULL REFERENCES restore_attachment_package_verifications(id) ON DELETE RESTRICT,
  attachment_object_plan_id TEXT NOT NULL REFERENCES restore_attachment_object_plans(id) ON DELETE RESTRICT,
  attachment_object_commit_preflight_id TEXT NOT NULL REFERENCES restore_attachment_object_commit_preflights(id) ON DELETE RESTRICT,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  doc_id TEXT NOT NULL,
  source_object_key TEXT NOT NULL,
  destination_object_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  package_sha256 TEXT NOT NULL CHECK (length(package_sha256) = 64),
  manifest_sha256 TEXT NOT NULL CHECK (length(manifest_sha256) = 64),
  status TEXT NOT NULL DEFAULT 'stored_r2' CHECK (status IN ('stored_r2')),
  destructive_write INTEGER NOT NULL DEFAULT 1 CHECK (destructive_write = 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, destination_object_key),
  UNIQUE (attachment_object_commit_preflight_id, doc_id)
);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_object_commits_workspace_created
  ON restore_attachment_object_commits(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_object_commits_preflight
  ON restore_attachment_object_commits(attachment_object_commit_preflight_id, created_at);
