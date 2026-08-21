# ADR 0041: Canonical Create Project Memberships

Date: 2026-07-08

## Status

Accepted

## Decision

Require contributors and department leads to have a matching `project_memberships` row before D1 replay applies canonical `task.created` or `document.created` operations with a project relation.

## Context

ADR 0027 blocked contributor and department-lead creates under unknown projects. That was a useful first guard, but known-project existence is not enough for collaboration. The membership tables now exist, and dry-run sessions can carry a D1 workspace member id into replay.

## Consequences

- Owner, producer, and director roles can still apply canonical create operations broadly.
- Contributor and department-lead task/document creates under known projects are rejected as `project_membership_required` unless their session member is assigned to that project.
- Operation log rows now record `actor_member_id` for replayed operations when the session has a member id.
- Full department-scope, member status, invite acceptance, and record-level update/delete policies remain future work.
