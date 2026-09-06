# Historical Decisions 0150-0199

Consolidated losslessly on 2026-09-06 from incremental ADRs. Original status statements describe their implementation stage, not current product or provider readiness. See [current decision owners](../../adr/README.md) and [project status](../../PROJECT_STATUS.md). Original files remain in the v0.1.0-beta.1 Git tag.

<a id="0150-multitab-operation-sync-safety"></a>

Source: `docs/adr/0150-multitab-operation-sync-safety.md`

# ADR 0150: Multi-Tab Operation Sync Safety

## Status

Accepted.

## Decision

Change successful operation sync persistence so it does not rewrite the entire in-memory workspace snapshot from the syncing tab.

After the Worker accepts queued operation IDs, the browser now:

- marks accepted operation records synced in the operation store
- appends the sync audit event to the currently stored workspace snapshot
- refreshes the current tab workspace from that stored snapshot when available

It no longer calls the generic full `persistWorkspace()` path just to save the audit entry after sync.

`npm run test:browser` now includes a multi-tab IndexedDB smoke: tab A creates and syncs a local task, tab B creates a local person from the current stored workspace, and a fresh tab verifies tab B's queued operation and workspace record survive tab A's sync.

## Context

Film is local-first and keeps workspace snapshots plus queued operation records in IndexedDB. A sync action changes operation status, but the previous success path also persisted the syncing tab's whole in-memory workspace so the audit log entry survived reloads.

In a multi-tab session, that whole-workspace write could overwrite a newer workspace snapshot written by another tab. Operation records are keyed separately and can be safely updated by accepted ID; the audit append should be similarly narrow.

## Consequences

- A sync in one tab is less likely to clobber another tab's newer workspace snapshot.
- Sync audit events are still persisted when the current stored workspace can be read.
- Broader multi-tab merge semantics remain conservative; future collaborative local editing may need per-record workspace storage or conflict-aware snapshot merging.


---

<a id="0151-browser-worker-backup-smoke"></a>

Source: `docs/adr/0151-browser-worker-backup-smoke.md`

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


---

<a id="0152-browser-worker-mutation-smoke"></a>

Source: `docs/adr/0152-browser-worker-mutation-smoke.md`

# ADR 0152: Browser Worker Mutation Smoke

## Status

Accepted.

## Decision

Extend `npm run smoke:browser:worker` with a protected record mutation path against the configured Worker origin.

The smoke now creates a local Markdown document, syncs the queued `document.created` operation through the signed Worker session so D1 has a canonical target row, then drives the Team mutation UI through:

- update authorization preflight
- metadata-only mutation request creation
- owner/producer approval
- non-destructive field diff preview
- explicit mutation apply with Worker confirmation

It asserts the applied mutation reports a destructive write for only the requested allowlisted document metadata fields.

## Context

Direct Worker tests already cover mutation authorization, stale checks, and D1 application. The mocked browser smoke covers the UI shape. The missing release evidence was a browser session proving cookies, CSRF, D1 operation replay, mutation request state, and mutation apply all compose over a real local or staging Worker origin.

The smoke creates its own target row first because local D1 is schema-ready but not seeded with static workspace documents.

## Consequences

- Local/staging handoff has end-to-end UI-through-Worker evidence for a protected mutation write.
- The smoke remains deterministic and does not require provider credentials.
- The generated canonical document row lives only in local/staging D1 state.
- Broader mutation matrix coverage remains in Worker and web unit tests.


---

<a id="0153-restore-application-preflight-accessibility-smoke"></a>

Source: `docs/adr/0153-restore-application-preflight-accessibility-smoke.md`

# ADR 0153: Restore Application Preflight Accessibility Smoke

## Status

Accepted.

## Decision

Extend `npm run test:browser` so the desktop smoke drives the restore UI beyond encrypted backup preview.

After exporting and previewing an encrypted backup, the smoke signs in again through mocked Worker auth, accepts the exact `RESTORE workspace_acme` confirmation phrase for each restore step, and mocks:

- restore gate check
- restore approval record
- restore commit-storage check
- restore application-preflight check

It then runs axe serious/critical checks on the resulting application-preflight state, including the dense restore status panels and snapshot review table.

## Context

Restore preview already had axe coverage, but the confirmation-driven Worker restore panels are denser and closer to the eventual apply path. They include repeated status regions, conditional action buttons, hash snippets, rollback guidance, and a scrollable row-review table.

The deterministic browser smoke should catch accessibility regressions in those states without requiring a live Worker or applying destructive restore commits.

## Consequences

- Browser QA now covers the critical restore progression through application preflight.
- The route mocks assert CSRF headers and exact confirmation phrases.
- Deterministic smoke still stops before destructive restore apply because the same-state backup has no create/update rows to apply.
- Live Worker restore commit validation remains covered by Worker tests and manual/local-staging verification.


---

<a id="0154-live-provider-adapter-smoke"></a>

Source: `docs/adr/0154-live-provider-adapter-smoke.md`

# ADR 0154: Live Provider Adapter Smoke

## Status

Accepted.

## Decision

Add `npm run smoke:providers:live`, backed by `scripts/live-provider-adapter-smoke.mjs`, as an opt-in local/staging smoke for provider adapter readiness.

The command signs in through the configured Worker origin and checks:

- all MVP provider dry-run surfaces
- Google Drive dry-run planning
- Stripe summary readiness
- optional Pool/Store Stripe summary adapter fetches when `FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE=1`
- configurable request timeout through `FILM_LIVE_PROVIDER_SMOKE_TIMEOUT_MS` or `--timeout-ms`, defaulting to 90 seconds for cold summary scans
- Resend invite-delivery readiness
- optional Resend live invite send when `FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE=1` and `FILM_LIVE_PROVIDER_SMOKE_INVITE_EMAIL` are set

It skips without a Worker origin unless required. It does not print provider secrets, cookies, CSRF tokens, dev tokens, or raw recipient details.

## Context

Provider integrations are MVP-critical, but live credentials and third-party side effects should not run in default CI. Film currently has true live-adapter surfaces for Stripe summaries through Pool/Store and Resend invite delivery. Google, Social, and SMS remain dry-run planning surfaces until their live adapters and compliance scopes are explicit.

## Consequences

- Operators can run a single local/staging provider smoke before release evidence collection.
- Live Stripe adapter calls and live Resend sends require explicit per-run flags.
- Google, Social, and SMS are still represented as dry-run readiness checks, not live side-effecting checks.
- Default `npm run smoke` remains provider-secret-free.


---

<a id="0155-local-worker-smoke-suite"></a>

Source: `docs/adr/0155-local-worker-smoke-suite.md`

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


---

<a id="0156-attachment-object-plan-policy-fields"></a>

Source: `docs/adr/0156-attachment-object-plan-policy-fields.md`

# ADR 0156: Attachment Object Plan Policy Fields

## Status

Accepted.

## Decision

Restore attachment object plans now include explicit policy and proof fields while remaining non-destructive:

- `destinationPolicy = workspace_scoped_deterministic_object_keys`
- `overwritePolicy = blocked_until_explicit_overwrite_rules`
- `byteSourcePolicy = verified_package_manifest_only`
- `sourceVerificationStatus = metadata_hash_verified_without_bytes`

Each planned object also reports candidate destination status, overwrite status, byte-source status, and manifest-hash verification status. The action remains `blocked_destination_write_rules`, `canRestoreBytes` remains false, and no endpoint accepts or writes raw attachment bytes.

## Context

ADR 0086 added object-level attachment restore planning, but the response only exposed a destination key and a generic blocker. Before any destructive byte restore can exist, operators need a clearer contract for which destination rule, overwrite rule, and byte-source proof are missing.

## Consequences

- The Worker can persist richer object-plan JSON without a schema migration because `restore_attachment_object_plans.plan_json` already stores the full plan.
- The browser restore panel can explain why byte restore remains blocked after package verification.
- ADR 0163 adds a durable non-destructive commit preflight for R2/D1 destination absence checks. Future destructive byte restore still needs explicit byte-source submission/streaming, byte-source verification against package bytes at commit time, and destination write authorization before any R2 write path is added.


---

<a id="0157-remote-wrangler-secret-readiness"></a>

Source: `docs/adr/0157-remote-wrangler-secret-readiness.md`

# ADR 0157: Remote Wrangler Secret Readiness

## Status

Accepted.

## Context

Film's deployment readiness checker can validate tracked Worker config and ignored local `.dev.vars`, but production secrets should live in Cloudflare Worker secrets or dashboard-managed bindings. Operators need a way to prove those remote secret names exist without copying values into files or terminal output.

## Decision

Add `npm run check:deploy -- --wrangler-secrets` support. The checker calls `wrangler secret list --format json`, records only secret names, and treats those names as configured for readiness checks. It never reads or prints secret values.

## Consequences

- Production secret posture can be audited by name after the remote Worker exists.
- Local `.dev.vars` remains useful for local/staging verification, but it is not required for remote secret readiness.
- Production route/origin and live invite decisions remain separate blockers until explicitly configured.


---

<a id="0158-bounded-rate-limit-overrides"></a>

Source: `docs/adr/0158-bounded-rate-limit-overrides.md`

# ADR 0158: Bounded Rate Limit Overrides

## Status

Accepted.

## Context

Film's Worker has KV-backed POST rate limits, but the defaults are hard-coded. Production launch needs a way to tune route-family buckets without code changes, while avoiding broad disable switches or unsafe values.

## Decision

Add optional `RATE_LIMIT_OVERRIDES` as a non-secret JSON object keyed by existing bucket names. Each override may set integer `limit` from 1 to 1000 and `windowSeconds` from 10 to 3600. Unknown buckets, malformed JSON, or out-of-range values are ignored by the Worker in favor of defaults and are reported by deployment readiness.

## Consequences

- Operators can tune production rate limits without adding new route code.
- Local development and CI continue using the default rate-limit profile.
- The override surface cannot create new buckets, disable rate limiting, or set unbounded windows.


---

<a id="0159-film-profile-stale-check-timestamps"></a>

Source: `docs/adr/0159-film-profile-stale-check-timestamps.md`

# ADR 0159: Film Profile Stale-Check Timestamps

## Status

Accepted.

## Context

Core record mutation requests use each base table's `updated_at` column for stale-checking before applying approved changes. Film-profile fields such as runtime, format, shoot dates, and budget live in `film_profiles`, not `projects`, so they need their own stale-check surface before cross-table edits can be enabled.

## Decision

Add `created_at` and `updated_at` columns to `film_profiles` through migration `0024_film_profile_timestamps.sql`, and require those columns in the migration validator.

## Consequences

- Future film-profile mutation requests can compare against `film_profiles.updated_at` instead of relying on `projects.updated_at`.
- The existing core-record mutation path remains scoped to base tables.
- This migration does not enable profile edits by itself.


---

<a id="0160-film-profile-mutation-preflight"></a>

Source: `docs/adr/0160-film-profile-mutation-preflight.md`

# ADR 0160: Film Profile Mutation Preflight

## Status

Accepted.

## Context

Core record mutations use base-table `updated_at` values for stale checks. Film-profile metadata such as runtime, format, shoot dates, and budgets lives in `film_profiles`, so it needs a separate preflight surface before request/diff/apply routes can safely edit those fields.

## Decision

Add `POST /api/projects/film-profile/mutation-preflight` as an owner/producer protected Worker route.

The route validates workspace and project scope, accepts optional allowlisted profile field keys, reads the selected project's `film_profiles.updated_at` value when D1 is available, and returns:

- `destructiveWrite: false`
- `profileMutationPolicy: "film_profile_stale_check_preflight"`
- the normalized field keys and shared-schema field definitions
- a bounded profile snapshot with `expectedUpdatedAt`

The field contract lives in `packages/schema` and covers runtime minutes, format, shoot start/end, budget cents, and spent cents. Without D1, the route can return seed-project dry-run profile metadata for local development. If D1 is unavailable at read time, the route reports `d1_unavailable_dry_run` only when it can safely fall back to seed data.

## Consequences

- Browser and future UI work can discover profile-edit fields without reusing the base project mutation allowlist.
- Future film-profile request/diff/apply routes can require a fresh `film_profiles.updated_at` match.
- No film-profile edits are applied by this ADR.
- Cross-table profile edits remain separate from the core record mutation request/apply pipeline until their own approval and stale-write checks are implemented.


---

<a id="0161-film-profile-mutation-requests"></a>

Source: `docs/adr/0161-film-profile-mutation-requests.md`

# ADR 0161: Film Profile Mutation Requests

## Status

Accepted.

## Context

ADR 0160 added a preflight route for `film_profiles` metadata. The remaining gap was durable review and stale-checked application for runtime, format, shoot-date, and budget updates without overloading the core `record_mutation_requests` table, which is constrained to base project/task/document/person/equipment/expense rows.

## Decision

Add migration `0025_film_profile_mutation_requests.sql` with a dedicated `film_profile_mutation_requests` table.

Add protected owner/producer Worker routes for:

- `POST /api/projects/film-profile/mutations/request-dry-run`
- `POST /api/projects/film-profile/mutations/requests/manifest`
- `POST /api/projects/film-profile/mutations/requests/resolve-dry-run`
- `POST /api/projects/film-profile/mutations/diff-dry-run`
- `POST /api/projects/film-profile/mutations/apply`

Profile request creation stores bounded metadata, normalized allowlisted field keys, and the selected profile row's `expected_updated_at`. Resolution is approval/rejection only and remains non-destructive. Diff preview reads fixed `film_profiles` columns and reports before/after metadata plus stale status.

Apply requires:

- owner/producer auth
- an approved request
- exact `APPLY FILM PROFILE MUTATION <requestId>` confirmation
- allowlisted update fields
- a fresh `film_profiles.updated_at` match

When the request expected no profile row, apply may insert a first profile row for an existing project. Otherwise it updates only the matching profile row. Stale requests are marked `stale_record_blocked` without applying changes.

## Consequences

- Film-profile edits get the same review shape as core mutations while keeping table constraints and parsers separate.
- Budget/runtime metadata can be corrected without opening raw document bodies, contacts, payment identifiers, or provider credentials to mutation requests.
- ADR 0162 exposes this route family in the Team inspector; broader browser-against-Worker smoke coverage remains a separate release gate.


---

<a id="0162-film-profile-mutation-browser-controls"></a>

Source: `docs/adr/0162-film-profile-mutation-browser-controls.md`

# ADR 0162: Film Profile Mutation Browser Controls

## Status

Accepted.

## Context

ADR 0161 made film-profile mutation requests durable in D1 and added protected Worker routes for request, manifest, resolution, diff preview, and apply. The browser still only exposed the core record mutation workflow, so runtime, format, shoot-date, and budget edits required direct API calls.

## Decision

Expose the film-profile mutation workflow in the Team inspector.

The browser renders field checkboxes from `packages/schema`, posts metadata-only profile mutation requests through `membership-client`, can review the selected project's profile request manifest, lets owner/producer sessions approve or reject requests, previews approved profile diffs with typed per-field value controls, and applies approved profile updates with the Worker-required `APPLY FILM PROFILE MUTATION <requestId>` confirmation.

Successful applies reconcile the local workspace mirror for the visible project fields after the Worker reports success. The Worker remains the authority for authorization, field allowlists, stale checks, confirmation, and destructive writes.

## Consequences

- Operators can use the app shell for the complete film-profile review flow instead of direct API calls.
- Browser code remains schema-driven and does not define its own profile mutation allowlist.
- Browser-against-Worker smoke now exercises this profile path against local or staging D1 when a Worker origin is configured.


---

<a id="0163-attachment-object-commit-preflights"></a>

Source: `docs/adr/0163-attachment-object-commit-preflights.md`

# ADR 0163: Attachment Object Commit Preflights

## Status

Accepted

## Decision

Add `POST /api/restores/attachment-objects-commit-preflight` plus the `restore_attachment_object_commit_preflights` D1 table.

The route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, exact `RESTORE <workspaceId>` confirmation, a matching package verification row, a matching stored object plan, package and manifest hashes, a bounded package manifest, D1 storage, and the `ATTACHMENTS` R2 binding for destination existence checks.

It records destination readiness only. Each object is classified as ready for a future explicit byte commit, blocked by an existing destination, blocked by missing R2 binding, or blocked by destination-check failure. It checks both R2 object existence and D1 stored attachment intent rows. It accepts no raw package bytes, writes no attachment bytes, keeps `destructiveWrite: false`, and returns `canRestoreBytes: false` even when all destinations are ready.

The browser restore panel exposes this after package verification and object planning as `Check attachment commit preflight`.

## Context

ADR 0086 and ADR 0156 established non-destructive object planning after package manifest verification. That produced deterministic destination keys and explicit policy fields, but it still did not prove whether those destination keys were currently unused.

Before a byte restore commit can exist, Film needs a durable handoff record that captures destination readiness and overwrite blockers without making the destructive write path available.

## Consequences

- Future attachment byte restore commits can validate a recent commit preflight instead of trusting browser-side destination assumptions.
- Existing destination objects are blocked because overwrite policy is still not explicit.
- Package byte submission/streaming and per-object byte hash verification remain future work.
- The route gives operators a visible next step after object planning without restoring bytes.


---

<a id="0164-expiring-stored-backup-download-plans"></a>

Source: `docs/adr/0164-expiring-stored-backup-download-plans.md`

# ADR 0164: Expiring Stored Backup Download Plans

## Status

Accepted

## Decision

Add `POST /api/backups/r2/object-download-plan` plus the `backup_object_download_plans` D1 table.

Stored backup byte downloads now require a short-lived plan ID and token. The plan route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, workspace scope checks, a D1 restore-point ID, the `BACKUPS` R2 binding, a derived workspace-scoped backup object key, and an existing R2 object. It stores only a hashed token, object key, restore point, actor member, and 15-minute expiry, then records bounded audit metadata with `destructiveWrite: false`.

`GET /api/backups/r2/object` rejects direct downloads without a matching plan ID and token. It verifies token hash, expiry, restore-point match, object-key match, and workspace object-key prefix before reading encrypted backup bytes from R2. The browser preview flow creates the plan immediately before downloading, then decrypts the backup locally.

## Context

Stored backup downloads already resolved D1 restore-point IDs server-side instead of trusting browser-supplied R2 keys. That prevented arbitrary bucket-key reads, but it did not provide a short-lived, auditable byte-download grant.

Backups are encrypted before upload, but downloaded backup bytes still deserve explicit expiry and replay resistance because they contain the encrypted workspace, document-body payloads, planning exports, and attachment restore-policy metadata.

## Consequences

- Direct stored-backup byte downloads are blocked unless an unexpired D1-backed plan exists.
- The browser never receives or supplies a raw R2 object key for stored-backup preview.
- Operators get an audit event for plan creation and a separate audit event for download.
- Download plans are not destructive and do not weaken the existing local-only passphrase/decryption boundary.


---

<a id="0165-restore-application-table-plan-commit-validation"></a>

Source: `docs/adr/0165-restore-application-table-plan-commit-validation.md`

# ADR 0165: Restore Application Table Plan Commit Validation

## Status

Accepted

## Decision

Tighten `POST /api/restores/application-commit` so workspace-snapshot restore records must match the submitted application table plan before any D1 conflict checks or writes run.

The Worker now computes per-table workspace-snapshot counts from the submitted records and compares table name, source, entity type, operation count, create count, update count, skip count, preview-only count, and restore-support status against the request's workspace-snapshot table-plan rows. If the preflight row contains an `applicationTablePlan` inside rollback guidance, the commit request's table plan must also match that stored preflight plan exactly.

Mismatches return `restore_application_table_plan_record_mismatch` or `restore_application_preflight_table_plan_mismatch` with `destructiveWrite: false`.

## Context

Application preflights already persisted bounded table-plan metadata, and application commits already checked preview counts and fresh D1 conflicts. However, a malformed client could still submit a broad table plan with a narrower or differently shaped record list. That weakened the handoff between preview, preflight, and commit.

## Consequences

- Workspace snapshot commits are tied more tightly to the table plan the user reviewed.
- Planning table-plan rows remain separate and are still validated by the planning commit path.
- Existing legacy preflight rows without a stored application table plan can still proceed if the request table plan matches the submitted records.


---

<a id="0166-resend-invite-delivery-webhook-verification"></a>

Source: `docs/adr/0166-resend-invite-delivery-webhook-verification.md`

# ADR 0166: Resend Invite Delivery Webhook Verification

## Status

Accepted

## Decision

Add `POST /api/webhooks/resend/invite-delivery` as a Worker-owned provider callback for Resend invite-delivery events.

The route reads a bounded raw body, requires `svix-id`, `svix-timestamp`, and `svix-signature`, verifies the Svix HMAC with `INVITE_DELIVERY_WEBHOOK_SECRET`, rejects stale timestamps, normalizes supported Resend email delivery event types, and records an idempotent D1 row keyed by Svix message ID. When the event includes a Resend email ID that matches a live invite delivery attempt, the webhook row links to that attempt, workspace, and invite.

The stored row contains only provider/status IDs, timestamps, delivery status, and metadata-key names. It does not store raw webhook payloads, raw recipient addresses, headers, or secret values.

## Context

ADR 0106 added explicitly gated live Resend invite delivery, but webhook verification and delivery-event handling were still listed as blockers. Film needs delivery status ingestion before broader live-provider launch, while preserving the same trust boundary used elsewhere: provider callbacks terminate in the Worker, and browser code never sees provider secrets.

Resend signs webhooks with Svix headers, so the Worker can validate authenticity without adding a new app-session or CSRF requirement to provider callbacks.

## Consequences

- Resend invite-delivery callbacks now fail closed when the signing secret is missing, malformed, stale, or invalid.
- Replay delivery from Resend is idempotent by Svix message ID.
- D1 can now retain bounded delivery-state evidence without persisting raw provider payloads.
- Production launch still needs sender/domain setup, production route/origin decisions, bounce/suppression policy review, abuse controls, and redacted audit review.


---

<a id="0167-resend-invite-delivery-state-suppressions"></a>

Source: `docs/adr/0167-resend-invite-delivery-state-suppressions.md`

# ADR 0167: Resend Invite Delivery State And Suppressions

## Status

Accepted

## Decision

Materialize verified Resend invite-delivery webhooks into two bounded D1 surfaces:

- `invite_delivery_attempts.last_event_status` and `last_event_at` hold the latest signed provider event for a linked live invite delivery attempt.
- `invite_delivery_suppressions` stores hash-only suppression evidence for bounced, complained, or suppressed events, keyed by provider, target hash, and suppression reason.

The webhook route still stores the normalized event row first and ignores duplicate Svix message IDs. Only non-duplicate signed events update delivery attempt state or suppression rows. Suppression records link back to the workspace, invite, delivery attempt, provider message ID, and source webhook event when those values are known from the existing live delivery attempt. Raw webhook payloads and raw recipient addresses are not stored.

## Context

ADR 0166 added signature verification and bounded webhook event storage. That proved the provider callback boundary, but live invite delivery still needed durable state that operators can use for bounce and suppression review before public launch.

The safest next step is to materialize status from already verified events rather than adding new sends, browser-visible raw delivery payloads, or provider API reads.

## Consequences

- Linked live invite attempts now have a durable latest provider event without changing the original send status.
- Bounce, complaint, and suppression events create hash-only review records.
- Replayed provider webhooks remain idempotent by Svix message ID.
- Production launch still needs an operating policy for future send blocking, support review, and retention around suppression records.


---

<a id="0168-invite-delivery-suppression-manifest"></a>

Source: `docs/adr/0168-invite-delivery-suppression-manifest.md`

# ADR 0168: Invite Delivery Suppression Manifest

## Status

Accepted

## Decision

Add a protected owner/producer route, `POST /api/invites/delivery-suppressions`, that returns a bounded manifest of hash-only invite delivery suppression rows for a workspace.

The response includes suppression IDs, provider, target hash, suppression reason, linked invite/delivery-attempt/provider-message/source-webhook IDs, timestamps, count, truncation status, and persistence metadata. It does not return raw recipient addresses, webhook payloads, headers, or secret values. The Team inspector exposes `Review delivery suppressions` using the same signed session and CSRF model as pending invite manifest review.

## Context

ADR 0167 stores hash-only suppression evidence from signed Resend webhooks. Operators need a review surface before production invite delivery can be responsibly enabled, but that surface should not expose raw provider payloads or create any send/block mutation policy yet.

## Consequences

- Owners and producers can inspect suppression evidence from the Team panel.
- Suppression review is auditable through bounded D1 audit metadata.
- Future work can add explicit send-blocking or retention policy without changing the raw-data boundary.


---

<a id="0169-stripe-summary-production-defaults"></a>

Source: `docs/adr/0169-stripe-summary-production-defaults.md`

# ADR 0169: Stripe Summary Production Defaults

## Status

Superseded for production defaults by ADR 0223. The adapter architecture remains implemented.

## Decision

Configure Film's non-secret Worker defaults for Stripe summary reads to use the existing Dust Wave companion adapters:

- Pool: `https://pledge.dustwave.xyz/film/stripe-summary`
- Store: `https://checkout.dustwave.xyz/film/stripe-summary`

The default project mapping covers the seed `workspace_acme/proj_echoes` project and the Dust Wave fixture project with public Pool campaign slugs and Store product refs. `STRIPE_REDACTED_AUDIT=true` and `STRIPE_SUMMARY_MODE=live` are tracked as non-secret Worker vars, while `STRIPE_WEBHOOK_SECRET` and `STRIPE_SUMMARY_ADAPTER_SECRET` remain Wrangler/dashboard secrets.

## Context

The local provider smoke verified Film can call both companion adapters through the summary-only contract without exposing raw Stripe data. Pool and Store already expose bearer-authenticated `/film/stripe-summary` routes and declare the shared `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` binding name.

## Consequences

- Deployment readiness no longer treats Pool/Store adapter URLs, project mappings, redacted audit, or live summary mode as unresolved local defaults.
- Direct Stripe API reads remain blocked in Film.
- Production route/origin and live invite delivery decisions remain separate operator choices.
- Real project mappings can override the seed refs through Worker vars without changing code.


---

<a id="0170-invite-delivery-suppression-enforcement"></a>

Source: `docs/adr/0170-invite-delivery-suppression-enforcement.md`

# ADR 0170: Invite Delivery Suppression Enforcement

## Status

Accepted.

## Decision

Before creating a workspace invite, the Worker computes the target email hash and checks `invite_delivery_suppressions` for a matching Resend target hash. If a suppression exists, `POST /api/invites/create-dry-run` returns `409 invite_delivery_suppressed` with bounded suppression metadata and records an audit event.

The route does not create a workspace invite row, does not create an invite delivery attempt, and does not call Resend for suppressed targets.

## Context

ADR 0167 stored hash-only suppressions from bounced, complained, and suppressed Resend webhook events. ADR 0168 exposed those rows through a protected manifest. The missing MVP behavior was enforcement before future invite sends.

## Consequences

- Suppressed recipients are blocked by hash without storing or returning raw email addresses.
- Live and dry-run invite creation share the same suppression gate.
- D1-unavailable local development remains dry-run, because the Worker cannot prove a suppression exists.
- Future support workflows can add owner/producer review or suppression overrides as separate, audited routes.


---

<a id="0171-local-task-status-updates"></a>

Source: `docs/adr/0171-local-task-status-updates.md`

# ADR 0171: Local Task Status Updates

## Status

Accepted.

## Decision

The Tasks workspace exposes a row-level status selector for each open task. Changing a status updates the browser-local workspace immediately and queues a metadata-only `task.updated` operation with project ID, task title, new status, and previous status.

The shared schema and Worker operation replay allow `task.updated` as a task operation. D1 replay stores the operation in `operation_log` as metadata only; it does not yet mutate canonical task rows.

## Context

Film needs useful local production task handling before deeper collaborative editing is fully designed. The existing UI could create tasks and export a task list, but it could not change readiness/overdue/pending status without using the heavier protected record-mutation flow.

## Consequences

- Solo users can keep the local Tasks workspace current while offline.
- Sync preserves an auditable status-change history without prematurely committing server-side task update semantics.
- Existing project membership, owner metadata, and direct task permission checks protect replay when D1 auth is available.
- A future canonical task edit endpoint can apply the same status transitions after stale-write, rollback, and permission semantics are explicit.


---

<a id="0172-local-task-completion"></a>

Source: `docs/adr/0172-local-task-completion.md`

# ADR 0172: Local Task Completion

## Status

Accepted.

## Decision

The Tasks workspace exposes a row-level `Complete` action for open tasks. Completing a task removes it from the browser-local open-task list, increments the selected project's completed task count, records a local audit event, and queues a metadata-only `task.completed` operation with project ID, task title, previous status, and completion timestamp.

The shared schema and Worker operation replay allow `task.completed` as a task operation. D1 replay stores the operation in `operation_log` as metadata only; it does not yet mutate canonical task rows.

## Context

The app already tracked `openTasks` plus `tasks.done`, but the Tasks workspace only supported creating tasks and changing readiness status. Solo filmmakers need a quick way to close local work items before broader collaborative task editing is finalized.

## Consequences

- The open-task list and completed count are useful in offline/local production workflows.
- Operation sync preserves completion history without pretending canonical D1 task update semantics are finished.
- Existing project membership, owner metadata, and exact task permission checks protect replay when D1 auth is available.
- Future canonical task update/delete endpoints can reuse the same completion intent after stale-write, undo, and permission semantics are explicit.


---

<a id="0173-local-task-due-capture"></a>

Source: `docs/adr/0173-local-task-due-capture.md`

# ADR 0173: Local Task Due Capture

## Status

Accepted.

## Decision

Task create forms include an optional due label. `createTask` normalizes that label into the local task row, and `task.created` operation payloads include `dueAt` alongside the project ID and title.

When D1 operation replay applies a canonical `task.created` operation, the Worker writes the bounded `dueAt` payload into `tasks.due_at`. Empty due values remain `Unscheduled` locally and `NULL` in canonical D1 replay.

## Context

Film already displayed task due labels in the Slate and Tasks workspaces and included them in task-list exports, but locally created tasks always used `Unscheduled`. That made task handoff exports less useful for real production work.

## Consequences

- Solo users can capture lightweight due labels without adding a calendar store or Google Calendar dependency.
- The operation payload stays bounded metadata and does not include notes, private comments, provider IDs, or raw document content.
- Canonical D1 task creates can preserve the same due metadata when replay is authorized.
- Rich due-date validation, reminders, recurring tasks, and calendar sync remain separate Worker-owned/provider-gated work.


---

<a id="0174-production-route-invite-delivery-enable"></a>

Source: `docs/adr/0174-production-route-invite-delivery-enable.md`

# ADR 0174: Configure Production Route and Invite Delivery

## Status

Accepted

## Decision

Configure the Film Worker for the Dust Wave production custom domain `api.film.dustwave.xyz`, add `https://film.dustwave.xyz` to `ALLOWED_ORIGINS`, set `INVITE_APP_ORIGIN=https://film.dustwave.xyz`, and enable invite sending with `INVITE_DELIVERY_MODE=live`.

Use `Film <invites@dustwave.xyz>` as the invite sender because the Resend account already has the root `dustwave.xyz` domain verified. Store the Resend webhook signing secret only as the Cloudflare Worker secret `INVITE_DELIVERY_WEBHOOK_SECRET`.

Deploy the static app as the separate `film-web` Worker with static assets and the custom domain `film.dustwave.xyz`, keeping the API Worker and browser app deploy targets separate.

## Context

Deployment readiness had only production identity and invite-delivery blockers remaining after remote Wrangler secrets were counted: app origin, Worker route, invite sender, invite app origin, Resend webhook signing secret, and live delivery mode.

Pool and Store already use explicit `dustwave.xyz` zone routes rather than `workers.dev`, and Film keeps `workers_dev = false`.

## Consequences

- `npm run check:deploy -- --wrangler-secrets` and `npm run check:deploy:strict` can now act as real production readiness gates for Worker configuration.
- Browser CORS allows the production app origin plus local Vite origins.
- Live invite sends remain Worker-owned and require the Resend key, sender, app origin, webhook secret, and live mode.
- Static app hosting uses Workers static assets instead of requiring a separate DNS-write token for Cloudflare Pages.


---

<a id="0175-member-only-live-magic-link-auth"></a>

Source: `docs/adr/0175-member-only-live-magic-link-auth.md`

# ADR 0175: Member-Only Live Magic-Link Authentication

## Status

Accepted.

## Decision

Production uses `AUTH_MAGIC_LINK_MODE=live`. A magic-link request always returns the same generic accepted response, but the Worker sends a Resend email only when the normalized email hash belongs to an active D1 workspace member. Tokens are random, short-lived, stored only as hashes, bound to that member and workspace, and consumed once. Verification fails closed if D1 or KV is unavailable, if membership is not active, or if a legacy session lacks member/workspace scope.

The web app consumes `magicLinkToken` from the production URL and immediately removes it from browser history. Local Wrangler development explicitly overrides the mode to `dry_run`, where test tokens can still be returned for deterministic smoke tests.

Production owner bootstrap is a separate operator command, `npm run bootstrap:production-owner -- --apply`. It reads the approved owner identity from an ignored companion environment file, hashes it locally, expires prior links for the target member, revokes target-member and workspace-less sessions, upserts the workspace/member rows, records a bounded operator audit event, and never prints the email or hash.

## Context

The previous production configuration exposed the local dry-run behavior. An unknown email could receive a development token and create a workspace-less owner session because the authorization fallback treated missing workspace scope as permitted.

## Consequences

- Unknown and inactive addresses are indistinguishable at the API response boundary and receive no email.
- Production sign-in depends on D1, KV, Resend, and an existing active member record.
- No raw email, token, cookie, or CSRF value is persisted in D1 or logs.
- Local smoke remains deterministic without weakening the production mode.


---

<a id="0176-attachment-object-byte-restore-commit"></a>

Source: `docs/adr/0176-attachment-object-byte-restore-commit.md`

# ADR 0176: Attachment Object Byte Restore Commit

## Status

Accepted.

## Decision

Restore attachment bytes through a separate owner/producer-only `PUT /api/restores/attachment-object-commit` route after the durable package preflight, package verification, object plan, and recent ready object commit preflight all match. The request must include the exact `RESTORE <workspaceId>` confirmation and the verified package, manifest, object, destination, size, content type, and SHA-256 metadata.

The browser reopens the downloaded ZIP, verifies every planned entry and SHA-256 locally, and uploads one object at a time. The Worker independently bounds and hashes the request body, refuses an existing D1 intent or R2 destination, uses an R2 create-only conditional put, and records both a `stored_r2` attachment intent and a destructive commit row. A metadata failure triggers best-effort cleanup of the newly written object and intent. A retry is idempotent only when the prior commit and current R2 metadata still match. ADR 0196 replaces the split D1 writes and best-effort-only cleanup with a durable prepared reservation, atomic D1 finalization, and recoverable compensation state.

## Context

Film already verified package manifests and destination absence, but stopped before byte submission. Completing the restore path required explicit streaming limits, overwrite policy, destination authorization, durable proof, compensation, and retry behavior.

## Consequences

- Attachment restore never overwrites an existing D1 or R2 destination.
- The browser and Worker both verify bytes; browser verification is not trusted as authorization.
- Each object is independently committed and auditable, so a partial package can be retried safely.
- The 25 MiB per-object bound keeps the current Worker path simple; larger objects require a future multipart design.


---

<a id="0177-production-auth-smoke"></a>

Source: `docs/adr/0177-production-auth-smoke.md`

# ADR 0177: Production Auth Smoke

## Status

Accepted.

## Decision

Provide `npm run smoke:auth:production` as an explicitly gated production authentication probe. It runs only with `--allow-send` or `FILM_PRODUCTION_AUTH_SMOKE_ALLOW_SEND=1`, reads an approved owner address and Resend API credential from environment variables or an ignored companion `.dev.vars`, and never prints either value.

The smoke verifies the Worker's non-secret live auth mode, generic magic-link response, absence of a development token/email hash, creation and delivery of a newly requested matching Resend message, in-memory sign-in link consumption, session metadata, logout, and revoked-session rejection. It does not call project, provider, backup, restore, or other workspace mutation routes.

## Context

Local smoke depends on deterministic dry-run tokens, while production correctly exposes no token. Manual retrieval proved the live flow but was not repeatable release evidence and risked accidentally printing sensitive values.

## Consequences

- Production auth can be verified end to end without exposing the recipient, message ID, link, token, cookie, CSRF value, or API key.
- Every real run sends one approved magic-link email and writes then revokes one auth session.
- The send gate keeps the command out of normal CI and local smoke.



---

<a id="0178-production-rate-limit-posture"></a>

Source: `docs/adr/0178-production-rate-limit-posture.md`

# ADR 0178: Retain Default Production Rate Limits

## Status

Accepted.

## Decision

Retain the Worker's default KV-backed production rate limits rather than adding `RATE_LIMIT_OVERRIDES` or a Turnstile challenge now. Use `npm run report:production-traffic` to review aggregate Cloudflare Worker invocation metrics and unexpired rate-limit window counts without printing account IDs, namespace IDs, credentials, or identity hashes.

The July 9, 2026 release review covered 24 hours and reported 311 successful Worker invocations, zero runtime invocation errors, four subrequests, one active magic-link request in its window, and one active verification in its window. The request bucket default remains 5 requests per 10 minutes; neither active auth bucket showed more than one request for an identity.

The July 10 follow-up covered 24 hours and reported 1,161 Worker requests, zero runtime invocation errors, 34 subrequests, and zero active limiter windows. That evidence does not justify adding Turnstile or changing the default limits.

## Context

Production readiness originally left rate-limit tuning and an abuse challenge open. Tightening limits without traffic evidence can lock out legitimate crew, while adding a challenge adds another provider, client flow, privacy surface, and failure mode.

## Consequences

- The generic member-only magic-link response and existing KV limits remain the first unauthenticated abuse controls.
- Operators can repeat an aggregate-only report using ignored Cloudflare credentials from the companion environment.
- Worker invocation errors do not represent HTTP 4xx/5xx responses, and KV evidence includes only unexpired windows; both limitations are reported explicitly.
- Turnstile remains a follow-up if traffic, active-window counts, support reports, or provider delivery volume indicate abuse.


---

<a id="0179-project-onboarding-through-operation-replay"></a>

Source: `docs/adr/0179-project-onboarding-through-operation-replay.md`

# ADR 0179: Project Onboarding Through Operation Replay

## Status

Accepted.

## Decision

Use the existing authenticated local-first operation replay path for first-project onboarding. The sidebar project action opens a modal that requires a bounded title and one controlled project type. Creating the project instantiates the reusable Film template locally and queues `project.created` metadata containing only the title, controlled type, and template identifier.

Authorized Worker replay preserves the bounded project type, stamps the authenticated member as owner, creates the canonical D1 project and film-profile rows, records operation-log metadata, and emits the existing bounded sync audit event. The app does not silently create `Untitled Film` or use a direct operator D1 script for project content.

## Context

Production has an active owner but no canonical projects. The prior plus button immediately created a numbered `Untitled Film`, which made it too easy to sync placeholder data and did not capture a useful type before onboarding.

## Consequences

- Real project data is entered by the owner in the product rather than invented during deployment.
- The flow remains offline-capable and retry/idempotency behavior stays with operation replay.
- Project creation carries no logline, contacts, provider IDs, document bodies, or other sensitive production content.
- Stripe Pool/Store refs remain a separate operator-reviewed mapping after the canonical project exists.



---

<a id="0180-provider-runtime-readiness-manifest"></a>

Source: `docs/adr/0180-provider-runtime-readiness-manifest.md`

# ADR 0180: Provider Runtime Readiness Manifest

## Status

Accepted.

## Decision

Add a protected owner/producer `POST /api/providers/runtime-readiness` manifest that reports explicit live gates for every MVP provider without returning configuration values. The response reports status, bounded runtime mode, live capabilities, blockers, required decisions, and data boundary per provider, plus live/partial/blocked counts and `secretValuesExposed: false`.

Pool, Store, and Stripe are live only through the existing summary-only adapter gate. Resend is live only for member magic links and gated workspace invitations. Google, Meta Insights, and Telnyx SMS remain `dry_run_only` and blocked with concrete OAuth/token/webhook/consent decisions. Meta Insights' static capability contract is `needs_scope`, not `ready`.

The inspector exposes the manifest as an operational list and the Worker records only count/policy audit metadata.

## Context

Static provider capability preflights intentionally remain dry-run even when a narrow production path is live. That made the provider chips useful for planning but misleading as an operational answer to “what is live now?” Available Pool/Store environment files contain no Google, Meta, or Telnyx credentials. ADR 0213 selected Telnyx for crew-only transactional SMS, and ADR 0214 selected Meta's read-only Facebook/Instagram analytics boundary; both remain blocked until their credentials, consent, webhook validation, and production resources are implemented.

## Consequences

- Operators can distinguish bounded live paths from dry-run contracts in the product.
- No provider key, URL, mapping ref, OAuth value, recipient, account ID, or webhook value is exposed.
- The manifest does not enable any provider or weaken an existing gate.
- Google, Meta Insights, and Telnyx SMS cannot move to live until their listed implementation and compliance requirements are satisfied.


---

<a id="0181-live-auth-response-and-session-fail-closed-boundary"></a>

Source: `docs/adr/0181-live-auth-response-and-session-fail-closed-boundary.md`

# ADR 0181: Live Auth Response and Session Fail-Closed Boundary

## Status

Accepted.

## Decision

Auth verify, session metadata, and logout responses derive `dryRun` from `AUTH_MAGIC_LINK_MODE`; successful production responses report `dryRun: false`. The session metadata route returns `503 auth_storage_unavailable` when live auth has no D1 binding or cannot query the session store. It also rejects member-less or workspace-less sessions in live mode.

The development demo workspace route remains available in dry-run mode but returns `404` when live auth is enabled.

## Context

Live member-only authentication already failed closed for token verification and protected mutations, but successful auth responses still reported dry-run mode. The read-only session route also collapsed missing or failed D1 storage into a normal signed-out response, and the public demo route exposed fixture and binding metadata in production despite having no browser consumer.

## Consequences

- Production clients can distinguish an unavailable auth store from a valid signed-out state.
- Live auth responses accurately describe runtime behavior.
- Legacy unscoped sessions cannot appear valid through the session metadata route.
- The deterministic demo fixture remains available for local development without becoming a production API surface.


---

<a id="0182-d1-authoritative-session-role-and-workspace"></a>

Source: `docs/adr/0182-d1-authoritative-session-role-and-workspace.md`

# ADR 0182: D1-Authoritative Session Role and Workspace

## Status

Accepted.

## Decision

For member-bound sessions, current D1 membership is authoritative for role, status, and workspace. KV remains a session cache but cannot override a D1 role. A D1 member ID that is missing, has an invalid role, or belongs to a different workspace than the session is treated as inactive and rejected.

Unscoped local dry-run sessions may continue to use the cached role because they have no member binding. Production already rejects those sessions.

## Context

The previous membership reader preferred a non-owner role cached in KV over the current D1 member role. A producer downgraded to contributor could therefore retain producer authorization until the cached session expired. It also did not compare the member workspace with the workspace stored on the session.

## Consequences

- Role downgrades take effect on the next session or protected-route read without waiting for KV expiry.
- KV corruption or staleness cannot elevate a D1-bound member.
- Cross-workspace member/session mismatches fail closed.
- D1 remains the single authority for current workspace membership.


---

<a id="0183-member-status-and-logout-storage-fail-closed"></a>

Source: `docs/adr/0183-member-status-and-logout-storage-fail-closed.md`

# ADR 0183: Member Status and Logout Storage Fail Closed

## Status

Accepted.

## Decision

Member lookup requires the D1 `workspace_member_statuses` join. If that query fails, the member is not treated as active; the Worker no longer retries a legacy query that assumes active status.

Live logout requires durable D1 revocation when a session cookie is present. Missing or failed D1 storage returns `503 auth_storage_unavailable`, does not claim success, and does not clear the browser cookie. Dry-run development retains its memoryless fallback.

## Context

The compatibility lookup predated the deployed member-status migration. It could turn a status-table/query failure into active membership. Logout also returned success after a D1 exception, which removed the browser cookie while potentially leaving a copied server session usable.

## Consequences

- Member status lookup failures deny session and protected-route access.
- Production logout cannot report revocation until D1 confirms the operation path.
- Operators and clients can distinguish auth-storage failure from a completed logout.
- The Worker requires the already-deployed member-status migration in every D1 environment.


---

<a id="0184-protected-d1-authorization-and-collaboration-fail-closed"></a>

Source: `docs/adr/0184-protected-d1-authorization-and-collaboration-fail-closed.md`

# ADR 0184: Protected D1 Authorization and Collaboration Fail Closed

## Status

Accepted.

## Decision

When D1 is bound, protected record-comment and record-mutation authorization failures return 503 rather than granting dry-run access. Protected invite revocation, member status, project membership, record permission, record owner, and mutation-request operations likewise return explicit 503 errors when their D1 read/write path fails.

Memoryless success remains available only when D1 is intentionally absent in local dry-run development.

## Context

Several helpers predated production auth and treated a D1 exception as a dry-run result. Two authorization helpers returned allowed access after permission-query exceptions, and multiple collaboration writes could report success without persistence. That behavior is unsuitable once a D1-backed member session is authoritative.

## Consequences

- Permission-storage errors cannot grant comment or mutation access.
- Collaboration controls do not claim a member, membership, permission, owner, invite, or mutation-request change that D1 did not persist.
- Clients receive an actionable unavailable response instead of a misleading success.
- Deterministic no-D1 development remains supported.


---

<a id="0185-production-rate-limit-storage-fail-closed"></a>

Source: `docs/adr/0185-production-rate-limit-storage-fail-closed.md`

# ADR 0185: Production Rate-Limit Storage Fails Closed

## Status

Accepted.

## Decision

When `AUTH_MAGIC_LINK_MODE=live`, every route with a configured mutation-rate policy requires the `SESSIONS` KV binding and a successful KV bucket read/write. Missing or failed KV returns `503 rate_limit_unavailable` before route handling. Local dry-run mode keeps the memoryless fallback.

## Context

The production Worker has a dedicated KV binding and rate-limit policies for auth, invite, provider, import, attachment, backup/restore, and operation-sync mutations. The prior error path silently allowed the request when KV was missing or unavailable, removing all abuse controls during the failure.

## Consequences

- A KV outage cannot turn production mutation routes into unbounded endpoints.
- Availability failures are explicit and distinguishable from a 429 limit response.
- Health and other unmetered GET routes remain available.
- Local no-KV development remains deterministic.


---

<a id="0186-operation-replay-unavailable-keeps-local-queue"></a>

Source: `docs/adr/0186-operation-replay-unavailable-keeps-local-queue.md`

# ADR 0186: Operation Replay Unavailable Keeps Local Queue

## Status

Accepted.

## Decision

If D1 is bound and canonical operation replay returns `d1_unavailable_dry_run`, the sync route returns `503 operation_replay_unavailable`, an empty accepted list, and bounded ID/reason rejections. It does not record an accepted sync result.

The browser already marks operations synced only after a successful response with accepted IDs, so those operations remain queued for retry.

## Context

The replay helper previously returned every validated operation as accepted after a D1 exception even though no operation-log or canonical write completed. A browser could then mark its only local copy synced, creating a data-loss window.

## Consequences

- D1 failures cannot acknowledge operations that were not durably replayed.
- Local-first operations remain retryable after transient Worker storage errors.
- The response contains operation IDs and a fixed reason only, not operation payloads.
- Intentional no-D1 development continues to use validation-only dry-run acceptance.


---

<a id="0187-invite-suppression-and-replacement-atomicity"></a>

Source: `docs/adr/0187-invite-suppression-and-replacement-atomicity.md`

# ADR 0187: Invite Suppression and Replacement Atomicity

## Status

Accepted.

## Decision

With D1 bound, invite creation returns 503 if the hash-only suppression check cannot complete or if the invite row cannot be persisted. Neither failure calls Resend or exposes a token.

Revoking previous pending invites for a workspace/email hash and inserting the replacement execute in one D1 `batch()`. Cloudflare documents batched statements as transactional, with the sequence rolled back when a statement fails: <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>.

## Context

A failed suppression query previously looked the same as “not suppressed,” allowing live delivery to continue. Invite persistence failures could also produce a nominal success. Finally, replacement creation used two auto-commit statements, so an insert failure after revocation could invalidate the previous invite without creating a replacement.

## Consequences

- Suppression uncertainty blocks invite creation and email delivery.
- A live invite is not reported or delivered until its D1 row exists.
- Replacement failure preserves the previous pending invite.
- Local no-D1 dry-run invites continue to expose their deterministic development token.


---

<a id="0188-transactional-invite-acceptance"></a>

Source: `docs/adr/0188-transactional-invite-acceptance.md`

# ADR 0188: Transactional Invite Acceptance

## Status

Accepted.

## Decision

Invite acceptance writes the member role, active member status, and invite consumption in one D1 `batch()`. The route reports success only when the conditional invite-consumption statement changes exactly one pending row.

## Context

Those writes previously auto-committed independently. A failure after creating or activating the member but before consuming the invite could leave partial membership state and a reusable token.

## Consequences

- Acceptance either applies the membership state and consumes the invite together or rolls the sequence back.
- A stale or concurrently consumed invite does not produce a successful response.
- D1 failures return 503 without creating a member or consuming the invite.
- Invite tokens remain hash-only in storage.


---

<a id="0189-transactional-invite-webhook-materialization"></a>

Source: `docs/adr/0189-transactional-invite-webhook-materialization.md`

# ADR 0189: Transactional Invite Webhook Materialization

## Status

Accepted.

## Decision

A verified Resend invite-delivery callback materializes its deduplicated event row, linked delivery-attempt status, and optional bounce/complaint/suppression row in one D1 `batch()`. Event IDs derive from the validated Svix message ID, making a provider retry refer to the same stored event.

When D1 is bound or live invite delivery is enabled, lookup or batch failure returns `503 resend_webhook_persistence_unavailable`. The callback is not acknowledged as successful, allowing provider retry.

## Context

The previous flow inserted the dedupe event first and updated attempt/suppression state afterward. If a downstream write failed, the retry was classified as a duplicate and skipped the missing suppression, allowing future mail to an address that bounced or complained.

## Consequences

- Event, attempt state, and suppression state commit together.
- A failed materialization is retryable and does not leave a dedupe marker by itself.
- Duplicate callbacks can safely re-run idempotent attempt/suppression statements while retaining one event row.
- Raw webhook payloads and recipient addresses remain outside D1 storage.


---

<a id="0190-resend-invite-idempotency-and-attempt-tags"></a>

Source: `docs/adr/0190-resend-invite-idempotency-and-attempt-tags.md`

# ADR 0190: Resend Invite Idempotency and Attempt Tags

## Status

Accepted.

## Decision

Every live workspace-invite send includes `Idempotency-Key: film-invite/<inviteId>` and a non-PII `film_delivery_attempt` tag containing the D1 delivery-attempt ID. Resend documents 24-hour idempotent send handling and propagation of send tags into signed webhook payloads:

- <https://resend.com/docs/dashboard/emails/idempotency-keys>
- <https://resend.com/docs/dashboard/emails/tags>

Webhook processing first links by provider message ID. If that ID was not persisted after sending, it may link by the validated attempt tag only when the D1 attempt has no provider ID or the same provider ID. The transactional webhook batch then backfills the provider ID and applies event/suppression state.

## Context

Resend can accept an email before Film's follow-up D1 provider-ID update completes. Without another correlation value, later bounce or complaint callbacks cannot find the target hash, and retrying a send risks duplicate mail.

## Consequences

- Retrying the same invite send within Resend's idempotency window does not duplicate email.
- Signed callbacks can recover the exact D1 attempt after an outbound persistence failure.
- The tag contains no email address, token, workspace name, or provider credential.
- A mismatched tag/provider-ID pair cannot relink an attempt.


---

<a id="0191-bounded-notion-archive-and-csv-import"></a>

Source: `docs/adr/0191-bounded-notion-archive-and-csv-import.md`

# ADR 0191: Bounded Notion Archive and CSV Import

Date: 2026-07-09

## Status

Accepted

## Decision

Treat every stage of a Notion import as a bounded, integrity-checked pipeline.

- The browser ZIP reader accepts only single-disk, non-ZIP64, unencrypted stored or deflated archives. It validates UTF-8 paths, exact EOCD and central-directory bounds, central/local path, flag, and compression agreement, normalized duplicate paths, entry data bounds, declared output size, CRC-32, and sequential rather than concurrent inflation.
- Browser ZIP limits are 250 MiB per archive, 5,000 entries, 512 MiB aggregate declared uncompressed data, 25 MiB per entry, and a 200:1 compression ratio with a 1 MiB small-entry allowance.
- Worker metadata preflight requires a declared non-negative size for every entry and rejects more than 2,000 files, more than 512 MiB aggregate declared data, paths over 1,024 characters, or content types over 255 characters.
- After Worker preflight, folder and ZIP readers read only returned candidate paths and process text sequentially. The shared importer applies only candidates returned by its bounded plan. When the 50-candidate default cap is reached, project databases are selected before other CSV, Markdown, and asset candidates so related records retain a valid project target.
- CSV parsing is bounded to 5,000,000 characters, 2,000 data rows, 100 columns, and 8,192 characters per cell. Incomplete quoted rows are discarded, control characters are removed, and empty or duplicate headers are ignored with the first named column retained.
- Notion HTML remains unsupported and is never parsed or imported.

## Context

Metadata-only preflight and per-file size checks did not by themselves prevent a crafted ZIP from declaring inconsistent central/local metadata, expanding beyond its declaration, duplicating paths, or consuming memory through concurrent decompression. The import plan also showed at most 50 candidates while application still processed every supplied file, and CSV parsing retained an unbounded row matrix.

## Consequences

- Preview and application now share the same candidate boundary.
- Corrupt or decompression-heavy ZIPs fail before records or attachment blobs are created.
- Large and malformed CSVs produce bounded warnings instead of unbounded browser work.
- Very large valid exports must be split or imported in deliberate batches.
- Rich HTML import would require a separate sanitizer and target-data decision.


---

<a id="0192-local-attachment-content-validation"></a>

Source: `docs/adr/0192-local-attachment-content-validation.md`

# ADR 0192: Local Attachment Content Validation

Date: 2026-07-09

## Status

Accepted

## Decision

Validate imported Notion attachment bytes before they enter Film's IndexedDB staging store or R2 preparation workflow.

For each metadata-only asset selected by the bounded import plan, the browser requires:

- an allowlisted extension with a canonical content type;
- a non-empty blob no larger than 25 MiB;
- exact agreement between blob size, import manifest size, and document source size;
- agreement between canonical type and any non-empty/non-generic types reported by the source file, document metadata, and blob;
- a recognized signature for PNG, JPEG, GIF, PDF, WebP, WAV, AIFF, TIFF, OOXML, legacy OLE Office, MP3, ISO media containers, and HEIC;
- valid UTF-8/JSON syntax for JSON assets; and
- a root SVG with no script, event-handler, external-reference, active embedded-object, JavaScript URL, doctype, or entity patterns.

Only validated bytes are hashed and persisted. Canonical content type is written back to document metadata only after persistence succeeds. Validation failures are counted and warned without exposing raw source paths; the document remains metadata-only and is not prepared for upload. Existing non-metadata-only attachments are not restaged by a later import.

## Context

The importer already allowlisted attachment extensions, but extracted-folder MIME values came from the browser and staging trusted declared size/type. A renamed HTML file or corrupted media file could therefore enter the local blob store and later be prepared for R2 even though Worker upload hashing proved only byte identity, not file-format agreement.

## Consequences

- Common renamed, truncated, malformed, and active-vector files fail before local persistence.
- R2 upload metadata uses a canonical type derived from the validated extension.
- Unsupported or rejected bytes remain visible as metadata-only documents so imports remain reviewable.
- This is deterministic format validation, not antivirus or malware scanning; higher-assurance scanning remains a separate production decision.


---

<a id="0193-atomic-guarded-workspace-snapshot-restores"></a>

Source: `docs/adr/0193-atomic-guarded-workspace-snapshot-restores.md`

# ADR 0193: Atomic Guarded Workspace Snapshot Restores

Date: 2026-07-09

## Status

Accepted

## Decision

Commit a workspace snapshot as one bounded D1 batch containing every core-record write, the durable `restore_application_commits` row, and the bounded restore audit event.

D1 documents that `db.batch()` executes statements as a transaction and rolls back the sequence when a statement fails:

- <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>
- <https://developers.cloudflare.com/d1/platform/limits/>

Before preparing the batch, Film now enforces the backup model's relationship and semantic contract:

- root workspace/project rows cannot declare a parent project;
- task/document/person/equipment/expense rows require a same-workspace project;
- project phase, task status/priority, document type, and equipment tone are allowlisted;
- non-Markdown documents cannot carry Markdown bodies; and
- expense percentage is limited to 0–100.

The batch orders project writes before child writes. Fixed-query SQLite assertions run inside the transaction before every non-skip write: creates require the ID to be absent, updates require the ID in the current workspace, and child records require their project in the current workspace. A stale action or relationship causes an intentional SQL error and full rollback, preventing an upsert from changing a create into an update or an update into a create.

The core snapshot request is capped at 150 records and 700 prepared statements. A batch failure returns 503 with `destructiveWrite: false`; an oversized batch returns 422. Neither path writes restored rows, commit evidence, or audit evidence.

## Context

The prior endpoint performed each workspace/project/child write separately, then inserted the restore-commit row and audit event in later calls. A constraint or storage failure could therefore leave a partially restored workspace without durable commit evidence. Pre-batch conflict reads also did not protect against a target changing before an `ON CONFLICT` upsert executed.

## Consequences

- Restored core rows and their commit/audit evidence succeed or roll back together.
- Concurrent target changes cannot silently alter restore action semantics.
- Valid backups use canonical D1 values rather than arbitrary bounded strings.
- Snapshots above 150 core rows need a future resumable, proof-bound segmented restore design; they are not partially applied.


---

<a id="0194-atomic-guarded-planning-restores"></a>

Source: `docs/adr/0194-atomic-guarded-planning-restores.md`

# ADR 0194: Atomic Guarded Planning Restores

Date: 2026-07-09

## Status

Accepted

## Decision

Commit a planning restore as one bounded D1 batch containing every non-idempotent planning-row write, the durable `restore_planning_commits` row, and the bounded restore audit event.

D1 documents that `db.batch()` executes statements as a transaction and rolls back the sequence when a statement fails:

- <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>
- <https://developers.cloudflare.com/d1/platform/limits/>

The Worker reruns the durable planning preview immediately before commit. Fixed-query SQLite assertions then run inside the transaction before every create or update: creates require the ID to be absent from the fixed destination table, updates require the ID in the current workspace, and project-scoped rows require their project in the current workspace. A stale target or project relationship intentionally fails the batch instead of allowing `ON CONFLICT` to change the approved action.

The commit endpoint accepts at most 150 records and 700 prepared statements. Duplicate IDs, project-scoped production roles, and invalid created/updated timestamps are rejected during preview. A batch failure returns 503 with `destructiveWrite: false`; an oversized batch returns 422. Neither path writes planning rows, commit evidence, or commit audit evidence.

## Context

The prior endpoint upserted each planning row separately, inserted the restore-commit row afterward, and recorded audit evidence in a third operation. A storage or constraint failure could therefore leave a partial planning restore without durable commit evidence. The pre-commit preview also did not close the race between conflict reads and upserts.

## Consequences

- Planning rows and their commit/audit evidence succeed or roll back together.
- Concurrent target or project changes cannot silently alter approved restore semantics.
- Idempotent rows remain write-free while still appearing in the durable result summary.
- Planning restores above 150 records need a future resumable, proof-bound segmented design; they are not partially applied.


---

<a id="0195-atomic-truthful-notion-planning-imports"></a>

Source: `docs/adr/0195-atomic-truthful-notion-planning-imports.md`

# ADR 0195: Atomic Truthful Notion Planning Imports

Date: 2026-07-09

## Status

Accepted

## Decision

Apply new Notion planning rows and their audit evidence in one bounded D1 batch. The import route remains create-only: exact existing rows are idempotent, changed existing rows return bounded update previews, and neither class updates D1.

Before batching, the Worker normalizes the whole request, rejects duplicate deterministic IDs, resolves project title hints only inside the authenticated workspace, and reads deterministic row IDs from their fixed destination tables. An ID already owned by another workspace is rejected as `id_workspace_conflict` without returning persisted values or a field diff.

Each planned create has an in-transaction absence assertion. Project-scoped creates also have an in-transaction same-workspace project assertion. Plain `INSERT` statements follow those guards, and the bounded `import.notion_planning_committed` audit event is the final statement. Any assertion, insert, or audit failure rolls back the batch and returns 503 with `destructiveWrite: false`.

Responses now report `destructiveWrite: true` and `dryRun: false` when at least one D1 row was created. Idempotent/update-preview-only responses remain non-destructive. The endpoint accepts at most 200 records and 700 prepared statements.

## Context

The prior route inserted each new row separately and recorded audit evidence afterward. A storage failure could leave a partial import with no matching audit event. It also returned `destructiveWrite: false` after successful D1 inserts and could compare a deterministic ID owned by another workspace, exposing a bounded field-level difference.

## Consequences

- New planning rows and audit evidence succeed or roll back together.
- The API accurately distinguishes D1 writes from preview-only classifications.
- Cross-workspace deterministic-ID collisions do not disclose row values.
- Changed existing planning rows still require a future explicit update approval path.


---

<a id="0196-recoverable-attachment-restore-finalization"></a>

Source: `docs/adr/0196-recoverable-attachment-restore-finalization.md`

# ADR 0196: Recoverable Attachment Restore Finalization

Date: 2026-07-09

## Status

Accepted

## Decision

Use a deterministic `prepared` attachment upload intent as the durable reservation before writing restored bytes to R2. After the create-only R2 put succeeds, finalize the intent as `stored_r2`, insert the destructive `restore_attachment_object_commits` row, and insert bounded audit evidence in one D1 batch.

The reservation identity is derived from the workspace, commit preflight, document, destination key, and expected SHA-256. It stores a hashed commit identity and a preflight-scoped storage marker. A retry may reuse an existing R2 object only when the prepared reservation and R2 custom metadata exactly match the request chain, size, document, workspace, hash, and destination. Matching recovery remains available after the normal 15-minute preflight window because the reservation proves the original attempt began while the preflight was valid.

If D1 finalization fails, the Worker checks for a concurrently completed matching commit before compensating. Otherwise it deletes only an R2 object whose metadata still matches the reservation, confirms destination absence, and releases the prepared intent. When R2 cleanup cannot be confirmed, the Worker leaves the prepared intent in place and returns `r2_restore_compensation_pending`; a matching authenticated retry can finalize the existing verified object without uploading it again.

## Context

The prior path wrote R2 first, inserted a `stored_r2` upload intent, inserted the restore commit in a second D1 call, and recorded audit evidence afterward. Cleanup failures were ignored. A failure could therefore leave an orphaned R2 object or D1 intent that permanently failed the no-overwrite destination check, while successful bytes and commit evidence could exist without audit evidence.

## Consequences

- D1 intent state, destructive commit evidence, and audit evidence finalize atomically.
- Confirmed compensation returns the destination to an absent, retryable state.
- Unconfirmed R2 compensation remains recoverable through a narrowly matched prepared reservation.
- Concurrent matching requests cannot cause a failed request to delete another request's completed object.
- D1 and R2 still cannot share a transaction; the prepared reservation and verified retry contract make that split explicit.


---

<a id="0197-recoverable-r2-metadata-finalization"></a>

Source: `docs/adr/0197-recoverable-r2-metadata-finalization.md`

# ADR 0197: Recoverable R2 Metadata Finalization

Date: 2026-07-09

## Status

Accepted

## Decision

Treat encrypted backup uploads and normal attachment uploads as incomplete until their required D1 metadata and audit evidence finalize successfully.

Backup uploads now require both D1 and R2. The Worker reads the declared body through the bounded streaming helper, verifies SHA-256, derives a deterministic object key and restore-point ID, and uses a create-only R2 put. An exact existing R2 object is a recoverable retry; a metadata mismatch is a conflict. Restore-point insertion, latest-five retention, and deterministic audit evidence execute in one D1 batch. If that batch fails, the encrypted object remains at its deterministic key and the route returns `r2_backup_metadata_pending` with 503 so the same upload can finalize metadata without a second R2 write.

Normal attachment storage reuses the existing prepared upload intent as its reservation. The Worker uses bounded body reads, the intent's content type, create-only R2 puts, and exact R2 metadata checks. Intent finalization and deterministic audit evidence execute in one D1 batch. A batch failure returns `r2_attachment_metadata_pending`; the prepared intent and matching R2 object remain recoverable by the same token-bound request without overwrite or a second upload.

## Context

Both paths previously wrote R2 before separate D1 calls. Backup metadata failure still returned success and could leave an object absent from restore-point manifests. Attachment metadata failure also returned an accepted object while its intent remained prepared. Both routes used unbounded `request.arrayBuffer()` reads, and normal attachment storage did not use a no-overwrite conditional put.

## Consequences

- R2 byte persistence is no longer reported as fully committed before D1 evidence is durable.
- Deterministic exact-state retries recover cross-store failures without duplicate object writes.
- Existing destination objects with mismatched ownership/hash metadata remain blocked.
- Request bodies cannot exceed their declared size or route-specific cap while being buffered.


---

<a id="0198-atomic-canonical-operation-replay"></a>

Source: `docs/adr/0198-atomic-canonical-operation-replay.md`

# ADR 0198: Atomic Canonical Operation Replay

Date: 2026-07-09

## Status

Accepted

## Decision

Apply every newly accepted operation in one bounded D1 batch containing workspace/known-seed prerequisites, in-transaction conflict assertions, canonical create statements, relationship statements, and matching `operation_log` rows. Existing exact operation IDs remain read-only idempotent results, and individually invalid or unauthorized operations remain rejected before the batch.

Before preparing writes, the Worker resolves project references by both ID and workspace, rejects cross-workspace project IDs, rejects canonical target IDs already present in any workspace, and rejects duplicate create targets in the request. Known seed projects are materialized before child operations. Project creates are ordered before other accepted operations so a local project plus its initial records can sync together.

Inside the transaction, every new operation ID must still be absent. Create operations also require no matching applied entity-create log and no canonical target row. Project-scoped creates require the project in the current workspace after any planned project/seed writes. Plain canonical inserts and plain operation-log inserts follow those assertions. The batch is capped at 700 statements. Any statement or storage failure returns 503 with zero accepted/replayed IDs, and D1 rolls back all canonical and operation-log writes.

## Context

The prior replay loop wrote each canonical record and then its operation-log row separately before moving to the next operation. Returning zero acknowledged IDs after a later exception protected the browser queue, but did not undo earlier D1 writes. A retry could then encounter canonical rows without matching operation evidence. Project existence checks also used global IDs without enforcing the operation workspace.

## Consequences

- A replay batch cannot partially materialize canonical records or operation logs.
- Cross-workspace project references and target-ID collisions fail before writes.
- Concurrent create/log races abort the entire transaction instead of being hidden by `INSERT OR IGNORE`.
- Metadata-only task/document operations remain operation-log entries and do not mutate canonical bodies or task state.


---

<a id="0199-atomic-approved-mutation-application"></a>

Source: `docs/adr/0199-atomic-approved-mutation-application.md`

# ADR 0199: Atomic Approved Mutation Application

Date: 2026-07-09

## Status

Accepted

## Decision

Apply approved core-record and film-profile mutations as guarded D1 transactions. Each batch contains:

- an assertion that the mutation request is still `approved_pending_apply`;
- an assertion that the target still matches its approved `updated_at` state, or remains absent for an approved new film profile;
- the allowlisted target update, delete, or profile insert;
- the request transition to `applied` with bounded field diffs and rollback guidance in `application_json`; and
- deterministic bounded audit evidence.

The target write and request transition must each report one changed row. Any assertion, write, request-state, audit, or storage failure returns 503 with `destructiveWrite: false`; D1 rolls back the sequence. A changed or deleted target is marked `stale_record_blocked` through the existing non-destructive stale path instead of being applied.

## Context

The prior apply helpers changed the target first, updated the mutation-request row in a later statement, reread the request, and recorded audit evidence from the route afterward. A D1 failure could therefore leave an updated/deleted target attached to an approved-but-not-applied request, or an applied request without audit evidence. Guarded target writes reduced stale risk but did not make the multi-statement result atomic.

## Consequences

- Target state, request application/rollback evidence, and audit evidence commit or roll back together.
- Approved stale-check semantics are preserved inside the transaction, closing the read/write race.
- Retrying after a storage failure remains safe because the request is still approved and the target is unchanged.
- Idempotent reads of already applied requests do not repeat the destructive write.


---
