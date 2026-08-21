# ADR 0116: Record Mutation Requests

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0113 added authorization preflights for core record updates and deletes. The next useful collaboration step is to let authorized users record intent for owner/producer review before adding real update/delete application.

## Decision

Add `POST /api/records/mutations/request-dry-run` and `POST /api/records/mutations/requests/manifest`.

The request route requires CSRF/session authorization, workspace scope, a fixed core record type, an existing core row, a valid update/delete mutation, and the same authorization as the mutation preflight. It records a bounded `record_mutation.request_created` audit event when D1 is available.

The request response policy is `record_mutation_request_metadata_only`. It returns `destructiveWrite: false` plus request metadata: entity, mutation, actor, allowed-by policy, status, summary preview/hash, bounded field keys, and timestamp.

The first request route implementation stored request metadata in audit events only. ADR 0117 supersedes that storage shape with a dedicated `record_mutation_requests` table, owner/producer resolution, and stale-checked apply routes.

## Consequences

- Update/delete work now has a visible request and review step without weakening destructive-write boundaries.
- The first implementation reused `audit_events`; ADR 0117 moves durable request status to first-class D1 rows.
- Approval resolution, stale-record checks, and actual update/delete application are handled by ADR 0117.
