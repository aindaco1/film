# ADR 0218: Cloudflare KV Rate-Limit TTL Floor

## Status

Accepted

## Context

Film stores mutation rate-limit counters in KV and fails live mutations closed when that storage is unavailable. Cloudflare KV requires `expirationTtl` to be at least 60 seconds. A 60-second logical window initially wrote a valid TTL, then attempted 59, 58, and lower values on subsequent requests. KV rejected those writes, so legitimate requests received `rate_limit_unavailable` instead of a counter update.

## Decision

Keep the logical reset timestamp in the stored bucket and set the physical KV TTL to `max(60, resetAt - now)`. Parsing already ignores expired logical buckets, so an entry that physically survives beyond its logical reset is reinitialized safely on the next request.

Add a regression test with a KV double that rejects sub-60-second TTLs. Keep live-mode fail-closed behavior and existing per-route bucket separation.

## Consequences

- Repeated requests within 60-second buckets no longer fail because of an invalid provider TTL.
- Logical windows shorter than 60 seconds remain possible through reset timestamps, even though stale physical entries can live for up to 60 seconds.
- Operators can distinguish storage failure (`rate_limit_unavailable`) from policy exhaustion (`rate_limited`).
