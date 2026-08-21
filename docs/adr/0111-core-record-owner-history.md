# ADR 0111: Core Record Owner History

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0109 added protected owner manifest and transfer routes, and ADR 0110 made all browser core child rows addressable by stable IDs. Owner/producers could now correct current ownership, but the UI still had no bounded way to review how a row's owner changed over time.

## Decision

Add a protected `POST /api/records/owners/history` route backed by existing `audit_events` rows. The route requires the same owner/producer authorization, CSRF/session checks, workspace scope, fixed core entity type, and valid row ID checks as owner manifests and transfers. When D1 is available, it validates that the selected core row belongs to the workspace, then returns bounded `record_owner.transferred` audit entries for that exact entity.

The response exposes only transfer-oriented metadata: actor member ID, previous owner member ID, new owner member ID, timestamp, count, and truncation status. It does not expose arbitrary audit metadata values.

The Team inspector adds `Review owner history` next to current-owner review and transfer controls.

## Consequences

- Owners/producers can inspect recent ownership changes without direct D1 access.
- Owner history reuses bounded audit metadata instead of adding another table.
- Deleted-row history, approval workflows, reviewer/comment semantics, and update/delete authorization remain future work.
