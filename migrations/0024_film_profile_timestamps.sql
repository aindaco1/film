-- Add timestamps needed for future film-profile stale-check mutation paths.

ALTER TABLE film_profiles ADD COLUMN created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE film_profiles ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';

UPDATE film_profiles
SET
  created_at = COALESCE((SELECT projects.created_at FROM projects WHERE projects.id = film_profiles.project_id), created_at),
  updated_at = COALESCE((SELECT projects.updated_at FROM projects WHERE projects.id = film_profiles.project_id), updated_at)
WHERE created_at = '1970-01-01T00:00:00.000Z'
   OR updated_at = '1970-01-01T00:00:00.000Z';
