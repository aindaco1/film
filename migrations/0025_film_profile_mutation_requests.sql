-- Durable review and application records for approved film-profile metadata mutations.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS film_profile_mutation_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_film_profile_mutation_requests_project
  ON film_profile_mutation_requests(workspace_id, project_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_film_profile_mutation_requests_actor
  ON film_profile_mutation_requests(workspace_id, actor_member_id, created_at);
