-- Metadata-only record comment intents for explicit comment-permission checks.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS record_comment_intents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'document')),
  entity_id TEXT NOT NULL,
  author_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  body_preview TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_record_comment_intents_entity
  ON record_comment_intents(workspace_id, entity_type, entity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_record_comment_intents_author
  ON record_comment_intents(workspace_id, author_member_id, created_at);
