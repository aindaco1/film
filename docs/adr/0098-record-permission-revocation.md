# ADR 0098: Record Permission Revocation

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0096 added protected project and document permission manifests. Owners/producers could review current explicit grants, but they still needed a Worker-owned path to remove stale or over-broad grants.

Revocation changes collaboration authorization, so it must live behind the same session, role, workspace, and audit boundaries as assignment.

## Decision

Add protected `POST /api/records/permissions/revoke-dry-run` for owner/producer sessions. The route validates workspace scope and requires the manifest row's:

- permission ID
- entity type
- entity ID
- member ID
- permission level

With D1 available, the Worker first reads a row matching every supplied field, then deletes with the same exact-match predicate. Mismatched or stale requests return `record_permission_not_found`. Successful revokes record bounded audit metadata and return `revokePolicy: "exact_permission_match_only"`.

The Team panel renders `Revoke` actions beside permission manifest rows. After a successful revoke, the browser removes the grant from the visible manifest and updates the count.

## Consequences

- Owners/producers can remove project/document grants without direct D1 access.
- Stale browser state cannot delete a different grant because every visible manifest field must still match.
- Revocation removes future authorization based on that explicit grant; it does not remove project memberships, historical audit events, or local browser operation history.
- Permission history, undo, bulk revocation, and grant-expiry automation remain future work.
