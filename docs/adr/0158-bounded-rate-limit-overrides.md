# ADR 0158: Bounded Rate Limit Overrides

## Status

Accepted.

## Context

Film's Worker has KV-backed POST rate limits, but the defaults are hard-coded. Production launch needs a way to tune route-family buckets without code changes, while avoiding broad disable switches or unsafe values.

## Decision

Add optional `RATE_LIMIT_OVERRIDES` as a non-secret JSON object keyed by existing bucket names. Each override may set integer `limit` from 1 to 1000 and `windowSeconds` from 10 to 3600. Unknown buckets, malformed JSON, or out-of-range values are ignored by the Worker in favor of defaults and are reported by deployment readiness.

## Consequences

- Operators can tune production rate limits without adding new route code.
- Local development and CI continue using the default rate-limit profile.
- The override surface cannot create new buckets, disable rate limiting, or set unbounded windows.
