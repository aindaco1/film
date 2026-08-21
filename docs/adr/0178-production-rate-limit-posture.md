# ADR 0178: Retain Default Production Rate Limits

## Status

Accepted.

## Decision

Retain the Worker's default KV-backed production rate limits rather than adding `RATE_LIMIT_OVERRIDES` or a Turnstile challenge now. Use `npm run report:production-traffic` to review aggregate Cloudflare Worker invocation metrics and unexpired rate-limit window counts without printing account IDs, namespace IDs, credentials, or identity hashes.

The July 9, 2026 release review covered 24 hours and reported 311 successful Worker invocations, zero runtime invocation errors, four subrequests, one active magic-link request in its window, and one active verification in its window. The request bucket default remains 5 requests per 10 minutes; neither active auth bucket showed more than one request for an identity.

The July 10 follow-up covered 24 hours and reported 1,161 Worker requests, zero runtime invocation errors, 34 subrequests, and zero active limiter windows. That evidence does not justify adding Turnstile or changing the default limits.

## Context

Production readiness originally left rate-limit tuning and an abuse challenge open. Tightening limits without traffic evidence can lock out legitimate crew, while adding a challenge adds another provider, client flow, privacy surface, and failure mode.

## Consequences

- The generic member-only magic-link response and existing KV limits remain the first unauthenticated abuse controls.
- Operators can repeat an aggregate-only report using ignored Cloudflare credentials from the companion environment.
- Worker invocation errors do not represent HTTP 4xx/5xx responses, and KV evidence includes only unexpired windows; both limitations are reported explicitly.
- Turnstile remains a follow-up if traffic, active-window counts, support reports, or provider delivery volume indicate abuse.
