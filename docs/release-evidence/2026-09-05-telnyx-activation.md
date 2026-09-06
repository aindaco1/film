# Telnyx Activation And Owned-Number Acceptance

Date: 2026-09-05

## Production State

- Verified the existing Film campaign in the real Helium portal and through the protected Worker readiness route. Campaign is active; profile is enabled, named Film, uses webhook API v2, and targets the Film Worker messaging webhook.
- Verified the existing sender is SMS-capable and belongs to the Film messaging profile. No new number was purchased.
- After explicit user confirmation, assigned the existing sender to the approved campaign in Helium. The protected API subsequently confirmed `ASSIGNED`, with seven approved carrier results and none pending, rejected, or unknown.
- Existing production API key, profile/campaign configuration, sender mapping, webhook public key, encryption/HMAC keys, D1, quiet hours, and retention all passed redacted readiness checks. Secret values were neither retrieved from Cloudflare nor printed.
- Deployed only `film-worker` to its existing custom domain and cron. Webhook-only version `6f070686-baca-4629-87b7-da6010b30179` preceded live-send version `7d0bf14e-7f30-4e07-883a-f3cf4f13bae8`; final HELP-readiness version is `36249ef6-ff24-4221-9a58-e85b25dbbd19`. Final upload: 963.21 KiB, gzip 157.24 KiB. Worker startup: 11 ms.
- `TELNYX_WEBHOOK_MODE=live`; `SMS_MODE=live`. Other provider activation modes are unchanged. Existing frontend/demo work was not deployed.
- Production health passed. An unsigned webhook request returned `400 telnyx_webhook_signature_headers_required` rather than the old disabled-route 404.
- Post-deployment owner auth smoke passed the canonical snapshot, protected provider runtime gates, live Google metadata-only readiness/start, logout, and revoked session. Its live-mode readiness check does not send an SMS. Provider runtime reports three live and four blocked integrations.
- Final production readiness confirmed both HELP settings booleans true, all SMS configuration/profile/sender checks true, and seven approved carriers. The provider status remains named `ready_for_owned_number_smoke`; the separate `readyForOwnedNumberSmoke` activation flag is false because sending is already live, not because a configuration check failed.

## Owned-Number Evidence

- The user supplied their own mobile number and authorized a single integration test. Temporary operator consent covered only `call_sheet`; no crew list or campaign audience was enrolled.
- One one-segment test was accepted by Telnyx and finalized as delivered. Redacted D1 evidence contains one delivery attempt, with genuine signed `message.sent` and `message.finalized` callbacks and no provider errors.
- The user replied STOP. A genuine signed inbound STOP revoked consent and removed all categories. A new send request with a different idempotency key returned `409 sms_recipient_not_consented` before contacting Telnyx. No second application SMS was sent.
- The user then sent HELP and received nothing, followed by START and Telnyx's generic re-subscription confirmation. D1 recorded START as `opt_in_received` but the Film recipient remained `revoked` with an empty category list. Provider unblocking did not re-enroll them in Film.
- Inspection of Film's Global keyword settings in native Helium found no HELP response. Added and read back the saved response: "Film by Dust Wave: For help, visit https://dustwave.xyz/contact.html or contact your production coordinator. Reply STOP to opt out. Msg & data rates may apply."
- Readiness handles both the REST SDK's `info` operation with a HELP trigger and the guide's reserved `help` operation. The two provider references disagree on this operation name; accepting only the guide's value falsely reported the saved profile as unconfigured. Added REST-format and default-keyword regressions; no duplicate reply sender was added to Film. Temporary content-free shape diagnostics were removed after investigation.
- After saving, the user repeated HELP and confirmed receipt of the branded support reply. Independent redacted D1 evidence recorded one signed inbound HELP and one `help_requested` consent event. Consent still remained revoked with no categories; the application still had exactly one delivered test attempt.
- Removed the temporary private test-number configuration file. Raw mobile numbers, SMS bodies, credentials, and private provider identifiers are excluded from these release notes.

## Safety Changes

- Recheck current consent, category, linked-member status, and attempt suppression immediately before each recipient's provider request. Storage failure blocks dispatch.
- Share content-free delivery reconciliation between the webhook and provider-response paths. Handle callbacks before the response, duplicate retries after storage errors, and out-of-order status changes; terminal outcomes cannot be overwritten by transit events, and STOP suppression is preserved.
- Require configured live signed-webhook handling at the outbound route itself.
- Fail readiness closed on missing/unknown carrier results and specific campaign rejection/pending/suspension despite a generic `ACTIVE` status. Provider GETs have a ten-second timeout.
- Readiness also checks complete keyword settings for an effective US/global HELP response. Missing, ambiguous, malformed, incomplete, or unreadable rules cannot report ready. It returns only booleans, never response text or rule identifiers; carrier delivery still requires the real keyword test.
- Reuse shared send-result and provider-readiness contracts in browser/Worker, including suppressed counts. Reuse the existing production auth probe for read-only Telnyx diagnostics.
- Strict deployment validation checks all SMS prerequisites for webhook-only activation. The earlier `--sms-preflight` intentionally still requires both gates disabled.

## Verification

- `npm run build`: passed; existing web entry chunk-size warning remains.
- `npm run typecheck:web`: passed.
- `npm test`: 668 tests passed, including 35 added Worker regressions across delivery safety, campaign/carrier readiness, HELP configuration, and HELP non-reactivation.
- Updated deployment/readiness and auth-probe script tests: passed after their final changes.
- `npm run test:browser`: passed, including both-theme desktop/mobile SMS enrollment/composer, appearance, demo isolation, and production workflows using mocked provider routes.
- `npm run smoke:local:worker`: passed migration-applied real-local-Worker, collaboration, restore/attachment transactions, browser/Worker, and provider preflight flows; disposable server stopped.
- `npm run test:security`, `npm run test:migrations`, `git diff --check`: passed.
- Remote D1 migrations: none pending. No schema migration was added.
- Strict remote-name deployment check and Wrangler package dry-run: passed before deployment.

## Remaining Acceptance

The controlled send, delivery, STOP, blocked subsequent send, START non-reactivation, and corrected HELP reply/callback checks are complete. Keep the test recipient opted out. Future real crew sends require their own explicit category consent; the user's single test did not authorize promotional or crew-wide messages.

Local signed fixtures and an unsigned-request rejection alone do not prove a real Telnyx-signed callback or carrier delivery; this release has separate live send/STOP/START evidence. Number assignment approval is not consent to send messages to the crew.

Provider status interpretation follows the official [campaign fields](https://developers.telnyx.com/api-reference/campaign/get-campaign) and [carrier operation status](https://developers.telnyx.com/api-reference/campaign/get-campaign-operation-status) contracts.
Keyword configuration follows Telnyx's [auto-response settings API](https://developers.telnyx.com/api-reference/opt-out-management/list-auto-response-settings) and [keyword management guidance](https://support.telnyx.com/en/articles/1270091-sms-opt-out-keywords-and-stop-words). Campaign registration fields and the messaging profile's active response rules are separate.
The actual REST `info` operation is defined in the official [Telnyx Node SDK contract](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/messaging-profiles/autoresp-configs.ts); the [advanced messaging guide](https://developers.telnyx.com/docs/messaging/messages/advanced-opt-in-out) instead documents `help` and its reserved default trigger.
