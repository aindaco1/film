# ADR 0181: Live Auth Response and Session Fail-Closed Boundary

## Status

Accepted.

## Decision

Auth verify, session metadata, and logout responses derive `dryRun` from `AUTH_MAGIC_LINK_MODE`; successful production responses report `dryRun: false`. The session metadata route returns `503 auth_storage_unavailable` when live auth has no D1 binding or cannot query the session store. It also rejects member-less or workspace-less sessions in live mode.

The development demo workspace route remains available in dry-run mode but returns `404` when live auth is enabled.

## Context

Live member-only authentication already failed closed for token verification and protected mutations, but successful auth responses still reported dry-run mode. The read-only session route also collapsed missing or failed D1 storage into a normal signed-out response, and the public demo route exposed fixture and binding metadata in production despite having no browser consumer.

## Consequences

- Production clients can distinguish an unavailable auth store from a valid signed-out state.
- Live auth responses accurately describe runtime behavior.
- Legacy unscoped sessions cannot appear valid through the session metadata route.
- The deterministic demo fixture remains available for local development without becoming a production API surface.
