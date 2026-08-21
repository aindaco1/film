# ADR 0224: Disable Tracking for Authentication Email

## Status

Implemented in production.

## Decision

Keep both Resend click tracking and open tracking disabled for the verified `dustwave.xyz` sending domain. Film magic-link and workspace-invite delivery remains transactional and continues to use provider delivery events, idempotency keys, hash-only suppression state, and bounded delivery-attempt metadata.

Do not route one-time authentication or invitation URLs through a click-tracking redirect and do not add tracking pixels to those messages.

## Context

The first explicit owner sign-in showed that Resend click tracking rewrote the Film magic link through a Resend redirect. That gives another service a copy of a live one-time URL and can also trigger link-scanner consumption or deliverability warnings. Resend recommends disabling tracking for sensitive login and verification email.

Primary sources:

- <https://resend.com/docs/dashboard/domains/tracking>
- <https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails>
- <https://resend.com/docs/dashboard/emails/deliverability-insights>

## Consequences

- Future Film authentication and invite links remain direct `film.dustwave.xyz` URLs.
- Film does not collect open/click engagement analytics for transactional identity email.
- Delivery, bounce, complaint, and suppression handling remains available through the signed Resend webhook path.
