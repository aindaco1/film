# ADR 0048: Workspace Member Status Auth

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0097.

## Decision

Add D1-backed workspace member status enforcement for Worker auth paths using a `workspace_member_statuses` side table.

## Context

The shared browser model distinguishes active and invited members, and future invite flows need revocation/disable behavior. The already-applied D1 `workspace_members` table does not include a status column, so mutating that base table would be riskier than adding an idempotent companion table.

## Consequences

- Migration `0006_workspace_member_statuses.sql` adds active, invited, and disabled status rows keyed by member id.
- Legacy members with no status row default to active.
- Magic-link verification rejects invited or disabled matching workspace members before consuming the one-time token.
- Protected mutations and read-only session metadata reject sessions bound to non-active members.
- KV cached non-owner roles remain authoritative for dry-run tests, while D1 member status is still checked.
- Invite acceptance activates members through the status table. ADR 0097 adds protected active/disabled status management and target session revocation.
