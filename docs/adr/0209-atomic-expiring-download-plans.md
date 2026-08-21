# ADR 0209: Atomic Expiring Download Plans

Date: 2026-07-09

## Status

Accepted

## Decision

Persist short-lived bearer download plans and their issuing audit evidence in one D1 batch:

- encrypted backup object download plans, and
- stored attachment package download plans.

Backup plan creation also reasserts the stored R2 restore-point proof inside the transaction. A failed backup plan batch returns 503 with no plan ID or token. A failed attachment package plan returns the existing blocked dry-run response with no plan ID or token; it may record a separate blocked-attempt audit because that response authorizes no download.

## Context

Both routes return short-lived bearer tokens that authorize encrypted or packaged bytes. Their plan rows were durable, but the audit event was a later independent write. D1 audit failure could therefore leave a usable token without its issuing history.

## Consequences

- A returned backup or attachment package bearer token always has matching bounded audit evidence.
- Backup plans cannot advance after their stored restore point disappears or leaves the expected R2 namespace.
- Failed attachment package plan storage remains a non-authorizing, operator-visible blocker.
- Download routes keep their existing token-hash, expiry, workspace, object-key, and D1 source revalidation.
- Unit fault injection verifies rollback/no-token behavior; local real-D1 browser and attachment probes exercise both plan types without exposing token values in logs.
