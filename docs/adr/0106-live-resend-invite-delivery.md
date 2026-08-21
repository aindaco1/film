# ADR 0106: Live Resend Invite Delivery

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0087 created a hash-only invite delivery outbox, and ADR 0091 added readiness checks. That let owners and producers see invite-delivery blockers, but invite creation still could not send email even when production Resend settings were present.

Live invite delivery touches raw email addresses and invite tokens. Those values must not become durable Film data, and accidental sends must remain impossible in local development or partially configured deployments.

## Decision

Add an explicitly gated Resend delivery path to `POST /api/invites/create-dry-run`.

The Worker sends email only when all of these are true:

- `INVITE_DELIVERY_MODE=live`
- `RESEND_API_KEY` is configured
- `INVITE_FROM_EMAIL` is configured
- `INVITE_APP_ORIGIN` is a production HTTPS origin listed in `ALLOWED_ORIGINS`
- `INVITE_DELIVERY_WEBHOOK_SECRET` is configured
- D1 invite and delivery-attempt storage is available

Before calling Resend, the Worker inserts an `invite_delivery_attempts` row with `delivery_mode = live_resend` and `status = queued_live`. After the provider response, it updates the row to `sent_live` with the provider message ID or `failed_live_delivery` with a bounded error code. Film storage keeps only the target hash, provider message ID, error code, and delivery status. The raw email address and invite token are used only in the outgoing Resend request.

Dry-run behavior remains the default. When live delivery is not enabled, invite creation records the existing `dry_run_outbox` attempt and returns the development-only invite token for local testing. When live delivery is enabled, the browser response does not expose the invite token.

## Consequences

- Film can send invite emails through a Worker-owned provider path without putting provider credentials or raw invite targets in browser code.
- Accidental live sends remain blocked by an explicit mode flag and production-origin checks.
- Delivery attempts have durable status before and after provider calls.
- Bounce/suppression webhooks, sender/domain production setup, and abuse controls remain required before public launch.
