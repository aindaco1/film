# Film Operations

Use these procedures from an operator machine with the Film, Pool, and Store repos available. Never paste secret values, auth output, recipient details, or raw Wrangler output into tickets or release evidence.

## Owner Recovery Or Rotation

1. Put the approved replacement owner address in an ignored `.dev.vars` key, normally Pool's `ADMIN_BOOTSTRAP_EMAILS`.
2. Run `npm run bootstrap:production-owner` and review the non-writing summary.
3. Run `npm run bootstrap:production-owner -- --apply`.
4. Verify one active owner, zero active workspace-less sessions, and an `operator.owner_bootstrapped` audit row by count only.
5. Run `npm run smoke:auth:production -- --allow-send --require --check-runtime-readiness`.

Applying the bootstrap expires prior unconsumed links for the target member, revokes target-member and workspace-less sessions, rotates the stored email hash, keeps the member active as owner, and writes a bounded audit event. It does not print or audit the email/hash.

## Resend API Key Rotation

1. Create a replacement Resend API key with send access for the verified Film sender domain.
2. Set Film's `RESEND_API_KEY` with `wrangler secret put` from `apps/worker`; do not place the value in shell history or tracked files.
3. Run `npm run check:deploy:strict -- --wrangler-secrets` and deploy the Worker.
4. Run the production auth smoke with the explicit send gate.
5. Confirm the approved message was delivered, the session was revoked, and health still reports `live_member_only`.
6. Revoke the old key in Resend only after the smoke passes.

## Resend Webhook Rotation

Film currently accepts one `INVITE_DELIVERY_WEBHOOK_SECRET`. Create the replacement Resend webhook endpoint, set its new secret in Film, deploy immediately, and send an approved invite to verify a signed delivery event before deleting the old endpoint. Because there is no dual-secret overlap, schedule this as a short controlled maintenance operation and retain the old secret only long enough to roll back the Worker if verification fails.

## Pool/Store Summary Secret Rotation

`STRIPE_SUMMARY_ADAPTER_SECRET` in Film must equal `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` in both Pool and Store. The current adapters accept one value, so rotate all three in one controlled window:

1. Generate one replacement value locally without printing it.
2. Update Pool and Store companion Worker secrets and deploy both adapters.
3. Update Film's Worker secret and deploy Film immediately.
4. Run `npm run check:companions -- --strict` and `npm run check:deploy:strict -- --wrangler-secrets`.
5. Run the live-provider smoke with explicit Stripe allow mode.
6. If either adapter fails, restore the prior value to all three Workers and redeploy; do not enable direct Stripe fallback.

## Provider Gate Review

Use the inspector's `Runtime` action or the protected `/api/providers/runtime-readiness` route through the production auth smoke. Resend transactional email and metadata-only Google OAuth are the current live provider paths. Pool, Store, and Stripe summary adapters are implemented but explicitly disabled until Big Sword has verified companion refs. Google reports live only while its client ID/secret, callback, encryption key, D1/KV bindings, and explicit live gate are present. Meta and SMS remain blocked until their provider and compliance gates are accepted.

For Google connection incidents, first set `GOOGLE_OAUTH_MODE=dry_run` and deploy; existing ciphertext remains stored but no new OAuth start or Drive read is allowed. Do not delete or replace `GOOGLE_TOKEN_ENCRYPTION_KEY`. Owners can use the UI disconnect action to attempt Google revocation and erase local tokens. A lost encryption key requires reconnecting every affected workspace after clearing unusable provider connection rows through an approved D1 operation.

For Meta incidents, set `META_OAUTH_MODE=disabled` and deploy. This blocks new OAuth starts, candidate reads, Page changes, and analytics while retaining existing ciphertext for recovery. Signed deauthorization and data-deletion callbacks remain active when the app secret and D1 are available so provider-requested cleanup is not disabled with OAuth. Do not replace `META_TOKEN_ENCRYPTION_KEY` while a connection exists. The UI disconnect action attempts `/me/permissions` revocation and deletes both local token ciphertexts plus Page/Instagram mappings even if revocation fails. A lost key requires an approved clear of affected `meta_provider_connections` rows and workspace reconnection.

Meta activation order is: unlock the approved recovery manager; generate/store the independent key in the recovery manager and Wrangler without printing it; create the Meta app; configure Facebook Login for Business, the exact OAuth/deauthorization/data-deletion URLs, and five read-only scopes; complete data handling/App Review requirements; run signed deletion and deauthorization callback smokes; deploy with `META_OAUTH_MODE=live`; connect only an owned test account; select the intended Page; read a bounded 30-day result; disconnect; verify the D1 row contains no token ciphertext or mapping. Keep live mode disabled if any step fails.

## Production Notion Import

1. Sanitize the Notion export and keep it outside tracked source. Remove private contact data, provider credentials, expiring URLs, and unneeded attachment bytes.
2. Run the importer tests and strict deployment-readiness gate.
3. Extract the approved archive into a temporary directory and run the explicit production command documented in `docs/DEPLOYMENT.md`.
4. Require zero rejections and zero update previews. A retry must report every previously created row as idempotent.
5. Verify project-scoped aggregate D1 counts and count-only `import.notion_core_committed` / `import.notion_planning_committed` audit evidence.
6. Verify zero active operator sessions and magic links after the script exits, then remove the extracted temporary directory.

The core and planning routes never update existing rows. Changed records require a separate reviewed mutation or restore path; do not work around an update preview by changing source provenance or stable IDs.

## KV Rate-Limit Operations

Rate-limit entries retain their logical `resetAt`, but every `SESSIONS.put` uses Cloudflare KV's minimum 60-second physical TTL. Do not lower that floor when tuning `RATE_LIMIT_OVERRIDES`; shorter logical windows are enforced by the stored timestamp. A `rate_limit_unavailable` response is fail-closed storage behavior, while `rate_limited` is an intentionally exhausted bucket. Review aggregate traffic before changing limits.

## Telnyx Consent And Webhook Activation

1. Approve the `crew-sms-v1-2026-07-13` disclosure, public `/sms.html` terms, allowed categories, retention/deletion period, quiet hours, emergency override policy, and operator responsibility. Do not enroll a real number before this review.
2. Provision the Telnyx account, messaging profile, dedicated number, brand, and matching 10DLC campaign.
3. Store the API key, Portal Ed25519 public key, and receiving-number/workspace mapping through Wrangler secrets. Store the messaging profile ID and campaign ID as Worker configuration. Confirm the independent SMS encryption and HMAC keys remain recoverable.
4. Keep `TELNYX_WEBHOOK_MODE=disabled` and `SMS_MODE=disabled`. Run `npm run check:sms:preflight`, then use the SMS provider inspector's `Check Telnyx` action. During MNO review it should report `pending campaign review`, the Film profile and 505 sender should be ready, and both activation gates must remain closed.
5. After the campaign is active, assign the 505 number to it in Telnyx. Repeat `Check Telnyx` until it reports `ready for owned number smoke`; do not infer readiness only from the campaign-level status.
6. Run local signed STOP/START/HELP fixtures against the Worker while the production webhook gate remains disabled.
7. Set `TELNYX_WEBHOOK_MODE=live`, deploy, and send owned-number STOP, START, and HELP messages. Confirm STOP revokes and suppresses pending attempts, START does not reactivate consent, HELP records evidence, retries are idempotent, and responses contain no phone/message data.
8. Verify the configured quiet-hours window and terminal metadata retention period; verify the daily cron leaves queued attempts and consent evidence intact.
9. Enroll an owned recipient through Film, set `SMS_MODE=live`, and send one owned-number message from the SMS provider inspector. Submit the same request key through the API fixture and confirm no second provider request occurs; verify a signed final event advances the attempt.
10. Send STOP from the owned number and confirm a later send is rejected. Restore `SMS_MODE=disabled` after the smoke until production recipient enrollment is approved.
11. Disable both gates immediately if signature, mapping, D1, revocation, assignment, or delivery evidence fails.

Operator consent writes use an explicit evidence ID. Reusing the same ID with identical fields is idempotent; reusing it with changed fields is a conflict. Revocation uses the opaque recipient ID from the redacted manifest so phone values do not need to return to the browser.
