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
