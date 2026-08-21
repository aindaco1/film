# ADR 0065: Stored Attachment Export Pagination

Date: 2026-07-08

## Status

Accepted

## Decision

Add bounded offset pagination to stored R2 attachment export manifests and package plans.

`POST /api/attachments/r2/export-manifest` and `POST /api/attachments/r2/export-package-dry-run` accept `offset` plus the existing bounded `limit`. Responses include `offset`, `nextOffset`, `truncated`, and the current page of D1-confirmed attachment rows. Package plans created from paginated requests bind only the returned page of object keys unless the browser submits an explicit selected object-key list.

## Context

The stored attachment export routes were capped to avoid unbounded D1 reads and Worker memory pressure. Without pagination, large workspaces would be permanently truncated and unable to safely export package pages.

## Consequences

- Each page remains bounded to at most 1,000 D1 rows.
- Package ZIP downloads still require a matching unexpired package plan token.
- Browser UI now reports the next page offset when a manifest or package plan is truncated.
- Cursor pagination can replace offset pagination later if large datasets need better performance.
