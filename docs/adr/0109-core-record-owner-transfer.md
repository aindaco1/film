# ADR 0109: Core Record Owner Transfer

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0110 and ADR 0111.

## Context

ADR 0108 added nullable owner metadata and replay authorization based on owned project and document rows. That still left owner changes implicit: ownership could be set by Worker-applied creates, but owner/producers had no protected route to correct or transfer ownership as a team changes.

## Decision

Add Worker-owned routes for core D1 owner metadata:

- `POST /api/records/owners/manifest`
- `POST /api/records/owners/transfer-dry-run`

Both routes require owner/producer authorization, CSRF/session checks when D1 auth storage is available, matching workspace scope, a fixed core entity type, and a valid core record ID. The manifest route returns only the selected entity and current owner member ID. The transfer route also requires an active target workspace member, verifies the core record belongs to the workspace, updates only that record's `owner_member_id`, returns the previous owner member ID, and records bounded audit metadata.

The Team inspector exposes owner review and transfer for selected project, selected task, selected document, person, equipment, and expense ownership. The backend supports all core owner-bearing tables: projects, documents, tasks, people, equipment, and expenses.

## Consequences

- Owners/producers can review and correct ownership without direct D1 access or broad ad hoc SQL.
- Owner transfer is explicit and audited, but it does not grant project membership or create `record_permissions` rows.
- Ownership history, approval workflows, reviewer/comment semantics, and update/delete authorization remain future work.
