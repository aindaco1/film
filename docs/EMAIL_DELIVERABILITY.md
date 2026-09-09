# Email delivery

The shared `@dustwave/worker-core/email` helper supplies `Auto-Submitted: auto-generated` and an explicit reply destination. Existing subjects, HTML, plain text, sender identities, recipients, links, attachments, tags, and unsubscribe headers remain owned by the application. It does not add marketing, tracking, retry loops, or new recipients.

Resend's verified domain authentication and hard-bounce/complaint suppression remain provider responsibilities. An API success or a delivered event means provider/recipient-server acceptance; it does not prove Inbox placement. Keep open/click tracking disabled for these service messages. See the [shared deliverability guide](https://github.com/aindaco1/dust-wave-platform/blob/main/docs/email-deliverability.md).

Film uses the helper for sign-in links and workspace invitations. `EMAIL_REPLY_TO` in `apps/worker/wrangler.toml` points to the existing Dust Wave support address. The live-mode gates, eligibility checks, single-use tokens, idempotency keys, invitation suppression and webhook evidence are unchanged. A deployment sends no mail on its own.

## Shared dependency and rollback

Clone with `git submodule update --init --recursive`, then run `npm ci`. CI also initializes submodules. Worker Core 0.13.0 is pinned at `af2a5e5e4b65f218e627652b8243feb9704c48a1`; its consumer test enforces that exact checkout. No schema migration is required. Roll back the complete email-adoption commit and redeploy the preceding Worker version; do not change only the submodule while the import remains.

Validation: run `npm run smoke`, `npm run smoke:local:worker` and both Worker dry runs. The existing live-adapter fixtures verify the reply address and automatic-message header while preserving token placement, recipients and delivery tags. These tests do not send live invitations.
