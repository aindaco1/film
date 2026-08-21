# ADR 0103: Unexpired Record Permission Manifests

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0096 named the protected record permission manifest policy `active_record_permissions_only`. Canonical replay already treats `record_permissions` rows as active only when `expires_at` is null or in the future, but the manifest query only scoped by workspace, entity type, and entity ID.

That mismatch could show expired grants in the Team inspector even though replay would not honor them.

## Decision

Filter `POST /api/records/permissions/manifest` with the same unexpired rule used by replay:

- include rows where `expires_at` is null
- include rows where `expires_at` is greater than the Worker request timestamp
- exclude expired rows before pagination/truncation

The response policy name remains `active_record_permissions_only`, now matching the returned data.

## Consequences

- Owners/producers review only grants that can still influence current collaboration decisions.
- Expired rows remain in D1 for future history/cleanup work, but they are not exposed as active grants.
- A future permission history route should use a different policy name and explicit expired/history semantics.
