# ADR 0169: Stripe Summary Production Defaults

## Status

Superseded for production defaults by ADR 0223. The adapter architecture remains implemented.

## Decision

Configure Film's non-secret Worker defaults for Stripe summary reads to use the existing Dust Wave companion adapters:

- Pool: `https://pledge.dustwave.xyz/film/stripe-summary`
- Store: `https://checkout.dustwave.xyz/film/stripe-summary`

The default project mapping covers the seed `workspace_acme/proj_echoes` project and the Dust Wave fixture project with public Pool campaign slugs and Store product refs. `STRIPE_REDACTED_AUDIT=true` and `STRIPE_SUMMARY_MODE=live` are tracked as non-secret Worker vars, while `STRIPE_WEBHOOK_SECRET` and `STRIPE_SUMMARY_ADAPTER_SECRET` remain Wrangler/dashboard secrets.

## Context

The local provider smoke verified Film can call both companion adapters through the summary-only contract without exposing raw Stripe data. Pool and Store already expose bearer-authenticated `/film/stripe-summary` routes and declare the shared `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` binding name.

## Consequences

- Deployment readiness no longer treats Pool/Store adapter URLs, project mappings, redacted audit, or live summary mode as unresolved local defaults.
- Direct Stripe API reads remain blocked in Film.
- Production route/origin and live invite delivery decisions remain separate operator choices.
- Real project mappings can override the seed refs through Worker vars without changing code.
