# ADR 0201: Atomic Collaboration Authorization Writes

Date: 2026-07-09

## Status

Accepted

## Decision

Apply project membership assignment/revocation, record permission assignment/revocation, and core record owner transfer through guarded D1 `batch()` transactions. Each batch contains current-state assertions, the authorization write, and bounded audit evidence. Project membership assignment also creates a missing canonical project inside the same transaction and asserts that the resulting project belongs to the requested workspace.

Permission assignment preflights an existing grant by its unique identity and returns its durable ID when updating it. A new grant transaction asserts that no concurrent identity row appeared; an existing grant transaction asserts that the same ID remains current. Permission revocation requires the exact manifest identity and `updated_at`. Owner transfer asserts both an active target member and the exact prior owner.

Every authorization mutation and audit insert must report exactly one changed row. Any assertion, write, audit, or storage failure returns 503 and D1 rolls back the sequence.

## Context

These collaboration helpers previously wrote authorization state and returned to the route before inserting audit evidence. Assignment could also create a project in a separate write. A failure could leave live access state without history, or history without the intended state. In addition, `INSERT OR IGNORE` could hide a globally conflicting project ID, and permission upserts returned a generated ID even when the database retained an existing grant ID.

## Consequences

- Collaboration authorization state and its audit evidence commit or roll back together.
- Project IDs already owned by another workspace return `project_workspace_conflict` without creating a membership.
- Updating an existing permission preserves and returns its durable ID.
- Concurrent status, membership, permission, or ownership changes fail guarded assertions instead of overwriting newer state.
- Real local D1 smoke covers the complete assign, update, transfer, and revoke sequence.
