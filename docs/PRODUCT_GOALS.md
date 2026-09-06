# Film Product Goals

This document owns stable product direction and acceptance criteria. [Project Status](PROJECT_STATUS.md) owns changing implementation status, release evidence, blockers, and next steps. Do not maintain a second status ledger here.

## Direction

- Serve solo filmmakers and small teams, optimizing first for micro-budget non-union productions.
- Replace high-value production-planning workflows of heavier studio tools without copying their structure or creating parallel sources of truth.
- Keep screenplay and production planning local and private by default. Deterministic code owns canonical results; optional local-model suggestions require human review. Cloud/BYOK inference requires a separate consent and data-boundary decision.
- Stay static-first and framework-light. Add dependencies and abstractions only when measured benefits justify their cost.
- Keep the interface focused on projects: high-contrast black/white/gray, system appearance by default, accessible keyboard paths, and routine edits in the record being viewed.
- Give each user job one canonical UI surface; reuse domain contracts, projections, and mutation paths.
- Treat Notion as a one-way importer, not a live runtime dependency or parallel editor.
- Keep authorization, canonical collaboration writes, provider credentials, delivery eligibility, and destructive restore commits in the Worker.
- Keep core data portable through human-readable exports and encrypted backup/recovery before expanding integrations.
- Treat provider integrations as essential MVP capabilities with explicit scope, consent, compliance, and live acceptance. Meta is read-only; publishing belongs to Social.

## MVP Acceptance

1. A new user can create a real project and complete import, breakdown correction, scheduling, resource planning, call-sheet issue, sides, daily reporting, and export without an onboarding dead end or invented production facts.
2. Supported core-record collaboration enforces member/role/workspace/record scope, rejects stale changes, and preserves local work during failed sync. Local-only production data is distinguished from shared canonical data.
3. A representative production can export, preview, and recover its data and required attachment bytes within documented limits. Recovery never claims success after a partial or unverified write.
4. Each advertised provider capability has separately recorded configuration, owned-account acceptance, and applicable public approval. Disabled/deferred capabilities are not sold as active integrations.
5. Common flows pass automated regression, responsive/accessibility checks, and an observed producer/crew rehearsal. Automated checks alone do not certify usability or accessibility.
6. Releases identify tested source, green CI, deployed versions, verified artifacts, rollback targets, and remaining limitations.

## Explicit Boundaries

No cloud AI by default, no social publishing in Film, no inferred union/payroll compliance, no direct Stripe customer/payment data reads, and no fabricated Pool/Store resources. Real-time collaborative production-graph editing, broader planning/distribution workspaces, Google Docs/Calendar, optional assistance, and larger restore/upload paths need explicit acceptance or documented deferral before being claimed as complete.
