# ADR 0104: Expired Record Permission Manifests

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0103 makes active record permission manifests match replay behavior by excluding expired grants. That keeps the active collaboration surface accurate, but it also means owners/producers need a separate way to find expired grants for cleanup.

The existing exact revoke route can already remove a known `record_permissions` row when the caller supplies matching manifest metadata.

## Decision

Add protected `POST /api/records/permissions/expired-manifest` for owner/producer sessions.

The route reuses the active manifest request shape, workspace authorization, bounded limit, and metadata-only response shape, but returns only rows where `expires_at` is set and is not later than the Worker request timestamp. It reports `manifestPolicy: expired_record_permissions_only` and records a bounded `record_permission.expired_manifest_created` audit event.

The Team inspector adds expired project, selected-task, and selected-document permission review buttons. Rows returned by the expired manifest use the existing exact revoke action.

## Consequences

- Active grant review stays focused on permissions that can affect current replay authorization.
- Expired grant cleanup is possible without adding broad permission history semantics.
- Revocation still requires exact manifest metadata and owner/producer authorization.
- A future history view can include revoked grants from audit events, but that is a separate policy from expired-row cleanup.
