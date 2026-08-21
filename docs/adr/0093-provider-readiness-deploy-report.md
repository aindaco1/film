# 0093 - Provider Readiness Deploy Report

## Status

Accepted.

## Context

ADR 0091 added invite-delivery readiness, and ADR 0092 added Stripe summary-readiness. Both routes expose live-provider blockers safely at runtime, but `npm run check:deploy` still only reported route and origin blockers.

Before public deployment, Film needs one command that makes live-provider blockers visible without committing secrets or printing secret values.

## Decision

Extend `scripts/check-deployment-readiness.mjs` to read expected live-provider configuration from `wrangler.toml` vars or the current process environment and report blockers by name only.

The report now covers:

- production Worker route/custom domain
- production app origins, including exact http(s) origin shape
- invite live-delivery configuration: `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, `INVITE_APP_ORIGIN`, `INVITE_DELIVERY_WEBHOOK_SECRET`
- Stripe summary-readiness configuration: `POOL_STRIPE_SUMMARY_ADAPTER_URL`, `STORE_STRIPE_SUMMARY_ADAPTER_URL`, `STRIPE_PROJECT_MAPPINGS`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_REDACTED_AUDIT=true`, `STRIPE_SUMMARY_ADAPTER_SECRET`, `STRIPE_SUMMARY_MODE=live`

Follow-up hardening validates that Pool/Store adapter URLs are production HTTPS `/film/stripe-summary` endpoints, that mappings contain at least one safe Pool/Store ref instead of a placeholder string, and that Film's `STRIPE_SUMMARY_ADAPTER_SECRET` is configured separately from the companion Workers' `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` naming convention.

Non-strict mode remains advisory and exits successfully for local development. Strict mode fails on unresolved blockers.

## Consequences

- Provider-live prerequisites and obvious shape mistakes are visible in deployment checks without exposing secret values.
- Secrets can still be supplied out of band through environment/secret bindings.
- Local development remains unblocked while production readiness remains explicit.
