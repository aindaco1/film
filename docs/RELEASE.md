# Release Checklist

Use this checklist for local/staging handoff evidence and production readiness review. Film's API Worker, static app, member-only live magic-link auth, live Resend invite path, and Pool/Store Stripe summary adapters are configured for the Dust Wave deployment.

The latest [0.1.0-beta.1 deployment](release-evidence/2026-09-06-beta-1.md) packages the accumulated neutral-theme, demo, deferred-screen, offline, and provider work with 774 unit/script tests. It adds shared Google contracts and guarded refresh/reconnect behavior. The web and API are publicly verified with provider modes unchanged; GitHub release publication additionally requires the source commit's CI result.

The preceding [September 6 provider and maintainability follow-up](release-evidence/2026-09-06-provider-followup.md) includes real owner reauthorization and an empty Drive metadata read. Meta's new Dust Wave portfolio is assigned to Film but still requires identity/business/access verification and App Review. Public Google verification and the [selected-file scope decision](google-selected-file-evaluation.md) are separate from this beta.

The preceding [September 6 daily-document and checked-status frontend release](release-evidence/2026-09-06-daily-documents-release.md) is also deployed and publicly verified. It reduced the startup entry below 500 kB, shared deferred daily-document rendering, fixed clipped call-sheet fields, and included the checked integration-status UX. That release did not change the API Worker or provider configuration.

The September 5 frontend release is deployed and publicly verified: [frontend evidence](release-evidence/2026-09-05-frontend-release.md). Its API Worker is unchanged from the separately accepted [Telnyx release](release-evidence/2026-09-05-telnyx-activation.md). Local dev and smoke commands now share explicit non-sending provider defaults.

The subsequent [integration loading and session-boundary release](release-evidence/2026-09-05-integration-loading.md) is also deployed and publicly verified. It reduces initial JavaScript, shares deferred-screen recovery, rejects stale provider responses after sign-out, and verifies offline encrypted export/preview without changing provider configuration.

## Local Evidence

Run from the repo root:

```bash
npm run smoke
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:worker
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:browser:worker
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:providers:live
npm run smoke:auth:production -- --allow-send --require --check-runtime-readiness --expected-sms-mode live --check-telnyx-readiness
npm run smoke:local:worker
npm run check:companions -- --strict
npm run check:deploy
npm run check:deploy -- --wrangler-secrets
npm run report:production-traffic
cd apps/worker && npx wrangler deploy --dry-run
```

## CI Evidence

`.github/workflows/ci.yml` runs on pushes to `main` and pull requests. It installs dependencies with `npm ci`, installs Playwright Chromium, runs `npm run smoke` and the real-D1 `npm run smoke:local:worker`, reports `npm run check:deploy`, and packages both Workers with Wrangler dry runs. It retains the tested static build as a SHA-named artifact for 14 days. CI uses explicitly non-sending local provider modes and does not deploy or establish live provider acceptance.

The CI workflow does not run `npm run check:companions` because normal GitHub checkouts do not include the sibling Pool and Store repos. Run the companion check locally or in an operator workspace where those repos are available.

Expected local state:

- `npm run smoke` passes package builds, strict web type-checking, unit tests, secret scan, migration validation, and browser smoke.
- `FILM_WORKER_SMOKE_ORIGIN=<local-or-staging-worker-origin> npm run smoke:worker` passes real Worker health, dry-run magic-link auth, canonical workspace snapshot hydration, session metadata, MVP provider dry-runs, Stripe readiness, Google Drive sync planning, and logout without printing dev tokens or secrets.
- `FILM_WORKER_SMOKE_ORIGIN=<local-or-staging-worker-origin> npm run smoke:browser:worker` passes browser UI magic-link auth, canonical workspace hydration, real-D1 project/task/person/equipment/expense create/edit replay, provider chip dry-runs, Stripe readiness, Google Drive sync planning, canonical document writes, protected mutation apply, encrypted backup export, non-destructive restore preview, and logout against that Worker origin.
- `FILM_WORKER_SMOKE_ORIGIN=<local-or-staging-worker-origin> npm run smoke:providers:live` passes provider readiness smoke without printing secrets; use `FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE=1` and `FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE=1` only for approved local/staging live-adapter exercises. If a cold provider summary scan exceeds the default 90s budget, set `FILM_LIVE_PROVIDER_SMOKE_TIMEOUT_MS` or pass `--timeout-ms`.
- `npm run smoke:auth:production -- --allow-send --require --check-runtime-readiness --expected-sms-mode live` checks the production member-only Resend flow, canonical workspace snapshot, three-live/four-blocked provider manifest, live/redacted Google readiness and metadata-only authorization start, session read, logout, and revocation without printing sensitive values. It sends only the owner login email, not an SMS. Omit `--expected-sms-mode live` when verifying a deliberately disabled SMS deployment; the default then checks the disabled send boundary.
- Add `--check-telnyx-readiness` to that existing owner-login probe to inspect redacted profile, carrier, number-assignment, configuration, and activation state. It uses Worker-held Telnyx credentials and sends no SMS. `--allow-send` authorizes the owner sign-in email, not an SMS delivery test.
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
- `TELNYX_WEBHOOK_MODE=live` and `SMS_MODE=live` are deployed. Campaign and sender assignment are active, with seven affirmative carrier results. The September 5 owned-number test proved one delivered SMS, a genuine signed STOP callback, revoked consent, a subsequent new send blocked before the provider, and signed START without Film consent reactivation. The initially missing HELP reply was configured in the Film profile and passed its handset/signed-callback retest. The test recipient remains revoked. No promotional or crew-wide send was authorized by the owned-number test.
- `npm run check:deploy:strict -- --wrangler-secrets` checks live or webhook-only activation, including all SMS configuration. `npm run check:sms:preflight` intentionally requires both gates disabled and is only for the earlier pre-approval stage; it is not the post-approval command.
- The explicit owned-number test reuses production auth with `--send-owned-sms --sms-smoke-config <private-env-file>` only after recipient approval. The private file contains `FILM_SMS_SMOKE_RECIPIENT` and one stable `FILM_SMS_SMOKE_REQUEST_KEY`; do not put phone numbers in command-line arguments or tracked files. This path waits for readiness, uses temporary single-test operator consent, does not retry ambiguous sends, checks revocation with a new blocked request, and revokes temporary consent on timeout. Remove the private file afterward. Delivery receipts and actual keyword-event provenance are verified independently in redacted D1 evidence.
- migrations through `0037_project_operational_fields.sql` are applied before deploying the current Worker

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
