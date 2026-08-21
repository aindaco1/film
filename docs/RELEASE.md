# Release Checklist

Use this checklist for local/staging handoff evidence and production readiness review. Film's API Worker, static app, member-only live magic-link auth, live Resend invite path, and Pool/Store Stripe summary adapters are configured for the Dust Wave deployment.

## Local Evidence

Run from the repo root:

```bash
npm run smoke
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:worker
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:browser:worker
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:providers:live
npm run smoke:auth:production -- --allow-send --require
npm run smoke:local:worker
npm run check:companions -- --strict
npm run check:deploy
npm run check:deploy -- --wrangler-secrets
npm run report:production-traffic
cd apps/worker && npx wrangler deploy --dry-run
```

## CI Evidence

`.github/workflows/ci.yml` runs on pushes to `main` and pull requests. It installs dependencies with `npm ci`, installs Playwright Chromium, runs `npm run smoke`, reports `npm run check:deploy`, and packages the Worker with `npx wrangler deploy --dry-run`.

The CI workflow does not run `npm run check:companions` because normal GitHub checkouts do not include the sibling Pool and Store repos. Run the companion check locally or in an operator workspace where those repos are available.

Expected local state:

- `npm run smoke` passes build, unit tests, secret scan, migration validation, and browser smoke.
- `FILM_WORKER_SMOKE_ORIGIN=<local-or-staging-worker-origin> npm run smoke:worker` passes real Worker health, dry-run magic-link auth, canonical workspace snapshot hydration, session metadata, MVP provider dry-runs, Stripe readiness, Google Drive sync planning, and logout without printing dev tokens or secrets.
- `FILM_WORKER_SMOKE_ORIGIN=<local-or-staging-worker-origin> npm run smoke:browser:worker` passes browser UI magic-link auth, canonical workspace hydration, provider chip dry-runs, Stripe readiness, Google Drive sync planning, canonical task/document writes, protected mutation apply, encrypted backup export, non-destructive restore preview, and logout against that Worker origin.
- `FILM_WORKER_SMOKE_ORIGIN=<local-or-staging-worker-origin> npm run smoke:providers:live` passes provider readiness smoke without printing secrets; use `FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE=1` and `FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE=1` only for approved local/staging live-adapter exercises. If a cold provider summary scan exceeds the default 90s budget, set `FILM_LIVE_PROVIDER_SMOKE_TIMEOUT_MS` or pass `--timeout-ms`.
- `npm run smoke:auth:production -- --allow-send --require --check-runtime-readiness` passes the production member-only Resend flow, canonical workspace snapshot, protected two-live/five-blocked provider manifest, live/redacted Google readiness and metadata-only authorization start, session read, logout, and revocation without printing sensitive values.
- `npm run smoke:auth:production -- --allow-send --require --create-project-title 'Big Sword' --project-type 'Feature Film' --project-id project_big_sword --apply-project --notion-source-dir <extracted-export> --apply-notion-import` is the explicit operator-only, create-only Notion production path. It must end with an idempotent replay and revoked session; never point it at an unsanitized private export.
- `npm run smoke:local:worker` passes the migration-applied local Worker suite and stops Wrangler when done.
- `npm run check:companions -- --strict` has no blockers and prints no secret values. Local Pool/Store `.dev.vars` warnings are acceptable if production secrets are managed outside local files.
- `npm run check:deploy` remains advisory for local work; `npm run check:deploy:strict -- --wrangler-secrets` must pass for a fully live MVP. A disabled provider implementation may deploy only when its named blockers and non-live mode are recorded in release evidence.
- `npm run check:deploy -- --wrangler-secrets` counts Cloudflare Worker secret names without printing values after the remote Worker exists.
- `npm run report:production-traffic` reports aggregate Worker requests/runtime errors/subrequests and active rate-limit window maxima without printing Cloudflare or identity values; retain the default profile unless this evidence supports a bounded override.
- Wrangler dry-run packages the Worker and lists only expected D1, KV, R2, and non-secret vars.

## Production Gate

Before public release, verify:

- `AUTH_MAGIC_LINK_MODE=live`, at least one active D1 owner, and zero active workspace-less sessions
- production app origin in `ALLOWED_ORIGINS`
- Worker route/custom domain in `apps/worker/wrangler.toml`
- static app Worker hosting and DNS for `https://film.dustwave.xyz`
- production rate-limit posture: keep the default profile or configure bounded `RATE_LIMIT_OVERRIDES`
- `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, `INVITE_APP_ORIGIN`, `INVITE_DELIVERY_WEBHOOK_SECRET`, and `INVITE_DELIVERY_MODE=live`
- `POOL_STRIPE_SUMMARY_ADAPTER_URL` and `STORE_STRIPE_SUMMARY_ADAPTER_URL` as production HTTPS `/film/stripe-summary` endpoints, while summary activation remains optional
- `STRIPE_PROJECT_MAPPINGS={}` and `STRIPE_SUMMARY_MODE=disabled` until exact Big Sword Pool/Store resources exist; when live summaries are requested, require safe refs, `STRIPE_WEBHOOK_SECRET`, `STRIPE_REDACTED_AUDIT=true`, `STRIPE_SUMMARY_ADAPTER_SECRET`, and matching companion `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` bindings
- `META_OAUTH_MODE=disabled` until the Meta app/Login, recoverable key, review, and owned-account smoke are complete
- `SMS_MODE=disabled` until Telnyx resources, registration, policy approvals, webhook configuration, and owned-number smoke are complete
- migrations through `0036_sms_retention_indexes.sql` are applied before deploying the current Worker

Do not commit `.dev.vars`, provider keys, OAuth tokens, raw exports, generated backup ZIPs, screenshots with sensitive data, or release evidence that includes secret values.

## Evidence Notes

Keep release notes focused on:

- exact commands run and pass/fail state
- Worker dry-run upload size and binding names
- deploy-readiness blockers by configuration name only
- companion-readiness warnings by variable name only
- live Worker smoke origin and pass/fail state, without dev tokens, cookies, or secret values
- production member-only auth probe: generic unknown-address response, no exposed token/hash, delivered approved-owner message, scoped session read, and logout
- browser-against-Worker smoke origin, app origin, and pass/fail state
- live-provider adapter smoke origin, explicit allow flags used, and pass/fail state without provider secrets or raw recipient details
- browser smoke coverage, including auth, protected mutation UI, provider chips, local creates, reconnect sync, backup export, restore preview, attachment byte commit controls, restore application preflight, and mobile navigation

Store bounded summaries under `docs/release-evidence`. Follow that directory's redaction policy; do not paste raw Wrangler, Resend, Cloudflare GraphQL/KV, D1, or auth output into evidence files.

Live provider adapter smoke for Google, Pool, Store, Stripe, Social, Resend, and SMS should run only against explicitly configured local/staging secrets or approved production smoke recipients and should not print provider secrets or raw recipient details.
