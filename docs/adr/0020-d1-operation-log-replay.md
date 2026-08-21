# ADR 0020: D1 Operation Log Replay

Date: 2026-07-08

## Status

Accepted

## Decision

Replay validated browser operation batches into D1 `operation_log` metadata when the Worker has usable D1 auth/session and operation-log storage. ADR 0025 extends this by applying bounded create operations for projects, tasks, and documents to canonical D1 tables; backup, restore, import, and workspace seed operations remain metadata-only.

The Worker treats repeated operation IDs with the same workspace, kind, entity, payload, and status as idempotent. It rejects reused operation IDs with different metadata as `operation_conflict`, rejects a second applied operation for the same workspace/entity/kind as `entity_conflict`, and applies the operation-kind role policy from ADR 0023 before replaying metadata.

If D1 is missing, unmigrated, or unavailable in local development, the endpoint preserves the prior memoryless dry-run validation behavior and reports that persistence mode in the response.

## Context

Film is local-first, so browser actions are queued before sync. The first sync endpoint validated operation shape but did not persist or detect replay conflicts. The next conservative step was Worker-owned operation metadata replay before broad canonical record mutation.

## Consequences

- The browser can still mark accepted operations synced using the existing `accepted` response list.
- The response now exposes `persistence`, `replayed`, `idempotent`, `canonicalApplied`, `metadataOnly`, `conflictPolicy`, and `authorizationPolicy` for diagnostics and UI status.
- Operation replay is protected by the existing session guard and operation-kind role checks when D1 auth storage is available.
- Broader update/delete mutation application, ownership transfer, and reviewer/comment collaboration checks remain future work.
