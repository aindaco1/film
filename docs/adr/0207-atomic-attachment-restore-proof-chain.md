# ADR 0207: Atomic Attachment Restore Proof Chain

Date: 2026-07-09

## Status

Accepted

## Decision

Create each non-destructive attachment restore proof and its bounded audit event in one D1 batch:

- attachment package preflight,
- package verification,
- object plan, and
- object commit preflight.

Verification creation reasserts the exact package-preflight row inside its batch. Object-plan creation reasserts the exact package-verification row. Commit-preflight creation reasserts both the exact package verification and object plan. When D1 is bound, any assertion, insert, audit, or batch failure returns 503 and no proof ID.

The commit preflight remains non-destructive. It may inspect D1 and R2 destination state, but it writes no attachment bytes and cannot report `canRestoreBytes: true`.

## Context

The destructive attachment object commit already had reservation, create-only R2 storage, atomic D1 finalization, and compensation/retry behavior. Its four upstream proof rows were durable, but each audit event was a later independent write. The first three routes could also return success with a null proof ID after a bound-D1 failure.

Those artifacts authorize the later byte-commit route. A proof without audit evidence, or a downstream proof created after its upstream row changed, weakens the restore history even when no byte write occurs at that stage.

## Consequences

- Every successful attachment proof ID has matching bounded audit evidence.
- Upstream package, hash, manifest, object-plan, destination, and status evidence cannot change between route validation and downstream proof insertion.
- Bound-D1 errors cannot degrade into memoryless attachment restore authorization success.
- Existing no-overwrite and explicit byte-commit rules are unchanged.
- Unit fault injection covers failure and retry at all four stages; a dedicated local Wrangler probe validates the complete chain against real D1, performs no R2 write, and removes its proof and audit rows.
