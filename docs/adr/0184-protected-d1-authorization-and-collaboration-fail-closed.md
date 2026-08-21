# ADR 0184: Protected D1 Authorization and Collaboration Fail Closed

## Status

Accepted.

## Decision

When D1 is bound, protected record-comment and record-mutation authorization failures return 503 rather than granting dry-run access. Protected invite revocation, member status, project membership, record permission, record owner, and mutation-request operations likewise return explicit 503 errors when their D1 read/write path fails.

Memoryless success remains available only when D1 is intentionally absent in local dry-run development.

## Context

Several helpers predated production auth and treated a D1 exception as a dry-run result. Two authorization helpers returned allowed access after permission-query exceptions, and multiple collaboration writes could report success without persistence. That behavior is unsuitable once a D1-backed member session is authoritative.

## Consequences

- Permission-storage errors cannot grant comment or mutation access.
- Collaboration controls do not claim a member, membership, permission, owner, invite, or mutation-request change that D1 did not persist.
- Clients receive an actionable unavailable response instead of a misleading success.
- Deterministic no-D1 development remains supported.
