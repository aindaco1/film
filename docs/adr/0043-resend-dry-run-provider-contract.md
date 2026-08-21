# ADR 0043: Resend Dry-Run Provider Contract

Date: 2026-07-08

## Status

Accepted

## Decision

Add Resend to Film's Worker-backed dry-run provider contracts without adding API keys, live sends, template storage, or email delivery.

## Context

The product plan calls for Resend as the first email provider and magic-link delivery will eventually need a live email path. Film should define the provider boundary before any sender domain, API key, suppression handling, or email content pipeline goes live.

## Consequences

- `resend` is now a shared `IntegrationKey` and appears in the seed workspace.
- `/api/providers/resend/dry-run` returns metadata for transactional email, magic-link delivery, and crew notification capabilities.
- The web app exposes a Resend dry-run chip using the same Worker preflight path as other providers.
- Future live email work must add sender-domain verification, template review, unsubscribe/suppression handling, rate limits, audit events, and secret storage in the Worker only.
