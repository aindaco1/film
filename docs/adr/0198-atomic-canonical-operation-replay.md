# ADR 0198: Atomic Canonical Operation Replay

Date: 2026-07-09

## Status

Accepted

## Decision

Apply every newly accepted operation in one bounded D1 batch containing workspace/known-seed prerequisites, in-transaction conflict assertions, canonical create statements, relationship statements, and matching `operation_log` rows. Existing exact operation IDs remain read-only idempotent results, and individually invalid or unauthorized operations remain rejected before the batch.

Before preparing writes, the Worker resolves project references by both ID and workspace, rejects cross-workspace project IDs, rejects canonical target IDs already present in any workspace, and rejects duplicate create targets in the request. Known seed projects are materialized before child operations. Project creates are ordered before other accepted operations so a local project plus its initial records can sync together.

Inside the transaction, every new operation ID must still be absent. Create operations also require no matching applied entity-create log and no canonical target row. Project-scoped creates require the project in the current workspace after any planned project/seed writes. Plain canonical inserts and plain operation-log inserts follow those assertions. The batch is capped at 700 statements. Any statement or storage failure returns 503 with zero accepted/replayed IDs, and D1 rolls back all canonical and operation-log writes.

## Context

The prior replay loop wrote each canonical record and then its operation-log row separately before moving to the next operation. Returning zero acknowledged IDs after a later exception protected the browser queue, but did not undo earlier D1 writes. A retry could then encounter canonical rows without matching operation evidence. Project existence checks also used global IDs without enforcing the operation workspace.

## Consequences

- A replay batch cannot partially materialize canonical records or operation logs.
- Cross-workspace project references and target-ID collisions fail before writes.
- Concurrent create/log races abort the entire transaction instead of being hidden by `INSERT OR IGNORE`.
- Metadata-only task/document operations remain operation-log entries and do not mutate canonical bodies or task state.
