# ADR 0051: Project Membership Assignment Dry Run

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0099.

## Decision

Add a Worker-owned dry-run route for assigning active workspace members to projects:

`POST /api/projects/memberships/assign-dry-run`

The route requires owner/producer mutation authorization when D1 auth storage is available, rejects workspace mismatches, rejects producer-assigned owner roles, verifies that the target member exists in the same workspace and is active, ensures a project row exists for seed/local projects, and upserts `project_memberships`.

The Team inspector exposes a compact assignment form for the currently selected project. The web app stores only local audit feedback and transient UI state; the durable authorization signal is the D1 `project_memberships` row.

## Context

Invite acceptance activates workspace members, and operation replay already requires project membership for contributor and department-lead task/document creates. Without an assignment route, tests had to seed `project_memberships` directly and the UI could not exercise the collaboration path.

## Consequences

- Contributor and department-lead replay guards can now be exercised through a user-visible Worker route.
- Project assignments remain unavailable to signed-out users and fail closed for disabled/invited target members.
- ADR 0099 adds protected project membership manifests and exact assignment removal. Production still needs deeper record-level permissions, history, department scope rules, and invite delivery hardening before collaboration is complete.
