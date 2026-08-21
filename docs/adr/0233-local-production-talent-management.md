# ADR 0233: Local Production Talent Management

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local production talent records for micro-budget casting and shoot readiness. A record can link to one active screenplay cast element or use a manual character against the selected local breakdown. It stores bounded prospect/contacted/auditioning/offered/cast/released state, performer and direct/representative contacts, paperwork readiness, user-entered rate basis/amount, deal, travel, dietary, accessibility, wardrobe/fitting, general notes, and IDs referencing existing project documents.

Keep record creation, normalization, updates, derived manifests, and call-sheet mapping in `packages/schema`. Reuse the same internal production-resource helpers as Locations to derive scene usage from the occurrence graph, schedule use from existing stripboard versions, and availability from existing windows. Reuse the same web resource-usage renderer and document-reference checkbox renderer. Do not copy schedule, availability, scene, document metadata, or document bytes into talent records.

Allow only a linked record in `cast` state with a performer name to populate a draft call sheet that requires that exact screenplay character. Snapshot only the performer name into the existing cast call. Final call sheets reject the mutation until reopened.

Store talent records in IndexedDB and encrypted workspace backups. Do not send them to the Worker, D1, operation sync, providers, payroll systems, or models. Treat rate basis and amount as user-entered deal notes only: do not infer payroll, taxes, fringes, union terms, legal sufficiency, or labor compliance, and do not mutate the Expenses ledger or schedule-budget assumptions. Explicit local Markdown export includes the private fields because it is a user-triggered operational handoff; the export states that limitation and excludes screenplay source text, raw attachment bytes, provider/private state, and raw import paths.

## Context

Micro-budget non-union productions still need one place to connect characters, casting progress, performer readiness, schedule use, availability, paperwork references, and call sheets. Film already owns the underlying cast graph, stripboards, availability, project documents, and call-sheet cast calls. A separate casting schedule, contact database, document store, or inferred deal calculator would create conflicting sources of truth and weaken local/private defaults.

## Consequences

- One talent record bridges character requirements, casting readiness, entered terms, schedule use, availability, documents, and call-sheet performer names without copying those domains.
- Manual characters remain usable before breakdown review; linked records gain deterministic scene and call-sheet behavior.
- Sensitive contact and readiness details stay encrypted at rest in local backups and appear only in an explicit user-generated handoff.
- Audition media, releases/signatures, payroll integration, union-rule engines, agent portals, collaborative canonical persistence, and local-model assistance remain separate decisions.
