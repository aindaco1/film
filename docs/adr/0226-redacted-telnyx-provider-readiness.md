# ADR 0226: Redacted Telnyx Provider Readiness

Date: 2026-07-14

## Status

Implemented. Signed webhooks and outbound sending enabled September 5, 2026 after final sender assignment and controlled delivery/opt-out acceptance.

## Context

Film could validate local SMS configuration but still required manual Telnyx Portal inspection to distinguish campaign review, profile/webhook mistakes, and phone-number assignment state. The Telnyx API key must remain Worker-owned, and readiness output must not disclose credentials, profile/campaign identifiers, phone numbers, carrier identifiers, or provider error detail.

## Decision

Add an owner/producer-only `POST /api/providers/sms/provider-readiness` route and a `Check Telnyx` action in the provider inspector. The Worker performs bounded read-only requests for the configured messaging profile, campaign, carrier operation states, messaging number, phone-number campaign assignment, and keyword settings. The browser and Worker share the provider-readiness contract.

An approved campaign does not configure the actual HELP reply. The effective US/global rule must have a nonempty provider-valid response. Support the REST SDK's `info` operation with a HELP keyword and the messaging guide's `help` operation, whose built-in HELP trigger need not be repeated in the additional-keywords list. Unreadable, incomplete, or ambiguous rules fail readiness closed. Only reachability/configuration booleans leave the Worker; response wording and actual handset delivery remain separate operator acceptance checks.

The response contains only configuration booleans, aggregate carrier-state counts, normalized statuses, activation-gate state, and bounded operator blockers. It never returns configured identifiers or raw provider responses. The route audits count/status metadata only and does not assign numbers, modify the profile, enable webhooks, or send messages.

Production stages Denver quiet hours from 22:00 to 07:00 and 90-day terminal delivery/webhook metadata retention. Both Telnyx activation gates began `disabled` and became `live` on September 5 after the approved owned-number test. `TELNYX_CAMPAIGN_ID` is required for provider readiness and the final live gate.

The September 2026 activation pass distinguishes webhook-only activation from the earlier disabled preflight. Readiness requires affirmative carrier results and does not let a generic `ACTIVE` registration override specific pending, rejected, or suspended campaign state. The existing production owner-auth smoke can request these redacted diagnostics without receiving provider secrets or sending an SMS.

## Consequences

- Campaign review and carrier provisioning can be checked from Film without sharing the Telnyx API key with the browser.
- A missing or incorrect profile, webhook, number, campaign, or carrier assignment fails closed with redacted guidance.
- Provider readiness does not authorize activation. Signed webhook fixtures, an active campaign, assigned number, recipient enrollment, and the controlled owned-number smoke remain separate gates.
