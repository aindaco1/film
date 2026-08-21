# ADR 0175: Member-Only Live Magic-Link Authentication

## Status

Accepted.

## Decision

Production uses `AUTH_MAGIC_LINK_MODE=live`. A magic-link request always returns the same generic accepted response, but the Worker sends a Resend email only when the normalized email hash belongs to an active D1 workspace member. Tokens are random, short-lived, stored only as hashes, bound to that member and workspace, and consumed once. Verification fails closed if D1 or KV is unavailable, if membership is not active, or if a legacy session lacks member/workspace scope.

The web app consumes `magicLinkToken` from the production URL and immediately removes it from browser history. Local Wrangler development explicitly overrides the mode to `dry_run`, where test tokens can still be returned for deterministic smoke tests.

Production owner bootstrap is a separate operator command, `npm run bootstrap:production-owner -- --apply`. It reads the approved owner identity from an ignored companion environment file, hashes it locally, expires prior links for the target member, revokes target-member and workspace-less sessions, upserts the workspace/member rows, records a bounded operator audit event, and never prints the email or hash.

## Context

The previous production configuration exposed the local dry-run behavior. An unknown email could receive a development token and create a workspace-less owner session because the authorization fallback treated missing workspace scope as permitted.

## Consequences

- Unknown and inactive addresses are indistinguishable at the API response boundary and receive no email.
- Production sign-in depends on D1, KV, Resend, and an existing active member record.
- No raw email, token, cookie, or CSRF value is persisted in D1 or logs.
- Local smoke remains deterministic without weakening the production mode.
