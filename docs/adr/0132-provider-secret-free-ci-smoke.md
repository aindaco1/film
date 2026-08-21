# ADR 0132: Provider-Secret-Free CI Smoke

Date: 2026-07-08

## Status

Accepted.

## Context

Film needs repeatable release evidence before live provider credentials and production routes exist. CI should prove the static app, Worker package, migrations, browser smoke, and deployment-readiness reporting work without requiring Google, Resend, Stripe, Pool, Store, Social, or SMS secrets.

## Decision

Add `.github/workflows/ci.yml` for pull requests and pushes to `main`.

The workflow:

- installs dependencies with `npm ci`
- installs Playwright Chromium
- runs `npm run smoke`
- runs advisory `npm run check:deploy`
- packages the Worker with `npx wrangler deploy --dry-run`

It does not run `npm run check:companions` because normal GitHub checkouts do not include sibling Pool and Store repos.

## Consequences

- Pull requests get a no-secret baseline covering build, unit tests, secret scan, migrations, browser smoke, deploy-readiness reporting, and Worker packaging.
- Production release remains blocked until route/origin and live-provider decisions are configured.
- Companion Worker readiness remains an operator-local gate unless a future workflow explicitly checks out Pool and Store.
