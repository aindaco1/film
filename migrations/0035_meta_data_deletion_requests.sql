-- Replay-safe status records for Meta user-data deletion callbacks.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta_data_deletion_requests (
  id TEXT PRIMARY KEY,
  confirmation_code TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL UNIQUE,
  meta_user_id_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  deleted_connection_count INTEGER NOT NULL DEFAULT 0 CHECK (deleted_connection_count >= 0),
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meta_deletion_status_updated
  ON meta_data_deletion_requests(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_meta_deletion_user_hash
  ON meta_data_deletion_requests(meta_user_id_sha256, requested_at);
