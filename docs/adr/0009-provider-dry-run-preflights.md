# ADR 0009: Provider Dry-Run Preflights

Date: 2026-07-07

## Status

Accepted

Updated by ADR 0043, ADR 0058, and ADR 0068.

## Decision

Represent Pool, Store, Stripe, Social, Google, and SMS integrations as Worker-backed dry-run preflights before any live credentials, OAuth flows, or provider API calls are added.

## Context

Provider integrations are essential to the MVP, but they touch fundraising data, attendee lists, payment summaries, publishing workflows, Google data, and SMS compliance. The app needs visible integration surfaces early while keeping credentials and live calls out of browser code.

## Consequences

- `packages/providers` defines provider capabilities, required scopes, next steps, and compliance notes.
- `/api/providers/:provider/dry-run` requires CSRF metadata and returns dry-run provider metadata only.
- Topbar provider chips call the Worker and render an inspector summary.
- ADR 0068 adds a Google Drive/Docs sync dry-run plan route without OAuth credentials or live file reads.
- Live provider work must add least-privilege scopes, token storage, rate limits, consent/compliance checks, and webhook verification before credentials are used.
