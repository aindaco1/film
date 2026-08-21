# ADR 0097: Workspace Member Status Management

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0048 added D1-backed member status checks so invited or disabled members cannot authenticate or use protected Worker routes. The Team panel could invite and grant access, but owners/producers had no app path for disabling a member after access was no longer appropriate or reactivating a disabled member.

Member lifecycle management needs to stay in the Worker because it affects authorization, session validity, and audit history.

## Decision

Add protected `POST /api/members/status/dry-run` for owner/producer sessions. The route:

- validates workspace scope, target member ID, and target status
- supports only `active` and `disabled` management states
- rejects self-disable
- requires an owner actor to update an owner target
- upserts `workspace_member_statuses`
- revokes target D1 sessions when the target is disabled
- records bounded audit metadata with member ID, role, status, persistence, and session-revocation policy

The Team panel adds an `Update member status` control next to the roster. Disabled members remain visible in the roster, but active-member-only project assignment and record-permission grant selects exclude them.

## Consequences

- Owners/producers can disable or reactivate members without exposing raw emails or invite tokens.
- Disabled members lose protected-route access immediately because auth checks the status table, and D1 sessions are explicitly revoked on disable.
- The route intentionally does not manage the `invited` state; invites remain controlled by invite create/accept flows.
- Deeper member history, reason capture, ownership transfer, and irreversible account removal remain future work.
