# ADR 0039: Worker CORS Allowlist

Date: 2026-07-08

## Status

Accepted

## Decision

Use a Worker-owned `ALLOWED_ORIGINS` variable for credentialed CORS responses. The Worker only echoes a request origin when it appears in the allowlist; otherwise it returns the first configured origin so browsers do not grant cross-origin credential access.

## Context

The Worker previously hardcoded one local Vite origin. Film now uses several local development ports and has remote Cloudflare resources, but no public production route. CORS needs to be explicit before routes, auth delivery, or provider credentials go live.

## Consequences

- Local Wrangler config lists the current Vite localhost origins.
- Production deployment must replace or override `ALLOWED_ORIGINS` with the actual app origin.
- OPTIONS preflights and normal JSON responses use the same security and CORS header path.
- Unknown browser origins are not reflected, while non-browser clients can still read ordinary API responses.
