# 0107 - Gated Stripe Summary Adapter Fetch

## Status

Accepted.

## Context

ADR 0058 established a summary-adapter-first boundary for Stripe and ADR 0092 added protected readiness checks. The app now needs a Film-side fetch contract so Pool/Store adapter work can be tested without adding direct Stripe SDK/API reads or exposing provider credentials to the browser.

Pool and Store already own the checkout, settlement, and order/pledge contexts that can normalize Stripe-derived values. Film should consume only project-scoped aggregate fields from those systems.

## Decision

Add protected `POST /api/providers/stripe/summary` for owner/producer sessions. The route:

- requires workspace and project scope,
- requires `STRIPE_SUMMARY_MODE=live`,
- requires Pool/Store adapter URLs, project mappings, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUMMARY_ADAPTER_SECRET`, and `STRIPE_REDACTED_AUDIT=true`,
- sends only workspace ID, project ID, mapped Pool/Store refs, a summary-only data boundary, and requested aggregate field names to the adapters,
- authenticates adapter calls with the shared adapter secret,
- sanitizes adapter responses down to money totals, count totals, adapter status, mapped-ref count, generated-at timestamp, and currency,
- records bounded audit metadata only.

Direct Stripe reads remain blocked. Film does not return customer data, card/payment-method data, raw payment identifiers, charge IDs, invoice IDs, unrestricted webhook payloads, or adapter response pass-through fields.

## Consequences

- The web inspector can show `Fetch summary aggregates` only after readiness reports live summary reads are allowed.
- Tests cover the live-mode gate, mocked Pool/Store adapter calls, aggregate summing, and response redaction.
- Pool/Store now expose matching `/film/stripe-summary` adapter endpoints; production use still requires deployed HTTPS adapter URLs, matching Film/companion shared adapter secrets, project mappings with safe Pool/Store refs, webhook posture review, and redacted audit validation.
