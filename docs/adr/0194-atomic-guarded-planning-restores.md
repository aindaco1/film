# ADR 0194: Atomic Guarded Planning Restores

Date: 2026-07-09

## Status

Accepted

## Decision

Commit a planning restore as one bounded D1 batch containing every non-idempotent planning-row write, the durable `restore_planning_commits` row, and the bounded restore audit event.

D1 documents that `db.batch()` executes statements as a transaction and rolls back the sequence when a statement fails:

- <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>
- <https://developers.cloudflare.com/d1/platform/limits/>

The Worker reruns the durable planning preview immediately before commit. Fixed-query SQLite assertions then run inside the transaction before every create or update: creates require the ID to be absent from the fixed destination table, updates require the ID in the current workspace, and project-scoped rows require their project in the current workspace. A stale target or project relationship intentionally fails the batch instead of allowing `ON CONFLICT` to change the approved action.

The commit endpoint accepts at most 150 records and 700 prepared statements. Duplicate IDs, project-scoped production roles, and invalid created/updated timestamps are rejected during preview. A batch failure returns 503 with `destructiveWrite: false`; an oversized batch returns 422. Neither path writes planning rows, commit evidence, or commit audit evidence.

## Context

The prior endpoint upserted each planning row separately, inserted the restore-commit row afterward, and recorded audit evidence in a third operation. A storage or constraint failure could therefore leave a partial planning restore without durable commit evidence. The pre-commit preview also did not close the race between conflict reads and upserts.

## Consequences

- Planning rows and their commit/audit evidence succeed or roll back together.
- Concurrent target or project changes cannot silently alter approved restore semantics.
- Idempotent rows remain write-free while still appearing in the durable result summary.
- Planning restores above 150 records need a future resumable, proof-bound segmented design; they are not partially applied.
