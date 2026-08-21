# 0087 - Invite Delivery Outbox Dry Run

## Status

Accepted.

## Context

Workspace invite creation already stores only hashed invite targets and token hashes, but the response still reported `delivery: not_sent`. Live Resend delivery requires sender domain, templates, suppression handling, public routes, abuse controls, and provider credentials. Film can still add the durable handoff point now without sending email.

## Decision

Add `invite_delivery_attempts` as a hash-only dry-run delivery outbox table.

When `POST /api/invites/create-dry-run` creates a workspace invite, the Worker records a `resend`/`email` outbox attempt with `target_hash`, `template_key = workspace_invite`, `delivery_mode = dry_run_outbox`, and `status = queued_dry_run`. The route returns `delivery: queued_dry_run`, `deliveryPersistence`, and outbox metadata, but still returns the development-only invite token only in the immediate response.

## Consequences

- Invite delivery now has a durable Worker-owned handoff record without live provider calls.
- Raw invite email addresses are still not stored in D1, audit metadata, local mirror, operation log, or backups.
- Live delivery remains blocked until provider configuration, sender identity, templates, suppression/abuse controls, and public route decisions are explicit.
