# ADR 0208: Atomic Planning Restore Previews

Date: 2026-07-09

## Status

Accepted

## Decision

Persist each durable planning restore preview and its bounded `restore.planning_dry_run_created` audit event in one D1 batch.

When D1 is bound, any preview insert, audit insert, result-count, or batch failure returns 503 and no planning preview ID. Successful and rejected preview responses retain their existing 200/422 semantics when storage succeeds. The preview remains non-destructive and does not write planning rows.

## Context

The destructive planning commit requires a matching durable `restore_planning_previews` row. That row was inserted before a separate audit write, and bound-D1 failure could return a null preview ID while preserving the route's ordinary preview response.

## Consequences

- Every planning preview ID usable by planning commit has matching bounded audit evidence.
- Bound-D1 failures cannot produce a memoryless planning authorization artifact.
- Rejected record diagnostics remain available through the same persisted preview shape when storage succeeds.
- Unit fault injection verifies failure and retry; the real-D1 restore probe verifies the preview/audit pair and removes both.
