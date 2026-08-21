# ADR 0154: Live Provider Adapter Smoke

## Status

Accepted.

## Decision

Add `npm run smoke:providers:live`, backed by `scripts/live-provider-adapter-smoke.mjs`, as an opt-in local/staging smoke for provider adapter readiness.

The command signs in through the configured Worker origin and checks:

- all MVP provider dry-run surfaces
- Google Drive dry-run planning
- Stripe summary readiness
- optional Pool/Store Stripe summary adapter fetches when `FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE=1`
- configurable request timeout through `FILM_LIVE_PROVIDER_SMOKE_TIMEOUT_MS` or `--timeout-ms`, defaulting to 90 seconds for cold summary scans
- Resend invite-delivery readiness
- optional Resend live invite send when `FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE=1` and `FILM_LIVE_PROVIDER_SMOKE_INVITE_EMAIL` are set

It skips without a Worker origin unless required. It does not print provider secrets, cookies, CSRF tokens, dev tokens, or raw recipient details.

## Context

Provider integrations are MVP-critical, but live credentials and third-party side effects should not run in default CI. Film currently has true live-adapter surfaces for Stripe summaries through Pool/Store and Resend invite delivery. Google, Social, and SMS remain dry-run planning surfaces until their live adapters and compliance scopes are explicit.

## Consequences

- Operators can run a single local/staging provider smoke before release evidence collection.
- Live Stripe adapter calls and live Resend sends require explicit per-run flags.
- Google, Social, and SMS are still represented as dry-run readiness checks, not live side-effecting checks.
- Default `npm run smoke` remains provider-secret-free.
