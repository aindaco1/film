# ADR 0146: Live Worker Smoke Gate

## Status

Accepted.

## Decision

Add `npm run smoke:worker`, backed by `scripts/live-worker-smoke.mjs`, as an opt-in smoke gate for a configured local or staging Worker origin.

The smoke checks:

- `GET /health`
- `GET /api/provider-status`
- dry-run magic-link request and verification
- session metadata read with the returned `film_session` cookie
- MVP provider dry-run routes for Pool, Store, Stripe, Social, Google, Resend, and SMS
- Stripe summary-readiness policy
- Google Drive sync planning
- logout with the returned CSRF token

The command skips when no origin is configured. Operators can require the gate with `FILM_WORKER_SMOKE_REQUIRED=1` or `--require`. The script records only pass/fail evidence and route names; it does not print development magic-link tokens, CSRF tokens, cookies, provider secrets, or response payloads.

## Context

`npm run test:browser` already validates the UI in Chromium with mocked Worker routes. Worker unit tests validate D1/KV authorization and route behavior in-process. A release handoff still needs a small proof that a real Wrangler or staging Worker origin is reachable and that browser-facing dry-run auth/provider routes work together over HTTP.

Keeping the gate opt-in preserves secret-free default CI while giving operators a concrete local/staging command.

## Consequences

- Local/staging handoff can verify a real Worker origin with `FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:worker`.
- Default `npm run smoke` stays deterministic and does not require a running Worker.
- Browser UI automation against a live Worker remains a separate future gate.
- Live provider adapter reads still require explicit local/staging secrets and are not proven by this dry-run smoke.
