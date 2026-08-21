# ADR 0151: Browser Worker Backup Smoke

## Status

Accepted.

## Decision

Extend `npm run smoke:browser:worker` so the signed browser session also runs the encrypted backup path against the configured Worker origin.

After magic-link auth and provider checks, the smoke now:

- clicks `Backup now`
- accepts a smoke-only passphrase
- verifies a `.filmbackup.zip` encrypted backup download
- waits for either Worker R2 storage or Worker restore-point metadata fallback
- previews the encrypted backup locally
- confirms the restore preview reports that no records were overwritten

## Context

The original browser-against-Worker smoke proved CORS, cookies, CSRF, auth, provider preflights, Stripe readiness, and Google Drive planning. Backup export was still covered by the mocked browser smoke and direct Worker tests, but not by a real signed browser session.

Backup and restore safety are MVP-critical. The smoke should prove the browser can complete the protected backup handoff through a real local or staging Worker while keeping restore preview non-destructive and without relying on live provider credentials.

## Consequences

- Local/staging handoff now has UI-through-Worker evidence for encrypted backup export and restore preview.
- The gate remains opt-in and still skips without `FILM_WORKER_SMOKE_ORIGIN`.
- The smoke stores only generated test backup files under ignored `test-results/`.
- Protected mutation browser-against-Worker coverage and live provider adapter smokes remain separate future gates.
