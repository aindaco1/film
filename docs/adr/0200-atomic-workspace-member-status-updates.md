# ADR 0200: Atomic Workspace Member Status Updates

Date: 2026-07-09

## Status

Accepted

## Decision

Apply workspace member active/disabled changes in one guarded D1 `batch()`. The transaction asserts that the target member still has the preflight workspace, role, and status, then writes the new status, revokes every active target session when disabling, and inserts bounded audit evidence.

The status and audit writes must each report exactly one changed row. Any assertion, write, session-revocation, audit, or storage failure returns 503 and D1 rolls back the sequence. Reactivation does not revive revoked sessions; the member must authenticate again.

## Context

The prior helper upserted member status, revoked sessions in a later statement, and returned to the route before audit evidence was inserted. A D1 failure could therefore leave status, session validity, and audit history inconsistent. In particular, a disabled member could retain an active session if revocation failed after the status write.

## Consequences

- Member status, disable-time session revocation, and audit evidence commit or roll back together.
- A concurrent role or status change fails the in-transaction assertion instead of overwriting newer state.
- Retrying after a storage failure is safe because the original member and session state remains intact.
- Reactivation never silently restores a previously revoked session.
