# ADR 0202: Atomic Comment and Mutation Review Artifacts

Date: 2026-07-09

## Status

Accepted

## Decision

Persist metadata-only comment intents, core record mutation requests, film-profile mutation requests, and mutation approval/rejection transitions with their bounded audit evidence in guarded D1 `batch()` transactions.

Comment creation reasserts the target record inside the transaction. For non-owner/producer actors it also reasserts current target ownership or an active comment/write/admin permission before inserting the body preview and SHA-256; raw comment bodies remain unstored. Mutation request creation asserts that the target still matches the captured `updated_at` state. Film-profile requests additionally assert the project workspace and exact profile presence/version. Approval/rejection asserts that the request is still pending before changing status and writing audit evidence. Rollback request scaffolding uses the same atomic core-request path with a source-request reference.

Every artifact write, status transition, and audit insert must report exactly one changed row. Any assertion, write, audit, or storage failure returns 503 and D1 rolls back the sequence.

## Context

These helpers previously wrote the review artifact or request status before the route inserted its audit event. Comment storage also returned a successful response carrying `d1_unavailable_dry_run` after a D1 exception. Permission or target state could change after preflight but before comment/request insertion.

## Consequences

- Protected comment storage now fails closed instead of reporting dry-run success after D1 errors.
- Comment authorization, mutation review artifacts, request resolution, and audit evidence cannot split.
- Concurrent target, permission, or request-status changes fail guarded assertions rather than producing stale review evidence.
- Existing mutation diff/application and rollback workflows retain their response contracts while gaining atomic request history.
