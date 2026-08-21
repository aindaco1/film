-- Durable non-destructive restore planning preview records.

CREATE TABLE IF NOT EXISTS restore_planning_previews (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  snapshot_workspace_id TEXT NOT NULL,
  backup_created_at TEXT,
  persistence TEXT NOT NULL,
  accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  create_preview_count INTEGER NOT NULL DEFAULT 0 CHECK (create_preview_count >= 0),
  idempotent_count INTEGER NOT NULL DEFAULT 0 CHECK (idempotent_count >= 0),
  update_preview_count INTEGER NOT NULL DEFAULT 0 CHECK (update_preview_count >= 0),
  rejected_count INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  table_summary_json TEXT NOT NULL DEFAULT '[]',
  update_preview_json TEXT NOT NULL DEFAULT '[]',
  rejected_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'preview_only' CHECK (status IN ('preview_only')),
  destructive_write INTEGER NOT NULL DEFAULT 0 CHECK (destructive_write IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restore_planning_previews_workspace_created
  ON restore_planning_previews(workspace_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restore_planning_previews_workspace_status
  ON restore_planning_previews(workspace_id, status, created_at);
