# ADR 0199: Atomic Approved Mutation Application

Date: 2026-07-09

## Status

Accepted

## Decision

Apply approved core-record and film-profile mutations as guarded D1 transactions. Each batch contains:

- an assertion that the mutation request is still `approved_pending_apply`;
- an assertion that the target still matches its approved `updated_at` state, or remains absent for an approved new film profile;
- the allowlisted target update, delete, or profile insert;
- the request transition to `applied` with bounded field diffs and rollback guidance in `application_json`; and
- deterministic bounded audit evidence.

The target write and request transition must each report one changed row. Any assertion, write, request-state, audit, or storage failure returns 503 with `destructiveWrite: false`; D1 rolls back the sequence. A changed or deleted target is marked `stale_record_blocked` through the existing non-destructive stale path instead of being applied.

## Context

The prior apply helpers changed the target first, updated the mutation-request row in a later statement, reread the request, and recorded audit evidence from the route afterward. A D1 failure could therefore leave an updated/deleted target attached to an approved-but-not-applied request, or an applied request without audit evidence. Guarded target writes reduced stale risk but did not make the multi-statement result atomic.

## Consequences

- Target state, request application/rollback evidence, and audit evidence commit or roll back together.
- Approved stale-check semantics are preserved inside the transaction, closing the read/write race.
- Retrying after a storage failure remains safe because the request is still approved and the target is unchanged.
- Idempotent reads of already applied requests do not repeat the destructive write.
