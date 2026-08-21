# ADR 0101: Audit Manifest Filter Pagination

Date: 2026-07-08

## Status

Accepted.

## Decision

Extend the protected `POST /api/audit-events/export-dry-run` route with bounded pagination and action-prefix filtering:

- `limit`: 1 to 100, default 50
- `offset`: 0 to 10000, default 0
- `actionPrefix`: optional, 1 to 80 lowercase action-prefix characters

The route applies the action filter in D1 as an exact prefix predicate with `instr(action, prefix) = 1`, reads `limit + 1` rows, returns `offset`, `nextOffset`, `actionPrefix`, `rowCount`, and `truncated`, and still returns only metadata key names/counts rather than raw `metadata_json` values. ADR 0206 replaced the original `LIKE '<prefix>%'` implementation to avoid SQLite LIKE-pattern limits and wildcard interpretation.

The Activity tab adds an action-prefix filter form and a `Next audit page` button when `nextOffset` is present.

## Context

ADR 0095 added a protected audit manifest so owners/producers can verify Worker audit coverage without leaking raw metadata values. As more Worker dry-run routes write events, the single latest-events view becomes harder to inspect.

Film needs a small operator-friendly improvement that does not become a broad audit export or privileged search feature.

## Consequences

- Owners/producers can inspect provider, restore, invite, import, or sync audit families with an action prefix.
- Pagination remains bounded and cursorless for now; it is simple but can skip/duplicate rows if new events are written between page requests.
- The metadata boundary is unchanged: raw metadata values, provider credentials, object keys, email addresses, document bodies, and operation payloads stay out of the manifest response.
- Retention policy, immutable audit export, richer search, and role-specific audit access remain future work.
