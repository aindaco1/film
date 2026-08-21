# ADR 0211: Canonical Task and Markdown Writes

## Status

Accepted.

## Decision

Apply `task.updated` and `task.completed` operations to canonical D1 task rows in the same guarded batch as their operation-log evidence. Each transition validates the submitted previous status, project/workspace relationship, and existing canonical task state. The D1 batch reasserts that state before changing the task and recording the operation; stale transitions are rejected rather than overwriting newer work.

Add a separate `POST /api/documents/markdown` route for native/Markdown document bodies. The route requires an authenticated session, CSRF metadata, matching workspace/project/document IDs, a body no larger than 64 KiB, and the exact prior `updated_at` value. Owners, producers, and directors can write accessible documents; other roles require exact document ownership or an active document `write`/`admin` permission. The body update and bounded audit evidence commit atomically. Audit metadata contains only IDs, size, SHA-256, timestamps, and sensitivity state, never Markdown text.

The browser saves Markdown to IndexedDB first. When a canonical document version is known, it also attempts the Worker write. A network, authorization, or stale-version failure leaves the local draft and queued metadata operation intact for user recovery.

## Context

Task state/completion and document updates previously produced metadata-only operation-log history. Other devices could not observe task progress, and Markdown bodies stayed permanently local even after document creation reached D1.

## Consequences

- Task state and completion become visible through canonical workspace hydration.
- Concurrent task changes fail on previous-status mismatch.
- Markdown body conflicts fail with `stale_document_version` and preserve the local draft.
- D1 stores native Markdown bodies as application data; provider secrets, contacts, attachment bytes, and audit bodies remain excluded.
- Document creates must replay and hydrate once before direct body persistence has a canonical stale-check token.
