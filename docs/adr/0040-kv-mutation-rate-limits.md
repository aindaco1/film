# ADR 0040: KV Mutation Rate Limits

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Worker-owned mutation rate-limit gate for POST routes using the existing `SESSIONS` KV namespace with `rl:`-prefixed keys. Buckets are scoped by route family and a SHA-256 hash of IP plus user agent.

## Context

The roadmap requires rate limits before production auth, public routes, provider credentials, and externally visible actions. Film already has a KV namespace for ephemeral session data, and the current app still needs to stay usable in local dry-run development when bindings are absent.

## Consequences

- Magic-link request attempts are limited more tightly than ordinary authenticated dry-run mutations.
- Provider, import, attachment, backup/restore, and operation sync POST routes now share route-family buckets.
- Without KV, the Worker reports no rate-limit persistence and preserves local dry-run behavior.
- This is a coarse MVP abuse guard. Production may still need tuned limits, Turnstile on unauthenticated auth starts, and stronger per-account/provider quotas.
