# ADR 0131: Companion Worker Readiness Check

Date: 2026-07-08

## Status

Accepted.

## Context

Film's live Stripe summaries are intentionally adapter-first. Pool and Store own their Stripe-derived data and expose summary-only `/film/stripe-summary` endpoints, while Film must not read Stripe directly or copy companion secrets into browser code.

Manual inspection showed the companion repos can drift in two ways: tracked endpoint/secret-name support may be missing, or local `.dev.vars` files may not declare the Film bearer secret even when production secrets are managed elsewhere.

## Decision

Add `npm run check:companions`, backed by `scripts/check-companion-workers.mjs`.

The script checks the sibling Pool and Store repos for:

- `workers_dev = false`
- a production route/custom domain declaration
- tracked `/film/stripe-summary` Worker source
- tracked `FILM_STRIPE_SUMMARY_ADAPTER_SECRET`/fallback bearer-secret usage
- docs/scripts that name the Film adapter endpoint and shared secret

It reads only variable names from local `.dev.vars` files and never prints values. Missing local `.dev.vars` declarations are warnings, not blockers, because production secrets may live in Wrangler or Cloudflare dashboard bindings.

## Consequences

- Film can verify companion adapter readiness without embedding Pool/Store implementation details or leaking local secrets.
- `--strict` can fail CI/operator handoffs when tracked adapter support is missing.
- Live summary enablement still requires operator choices for production Film routes, adapter URLs, matching secret values, project mappings, webhook posture, and redacted audit settings.
