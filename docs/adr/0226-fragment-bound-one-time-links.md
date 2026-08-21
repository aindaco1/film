# ADR 0226: Keep One-Time Link Tokens Out of HTTP URLs

## Status

Implemented in production.

## Decision

Generate new Film magic-link and workspace-invite URLs with the one-time token in the URL fragment. The static app consumes the fragment immediately, removes it with `history.replaceState`, and sends a magic-link token only in the explicit Worker verification POST. Invite links prefill the existing acceptance control and still require a display name plus the Worker acceptance request.

Continue accepting legacy query-parameter links until already-issued messages have expired, but do not generate new query-token links.

## Context

Query parameters are sent to the static hosting origin before browser code can remove them and may appear in infrastructure request diagnostics. URL fragments stay browser-side and are sufficient for Film's static-first handoff.

## Consequences

- The static `film-web` request URL does not contain newly issued magic-link or invite tokens.
- Link tokens remain short-lived, one-time, hash-only at rest, and are still validated by the Worker.
- Browser smoke covers fragment consumption, URL cleanup, automatic magic-link verification, and invite-token prefill.
