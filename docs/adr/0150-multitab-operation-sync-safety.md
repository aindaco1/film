# ADR 0150: Multi-Tab Operation Sync Safety

## Status

Accepted.

## Decision

Change successful operation sync persistence so it does not rewrite the entire in-memory workspace snapshot from the syncing tab.

After the Worker accepts queued operation IDs, the browser now:

- marks accepted operation records synced in the operation store
- appends the sync audit event to the currently stored workspace snapshot
- refreshes the current tab workspace from that stored snapshot when available

It no longer calls the generic full `persistWorkspace()` path just to save the audit entry after sync.

`npm run test:browser` now includes a multi-tab IndexedDB smoke: tab A creates and syncs a local task, tab B creates a local person from the current stored workspace, and a fresh tab verifies tab B's queued operation and workspace record survive tab A's sync.

## Context

Film is local-first and keeps workspace snapshots plus queued operation records in IndexedDB. A sync action changes operation status, but the previous success path also persisted the syncing tab's whole in-memory workspace so the audit log entry survived reloads.

In a multi-tab session, that whole-workspace write could overwrite a newer workspace snapshot written by another tab. Operation records are keyed separately and can be safely updated by accepted ID; the audit append should be similarly narrow.

## Consequences

- A sync in one tab is less likely to clobber another tab's newer workspace snapshot.
- Sync audit events are still persisted when the current stored workspace can be read.
- Broader multi-tab merge semantics remain conservative; future collaborative local editing may need per-record workspace storage or conflict-aware snapshot merging.
