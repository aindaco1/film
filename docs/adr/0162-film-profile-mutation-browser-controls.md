# ADR 0162: Film Profile Mutation Browser Controls

## Status

Accepted.

## Context

ADR 0161 made film-profile mutation requests durable in D1 and added protected Worker routes for request, manifest, resolution, diff preview, and apply. The browser still only exposed the core record mutation workflow, so runtime, format, shoot-date, and budget edits required direct API calls.

## Decision

Expose the film-profile mutation workflow in the Team inspector.

The browser renders field checkboxes from `packages/schema`, posts metadata-only profile mutation requests through `membership-client`, can review the selected project's profile request manifest, lets owner/producer sessions approve or reject requests, previews approved profile diffs with typed per-field value controls, and applies approved profile updates with the Worker-required `APPLY FILM PROFILE MUTATION <requestId>` confirmation.

Successful applies reconcile the local workspace mirror for the visible project fields after the Worker reports success. The Worker remains the authority for authorization, field allowlists, stale checks, confirmation, and destructive writes.

## Consequences

- Operators can use the app shell for the complete film-profile review flow instead of direct API calls.
- Browser code remains schema-driven and does not define its own profile mutation allowlist.
- Browser-against-Worker smoke now exercises this profile path against local or staging D1 when a Worker origin is configured.
