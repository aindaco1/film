# ADR 0226: Redacted Telnyx Provider Readiness

Date: 2026-07-14

## Status

Implemented behind disabled webhook and send gates.

## Context

Film could validate local SMS configuration but still required manual Telnyx Portal inspection to distinguish campaign review, profile/webhook mistakes, and phone-number assignment state. The Telnyx API key must remain Worker-owned, and readiness output must not disclose credentials, profile/campaign identifiers, phone numbers, carrier identifiers, or provider error detail.

## Decision

Add an owner/producer-only `POST /api/providers/sms/provider-readiness` route and a `Check Telnyx` action in the provider inspector. The Worker performs bounded read-only requests for the configured messaging profile, campaign, carrier operation states, messaging number, and phone-number campaign assignment.

The response contains only configuration booleans, aggregate carrier-state counts, normalized statuses, activation-gate state, and bounded operator blockers. It never returns configured identifiers or raw provider responses. The route audits count/status metadata only and does not assign numbers, modify the profile, enable webhooks, or send messages.

Production stages Denver quiet hours from 22:00 to 07:00, 90-day terminal delivery/webhook metadata retention, and explicit `disabled` values for both Telnyx activation gates. `TELNYX_CAMPAIGN_ID` is required for provider readiness and the final live gate.

## Consequences

- Campaign review and carrier provisioning can be checked from Film without sharing the Telnyx API key with the browser.
- A missing or incorrect profile, webhook, number, campaign, or carrier assignment fails closed with redacted guidance.
- Provider readiness does not authorize activation. Signed webhook fixtures, an active campaign, assigned number, recipient enrollment, and the controlled owned-number smoke remain separate gates.
