# ADR 0206: Atomic Restore Proof Chain and Prefix Matching

Date: 2026-07-09

## Status

Accepted

## Decision

Create each non-destructive restore authorization artifact and its bounded audit event in one D1 batch:

- restore approval,
- restore commit attempt, and
- restore application preflight.

When D1 is bound, any assertion, insert, audit, or batch failure returns 503 and no proof ID. Commit-attempt creation reasserts the exact approval and stored R2 restore point inside the transaction. Application-preflight creation reasserts the exact approval, commit attempt, and stored R2 restore point inside the transaction.

Use `instr(column, prefix) = 1` for D1 prefix predicates. Do not express R2 snapshot namespaces or user-supplied audit action prefixes as `LIKE '<prefix>%'` patterns.

## Context

The three restore proof records were durable, but each matching audit event was written afterward. D1 failure could therefore leave an authorization artifact without its audit evidence, and approval storage failure could still produce a successful response with a null proof ID.

Real local-D1 verification also exposed a separate portability defect: the stored-backup namespace prefix is 53 characters, while the local D1 SQLite build rejects LIKE patterns longer than 50 characters. The lookup caught that SQL error and reported valid R2 restore points as unverified.

## Consequences

- A successful proof ID always has matching bounded audit evidence.
- Upstream restore proof rows cannot change between route validation and downstream proof creation without rolling back the batch.
- Bound-D1 failures cannot degrade into memoryless restore authorization success.
- Stored-backup listing, lookup, and proof assertions work without wildcard-pattern limits or wildcard interpretation.
- Audit action-prefix filtering remains bounded and exact-prefix based.
- Unit fault injection covers failure and retry at all three stages; the local Wrangler suite verifies the complete chain against real D1 and removes its probe rows.
