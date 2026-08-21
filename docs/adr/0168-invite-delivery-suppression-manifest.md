# ADR 0168: Invite Delivery Suppression Manifest

## Status

Accepted

## Decision

Add a protected owner/producer route, `POST /api/invites/delivery-suppressions`, that returns a bounded manifest of hash-only invite delivery suppression rows for a workspace.

The response includes suppression IDs, provider, target hash, suppression reason, linked invite/delivery-attempt/provider-message/source-webhook IDs, timestamps, count, truncation status, and persistence metadata. It does not return raw recipient addresses, webhook payloads, headers, or secret values. The Team inspector exposes `Review delivery suppressions` using the same signed session and CSRF model as pending invite manifest review.

## Context

ADR 0167 stores hash-only suppression evidence from signed Resend webhooks. Operators need a review surface before production invite delivery can be responsibly enabled, but that surface should not expose raw provider payloads or create any send/block mutation policy yet.

## Consequences

- Owners and producers can inspect suppression evidence from the Team panel.
- Suppression review is auditable through bounded D1 audit metadata.
- Future work can add explicit send-blocking or retention policy without changing the raw-data boundary.
