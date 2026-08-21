# ADR 0155: Local Worker Smoke Suite

## Status

Accepted.

## Decision

Add `npm run smoke:local:worker`, backed by `scripts/local-worker-smoke-suite.mjs`, as the preferred local all-in Worker verification command.

The suite:

- applies local D1 migrations with Wrangler
- starts `wrangler dev` for the Film Worker at `http://127.0.0.1:8787`
- runs `npm run smoke:worker`
- runs `npm run smoke:browser:worker`
- runs `npm run smoke:providers:live`
- stops the Worker process

## Context

The browser-against-Worker smoke now uses protected mutation routes, which require the latest local D1 migrations. Manual local testing can otherwise fail with confusing UI timeouts if the local Miniflare D1 state is behind.

The app's current local CORS defaults allow `http://127.0.0.1:5173`, so the suite uses Worker port `8787` and app port `5173` by default. Port overrides are available only for environments whose `ALLOWED_ORIGINS` are updated to match.

## Consequences

- Local Worker verification is reproducible with one command.
- The command remains outside default CI because it starts Wrangler and may exercise local/staging provider readiness.
- Migrations are applied before protected browser smoke routes run.
