-- Fine-grained record permission grants for Worker-owned mutation replay.

CREATE TABLE IF NOT EXISTS record_permissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('workspace', 'project', 'task', 'document', 'person', 'equipment', 'expense', 'planning')),
  entity_id TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'comment', 'write', 'admin')),
  department TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, entity_type, entity_id, member_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_record_permissions_member
  ON record_permissions(workspace_id, member_id, permission, entity_type);

CREATE INDEX IF NOT EXISTS idx_record_permissions_entity
  ON record_permissions(workspace_id, entity_type, entity_id, permission);
