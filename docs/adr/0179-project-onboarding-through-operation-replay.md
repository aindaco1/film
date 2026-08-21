# ADR 0179: Project Onboarding Through Operation Replay

## Status

Accepted.

## Decision

Use the existing authenticated local-first operation replay path for first-project onboarding. The sidebar project action opens a modal that requires a bounded title and one controlled project type. Creating the project instantiates the reusable Film template locally and queues `project.created` metadata containing only the title, controlled type, and template identifier.

Authorized Worker replay preserves the bounded project type, stamps the authenticated member as owner, creates the canonical D1 project and film-profile rows, records operation-log metadata, and emits the existing bounded sync audit event. The app does not silently create `Untitled Film` or use a direct operator D1 script for project content.

## Context

Production has an active owner but no canonical projects. The prior plus button immediately created a numbered `Untitled Film`, which made it too easy to sync placeholder data and did not capture a useful type before onboarding.

## Consequences

- Real project data is entered by the owner in the product rather than invented during deployment.
- The flow remains offline-capable and retry/idempotency behavior stays with operation replay.
- Project creation carries no logline, contacts, provider IDs, document bodies, or other sensitive production content.
- Stripe Pool/Store refs remain a separate operator-reviewed mapping after the canonical project exists.

