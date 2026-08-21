# Deployment Handoff

Film's Worker production route, static app origin, member-only live magic-link auth, and live invite-delivery gate are configured for the Dust Wave deployment. The static app deploys as the `film-web` Worker with static assets at `https://film.dustwave.xyz`, and the API Worker route targets `https://api.film.dustwave.xyz`. Stripe summary reads are configured only through Pool/Store summary adapters, with direct Stripe API reads blocked.

## Local Worker Vars

Copy `apps/worker/.dev.vars.example` to `apps/worker/.dev.vars` only when local overrides are needed. Keep `.dev.vars` out of git.

The example contains placeholder names for:

- local `ALLOWED_ORIGINS`
- local magic-link auth mode; Wrangler development already overrides it to `dry_run`
- Resend invite delivery settings
- optional `RATE_LIMIT_OVERRIDES`
- optional Pool/Store Stripe summary adapter URL overrides
- optional Stripe project mapping overrides
- Film's `STRIPE_SUMMARY_ADAPTER_SECRET`

Do not add provider API keys, webhook secrets, OAuth tokens, raw exports, or backup bundles to tracked files.

## Static App Hosting

Build and deploy the static app as Worker static assets:

```bash
npm run build
npx wrangler deploy --config apps/web/wrangler.toml
```

`apps/web/wrangler.toml` sets `workers_dev = false`, serves `apps/web/dist`, and attaches the custom domain `film.dustwave.xyz`.

`apps/web/.env.production` sets `VITE_WORKER_URL=https://api.film.dustwave.xyz`. Keep that production API origin in the built bundle; otherwise the static app falls back to the local Worker URL.

After deploying, verify both the Worker custom-domain object and public DNS. Cloudflare may create the read-only proxied DNS record before every resolver serves it; if `curl https://film.dustwave.xyz` still returns DNS resolution errors, wait for propagation and confirm the `film-web` Worker custom domain remains enabled.

## Production Secrets

Use Wrangler secrets or dashboard-managed secrets for sensitive values:

- `RESEND_API_KEY`
- `INVITE_DELIVERY_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUMMARY_ADAPTER_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID` (may be a non-secret Worker variable, but keeping all OAuth client configuration Worker-only is simpler)
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY` (base64-encoded 32 bytes)
- `META_OAUTH_CLIENT_ID` (numeric Meta app ID; may be a Worker variable)
- `META_OAUTH_CLIENT_SECRET`
- `META_LOGIN_CONFIGURATION_ID` (numeric Login for Business configuration ID; may be a Worker variable)
- `META_TOKEN_ENCRYPTION_KEY` (independent base64-encoded 32 bytes)
- `SMS_RECIPIENT_ENCRYPTION_KEY` (dedicated base64-encoded 32 bytes)
- `SMS_RECIPIENT_HASH_KEY` (a different base64-encoded 32-byte HMAC key)
- `TELNYX_WEBHOOK_PUBLIC_KEY` (base64 Ed25519 public key; required only for the signed webhook)
- `TELNYX_INBOUND_NUMBER_MAPPINGS` (secret JSON from receiving E.164 numbers to workspace IDs)
- `TELNYX_API_KEY` (secret API key for the disabled-by-default outbound adapter)

Keep `TELNYX_MESSAGING_PROFILE_ID`, `TELNYX_CAMPAIGN_ID`, `TELNYX_WEBHOOK_MODE`, `SMS_QUIET_HOURS_TIME_ZONE`, `SMS_QUIET_HOURS_START`, `SMS_QUIET_HOURS_END`, `SMS_DELIVERY_RETENTION_DAYS`, and `SMS_MODE` as Worker configuration. Profile and campaign identifiers are not credentials; both mode values remain `disabled` until the controlled activation steps pass.

Pool and Store companion Workers use `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` for the same bearer value that Film sends as `STRIPE_SUMMARY_ADAPTER_SECRET`.

## Google OAuth

Register this exact production redirect URI in the approved Google OAuth web client:

```text
https://api.film.dustwave.xyz/api/providers/google/oauth/callback
```

Set `GOOGLE_OAUTH_REDIRECT_URI` to the same value. Generate `GOOGLE_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`, store it as a Wrangler secret, and back it up in the approved secret manager. Do not rotate it after connections exist until multi-key decryption and re-encryption are available. Start with `drive.metadata.readonly` only; Drive content and Calendar require separate incremental consent after their user-facing imports exist. Set `GOOGLE_OAUTH_MODE=live` only after the OAuth consent screen, privacy copy, test users/publication status, and scopes are approved.

The connection is per workspace. The browser receives an authorization URL but never tokens. The Worker stores encrypted tokens in `provider_connections`, refreshes access tokens on demand, lists at most 100 Drive items per request, and erases local token ciphertext on disconnect even if provider revocation fails.

## Meta Read-Only OAuth

Register this exact redirect in the Meta app and Facebook Login for Business configuration:

```text
https://api.film.dustwave.xyz/api/providers/meta/oauth/callback
```

Register these exact deauthorization and user-data deletion callbacks in the Meta app:

```text
https://api.film.dustwave.xyz/api/webhooks/meta/deauthorize
https://api.film.dustwave.xyz/api/webhooks/meta/data-deletion
```

The deletion callback returns a generated status URL under `https://api.film.dustwave.xyz/api/providers/meta/data-deletion/status`. Both signed callbacks remain available when `META_OAUTH_MODE=disabled`, but return 404 until `META_OAUTH_CLIENT_SECRET` and D1 are available. Do not place the app secret in a Worker variable or browser build; store it only as a Wrangler secret.

Set `META_GRAPH_API_VERSION` to an explicitly reviewed `vN.N` value. Configure only `pages_show_list`, `pages_read_engagement`, `read_insights`, `instagram_basic`, and `instagram_manage_insights`. Generate `META_TOKEN_ENCRYPTION_KEY` separately from every Google/SMS key, store it in Wrangler and the approved recovery manager, and do not rotate it after connections exist without multi-key decryption.

Keep `META_OAUTH_MODE=disabled` until the Meta app ID/secret, numeric Login for Business configuration ID, owned Page and linked Instagram account, data handling answers, App Review requirements, signed deletion/deauthorization smoke, and owner smoke are complete. The OAuth callback creates `pending_page_selection`; an owner/producer must select a Page with `ANALYZE` and linked Instagram before the bounded 31-day analytics route can run. Disconnect revokes the user grant when possible and always deletes local ciphertext and mappings.

## Telnyx SMS Keys

Generate `SMS_RECIPIENT_ENCRYPTION_KEY` and `SMS_RECIPIENT_HASH_KEY` separately with `openssl rand -base64 32`. Store both as Wrangler secrets and in the approved secret manager. Never reuse the Google token key, never use the encryption key as the HMAC key, and do not rotate either after recipients exist until multi-key read and re-encryption support is deployed. These keys enable protected consent storage but never enable sending.

Keep `TELNYX_WEBHOOK_MODE` and `SMS_MODE` disabled until the Telnyx account, messaging profile, dedicated number, campaign, disclosure, quiet-hours window, retention period, and recipient enrollment are approved. Store the API key, Portal Ed25519 public key, and a JSON `TELNYX_INBOUND_NUMBER_MAPPINGS` value such as `{ "+15551234567": "workspace_acme" }` through Wrangler secrets; one mapped receiving number becomes that workspace's outbound sender. Store the profile ID, campaign ID, and approved policy values as Worker configuration. The protected `Check Telnyx` action performs read-only profile, campaign, carrier-status, and number-assignment checks through the Worker and returns no configured identifiers. The daily cron deletes only terminal attempts and Telnyx event metadata after `SMS_DELIVERY_RETENTION_DAYS`; consent evidence and pending attempts remain.

Run signed STOP/START/HELP fixtures before enabling the webhook. Then run one owned-number send with `SMS_MODE=live`, verify the deterministic retry does not send twice, verify the signed delivery event advances the content-free attempt, send STOP, and confirm later sends are denied. Immediately restore `SMS_MODE=disabled` if any step fails. The browser receives opaque consent/attempt IDs and aggregate counts only; message content exists only in the transient browser-to-Worker and Worker-to-Telnyx requests.

## Production Auth Bootstrap

Production sets `AUTH_MAGIC_LINK_MODE=live` in `apps/worker/wrangler.toml`. Live requests disclose no membership state and send a Resend link only to an existing active D1 member. The Worker fails closed if D1/KV membership or session state is unavailable.

Bootstrap the initial owner only from an approved ignored companion environment file:

```bash
npm run bootstrap:production-owner
npm run bootstrap:production-owner -- --apply
```

The first command is a non-writing report. `--apply` hashes the configured owner locally, expires unconsumed links for the prior target-member hash, revokes target-member and workspace-less sessions, upserts the production workspace/member rows, and records `operator.owner_bootstrapped` without email/hash metadata. The command does not print the email or hash. Do not use it as a general member-management workflow.

## Resend Invite Delivery Webhook

Configure the Resend webhook target as:

```text
https://api.film.dustwave.xyz/api/webhooks/resend/invite-delivery
```

`INVITE_DELIVERY_WEBHOOK_SECRET` must be the Resend/Svix signing secret value for that endpoint, stored as a Wrangler or dashboard secret. The Worker requires `svix-id`, `svix-timestamp`, and `svix-signature`, rejects stale or invalid signatures, deduplicates by Svix message ID, records only bounded invite-delivery metadata in D1, updates the linked attempt's latest provider event, and creates hash-only suppression rows for bounced, complained, or suppressed events. Production still needs an operating policy for support review of suppressions.

Run the companion readiness check from this repo before enabling live Stripe summaries:

```bash
npm run check:companions
```

The checker scans the sibling Pool and Store repos for tracked route, endpoint, and shared-secret binding names. It reports only configuration names and does not print `.dev.vars` values. Missing local `.dev.vars` declarations are warnings because production secrets may be managed through Wrangler or the Cloudflare dashboard.

## Stripe Summary Adapter Shape

Film accepts only summary-adapter reads for Stripe data. Production adapter URLs must be HTTPS endpoints with the path `/film/stripe-summary`.

`apps/worker/wrangler.toml` points at the Dust Wave Pool/Store production summary adapters but keeps `STRIPE_PROJECT_MAPPINGS={}` and `STRIPE_SUMMARY_MODE=disabled`. Big Sword has no verified companion resource. Do not reuse seed or fixture refs. Configure the exact real Film project to public Pool campaign slugs or Store product refs; JSON is preferred:

```json
{
  "workspace_acme": {
    "project_big_sword": {
      "poolRefs": ["approved-big-sword-campaign-slug"],
      "storeRefs": ["approved-big-sword-product-ref"]
    }
  }
}
```

Direct Stripe API reads remain blocked in Film. `STRIPE_WEBHOOK_SECRET` and `STRIPE_SUMMARY_ADAPTER_SECRET` remain secrets, and the Film-side adapter secret must match the companion Workers' `FILM_STRIPE_SUMMARY_ADAPTER_SECRET`.

## Rate Limit Overrides

The Worker has a default KV-backed rate-limit profile for POST route families. Production can tune existing buckets with non-secret JSON in `RATE_LIMIT_OVERRIDES`:

```json
{
  "auth_magic_link_request": { "limit": 5, "windowSeconds": 600 },
  "provider_dry_run": { "limit": 60, "windowSeconds": 60 }
}
```

Known bucket names include `auth_magic_link_request`, `auth_magic_link_verify`, `auth_logout`, `invite_dry_run`, `project_membership`, `record_permission`, `member_status`, `workspace_snapshot`, `document_content`, `provider_dry_run`, `google_oauth_start`, `google_oauth_callback`, `google_oauth_disconnect`, `import_dry_run`, `attachment_dry_run`, `backup_restore`, `operation_sync`, and `unknown_mutation`. Limits must be integers from 1 to 1000; windows must be 10 to 3600 seconds.

## Verification

```bash
npm run check:deploy
npm run check:deploy -- --dev-vars apps/worker/.dev.vars
npm run check:deploy -- --wrangler-secrets
npm run check:deploy:strict
npm run check:companions -- --strict
npm run report:production-traffic
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:worker
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:browser:worker
FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:providers:live
npm run smoke:auth:production -- --allow-send --require
npm run smoke:local:worker
npx wrangler deploy --dry-run --config apps/worker/wrangler.toml
npx wrangler deploy --dry-run --config apps/web/wrangler.toml
```

`npm run check:deploy` is advisory for local work. Add `-- --dev-vars apps/worker/.dev.vars` only for operator-local verification of ignored Worker dev vars; the script uses the values for presence/shape checks without printing secret values. Add `-- --wrangler-secrets` when Cloudflare secret names should count for production readiness; the script lists secret names only and never reads values. `npm run check:deploy:strict` is the fully-live MVP gate for auth, invite, and Google OAuth plus any provider mode explicitly set live. Meta, Telnyx SMS, and Stripe summaries are advisory while explicitly disabled. Setting a live mode makes that provider's app/secret/policy/mapping checks strict. Disabled provider implementation releases must record any intentional blockers and keep the corresponding live mode off.

`npm run smoke:worker` is an opt-in Worker-origin smoke. It skips without `FILM_WORKER_SMOKE_ORIGIN`; use `FILM_WORKER_SMOKE_REQUIRED=1` or `--require` when local/staging Worker verification should fail closed.

`npm run smoke:browser:worker` is an opt-in browser smoke against the configured Worker origin. It uses `FILM_BROWSER_WORKER_SMOKE_APP_ORIGIN` when provided, otherwise it uses or starts local Vite at `http://127.0.0.1:5173`. The smoke signs in through the Worker, verifies provider dry-run surfaces, creates and syncs a canonical document, applies an approved protected mutation, exports an encrypted backup through the signed UI path, accepts Worker R2 storage or metadata fallback, previews the encrypted backup locally, and signs out.

`npm run smoke:providers:live` is an opt-in provider-adapter smoke. Without extra allow flags, it checks live readiness without calling live Stripe adapters or sending email. Set `FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE=1` only against local/staging Pool and Store summary adapters, or against production after the mapped refs and shared adapter secret are confirmed. Set `FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE=1` and `FILM_LIVE_PROVIDER_SMOKE_INVITE_EMAIL` only when a real Resend test recipient is approved.

`npm run smoke:auth:production -- --allow-send --require` is an operator-only production probe. It reads the approved owner address and Resend API key from explicit environment variables or the ignored Pool `.dev.vars`, sends one magic link, waits for the new matching message to be delivered, verifies the session, logs out, and confirms revocation. It never prints the recipient or authentication/provider values.

The same script can explicitly create/verify a canonical project and import a sanitized extracted Notion export:

```bash
npm run smoke:auth:production -- --allow-send --require \
  --create-project-title 'Big Sword' --project-type 'Feature Film' \
  --project-id project_big_sword --apply-project \
  --notion-source-dir /absolute/path/to/sanitized-export --apply-notion-import
```

The source directory gate rejects symlinks and enforces aggregate file/byte caps. The Worker preflight selects readable candidates; the operator then commits at most 200 normalized core rows and 200 planning rows per route with create-only idempotency and a final canonical-ID check. Use this only for an approved sanitized export. Do not place raw exports, extracted source trees, recipient details, or generated operator output in the repo.

Add `--check-runtime-readiness` to require the protected manifest to report Pool/Store/Stripe/Resend/Google live and Meta Insights/Telnyx SMS blocked during the same transient session. The probe also validates a metadata-only Google authorization start, including the production callback, PKCE, offline access, granular consent, and exact scope, without granting access or storing tokens. See `docs/OPERATIONS.md` before owner or provider-secret rotation.

`npm run smoke:local:worker` is the preferred local all-in Worker gate because it applies local D1 migrations before starting Wrangler and then runs the direct Worker, browser Worker, and provider readiness smokes.

`npm run report:production-traffic` queries Cloudflare's Worker analytics and the `SESSIONS` KV namespace for aggregate invocation metrics and unexpired rate-limit window counts. It reads ignored operator credentials, reports its HTTP-status and expiration limitations, and never prints Cloudflare identifiers, credentials, or rate-limit identity hashes. Use the report before changing `RATE_LIMIT_OVERRIDES` or adding an abuse-challenge provider.
