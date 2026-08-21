-- Workspace invite and project membership scope foundations.

CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  invited_role TEXT NOT NULL CHECK (invited_role IN ('owner', 'producer', 'director', 'department_lead', 'contributor', 'reviewer')),
  invited_by_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_memberships (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  project_role TEXT NOT NULL CHECK (project_role IN ('owner', 'producer', 'director', 'department_lead', 'contributor', 'reviewer')),
  department TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, member_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invites_pending_email
  ON workspace_invites(workspace_id, email_hash)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_status
  ON workspace_invites(workspace_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_project_memberships_member
  ON project_memberships(member_id, project_role);
