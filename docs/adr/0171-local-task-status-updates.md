# ADR 0171: Local Task Status Updates

## Status

Accepted.

## Decision

The Tasks workspace exposes a row-level status selector for each open task. Changing a status updates the browser-local workspace immediately and queues a metadata-only `task.updated` operation with project ID, task title, new status, and previous status.

The shared schema and Worker operation replay allow `task.updated` as a task operation. D1 replay stores the operation in `operation_log` as metadata only; it does not yet mutate canonical task rows.

## Context

Film needs useful local production task handling before deeper collaborative editing is fully designed. The existing UI could create tasks and export a task list, but it could not change readiness/overdue/pending status without using the heavier protected record-mutation flow.

## Consequences

- Solo users can keep the local Tasks workspace current while offline.
- Sync preserves an auditable status-change history without prematurely committing server-side task update semantics.
- Existing project membership, owner metadata, and direct task permission checks protect replay when D1 auth is available.
- A future canonical task edit endpoint can apply the same status transitions after stale-write, rollback, and permission semantics are explicit.
