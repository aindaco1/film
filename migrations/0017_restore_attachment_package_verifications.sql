-- Durable non-destructive attachment restore package verification records.

CREATE TABLE IF NOT EXISTS restore_attachment_package_verifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  attachment_package_preflight_id TEXT NOT NULL REFERENCES restore_attachment_package_preflights(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  snapshot_workspace_id TEXT NOT NULL,
  backup_created_at TEXT,
  metadata_record_count INTEGER NOT NULL DEFAULT 0 CHECK (metadata_record_count >= 0),
  total_source_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_source_bytes >= 0),
  package_object_count INTEGER NOT NULL DEFAULT 0 CHECK (package_object_count >= 0),
  package_total_source_bytes INTEGER NOT NULL DEFAULT 0 CHECK (package_total_source_bytes >= 0),
  package_sha256 TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  package_manifest_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'verified_until_destination_rules' CHECK (status IN ('verified_until_destination_rules')),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_package_verifications_workspace_created
  ON restore_attachment_package_verifications(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_attachment_package_verifications_preflight
  ON restore_attachment_package_verifications(attachment_package_preflight_id, created_at);
