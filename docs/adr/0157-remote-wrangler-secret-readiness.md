# ADR 0157: Remote Wrangler Secret Readiness

## Status

Accepted.

## Context

Film's deployment readiness checker can validate tracked Worker config and ignored local `.dev.vars`, but production secrets should live in Cloudflare Worker secrets or dashboard-managed bindings. Operators need a way to prove those remote secret names exist without copying values into files or terminal output.

## Decision

Add `npm run check:deploy -- --wrangler-secrets` support. The checker calls `wrangler secret list --format json`, records only secret names, and treats those names as configured for readiness checks. It never reads or prints secret values.

## Consequences

- Production secret posture can be audited by name after the remote Worker exists.
- Local `.dev.vars` remains useful for local/staging verification, but it is not required for remote secret readiness.
- Production route/origin and live invite decisions remain separate blockers until explicitly configured.
