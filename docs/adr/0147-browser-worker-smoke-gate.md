# ADR 0147: Browser Worker Smoke Gate

## Status

Accepted.

## Decision

Add `npm run smoke:browser:worker`, backed by `scripts/browser-worker-smoke.mjs`, as an opt-in browser smoke against a configured local or staging Worker origin.

The smoke opens the static app in Chromium and verifies:

- app shell loading
- dry-run magic-link request and verification through the real Worker origin
- signed owner session rendering
- MVP provider dry-run chips through the real Worker origin
- Stripe summary-readiness rendering
- Google Drive sync planning rendering
- logout through the real Worker origin

The command skips when no Worker origin is configured. It uses `FILM_BROWSER_WORKER_SMOKE_APP_ORIGIN` when supplied; otherwise it uses or starts local Vite at `http://127.0.0.1:5173` with `VITE_WORKER_URL` pointed at the Worker origin.

## Context

ADR 0146 added a direct Worker-origin smoke. That proves the Worker routes compose over HTTP, but it does not prove the static app can call those routes with browser credentials, CORS, cookies, and CSRF handling.

The default browser smoke stays mocked for deterministic CI. This opt-in gate gives local/staging operators the missing UI-through-Worker evidence without requiring provider secrets or production routes.

## Consequences

- Local/staging handoff can verify browser credential flow with `FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:browser:worker`.
- Default `npm run smoke` remains deterministic and does not require a running Worker.
- Protected mutation, backup, restore, and live provider adapter browser flows remain future opt-in extensions.
- The gate must not print magic-link tokens, CSRF tokens, cookies, provider secrets, or full Worker payloads.
