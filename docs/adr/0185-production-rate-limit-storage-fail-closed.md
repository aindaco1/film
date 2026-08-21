# ADR 0185: Production Rate-Limit Storage Fails Closed

## Status

Accepted.

## Decision

When `AUTH_MAGIC_LINK_MODE=live`, every route with a configured mutation-rate policy requires the `SESSIONS` KV binding and a successful KV bucket read/write. Missing or failed KV returns `503 rate_limit_unavailable` before route handling. Local dry-run mode keeps the memoryless fallback.

## Context

The production Worker has a dedicated KV binding and rate-limit policies for auth, invite, provider, import, attachment, backup/restore, and operation-sync mutations. The prior error path silently allowed the request when KV was missing or unavailable, removing all abuse controls during the failure.

## Consequences

- A KV outage cannot turn production mutation routes into unbounded endpoints.
- Availability failures are explicit and distinguishable from a 429 limit response.
- Health and other unmetered GET routes remain available.
- Local no-KV development remains deterministic.
