# ADR 0114: Record Permission History

Date: 2026-07-08

## Status

Accepted.

## Context

Owners and producers can assign, review, expire-filter, and revoke project/task/document permissions. ADR 0103 called out permission history as future work so teams can audit how a grant changed without exposing raw audit metadata.

## Decision

Add `POST /api/records/permissions/history` for owner/producer sessions.

The route requires CSRF/session authorization, workspace scope, a fixed project/task/document entity type, an existing core row, and a bounded limit. It reads `audit_events` for `record_permission.assigned` and `record_permission.revoked` entries matching the exact entity type and ID.

The response policy is `record_permission_audit_history`. It returns only bounded permission-change metadata: action, actor member ID, target member ID, permission level, optional department, optional expiry, timestamp, count, and truncation status. Raw audit metadata remains out of the response.

## Consequences

- Owners/producers can audit permission changes from the Team inspector before broader collaboration workflows ship.
- Permission history reuses existing bounded audit events instead of creating another table.
- History is scoped to project/task/document permission UI for now; workspace/planning and other future scopes can be added when they have visible management workflows.
