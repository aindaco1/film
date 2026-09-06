# Film Product Goals

This document is the compact product-direction and status ledger. Detailed implementation contracts remain in the ADRs, architecture, security, testing, and release documents.

## Product Direction

- Build a practical production workspace for solo filmmakers and small teams, optimized first for micro-budget non-union productions.
- Replace the relevant production-planning value of heavier studio tools without copying their product structure or creating parallel sources of truth.
- Keep screenplay, breakdown, schedule, shot, location, talent, call-sheet, sides, and report workflows local and private by default.
- Keep the web app static-first and framework-light. Add a heavier framework only when a measured product need justifies its runtime and maintenance cost.
- Keep the interface project-focused, neutral, and high contrast. Follow system appearance by default, allow a local Light/Dark override, and preserve accessible names, keyboard focus, and direct in-context editing.
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
| Static-first, framework-light UI | The browser app remains TypeScript and DOM rendering without a UI framework. Shared projections own summaries; import, production-resource/daily-document/backup/integration screens, provider/recovery clients, demo, and handoff runtimes load at domain boundaries. Eight screens share one deferred-view lifecycle; production loaders also share their section registry/cache behavior. | On track; entry is 462.52 kB, with 555.17 kB total initial JS (120.89 kB gzip). Build budgets guard the complete initial dependency graph, and the large-entry warning is resolved. The 15.9k-line main module still needs measured incremental reduction |
| Deterministic, optional AI posture | Canonical parsing, matching, scheduling, reconciliation, and estimates use deterministic local code. No model is required. | On track; optional local/BYOK assistance remains deliberately deferred |
| Notion migration | Folder and ZIP imports are previewed locally, normalized, and committed through create-only core/planning routes with idempotent replay and explicit update previews. | On track and locally verified |
| Collaboration and trust boundaries | Sessions, roles, invites, permissions, reviewed mutations, audit evidence, canonical snapshots, stale checks, and canonical replay of in-place project/task/person/equipment/expense edits are Worker/D1 owned. | On track and locally verified; broad real-team acceptance is still pending |
| Data portability and recovery | Human-readable exports, encrypted ZIP backups, R2 storage, restore plans, durable approval chains, create-only attachment restore, and rollback guidance are implemented. | On track and locally verified |
| Provider integrations | Google owner reauthorization and a bounded empty-folder metadata read passed; expired-consent recovery is deployed. Telnyx's controlled delivery, STOP blocking, START non-reactivation, and corrected HELP reply are accepted. Meta's owned Facebook-only consent, Page selection, bounded insights read, revocation, and token/mapping cleanup are accepted. Film is assigned to the newly authorized Dust Wave business portfolio for Fumblers LLC dba Dust Wave. | Architecture on track; Meta remains disabled outside controlled testing. Business/access verification, general-user App Review, Instagram acceptance, Google's public restricted-scope decision/verification, and absent companion resource mappings remain external. The Telnyx test recipient remains opted out |
| Common-flow UX quality | The canonical inventory covers 54 user flows and an isolated 12-project portfolio with sparse and dense workloads. The suite contains 774 script/unit tests plus browser/compiled-offline checks. Shared deferred-screen and provider-status tests cover failures, draft/focus preservation, and rejection of old session results. Google recovery distinguishes temporary service failures, changed connections, and expired consent without automatic or broader OAuth. Previously loaded production screens and offline backup export/preview work with Worker networking unavailable. Call-sheet layout checks cover internal list and form clipping, not just page overflow. | Appearance/demo evidence is in `docs/design/2026-09-05-demo-and-summary-review.md`; beta validation and deployment evidence is recorded in `docs/release-evidence/2026-09-06-beta-1.md`. This is not blanket usability or WCAG certification |
| Trustworthy project summaries | Overview, project lists, expense top sheets, and handoffs share task/ledger/production projections. Fixed phase timelines and invented upcoming sheets are removed; backup status uses local encrypted export evidence. New projects start without invented budgets or crew. | Dashboard/appearance/demo changes are now deployed and publicly verified; demo edits remain isolated from real workspace persistence and providers |

## Current Priorities

The latest deployed evidence is [0.1.0-beta.1](release-evidence/2026-09-06-beta-1.md). Public asset hashes, the bounded public browser suite, API health, and the full local regression suite passed. The earlier owned Google metadata read remains valid bounded evidence; public provider approval and broad real-team acceptance remain separate. The [selected-file evaluation](google-selected-file-evaluation.md) documents why Picker needs a scope and browser-token policy decision before activation.

1. Keep reducing oversized browser and Worker modules at real domain boundaries, backed by contract tests. Do not create generic abstractions that hide authorization or failure semantics.
2. Keep the 54-flow catalog and generated user-flow document current whenever a workflow changes.
3. Treat production deployment, owned-account OAuth, carrier approval, live SMS, and companion Pool/Store mappings as external acceptance gates, not as consequences of passing local tests.
4. Keep the full initial browser graph within the measured bundle budgets as more UI domains are added; the previous over-500-kB entry warning is now resolved.
5. Validate the full product with actual micro-budget productions; use those sessions to decide which deferred collaboration, distribution, and optional assistance features deserve implementation.
6. Use the isolated demo portfolio and the documented real-team rehearsal to validate sparse, dense, mobile, and recovery scenarios before broad beta. Shared production-derived summaries now replace template-era timeline/progress/backup labels.

## MVP Interpretation

The local application and its protected Worker workflows are a usable MVP candidate. Telnyx, owned Facebook-only Meta, and the owned Google empty metadata read have real acceptance evidence, not just local fixtures. It is not accurate to claim every integration is publicly accepted: Instagram, Meta business/access verification and App Review, Google's restricted-scope review, and absent companion Pool/Store resources retain explicit external gates. A release claim should state local test evidence, deployment evidence, provider configuration, and real-world acceptance separately.
