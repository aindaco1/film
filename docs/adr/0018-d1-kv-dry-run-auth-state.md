# ADR 0018: D1/KV Dry-Run Auth State

Date: 2026-07-08

## Status

Accepted

## Decision

Use D1 for dry-run magic-link and session records when the Worker has a usable `DB` binding. Store only hashed magic-link tokens and hashed CSRF tokens. Consume magic links once, enforce expiry during verification, and mark sessions revoked on logout.

Use the `SESSIONS` KV binding as an optional session cache keyed by the opaque session ID, with hashed CSRF metadata and the same expiry horizon. If D1 or KV is missing or not migrated in local development, preserve the memoryless dry-run auth flow and report the fallback persistence mode in API responses.

## Context

The first auth slice proved Worker-owned magic-link routes without email delivery or production session storage. The next MVP step is to make expiry, reuse protection, and logout stateful without introducing live email delivery, OAuth, or browser-owned secrets.

## Consequences

- Development magic-link tokens are still returned to the app because no email provider is live.
- D1 stores token hashes and CSRF hashes, not raw magic-link tokens or raw CSRF tokens.
- A D1-backed token can be verified only once.
- Logout revokes matching D1 session records and deletes the optional KV cache entry.
- Fine-grained protected-route authorization, production email delivery, rate limits, and abuse protection remain separate work before live auth.
