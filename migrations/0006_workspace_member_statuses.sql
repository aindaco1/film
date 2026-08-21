-- Workspace member status enforcement without rewriting the base member table.

CREATE TABLE IF NOT EXISTS workspace_member_statuses (
  member_id TEXT PRIMARY KEY REFERENCES workspace_members(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_member_statuses_workspace_status
  ON workspace_member_statuses(workspace_id, status, updated_at);
