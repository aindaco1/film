# ADR 0028: Stripe Dry-Run Provider Contract

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0058.

## Decision

Add Stripe to Film's Worker-backed dry-run provider contracts without adding credentials, live API calls, payment data storage, or billing UI.

## Context

The product plan treats Pool, Store, and Stripe as authoritative finance systems. Film should eventually read payment, payout, and invoice summaries, but it must not become a payments system or hold card/payment method data. The conservative step is a visible dry-run contract that defines capabilities, scopes, and compliance boundaries before any Stripe secret exists.

## Consequences

- `stripe` is now a shared `IntegrationKey` and appears in the seed workspace.
- `/api/providers/stripe/dry-run` returns metadata for payment summaries, payout summaries, and invoice status checks.
- The web app exposes a Stripe dry-run chip that uses the same Worker preflight path as other providers.
- The contract keeps `secretsPolicy: worker_only` and explicitly avoids card data, raw payment method details, and unrestricted customer exports.
- Future live Stripe work follows ADR 0058: Pool/Store summary adapters first, then any direct Stripe fallback only after least-privilege scopes, webhook verification, rate limits, and redacted audit events are explicit.
