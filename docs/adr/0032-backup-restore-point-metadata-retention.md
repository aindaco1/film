# ADR 0032: Backup Restore-Point Metadata Retention

Date: 2026-07-08

## Status

Accepted

## Decision

When D1 is available, backup dry-runs record restore-point metadata and retain only the latest five restore points per workspace.

## Context

The product plan requires restore safety and retaining the last five versions. Browser backup export already encrypts payloads locally, but the Worker backup endpoint only returned metadata. Before writing backup bytes to R2, Film needs the server-side restore-point contract and retention behavior.

## Consequences

- `POST /api/backups/dry-run` now returns backup persistence and restore-point metadata.
- With D1 available, the Worker inserts a `restore_points` row with a dry-run R2-style snapshot reference.
- After insertion, older restore-point metadata is pruned so only the latest five remain for the workspace.
- Without D1, the endpoint remains memoryless dry-run.
- This dry-run endpoint does not upload backup bytes, verify R2 object existence, or make restore commits destructive. ADR 0054 adds a separate explicit R2 object upload route for already-encrypted ZIP backup bytes.
