# ADR 0195: Atomic Truthful Notion Planning Imports

Date: 2026-07-09

## Status

Accepted

## Decision

Apply new Notion planning rows and their audit evidence in one bounded D1 batch. The import route remains create-only: exact existing rows are idempotent, changed existing rows return bounded update previews, and neither class updates D1.

Before batching, the Worker normalizes the whole request, rejects duplicate deterministic IDs, resolves project title hints only inside the authenticated workspace, and reads deterministic row IDs from their fixed destination tables. An ID already owned by another workspace is rejected as `id_workspace_conflict` without returning persisted values or a field diff.

Each planned create has an in-transaction absence assertion. Project-scoped creates also have an in-transaction same-workspace project assertion. Plain `INSERT` statements follow those guards, and the bounded `import.notion_planning_committed` audit event is the final statement. Any assertion, insert, or audit failure rolls back the batch and returns 503 with `destructiveWrite: false`.

Responses now report `destructiveWrite: true` and `dryRun: false` when at least one D1 row was created. Idempotent/update-preview-only responses remain non-destructive. The endpoint accepts at most 200 records and 700 prepared statements.

## Context

The prior route inserted each new row separately and recorded audit evidence afterward. A storage failure could leave a partial import with no matching audit event. It also returned `destructiveWrite: false` after successful D1 inserts and could compare a deterministic ID owned by another workspace, exposing a bounded field-level difference.

## Consequences

- New planning rows and audit evidence succeed or roll back together.
- The API accurately distinguishes D1 writes from preview-only classifications.
- Cross-workspace deterministic-ID collisions do not disclose row values.
- Changed existing planning rows still require a future explicit update approval path.
