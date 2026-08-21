-- First-class production planning tables from the Notion workspace model.

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  parent_location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location_type TEXT,
  permit_required INTEGER NOT NULL DEFAULT 0 CHECK (permit_required IN (0, 1)),
  release_required INTEGER NOT NULL DEFAULT 0 CHECK (release_required IN (0, 1)),
  notes TEXT,
  sensitive INTEGER NOT NULL DEFAULT 1 CHECK (sensitive IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  opportunity_type TEXT,
  status TEXT NOT NULL DEFAULT 'tracking',
  due_at TEXT,
  website_url TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_notes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  meeting_type TEXT,
  meeting_at TEXT,
  participants_json TEXT NOT NULL DEFAULT '[]',
  notes_markdown TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  equipment_id TEXT REFERENCES equipment(id) ON DELETE SET NULL,
  requester_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  approved_by_member_id TEXT REFERENCES workspace_members(id) ON DELETE SET NULL,
  checkout_start TEXT,
  checkout_end TEXT,
  returned_at TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'declined', 'checked_out', 'returned', 'canceled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shows (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  show_type TEXT,
  channels_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS merch_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  image_ref TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  media_type TEXT,
  url TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_roles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_locations_project
  ON locations(project_id, name);

CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_due
  ON opportunities(workspace_id, due_at);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_project_at
  ON meeting_notes(project_id, meeting_at);

CREATE INDEX IF NOT EXISTS idx_equipment_requests_workspace_status
  ON equipment_requests(workspace_id, status, checkout_start);

CREATE INDEX IF NOT EXISTS idx_shows_project
  ON shows(project_id, status);

CREATE INDEX IF NOT EXISTS idx_merch_items_project
  ON merch_items(project_id, category);

CREATE INDEX IF NOT EXISTS idx_media_items_project
  ON media_items(project_id, media_type);
