# 0091 - Invite Delivery Readiness

## Status

Accepted. Extended by ADR 0106.

## Context

ADR 0087 added a hash-only Resend dry-run outbox attempt when workspace invites are created. That proved the invite delivery boundary without sending email, but the UI still could not show what blocks live delivery.

Live email sending needs explicit production origin, sender, API secret, webhook signature validation, bounce/suppression handling, audit policy, and abuse controls. Until those are configured, the Worker should expose readiness metadata without reading or returning secret values and without sending messages.

## Decision

Add protected `POST /api/invites/delivery-readiness` for owner/producer sessions. The route checks workspace scope and returns a Resend email readiness contract:

- dry-run outbox availability
- whether the Resend API key, invite sender, invite app origin, webhook secret, and production origin are configured
- missing configuration blockers by variable name only
- compliance notes for webhook, bounce, suppression, abuse, and audit policy

The web Team inspector adds `Check invite delivery`, renders the readiness result, and keeps invite creation unchanged. ADR 0106 later adds the explicitly gated live Resend adapter; the readiness route still exposes no raw secrets.

## Consequences

- Users can see why invite delivery is still dry-run without relying on deployment logs or hidden env state.
- The Worker has a stable handoff contract for a future live Resend adapter.
- Actual sending remains blocked until production route/origin decisions, sender/domain setup, webhook validation, suppression handling, abuse controls, and redacted audit policy are explicit.
