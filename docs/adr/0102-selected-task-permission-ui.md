# ADR 0102: Selected Task Permission UI

Date: 2026-07-08

## Status

Accepted.

## Decision

Add selected-task record permission controls to the Team inspector.

The UI exposes:

- a task selector for the current project's open tasks
- active-member selection
- permission level
- optional department scope
- optional expiry date
- `Grant task permission`
- `Review task permissions`

The form uses the existing Worker-owned `POST /api/records/permissions/assign-dry-run` route with `entityType: "task"`. The review button uses the existing protected record-permission manifest route, and revocation continues to use exact manifest-row metadata through the existing revoke route.

## Context

ADR 0090 already lets exact task `record_permissions` authorize contributor or department-lead `task.created` replay when broader project membership or project permission is absent. The Team inspector could create project and selected-document grants, but it did not expose task grants even though the Worker and replay policy supported them.

## Consequences

- Owners/producers can pre-grant one known task permission without giving project-wide write access.
- The browser still does not implement authorization locally; it only calls Worker-owned grant, manifest, and revoke routes.
- Task permissions remain scoped to open tasks visible in the current project UI. Update/delete semantics, reviewer-only task comments, closed task history, and broader ownership policies remain future work.
