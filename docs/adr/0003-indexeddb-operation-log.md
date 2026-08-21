# ADR 0003: IndexedDB Operation Log

Date: 2026-07-07

## Status

Accepted

## Decision

Use IndexedDB as the browser local mirror for workspace snapshots and queued operation records. Keep `localStorage` only as a fallback and for non-sensitive UI preferences.

## Context

Film must support full offline editing. The first slice does not implement server sync yet, but it needs the data shape that future sync, conflict handling, and restore previews can build on.

## Consequences

- Local mutations create operation records such as `project.created`, `task.created`, `backup.exported`, and `restore.dry_run`.
- The topbar and inspector expose the queued operation count.
- Current sync is a dry-run Worker preflight. Future sync can replay queued operations through Worker-owned authorization, idempotency, and conflict checks.
