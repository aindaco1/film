# ADR 0033: Backup UI Worker Metadata Handoff

Date: 2026-07-08

## Status

Accepted

Superseded in part by ADR 0054. The metadata-only handoff remains the fallback path when explicit R2 backup storage is unavailable.

## Decision

After exporting an encrypted browser ZIP backup, the web app calls the Worker backup dry-run endpoint to record or preview restore-point metadata when possible.

## Context

The browser owns local encrypted backup export, while the Worker owns durable restore-point metadata and future R2 storage handoff. The UI should show that boundary clearly without making the local export depend on Worker availability.

## Consequences

- Local encrypted ZIP export remains the primary backup action and still works offline.
- The app calls `POST /api/backups/dry-run` with session CSRF metadata after export.
- If the Worker returns restore-point metadata, the inspector shows the Worker persistence mode and latest-five retention policy, and the local restore-point list is updated.
- If the Worker is unavailable or the user lacks a valid session, the backup export still succeeds and the toast explains that Worker metadata was skipped.
- No backup bytes are sent to the Worker in this metadata-only fallback flow.
