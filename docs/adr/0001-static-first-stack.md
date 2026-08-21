# ADR 0001: Static-First Stack

Date: 2026-07-07

## Status

Accepted

## Decision

Build Film with a static TypeScript app shell and raw Cloudflare Worker APIs. Do not add React, Vue, Svelte, or another frontend framework in the initial slice.

## Context

The product plan calls for Pool/Store-style practices: static-first public surfaces, Cloudflare Worker trust boundaries, generated assets, strong tests, and no premature heavy framework dependency. The app will eventually need editor and collaboration complexity, but the first slice can prove the workspace model without committing to a framework.

## Consequences

- The first UI is implemented with TypeScript modules and template rendering.
- The app can adopt a framework later if the editor/collaboration implementation proves the tradeoff.
- Trust-sensitive paths still belong in the Worker regardless of frontend implementation.
