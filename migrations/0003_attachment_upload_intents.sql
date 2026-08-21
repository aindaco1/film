-- Attachment upload prepare/commit metadata.

CREATE TABLE IF NOT EXISTS attachment_upload_intents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  name TEXT NOT NULL,
  source_path TEXT,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  storage_key TEXT,
  commit_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'committed_dry_run', 'stored_r2')),
  prepared_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  committed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, doc_id, sha256),
  UNIQUE (workspace_id, object_key),
  UNIQUE (commit_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_attachment_upload_intents_workspace_status
  ON attachment_upload_intents(workspace_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_attachment_upload_intents_doc
  ON attachment_upload_intents(workspace_id, doc_id);

CREATE INDEX IF NOT EXISTS idx_attachment_upload_intents_expires
  ON attachment_upload_intents(expires_at);
