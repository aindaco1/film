# ADR 0115: Project Membership History

Date: 2026-07-08

## Status

Accepted.

## Context

The Team inspector can assign project memberships, review the active project team manifest, and remove exact assignments. Owners and producers also need a bounded audit view of who was assigned or removed without exposing raw audit metadata.

## Decision

Add `POST /api/projects/memberships/history` for owner/producer sessions.

The route requires CSRF/session authorization, workspace scope, an existing project row, and a bounded limit. It reads `audit_events` for `project_membership.assigned` and `project_membership.revoked` rows matching the exact workspace and project.

The response policy is `project_membership_audit_history`. It returns only membership-change metadata: action, actor member ID, target member ID, role, optional department, timestamp, count, and truncation status. It does not return raw audit metadata, invite email hashes, tokens, comments, or provider data.

## Consequences

- Owners/producers can inspect project-team changes before broader collaboration workflows ship.
- Membership history reuses existing audit events instead of adding a second membership-history table.
- The route is project-scoped for now; workspace-wide membership history can be added later if the UI grows a cross-project audit workflow.
