# ADR 0058: Stripe Summary Adapter Boundary

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0107.

## Decision

Film will treat Stripe live reads as summary-adapter-first through Worker-owned Pool/Store boundaries. Direct Stripe API reads remain disabled in the MVP and require a later explicit decision with restricted scopes, production webhooks, redacted audit events, and production resource configuration.

## Context

Stripe payment, payout, and invoice data is financially sensitive. The current MVP needs visible provider status and planning metadata, but it does not need Film to become the primary Stripe client. Pool and Store are closer to the product workflows that generate financing, orders, attendees, and campaign summaries, so they are the safer first place to normalize Stripe-derived finance signals.

Stripe's current integration guidance emphasizes choosing the right API surface deliberately, using modern payment objects and events, and securing live keys and webhooks before launch. Film should not add Stripe secrets or direct API calls until the production boundary is clearer.

## Consequences

- The Stripe provider dry-run contract now exposes `productionReadPolicy.mode = "summary_adapter_first"`.
- The Worker returns Stripe as `liveReadAllowed: false` with a summary-only data boundary.
- The web inspector renders provider production-read policy when present.
- No Stripe SDK, API key, webhook secret, or live request path is added.
- The roadmap moves from deciding the Stripe read path to implementing Pool/Store summary adapters after scopes, mappings, webhooks, audit events, and production secrets are explicit.
