# ADR 0112: Record Comment Intents

Date: 2026-07-08

## Status

Accepted.

## Context

The record permission model already includes a `comment` level, but there was no protected action that exercised comment authorization. Adding full stored comments would create a new primary-content export and restore surface before the backup model includes comments.

## Decision

Add metadata-only record comment intents for project, task, and document rows.

The Worker route `POST /api/records/comments/dry-run` requires an authenticated session, CSRF, workspace scope, a fixed commentable entity type, an existing core row, and a bounded comment body. Owner/producer sessions can create comment intents. Other roles need to own the selected record or hold an unexpired explicit `comment`, `write`, or `admin` record permission for the exact row.

The Worker route `POST /api/records/comments/manifest` uses the same session, workspace, row-existence, and owner/comment/write/admin authorization checks. It returns only bounded metadata for the exact selected row: author member ID, body preview, body hash, created timestamp, count, and truncation status.

When D1 is available, the Worker stores only a bounded body preview and SHA-256 hash in `record_comment_intents`; it does not store the full comment body. Audit metadata is bounded and includes the entity, body length or manifest count, hash or policy name, truncation state, and persistence mode.

## Consequences

- The `comment` permission level is now exercised by a protected Worker path without exposing full comment content.
- The UI can confirm reviewer/comment access semantics and review saved intent metadata before comments become primary exported content.
- Full comment storage, comment export/restore, threads, mentions, and deletion/moderation workflows remain future work.
