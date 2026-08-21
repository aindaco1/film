# ADR 0182: D1-Authoritative Session Role and Workspace

## Status

Accepted.

## Decision

For member-bound sessions, current D1 membership is authoritative for role, status, and workspace. KV remains a session cache but cannot override a D1 role. A D1 member ID that is missing, has an invalid role, or belongs to a different workspace than the session is treated as inactive and rejected.

Unscoped local dry-run sessions may continue to use the cached role because they have no member binding. Production already rejects those sessions.

## Context

The previous membership reader preferred a non-owner role cached in KV over the current D1 member role. A producer downgraded to contributor could therefore retain producer authorization until the cached session expired. It also did not compare the member workspace with the workspace stored on the session.

## Consequences

- Role downgrades take effect on the next session or protected-route read without waiting for KV expiry.
- KV corruption or staleness cannot elevate a D1-bound member.
- Cross-workspace member/session mismatches fail closed.
- D1 remains the single authority for current workspace membership.
