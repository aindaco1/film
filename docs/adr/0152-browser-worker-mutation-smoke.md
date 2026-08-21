# ADR 0152: Browser Worker Mutation Smoke

## Status

Accepted.

## Decision

Extend `npm run smoke:browser:worker` with a protected record mutation path against the configured Worker origin.

The smoke now creates a local Markdown document, syncs the queued `document.created` operation through the signed Worker session so D1 has a canonical target row, then drives the Team mutation UI through:

- update authorization preflight
- metadata-only mutation request creation
- owner/producer approval
- non-destructive field diff preview
- explicit mutation apply with Worker confirmation

It asserts the applied mutation reports a destructive write for only the requested allowlisted document metadata fields.

## Context

Direct Worker tests already cover mutation authorization, stale checks, and D1 application. The mocked browser smoke covers the UI shape. The missing release evidence was a browser session proving cookies, CSRF, D1 operation replay, mutation request state, and mutation apply all compose over a real local or staging Worker origin.

The smoke creates its own target row first because local D1 is schema-ready but not seeded with static workspace documents.

## Consequences

- Local/staging handoff has end-to-end UI-through-Worker evidence for a protected mutation write.
- The smoke remains deterministic and does not require provider credentials.
- The generated canonical document row lives only in local/staging D1 state.
- Broader mutation matrix coverage remains in Worker and web unit tests.
