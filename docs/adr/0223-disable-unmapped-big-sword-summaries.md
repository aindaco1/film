# ADR 0223: Disable Unmapped Big Sword Summaries

Date: 2026-07-10

## Status

Implemented. Product owner confirmed on 2026-07-10 that Big Sword has no Pool campaign or Store products yet, so mapping is intentionally deferred. Supersedes the production-default portion of ADR 0169.

## Context

Film production contains one canonical project: `workspace_acme/project_big_sword`. The tracked Stripe summary mappings referenced only the seed `proj_echoes` project and a separate Dust Wave fixture. Repository catalogs, production Pool/Store KV key names, and the live Stripe product catalog contain no Big Sword campaign or product reference.

The summary adapters and shared secret are operational, but reporting Pool, Store, and Stripe as live when no mapping can serve the only production project is misleading. Mapping Big Sword to Hand Relations, Film Fatale, or another unrelated public ref would silently attribute the wrong revenue.

## Decision

Set `STRIPE_PROJECT_MAPPINGS={}` and `STRIPE_SUMMARY_MODE=disabled` in production. Keep both companion adapter URLs, the redacted adapter implementation, and secret bindings in place. Deployment readiness treats the summary family as intentionally disabled and makes every URL/mapping/secret/live-mode check strict again when `STRIPE_SUMMARY_MODE=live` is requested.

Do not enable summaries until an operator supplies the exact Pool campaign slug and/or Store product refs that belong to Big Sword. The refs must exist in the companion catalog and return only aggregate money/count data through the existing adapters.

No Big Sword campaign or product needs to be created for the Film MVP. The integration remains activation-ready for a future resource: add its canonical ref, switch the explicit summary mode, pass strict readiness, and run the existing companion/live adapter smoke.

## Consequences

- Runtime readiness truthfully reports Pool, Store, and Stripe as blocked; Resend and Google remain the two live provider families.
- Big Sword cannot display unrelated seed/fixture revenue.
- No companion Worker or shared secret is removed, so activation is a small reviewed configuration change once canonical refs exist.
- Creating a new Pool campaign or Store product remains an explicit product/business action requiring campaign copy, goal, pricing, and publication decisions.
