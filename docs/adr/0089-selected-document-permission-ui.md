# 0089 - Selected Document Permission UI

## Status

Accepted. Extended by ADR 0096 and ADR 0102.

## Context

ADR 0088 let the Worker authorize metadata-only `document.updated` replay with an explicit document `record_permissions` write/admin grant. The Team inspector could assign project memberships and selected-project permissions, but it did not expose a way to create the document grants that the Worker now honors.

## Decision

Add a selected-document permission form to the Team inspector. It uses the current selected document, active workspace members, the same permission levels as project grants, optional department scope, optional expiry, and the existing Worker-owned `POST /api/records/permissions/assign-dry-run` route with `entityType: "document"`.

Project and document permission form state stay separate so granting one scope does not overwrite the visible status for the other. The UI remains a dry-run/Worker-owned assignment path and does not make document body storage authoritative.

## Consequences

- Owners and producers can create the document-level permission rows needed for metadata-only document update replay without granting project-wide write access.
- The first document permission UI is scoped to the currently selected document; broader permission management and review/comment semantics remain future work.
- ADR 0096 adds protected project/document permission manifest review for owner/producer sessions.
- ADR 0102 adds selected-task permission management using the same Worker-owned record-permission routes.
