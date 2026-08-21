# ADR 0011: Operation Sync Validation

Date: 2026-07-07

## Status

Accepted

## Decision

Validate queued local operations with a shared schema helper before the Worker accepts a dry-run sync batch.

## Context

Film is local-first, so browser actions create queued operations before future Worker replay. A shape-only sync preflight would allow invalid kind/entity pairs or oversized payloads to be marked synced before authorization and D1 replay exist.

## Consequences

- `validateOperationBatchForSync` lives in `packages/schema`.
- The Worker rejects invalid IDs, workspaces, statuses, kind/entity pairs, timestamps, summaries, and oversized or unserializable payloads.
- The sync endpoint still does not mutate canonical project/task/document records, but it now exercises the same contract future replay should start from.
- D1-backed replay now records operation metadata with authorization, idempotency, and conflict checks when D1 auth/session and operation-log storage are available.
- Per-record permission checks and canonical record mutation application remain separate work.
