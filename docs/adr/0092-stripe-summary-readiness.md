# 0092 - Stripe Summary Readiness

## Status

Accepted. Extended by ADR 0094 and ADR 0107.

## Context

Film treats Stripe as an MVP provider, but direct Stripe reads are intentionally blocked. Payment data is high-risk, and Film should first consume summary-only aggregates through Pool/Store boundaries instead of introducing raw payment, card, payment-method, or unrestricted customer data.

The existing Stripe provider dry run states this policy, but the app needs a concrete readiness contract that shows what configuration remains missing before a future summary adapter can exist.

## Decision

Add protected `POST /api/providers/stripe/summary-readiness` for owner/producer sessions. The route checks workspace scope and returns a summary-only readiness contract:

- Pool summary adapter URL configured
- Store summary adapter URL configured
- project mapping configuration present
- Stripe webhook secret configured
- redacted audit logging enabled
- direct Stripe reads remain blocked
- live summary reads remain blocked until ADR 0107's explicit adapter route gates are satisfied

The web provider panel adds `Check Stripe summaries` when the Stripe dry run is selected and renders the readiness result. The route does not call Stripe, does not read browser credentials, and returns only configuration booleans and blocker labels.

## Consequences

- Stripe MVP work can advance through adapter readiness without weakening the summary-only boundary.
- Direct Stripe API reads and secrets remain out of browser code.
- ADR 0094 adds bounded D1 audit metadata for readiness checks without changing the no-live-read policy.
- ADR 0107 adds the Film-side live adapter route while Pool/Store still need production adapter endpoint definitions, webhook verification, redacted audit events, and production resources.
