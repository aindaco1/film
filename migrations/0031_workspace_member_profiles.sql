-- Bounded member profile metadata for canonical workspace hydration.

ALTER TABLE workspace_members ADD COLUMN display_name TEXT;
ALTER TABLE workspace_members ADD COLUMN last_seen_at TEXT;

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_role
  ON workspace_members(workspace_id, role, created_at);
