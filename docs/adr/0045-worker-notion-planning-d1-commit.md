# ADR 0045: Worker Notion Planning D1 Commit

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Worker-owned `POST /api/imports/notion/planning/commit` route that accepts bounded normalized Notion planning rows and writes them into first-class D1 planning tables when D1 is available.

## Context

The browser importer can now recognize production-planning Notion databases and preserve normalized row metadata. Film also has D1 tables for locations, opportunities, meeting notes, equipment requests, shows, merch, media items, and production roles. The remaining gap was durable import handoff without moving trust-sensitive write behavior into browser code.

## Consequences

- The route accepts at most 200 planning records per request and requires owner, producer, or director authorization when D1 auth storage is available.
- Records are validated for known planning kind, bounded title, safe relative source path, bounded project relation hint, and bounded string fields.
- D1 rows use deterministic `notion_<kind>_<hash>` IDs based on workspace, kind, title, and source path so repeated imports are idempotent.
- The route skips all D1 planning writes when any row in the batch fails validation.
- Existing project rows are linked by case-insensitive project title hints when present; unresolved project hints import as workspace-level planning rows.
- The route returns `dryRun: true` until broader relation mapping, backup/export coverage, and live import approvals exist.
- The browser import summary reports committed, idempotent, and rejected planning row counts without pretending the browser workspace model stores those tables locally.
