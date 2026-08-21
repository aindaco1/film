# ADR 0099: Project Membership Manifest And Removal

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0051 added project membership assignment. Those rows are durable collaboration signals for contributor and department-lead operation replay, but owners/producers could not review or remove them from the app.

Because project memberships affect authorization, review and removal need to stay Worker-owned and audited.

## Decision

Add protected owner/producer routes:

- `POST /api/projects/memberships/manifest`
- `POST /api/projects/memberships/revoke-dry-run`

The manifest route validates workspace scope, joins `project_memberships` through `projects` to confirm workspace ownership, and returns bounded `active_project_memberships_only` rows with member ID, role, department, persistence, and audit persistence.

The revoke route requires exact project ID, member ID, and project role from a manifest row. Owner project roles require an owner actor. With D1 available, the Worker reads a matching joined row before deleting the same exact membership tuple and records bounded audit metadata.

The Team panel adds `Review project team` and `Remove` actions. After removal, the visible manifest row and count update locally.

## Consequences

- Owners/producers can inspect and remove project-scoped collaboration assignments without direct D1 access.
- Stale or mismatched browser state cannot remove a different role because the project/member/role tuple must still match.
- Removing a project membership affects future replay authorization through membership checks, but it does not revoke workspace membership, explicit record permissions, local browser operation history, or audit events.
- Membership history, ownership transfer, bulk removal, and department-specific policy tuning remain future work.
