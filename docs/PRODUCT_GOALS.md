# Film Product Goals

This document is the compact product-direction and status ledger. Detailed implementation contracts remain in the ADRs, architecture, security, testing, and release documents.

## Product Direction

- Build a practical production workspace for solo filmmakers and small teams, optimized first for micro-budget non-union productions.
- Replace the relevant production-planning value of heavier studio tools without copying their product structure or creating parallel sources of truth.
- Keep screenplay, breakdown, schedule, shot, location, talent, call-sheet, sides, and report workflows local and private by default.
- Keep the web app static-first and framework-light. Add a heavier framework only when a measured product need justifies its runtime and maintenance cost.
- Use deterministic local logic for canonical production workflows. Optional local-model assistance may be added later only as reviewable, non-canonical output; bring-your-own-key cloud inference requires a separate consent and data-boundary decision.
- Treat Notion as a one-way import source, not a preview surface or runtime dependency.
- Keep trust-sensitive authorization, canonical collaboration, provider credentials, and destructive restore controls in the Worker.
- Make core data portable through explicit handoff exports and encrypted backup/restore before deepening integrations.
- Keep Meta read-only; publishing remains the Social application's responsibility. Keep every provider behind explicit capability, consent, compliance, and live-mode gates.

## Current Alignment

| Goal | Current evidence | Status |
| --- | --- | --- |
| Micro-budget production chain | Local screenplay breakdown, versioned stripboards, availability/DOOD, explicit scenario assumptions, cost estimates, shots, locations, talent, call sheets, sides, and daily reports share stable graph references. | On track and locally verified |
| Private and offline by default | Production graph data stays in IndexedDB and encrypted backups; source text and production records are excluded from Worker, D1, provider, and model calls unless an explicit export boundary says otherwise. | On track and locally verified |
| Static-first, framework-light UI | The browser app remains TypeScript and DOM rendering without a UI framework. Shared renderers and client modules own repeated behavior. | On track; large `main.ts` and bundle size remain maintainability risks |
| Deterministic, optional AI posture | Canonical parsing, matching, scheduling, reconciliation, and estimates use deterministic local code. No model is required. | On track; optional local/BYOK assistance remains deliberately deferred |
| Notion migration | Folder and ZIP imports are previewed locally, normalized, and committed through create-only core/planning routes with idempotent replay and explicit update previews. | On track and locally verified |
| Collaboration and trust boundaries | Sessions, roles, invites, permissions, reviewed mutations, audit evidence, canonical snapshots, and stale checks are Worker/D1 owned. | On track and locally verified; broad real-team acceptance is still pending |
| Data portability and recovery | Human-readable exports, encrypted ZIP backups, R2 storage, restore plans, durable approval chains, create-only attachment restore, and rollback guidance are implemented. | On track and locally verified |
| Provider integrations | Google metadata OAuth, Meta read-only contracts, Telnyx consent/webhooks/send adapter, Resend, and Pool/Store summary boundaries are explicit and secret-free in the browser. | Architecture on track; provider/account/compliance acceptance remains external |
| Common-flow UX quality | The canonical inventory covers 51 user flows across all application workspaces, with unit, integration, browser, accessibility, mobile-boundary, and real-local-Worker evidence. | On track and locally verified |

## Current Priorities

1. Keep reducing oversized browser and Worker modules at real domain boundaries, backed by contract tests. Do not create generic abstractions that hide authorization or failure semantics.
2. Keep the 51-flow catalog and generated user-flow document current whenever a workflow changes.
3. Treat production deployment, owned-account OAuth, carrier approval, live SMS, and companion Pool/Store mappings as external acceptance gates, not as consequences of passing local tests.
4. Measure and reduce the browser entry bundle before adding more major UI domains.
5. Validate the full product with actual micro-budget productions; use those sessions to decide which deferred collaboration, distribution, and optional assistance features deserve implementation.

## MVP Interpretation

The local application and its protected Worker workflows are a usable MVP candidate. It is not accurate to claim every integration is production accepted: Meta, Telnyx/10DLC, companion Pool/Store data, and any unconsented Google account flow retain explicit external gates. A release claim should state local test evidence, deployment evidence, provider configuration, and real-world acceptance separately.
