# ADR 0035: Production Planning D1 Tables

Date: 2026-07-08

## Status

Accepted

## Decision

Add D1/SQLite tables for first-class production planning records found in the current Notion workspace model.

## Context

The Notion workspace includes opportunities, locations, equipment requests, meeting notes, shows, merch, media/reading-list records, and role catalogs. Film's initial schema covered projects, tasks, docs, people, equipment, and expenses, but it did not yet give the remaining v1 records durable table boundaries.

## Consequences

- New tables: `locations`, `opportunities`, `meeting_notes`, `equipment_requests`, `shows`, `merch_items`, `media_items`, and `production_roles`.
- The tables use workspace/project foreign keys where appropriate and JSON text fields for tags, participants, and channels until richer contracts are needed.
- This is migration-only groundwork. The importer and UI do not yet write these tables.
- `npm run test:migrations` validates the expanded schema twice with SQLite.
