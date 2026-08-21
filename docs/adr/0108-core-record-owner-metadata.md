# ADR 0108: Core Record Owner Metadata

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0109.

## Context

Film now has D1-backed project memberships and explicit record permissions, but Worker-applied canonical records still lacked a durable owner signal. That made small solo-to-team workflows awkward: a contributor could create a row, but future replay authorization could not recognize that contributor as the row's owner unless an owner/producer also created a separate grant.

## Decision

Add nullable `owner_member_id` metadata to core canonical D1 rows: projects, documents, tasks, people, equipment, and expenses.

When operation replay applies a canonical create, the Worker stores the authenticated actor member ID as the owner metadata for the created row. The replay guard can then use owner metadata as an authorization signal alongside project memberships and explicit `record_permissions` rows:

- Owned projects can authorize scoped task, document, and equipment creates under that project.
- Owned documents can authorize metadata-only `document.updated` replay for that document.
- Sensitive records still require the existing operator role path.
- Department-scope matching still applies when authorization comes from a membership or explicit permission grant.

The migration keeps ownership nullable so existing rows, imported records, and restored rows are not forced into a false owner.

## Consequences

- Contributor-created canonical rows have an auditable owner member without exposing raw identity data outside D1.
- The replay response policy remains `canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available`.
- The migration validator now checks the owner columns explicitly while running the migration chain against fresh SQLite databases.
- Reviewer/comment semantics, update/delete authorization, and person/expense collaboration remain future work. ADR 0109 adds protected owner transfer.
