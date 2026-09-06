# Testing

This document owns how to verify Film. [User Flows](USER_FLOWS.md) owns the generated flow inventory; [Project Status](PROJECT_STATUS.md) owns the latest results and open acceptance gates. A passing fixture is not live provider acceptance.

## Baseline

Run from the repo root:

```bash
npm ci
npx playwright install chromium
npm run smoke
npm run smoke:local:worker
```

`smoke` builds the packages, typechecks the web app, runs script/package tests, scans for secrets, validates migrations, exercises browser workflows, and checks the compiled offline shell. The separate local-Worker suite applies migrations to disposable D1 state and tests browser persistence, authorization, collaboration and restore transaction proofs against a real Worker.

Local development and local-Worker smokes share [the non-sending policy](../scripts/local-worker-config.mjs). Credentials being present must never enable a provider implicitly. The supervisor uses [managed processes](../scripts/managed-process.mjs) for bounded commands, streamed output and descendant cleanup; do not replace this with blocking subprocess orchestration.

## Focused Checks

| Change | Command |
| --- | --- |
| Scripts, docs and flow inventory | `npm run test:scripts` |
| Shared or application contracts | `npm run test` |
| Web types | `npm run typecheck:web` |
| Secret boundaries | `npm run test:security` |
| D1 schema | `npm run test:migrations` |
| UI behavior and accessibility | `npm run test:browser` |
| System/light/dark appearance | `npm run test:appearance` |
| Isolated demo portfolio | `npm run test:demo` |
| Compiled offline behavior | `npm run test:offline` |
| Empty canonical workspace | `node scripts/browser-smoke.mjs --empty-only --built` |
| All deferred screens | `node scripts/browser-smoke.mjs --deferred-views-only --built` |
| Backup screen loading only | `node scripts/browser-smoke.mjs --backup-loading-only --built` |
| Checked integration status | `node scripts/browser-smoke.mjs --provider-status-only --built` |
| Google recovery fixtures | `node scripts/browser-smoke.mjs --google-only --built` |
| Private screenplay chain | `npm run accept:screenplay -- /absolute/path/to/screenplay.fdx` |

Build first when invoking a focused `--built` check. Omit `--built` to exercise the development server.

To use a separately started non-sending Worker, set `FILM_WORKER_SMOKE_ORIGIN` and run `smoke:worker` or `smoke:browser:worker`. Prefer the supervised local suite for reproducible release evidence rather than changing persistent developer D1 state.

### Screenplay Acceptance

The `accept:screenplay` command above runs an approved `.fdx` or `.fountain` file through the local production-planning chain. Keep private fixtures outside the repository. The runner makes no network requests and prints source-free aggregates, excluding the source path, screenplay title/text, character names, scene headings, and element names.

The command must fail if no scenes parse, any scene remains unassigned, sides or the report diverge from the generated call sheet, or the estimate does not match the generated schedule. Automated synthetic coverage also asserts that screenplay dialogue, headings, and character names do not enter the evidence object.

The schedule is mechanical and estimates use synthetic smoke-test rates. Passing this check verifies the planning chain, not an approved shooting plan or production budget. Retain real-run aggregates as dated evidence, such as the [August 21 screenplay acceptance](release-evidence/2026-08-21-screenplay-acceptance.md).

### Worker Smoke Options

`smoke:worker` skips without `FILM_WORKER_SMOKE_ORIGIN`; use `FILM_WORKER_SMOKE_REQUIRED=1` or `--require` when local/staging Worker verification should fail closed.

`smoke:browser:worker` uses `FILM_BROWSER_WORKER_SMOKE_APP_ORIGIN` when provided, otherwise it uses or starts local Vite at `http://127.0.0.1:5173`. It signs in through the configured Worker, verifies provider dry-run surfaces, creates and syncs a canonical document, applies an approved protected mutation, exports an encrypted backup, accepts Worker R2 storage or metadata fallback, previews the encrypted backup locally, and signs out.

## Coverage Ownership

| Layer | Responsibility |
| --- | --- |
| `packages/schema/test` | Stable IDs, data validation, production graph transitions, schedule/budget arithmetic, snapshot provenance, scoped mutation contracts |
| `packages/importers/test` | Bounded CSV/ZIP/FDX/Fountain parsing, idempotent provenance, unsafe input rejection, no executable Notion HTML |
| `packages/backup/test` | Encryption, archive integrity, redaction, restore previews, source graph round trips and attachment policy |
| `packages/providers/test` | Provider scope/capability contracts, exact grants, bounded metadata projections and dry-run clone safety |
| `apps/web/test` | Shared rendering, canonical UI ownership, client contracts, state reconciliation, exports, offline/privacy boundaries |
| `apps/worker/test` | D1-authoritative sessions, scope/role checks, atomic writes/audits, stale checks, restore proofs, provider gates, refresh races, signed callbacks and consent |
| `scripts/*.test.mjs` | Runner lifecycle, deployment/local-mode safety, secret-free operator output, flow-catalog integrity and documentation links |
| Browser suites | Real rendered navigation, contextual edits, keyboard/modal behavior, reload, responsive bounds, serious/critical axe findings and draft/focus preservation |
| Local Worker suite | Real SQLite/D1 behavior and browser-to-Worker workflows, including atomic transaction failure/retry paths |

The [flow catalog](../scripts/user-flow-catalog.mjs) maps each user flow to concrete evidence. Update that catalog and run `npm run docs:user-flows` when adding a flow; never maintain a second manual list in this document. Catalog coverage can include unit, integration and browser evidence and does not mean every flow has a standalone end-to-end test.

## Browser Invariants

- Every workspace has a reachable navigation path, a behavior contract for enabled commands, and bounded desktop/mobile layout.
- Appearance follows the system unless explicitly overridden. Cross-tab changes, unavailable preference storage and unsaved inputs are covered.
- Deferred screens share one loading/failure/navigation matrix. Late module or provider results must not overwrite another view, signed-out session, newer draft or focus.
- Empty real workspaces retain sign-in, first-project creation, backups and integrations. Demo fixtures must not hide onboarding failures.
- The demo uses existing schemas and parsers, preserves normal workspace data, and makes no Worker requests.
- Compiled offline tests cover encrypted export/preview and previously loaded lazy screens. They do not promise never-fetched features are available offline.
- Production documents retain pinned revisions. Final call sheets reject implicit schedule changes; explicit draft sync preserves manual fields.
- Screenshot output under `test-results/` is disposable. Inspect representative rendered states; structural assertions alone do not establish visual quality.

## Performance And CI

[Bundle budgets](../scripts/web-bundle-budget.mjs) enforce entry, total initial JavaScript and initial gzip ceilings after final chunk transforms, traversing static dependencies once. They also reject accidental eager imports of deferred provider/recovery/production screens. Treat the budgets as regression ceilings, not performance targets; the script is the numeric source of truth.

[CI](../.github/workflows/ci.yml) runs `npm run smoke`, the fresh-D1 local suite, advisory deployment readiness and both Worker dry runs. It retains the tested static build as a SHA-named artifact for 14 days. CI neither deploys nor authorizes live providers. Companion checks require sibling repos and therefore run in an operator workspace, not a normal CI checkout.

## Operator And Public Checks

Follow [Deployment](DEPLOYMENT.md) for configuration and [Operations](OPERATIONS.md) for consent, rotations, production imports and recovery. Live exercises are separate from ordinary tests.

### Configuration Readiness

`npm run check:deploy` is advisory for local work. Add `-- --dev-vars apps/worker/.dev.vars` only for operator-local verification of ignored Worker dev vars; the script uses the values for presence/shape checks without printing secret values. Add `-- --wrangler-secrets` when Cloudflare secret names should count for production readiness; the script lists secret names only and never reads values.

`npm run check:deploy:strict -- --wrangler-secrets` requires live readiness for auth, invites and Google OAuth plus any provider mode explicitly set live. Meta, Telnyx SMS and Stripe summaries are advisory while explicitly disabled. Setting a live mode makes that provider's app/secret/policy/mapping checks strict. Record intentional blockers and keep their live modes off; a passing configuration check is not account, delivery or public-provider acceptance.

`npm run check:companions -- --strict` validates the local Pool/Store adapter contract. The checker scans sibling repos for tracked route, endpoint and shared-secret binding names, reports configuration names only, and does not print `.dev.vars` values. Missing local secret declarations are warnings because production secrets may be managed through Wrangler or the dashboard. Real resource mappings must exist before live reads.

`npm run check:sms:preflight` requires both SMS gates disabled and is for new/unapproved installations. Use the [Telnyx activation procedure](OPERATIONS.md#telnyx-consent-and-webhook-activation); do not reset an accepted live deployment to satisfy this provisioning check.

### Worker Packaging

Package both Workers without deploying:

```bash
npx wrangler deploy --dry-run --config apps/worker/wrangler.toml
npx wrangler deploy --dry-run --config apps/web/wrangler.toml
```

After Worker configuration changes, also run `npx wrangler types worker-configuration.d.ts --include-runtime false --check` from `apps/worker`.

### Provider Readiness And Approved Sends

Set `FILM_WORKER_SMOKE_ORIGIN` to the approved local/staging Worker before running `smoke:providers:live`; a production origin requires the separate provider/resource approvals below.

`smoke:providers:live` checks readiness without calling live Stripe adapters or sending email unless explicit allow flags are supplied. Set `FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE=1` only against local/staging Pool and Store summary adapters, or against production after mapped refs and the shared adapter secret are confirmed. Set `FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE=1` and `FILM_LIVE_PROVIDER_SMOKE_INVITE_EMAIL` only when a real Resend test recipient is approved.

`npm run smoke:auth:production -- --allow-send --require` is an operator-only probe. It reads the approved owner address and Resend API key from explicit environment variables or the ignored Pool `.dev.vars`, sends one magic link, waits for the matching message to be delivered, verifies the session, logs out, and confirms revocation. It never prints the recipient or authentication/provider values. Production project creation/import requires the separate [Notion import procedure](OPERATIONS.md#production-notion-import).

Add `--check-runtime-readiness` to inspect the protected manifest during the same transient session. The probe expects Resend/Google live and unmapped Pool/Store/Stripe plus Meta blocked; its SMS default expects sending disabled. Match `--expected-sms-mode` to [Project Status](PROJECT_STATUS.md), using `live` for an accepted live-SMS deployment. The probe also validates a metadata-only Google authorization start, including the production callback, PKCE, offline access, granular consent and exact scope, without granting access or storing tokens.

`--check-telnyx-readiness` adds read-only provider checks. `--send-owned-sms` is a separate consent-controlled delivery exercise documented in [Operations](OPERATIONS.md#telnyx-consent-and-webhook-activation); owner-login approval never implies an SMS send.

### Public Assets And Traffic

`node scripts/browser-smoke.mjs --release-origin https://film.dustwave.xyz` checks public compiled assets with isolated storage and mocked/blocked API requests. It is not a live-account test.

`npm run report:production-traffic` queries Cloudflare Worker analytics and the `SESSIONS` KV namespace for aggregate invocation metrics and unexpired rate-limit window counts. It reads ignored operator credentials, reports its HTTP-status and expiration limitations, and never prints Cloudflare identifiers, credentials or rate-limit identity hashes. Use observed evidence before changing `RATE_LIMIT_OVERRIDES` or adding an abuse-challenge provider.

## Human Acceptance

Before describing Film as broadly production-ready, rehearse a real small production with a producer and contributor, not only the fixture owner. Use approved non-sensitive records:

1. Join, sign in, create/import a project, assign work, and confirm denied roles remain denied.
2. Break down a screenplay, schedule at least two days/units, resolve conflicts and compare an explicit budget scenario.
3. Issue a call sheet, revise the source/schedule, and verify the issued sheet stays stable while a reviewed draft changes.
4. Generate sides and a daily report; inspect exported files with the people who will use them.
5. Edit offline, reconnect and reload; reconcile queued work and stale-record errors without losing drafts.
6. Export an encrypted backup and restore into an isolated workspace; verify core records, local production graph and separately handled attachments.
7. Complete desktop keyboard and macOS VoiceOver navigation, plus mobile forms and exports at realistic content lengths.
8. With separate consent, verify an actual provider connection, expiry/reconnect/disconnect and delivery lifecycle.

Record limitations, operator consent and pass/fail evidence using the [release evidence policy](release-evidence/README.md). Never include private script text, contacts, tokens, screenshots of secrets or raw provider output.
