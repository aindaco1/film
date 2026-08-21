# ADR 0019: Protected Mutation Session Checks

Date: 2026-07-08

## Status

Accepted

## Decision

Require protected Worker dry-run mutations to pass a shared session guard when D1 auth storage is available. The guard validates the `x-film-csrf` header, checks the `film_session` HttpOnly cookie against the D1 `sessions` table, rejects revoked or expired sessions, verifies the hashed CSRF token, and reads the dry-run role from the optional `SESSIONS` KV cache.

Provider preflights and backup dry runs require owner or producer roles. Notion import and attachment R2 dry runs require owner, producer, or director roles. Operation sync preflight accepts any authenticated first-class role, and replay metadata now adds the operation-kind role policy from ADR 0023.

If the local D1 session store is missing or unavailable, the Worker preserves the existing memoryless dry-run fallback so the static app remains usable before local Wrangler resources are migrated.

## Context

D1/KV auth state gives Film one-time magic links and revocable sessions, but sensitive Worker mutations still accepted any sufficiently long CSRF-like string. The MVP needs Worker-owned authorization checks before provider, backup, import, attachment, and sync mutations become real.

## Consequences

- A migrated D1 auth store now makes protected dry-run mutations fail closed without a valid session cookie and matching CSRF token.
- Role checks are still dry-run oriented; detailed record-level ownership and collaboration checks remain future work.
- Local development with an unapplied D1 database can still exercise the app through the documented fallback.
- Browser code continues to hold only active-page session metadata and does not store tokens in IndexedDB, localStorage, backups, or source files.
