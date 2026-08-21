# ADR 0027: Canonical Create Record-Scope Guard

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0105 and ADR 0108.

## Decision

When D1 replay applies canonical `task.created` or `document.created` operations, department lead and contributor roles must target an existing or known seed project when a project relation is present. ADR 0105 later extends the same scope guard to `equipment.created`.

## Context

Operation-kind role checks are broad. They say whether a role may create a kind of record, not whether that role may create it under a specific project. Film v1 needs collaboration, and the first safe record-level boundary is the canonical create path that already writes to D1 tables.

## Consequences

- Owner, producer, and director create replay behavior stays unchanged.
- Department leads and contributors can still create unassigned task/document records.
- Department leads and contributors can create task/document records under projects already present in D1 or under known seed demo projects.
- Department leads and contributors cannot replay task/document creates under unknown project IDs; those operations are rejected with `project_scope_not_found` before canonical rows or operation-log entries are written.
- This is still a narrow guard. Later ADRs add workspace membership, project assignments, department scopes, explicit collaboration grants, and owner metadata; update/delete ownership transfer remains future work.
