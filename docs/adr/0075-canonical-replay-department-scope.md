# ADR 0075: Canonical Replay Department Scope

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0084 and ADR 0108.

## Decision

Strengthen Worker operation replay authorization for canonical D1 creates.

Owner, producer, and director sessions keep the operator path for project, task, and document creates. Contributor and department-lead sessions still need an active `project_memberships` row before task or document creates can be applied to canonical D1 tables. Department leads now need a matching operation `department` value when their project membership has a department. Scoped non-operator members cannot create canonical records marked `sensitive: true`. ADR 0084 later adds explicit project `record_permissions` write/admin grants as an alternate scoped signal. ADR 0108 later adds core owner metadata as another scoped signal.

The operation sync response now reports `recordAuthorizationPolicy: canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available`.

## Context

The first replay guard only checked that contributors and department leads had project membership before applying task/document creates. Film production teams need department-limited collaboration before broader live collaboration and destructive restore paths ship. This adds a small, testable permission layer without introducing a full ACL system or changing browser-local behavior.

## Consequences

- Department-lead replay with missing or mismatched department is rejected before operation-log persistence.
- Contributor replay with a mismatched explicit department is rejected.
- Sensitive canonical records require an operator role.
- Operator-created sensitive documents persist `sensitive = 1`.
- Future work still needs department metadata on more canonical tables, ownership transfer, and review/approval workflows beyond the current project-level membership, owner metadata, and record-permission guard.
