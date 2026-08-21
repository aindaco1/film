# ADR 0163: Attachment Object Commit Preflights

## Status

Accepted

## Decision

Add `POST /api/restores/attachment-objects-commit-preflight` plus the `restore_attachment_object_commit_preflights` D1 table.

The route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, exact `RESTORE <workspaceId>` confirmation, a matching package verification row, a matching stored object plan, package and manifest hashes, a bounded package manifest, D1 storage, and the `ATTACHMENTS` R2 binding for destination existence checks.

It records destination readiness only. Each object is classified as ready for a future explicit byte commit, blocked by an existing destination, blocked by missing R2 binding, or blocked by destination-check failure. It checks both R2 object existence and D1 stored attachment intent rows. It accepts no raw package bytes, writes no attachment bytes, keeps `destructiveWrite: false`, and returns `canRestoreBytes: false` even when all destinations are ready.

The browser restore panel exposes this after package verification and object planning as `Check attachment commit preflight`.

## Context

ADR 0086 and ADR 0156 established non-destructive object planning after package manifest verification. That produced deterministic destination keys and explicit policy fields, but it still did not prove whether those destination keys were currently unused.

Before a byte restore commit can exist, Film needs a durable handoff record that captures destination readiness and overwrite blockers without making the destructive write path available.

## Consequences

- Future attachment byte restore commits can validate a recent commit preflight instead of trusting browser-side destination assumptions.
- Existing destination objects are blocked because overwrite policy is still not explicit.
- Package byte submission/streaming and per-object byte hash verification remain future work.
- The route gives operators a visible next step after object planning without restoring bytes.
