# Deployment Handoff

This document owns hosting and provider configuration. [Project Status](PROJECT_STATUS.md) owns deployed versions and provider activation/acceptance; [Testing](TESTING.md#operator-and-public-checks) owns verification commands; [Operations](OPERATIONS.md) owns approved operator procedures.

The static app deploys as the `film-web` Worker with static assets at `https://film.dustwave.xyz`, and the API Worker route targets `https://api.film.dustwave.xyz`. Stripe summary reads use only Pool/Store summary adapters, with direct Stripe API reads blocked.

## Local Worker Vars

`npm run dev` and `npm run dev:worker` use the shared non-sending policy in `scripts/local-worker-config.mjs`. Local auth/invites are dry-run; Google, Meta, SMS, signed Telnyx webhooks, and Stripe summary modes are explicitly disabled, even when production configuration or local credentials exist. The real local-Worker smoke suite uses the same policy with disposable ports. Deliberate live-provider exercises must remain separate opt-in operator commands.

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

Keep `TELNYX_MESSAGING_PROFILE_ID`, `TELNYX_CAMPAIGN_ID`, `TELNYX_WEBHOOK_MODE`, `SMS_QUIET_HOURS_TIME_ZONE`, `SMS_QUIET_HOURS_START`, `SMS_QUIET_HOURS_END`, `SMS_DELIVERY_RETENTION_DAYS`, and `SMS_MODE` as Worker configuration. Profile and campaign identifiers are not credentials. For a new/unapproved installation both modes remain `disabled` until controlled activation passes; see [Project Status](PROJECT_STATUS.md) for the existing deployment rather than resetting it to this provisioning default.

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

Facebook Login for Business requires every permission in the selected configuration. For Facebook-only accounts, point `META_LOGIN_CONFIGURATION_ID` at a user-token configuration containing only `pages_show_list`, `pages_read_engagement`, and `read_insights`. Use the combined five-permission configuration only for accounts with an authorized Instagram asset. The authorization URL uses `config_id` without a redundant `scope` override, following [Meta's configuration contract](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business). The Worker still requires the three Facebook grants and rejects grants outside its read-only allowlist; its stored OAuth-state scope list is that bounded allowlist, not a claim that Instagram access was granted.

Page discovery and selection share a bounded `/me/accounts` read so task permissions and the selected Page token come from the user's authorized managed-Pages edge. Discovery never returns tokens. Analytics warnings retain endpoint identity and allowlisted numeric HTTP/provider error codes only; the audit records these codes without provider messages, traces, URLs, or credentials.

Keep `META_OAUTH_MODE=disabled` outside an explicitly approved owned-account acceptance run until the Meta app ID/secret, numeric Login for Business configuration ID, owned Page, data handling answers, applicable App Review requirements, signed deletion/deauthorization smoke, and owner smoke are complete. The OAuth callback creates `pending_page_selection`; an owner/producer must select a Page with `ANALYZE` before the bounded 31-day analytics route can run. A linked Instagram professional account is optional. Facebook-only acceptance can use an owned test Page; Instagram reads require both Instagram permissions and a linked account. Empty test-Page results do not prove Instagram or general customer acceptance. Disconnect revokes the user grant when possible and always deletes local ciphertext and mappings.

Disabling `META_OAUTH_MODE` also blocks Page discovery, selection, and analytics through existing tokens. Disconnect and signed deletion/deauthorization callbacks remain available for cleanup while the integration is disabled.

## Telnyx SMS Keys

Generate `SMS_RECIPIENT_ENCRYPTION_KEY` and `SMS_RECIPIENT_HASH_KEY` separately with `openssl rand -base64 32`. Store both as Wrangler secrets and in the approved secret manager. Never reuse the Google token key, never use the encryption key as the HMAC key, and do not rotate either after recipients exist until multi-key read and re-encryption support is deployed. These keys enable protected consent storage but never enable sending.

Keep `TELNYX_WEBHOOK_MODE` and `SMS_MODE` disabled until the Telnyx account, messaging profile, dedicated number, campaign, disclosure, quiet-hours window, retention period, and recipient enrollment are approved. Store the API key, Portal Ed25519 public key, and a JSON `TELNYX_INBOUND_NUMBER_MAPPINGS` value such as `{ "+15551234567": "workspace_acme" }` through Wrangler secrets; one mapped receiving number becomes that workspace's outbound sender. Store the profile ID, campaign ID, and approved policy values as Worker configuration. The protected `Check Telnyx` action performs read-only profile, campaign, carrier-status, and number-assignment checks through the Worker and returns no configured identifiers. The daily cron deletes only terminal attempts and Telnyx event metadata after `SMS_DELIVERY_RETENTION_DAYS`; consent evidence and pending attempts remain.

Follow [Telnyx Consent And Webhook Activation](OPERATIONS.md#telnyx-consent-and-webhook-activation) for the ordered fixtures, consent, send/retry, delivery, STOP and failure checks. [Security](SECURITY.md#sms-consent-and-telnyx) owns the recipient and transient-message boundaries.

## Production Auth Bootstrap

`AUTH_MAGIC_LINK_MODE=live` enables member-only Resend authentication. Live requests disclose no membership state and send a link only to an existing active D1 member. The Worker fails closed if D1/KV membership or session state is unavailable.

Use [Owner Recovery Or Rotation](OPERATIONS.md#owner-recovery-or-rotation) for initial provisioning or recovery from an approved ignored companion environment file. That procedure owns the non-writing preview, explicit apply, session revocation and verification steps.

## Resend Invite Delivery Webhook

Configure the Resend webhook target as:

```text
https://api.film.dustwave.xyz/api/webhooks/resend/invite-delivery
```

`INVITE_DELIVERY_WEBHOOK_SECRET` must be the Resend/Svix signing secret value for that endpoint, stored as a Wrangler or dashboard secret. The Worker requires `svix-id`, `svix-timestamp`, and `svix-signature`, rejects stale or invalid signatures, deduplicates by Svix message ID, records only bounded invite-delivery metadata in D1, updates the linked attempt's latest provider event, and creates hash-only suppression rows for bounced, complained, or suppressed events. [Project Status](PROJECT_STATUS.md#provider-posture) tracks operational acceptance; [Operations](OPERATIONS.md#resend-webhook-rotation) owns webhook rotation.

## Stripe Summary Adapter Shape

Film accepts only summary-adapter reads for Stripe data. Production adapter URLs must be HTTPS endpoints with the path `/film/stripe-summary`.

Keep `STRIPE_PROJECT_MAPPINGS={}` and `STRIPE_SUMMARY_MODE=disabled` until real companion resources are verified. [Project Status](PROJECT_STATUS.md#provider-posture) records accepted mappings and activation; do not reuse seed or fixture refs. Configure the exact real Film project to public Pool campaign slugs or Store product refs; JSON is preferred:

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

Before enabling reads, use the [companion configuration check](TESTING.md#configuration-readiness) and the separately gated [provider probe](TESTING.md#provider-readiness-and-approved-sends).

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

Use [Testing: Operator And Public Checks](TESTING.md#operator-and-public-checks) for deployment/companion readiness, Worker packaging, approved provider probes and public-asset checks. [Worker Smoke Options](TESTING.md#worker-smoke-options) covers separately started local Workers; the Testing baseline owns the supervised local suite.

Production project creation and Notion import are documented in [Operations](OPERATIONS.md#production-notion-import). Follow [Release](RELEASE.md) for the source-to-publication sequence and dated evidence.
