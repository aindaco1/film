# 0084 - Record Permission Replay Guard

## Status

Accepted. Extended by ADR 0088, ADR 0090, ADR 0105, and ADR 0108.

## Context

ADR 0075 made contributor and department-lead canonical replay depend on project memberships and department scope. That was a useful first collaboration guard, but production teams also need explicit record-level grants that are not the same as crew assignment. The next conservative step is to persist a bounded `record_permissions` table and use project-scoped write/admin grants as an alternate authorization signal before broader ACL management exists.

## Decision

Add a D1/SQLite `record_permissions` table with workspace, entity type, entity ID, member ID, permission level, optional department, and optional expiry fields.

Add `POST /api/records/permissions/assign-dry-run` as a Worker-owned route for owner/producer assignment of permissions to active members in the same workspace. The route requires CSRF/session authorization when D1 auth storage is available, rejects disabled or invited members, and upserts durable permission rows when D1 is available. Without D1 it remains a memoryless dry run. The Team inspector exposes a compact selected-project permission form that calls this route for active members.

Extend canonical operation replay so contributor and department-lead task/document creates and metadata-only document updates may proceed when the session member has either a matching `project_memberships` row or an unexpired project `record_permissions` write/admin grant. ADR 0088 later adds explicit document record permissions for metadata-only `document.updated` replay. ADR 0090 later allows exact task/document record permissions for direct canonical creates. ADR 0105 later extends the same guard shape to equipment creates while keeping person/expense replay operator-only. ADR 0108 later adds core owner metadata as another authorization signal. Department-scoped permissions must match the operation department; scoped non-operator sensitive records still require owner/producer/director replay.

## Consequences

- Film now has a durable permission table, Worker-owned assignment route, and visible selected-project permission control before broader collaboration UI is expanded.
- Canonical replay reports `recordAuthorizationPolicy: canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available`.
- The first record-permission enforcement is intentionally project-scoped, then extended to metadata-only document update replay in ADR 0088, exact task/document create grants in ADR 0090, equipment create replay in ADR 0105, and core owner metadata in ADR 0108; ownership transfer, person/expense collaboration, and reviewer/comment semantics remain future work.
- Production invite delivery and user-facing permission management remain separate slices.
