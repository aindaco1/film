-- Workspace snapshot metadata restored by the Worker-owned application commit path.

CREATE TABLE IF NOT EXISTS workspace_restore_metadata (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  archived_project_count INTEGER NOT NULL DEFAULT 0,
  backup_policy TEXT,
  next_backup TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
