# ADR 0210: Canonical Workspace Hydration

## Status

Accepted.

## Decision

Add an authenticated, CSRF-protected `POST /api/workspaces/current/snapshot` route that returns a bounded canonical D1 workspace snapshot. The snapshot contains workspace/member metadata and core project, film-profile, task, document, people, equipment, expense, and restore-point records without contact fields, private notes, raw audit metadata, provider values, or attachment bytes.

Owner, producer, and director sessions can read all core project records, while expenses remain owner/producer or exact-owner/permission scoped. Other roles receive projects reachable through project membership, project ownership, or active record permissions; sensitive documents require exact document ownership or permission. Sensitive people and expenses remain restricted. Every collection has a fixed limit and the response reports truncated collection names.

After magic-link verification, and after a same-tab reload with a session token retained in `sessionStorage`, the browser fetches the canonical snapshot and reconciles it into IndexedDB. Canonical records replace fixture data. Explicitly queued local creates and unsynced task/document edits remain in the local mirror until replay succeeds. Successful D1 operation replay refreshes the snapshot again.

## Context

The static app previously always opened the demo `workspace_acme` mirror. Production authentication could succeed while the browser continued to show fixture projects, and no general D1 read path existed for another device or collaborator. Reloading also discarded the in-memory CSRF token even while the HttpOnly session cookie remained valid.

## Consequences

- Production opens the authenticated D1 workspace instead of demo content.
- Reloads in the same tab restore the session without exposing CSRF through the session metadata endpoint.
- A new tab still requires a new magic link because CSRF tokens are not persisted to long-lived local storage.
- Snapshot reads are bounded full snapshots, not incremental cursors; delta sync and richer conflict presentation remain future work.
- The browser remains an offline mirror, while D1 is authoritative for records that have completed replay or direct canonical writes.
