-- Nullable core record ownership metadata for collaboration checks.

PRAGMA foreign_keys = ON;

ALTER TABLE projects ADD COLUMN owner_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN owner_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN owner_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL;
ALTER TABLE people ADD COLUMN owner_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL;
ALTER TABLE equipment ADD COLUMN owner_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN owner_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_owner
  ON projects(workspace_id, owner_member_id);

CREATE INDEX IF NOT EXISTS idx_documents_owner
  ON documents(workspace_id, owner_member_id);

CREATE INDEX IF NOT EXISTS idx_tasks_owner
  ON tasks(workspace_id, owner_member_id);

CREATE INDEX IF NOT EXISTS idx_people_owner
  ON people(workspace_id, owner_member_id);

CREATE INDEX IF NOT EXISTS idx_equipment_owner
  ON equipment(workspace_id, owner_member_id);

CREATE INDEX IF NOT EXISTS idx_expenses_owner
  ON expenses(workspace_id, owner_member_id);
