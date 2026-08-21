# ADR 0180: Provider Runtime Readiness Manifest

## Status

Accepted.

## Decision

Add a protected owner/producer `POST /api/providers/runtime-readiness` manifest that reports explicit live gates for every MVP provider without returning configuration values. The response reports status, bounded runtime mode, live capabilities, blockers, required decisions, and data boundary per provider, plus live/partial/blocked counts and `secretValuesExposed: false`.

Pool, Store, and Stripe are live only through the existing summary-only adapter gate. Resend is live only for member magic links and gated workspace invitations. Google, Meta Insights, and Telnyx SMS remain `dry_run_only` and blocked with concrete OAuth/token/webhook/consent decisions. Meta Insights' static capability contract is `needs_scope`, not `ready`.

The inspector exposes the manifest as an operational list and the Worker records only count/policy audit metadata.

## Context

Static provider capability preflights intentionally remain dry-run even when a narrow production path is live. That made the provider chips useful for planning but misleading as an operational answer to “what is live now?” Available Pool/Store environment files contain no Google, Meta, or Telnyx credentials. ADR 0213 selected Telnyx for crew-only transactional SMS, and ADR 0214 selected Meta's read-only Facebook/Instagram analytics boundary; both remain blocked until their credentials, consent, webhook validation, and production resources are implemented.

## Consequences

- Operators can distinguish bounded live paths from dry-run contracts in the product.
- No provider key, URL, mapping ref, OAuth value, recipient, account ID, or webhook value is exposed.
- The manifest does not enable any provider or weaken an existing gate.
- Google, Meta Insights, and Telnyx SMS cannot move to live until their listed implementation and compliance requirements are satisfied.
