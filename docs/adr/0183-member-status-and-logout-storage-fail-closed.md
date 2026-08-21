# ADR 0183: Member Status and Logout Storage Fail Closed

## Status

Accepted.

## Decision

Member lookup requires the D1 `workspace_member_statuses` join. If that query fails, the member is not treated as active; the Worker no longer retries a legacy query that assumes active status.

Live logout requires durable D1 revocation when a session cookie is present. Missing or failed D1 storage returns `503 auth_storage_unavailable`, does not claim success, and does not clear the browser cookie. Dry-run development retains its memoryless fallback.

## Context

The compatibility lookup predated the deployed member-status migration. It could turn a status-table/query failure into active membership. Logout also returned success after a D1 exception, which removed the browser cookie while potentially leaving a copied server session usable.

## Consequences

- Member status lookup failures deny session and protected-route access.
- Production logout cannot report revocation until D1 confirms the operation path.
- Operators and clients can distinguish auth-storage failure from a completed logout.
- The Worker requires the already-deployed member-status migration in every D1 environment.
