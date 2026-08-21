# ADR 0222: Worker-Owned Telnyx Outbound Adapter

Date: 2026-07-10

## Status

Implemented behind a disabled production gate.

## Context

Film already had encrypted SMS consent, signed Telnyx STOP/START/HELP handling, and content-free delivery-attempt storage. MVP crew operations still needed an outbound path without letting the browser resolve phone numbers, persisting message content, bypassing category consent, or repeating a provider send after an ambiguous client retry.

## Decision

Add a protected owner/producer `POST /api/providers/sms/send` route. The browser submits one to ten opaque consent-record IDs, one allowlisted operational category, a transient message body, and a fresh request key. The Worker verifies project/workspace scope, current category consent, linked-member status, batch and segment caps, and the configured quiet-hours window. Only safety/location alerts may use an emergency override, and the override requires an allowlisted reason code.

The Worker decrypts E.164 values only after every recipient passes policy. A deterministic attempt ID derived from the request key and opaque recipient ID gives Film-owned replay protection. Content-free `queued` attempt rows and redacted start audit evidence commit before any provider call. The Worker then sends each SMS through `POST https://api.telnyx.com/v2/messages`, stores only the returned provider message ID, bounded status/error codes, and segment count, and returns only opaque attempt IDs and aggregate counts. Message bodies are not stored in D1, audits, local UI state, backups, or provider responses.

Signed outbound Telnyx events atomically update the matching attempt and redacted audit evidence. A daily scheduled job deletes terminal delivery attempts and Telnyx event metadata after the explicitly configured 30–730 day period; pending attempts and consent evidence are not deleted by this job.

Live readiness requires `SMS_MODE=live`, API/profile/sender configuration, encrypted identity keys, signed webhook configuration, approved quiet hours, an explicit retention period, and the retention cron. Production keeps `SMS_MODE=disabled` until account verification, dedicated number, 10DLC campaign, disclosure, policy approval, recipient enrollment, and owned-number send/STOP/delivery smoke are complete.

## Consequences

- Telnyx remains replaceable because consent and delivery state are Film-owned and provider-specific content is not retained.
- A repeated request key cannot trigger a second provider send; an operator must use a new key for an intentional retry after reviewing the existing attempt.
- The first implementation caps a request at ten recipients and sixty total estimated segments. Larger crew sends require multiple explicitly keyed batches or a future queue.
- The Social application and email paths are unaffected; marketing, fundraising, investor, and promotional SMS remain outside v1.
