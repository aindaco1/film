# ADR 0172: Local Task Completion

## Status

Accepted.

## Decision

The Tasks workspace exposes a row-level `Complete` action for open tasks. Completing a task removes it from the browser-local open-task list, increments the selected project's completed task count, records a local audit event, and queues a metadata-only `task.completed` operation with project ID, task title, previous status, and completion timestamp.

The shared schema and Worker operation replay allow `task.completed` as a task operation. D1 replay stores the operation in `operation_log` as metadata only; it does not yet mutate canonical task rows.

## Context

The app already tracked `openTasks` plus `tasks.done`, but the Tasks workspace only supported creating tasks and changing readiness status. Solo filmmakers need a quick way to close local work items before broader collaborative task editing is finalized.

## Consequences

- The open-task list and completed count are useful in offline/local production workflows.
- Operation sync preserves completion history without pretending canonical D1 task update semantics are finished.
- Existing project membership, owner metadata, and exact task permission checks protect replay when D1 auth is available.
- Future canonical task update/delete endpoints can reuse the same completion intent after stale-write, undo, and permission semantics are explicit.
