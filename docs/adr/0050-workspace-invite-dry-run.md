# ADR 0050: Workspace Invite Dry Run

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0087 and ADR 0100.

## Decision

Implement workspace invite creation and acceptance as Worker-owned dry-run routes backed by D1 when available.

Owners and producers can create invites for a workspace through `POST /api/invites/create-dry-run`. Producer-created owner invites are rejected. Invite creation stores the target email as `email_hash`, stores only a hashed token, revokes older pending invites for the same workspace/email hash, records an audit event, and returns a development-only token without sending email.

Unauthenticated invite acceptance uses `POST /api/invites/accept-dry-run`. The Worker resolves the token hash, rejects expired or non-pending invites, creates or updates the workspace member, activates `workspace_member_statuses`, marks the invite accepted, and records an audit event. Acceptance does not create a session; the accepted member signs in through the existing magic-link path.

## Context

The MVP needs collaboration foundations before deeper provider integrations, but production invite delivery, custom routes, abuse controls, and email provider policy are not finalized. The D1 invite and member-status tables already exist, and auth now rejects invited/disabled members and workspace mismatches.

## Consequences

- Browser code never stores raw invite emails in the local mirror, operation log, or backups.
- Development tokens are visible only in the immediate dry-run response so local UI can exercise acceptance before email delivery exists.
- D1-backed acceptance can be tested end to end without adding production email, SMS, OAuth, or provider credentials.
- ADR 0100 adds protected pending invite manifests and exact pending invite revocation without exposing raw emails or token hashes.
- Future live invite delivery can reuse the D1 invite and dry-run delivery outbox model but must add abuse controls, delivery provider integration, token lifecycle policy, and public route decisions before going live.
