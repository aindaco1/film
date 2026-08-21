-- Durable review and application records for approved core-record mutations.

PRAGMA foreign_keys = ON;

ALTER TABLE people ADD COLUMN updated_at TEXT;
ALTER TABLE equipment ADD COLUMN updated_at TEXT;
ALTER TABLE expenses ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS record_mutation_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'document', 'task', 'person', 'equipment', 'expense')),
  entity_id TEXT NOT NULL,
  mutation TEXT NOT NULL CHECK (mutation IN ('update', 'delete')),
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  allowed_by TEXT NOT NULL CHECK (allowed_by IN ('owner_producer', 'record_owner', 'write_permission', 'dry_run_memoryless')),
  status TEXT NOT NULL DEFAULT 'pending_owner_producer_review' CHECK (status IN ('pending_owner_producer_review', 'approved_pending_apply', 'rejected', 'applied', 'stale_record_blocked')),
  summary_preview TEXT NOT NULL,
  summary_sha256 TEXT NOT NULL,
  field_keys_json TEXT NOT NULL DEFAULT '[]',
  expected_updated_at TEXT,
  resolved_by_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  resolved_at TEXT,
  resolution_note_preview TEXT,
  resolution_note_sha256 TEXT,
  applied_by_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  applied_at TEXT,
  application_json TEXT,
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_record_mutation_requests_entity
  ON record_mutation_requests(workspace_id, entity_type, entity_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_record_mutation_requests_actor
  ON record_mutation_requests(workspace_id, actor_member_id, created_at);
