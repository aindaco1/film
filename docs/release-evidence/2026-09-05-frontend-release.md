# Frontend Release and Recovery Loading

Date: 2026-09-05

## Scope

- Release the previously locally verified neutral System/Light/Dark appearance, shared empty-state spacing, isolated 12-project demo portfolio, and production-derived project summaries. Detailed UX evidence remains in `docs/design/2026-09-05-demo-and-summary-review.md` rather than being duplicated here.
- Move backup/restore markup into `backup-workspace.ts` with an explicit state contract. Share the existing action bindings, icons, byte formatting, and deterministic preview/commit record planner. No framework, runtime dependency, migration, restore authorization, or provider activation change.
- Load recovery screens on demand. Preserve account drafts and focus outside the content container; discard late rendering after navigation. A failed native module import offers an explicit page reload, with an unsaved-form warning, instead of an ineffective cached retry. Previously loaded screens remain available offline.
- Load the existing ZIP utilities only when attachment-package verification needs them. Build-time static dependency traversal now catches accidentally eager backup, demo, or import modules.
- Fix old sample-project construction sharing arrays and record IDs across projects. Fresh sample projects now get cloned, project-scoped records. Existing persisted workspaces and older backup IDs are not rewritten; the Worker still rejects duplicate restore identities before writes.
- Dev and local-Worker smoke now share explicit non-sending provider modes. Production live SMS configuration cannot silently activate local sends; adding a new configured provider mode without a local decision fails regression tests.

## Size Evidence

- Entry: 536,388 bytes, 106.03 kB gzip, down from approximately 567.4 kB before this pass.
- All initial JS, including transitive static dependencies: 628,041 bytes, 133,143 gzip bytes, six chunks.
- Deferred backup screen: 33.03 kB; import utility: 7.22 kB.
- Build ceilings: 540,000 entry bytes, 650,000 initial bytes, 150,000 initial gzip bytes. Measurements run after final Vite chunk transforms.
- The over-500-kB warning remains visible. The main module remains roughly 17.4k lines; this is incremental domain extraction, not a completed decomposition or an ideal startup-size claim.

## Verification

- Full `npm run smoke` passed: builds, strict web typecheck, script/unit tests, secret scan, all 37 migrations, full browser workflows, appearance/demo audits, and compiled offline recovery.
- Added direct backup-renderer/record-planner regressions, startup dependency-budget tests, and non-live local-provider-policy tests. Total suite: 677 script/unit tests (55 scripts, 227 web, 312 Worker, 83 shared packages).
- `node scripts/browser-smoke.mjs --backup-loading-only --built` passed actual compiled lazy loading, fault recovery, stale navigation, preserved drafts/focus, cached revisits, reload, action bindings, and desktop/mobile light/dark checks.
- Strict deployment readiness passed with 16 remote secret names; secret values were not fetched. Companion contract checks passed without activating nonexistent Big Sword mappings.
- Web Wrangler dry-run passed. No Worker deploy or production data mutation is part of this release.
- The real local-Worker suite passed again after the shared non-sending policy change: migrations, auth/hydration, member and collaboration transactions, restore/attachment proofs, real-D1 browser editing, encrypted backup export/preview, provider gates, and disposable-member/server cleanup. The final script-only rerun passed all 55 tests.
- Final secret scan and `git diff --check` passed. CI was not run; local changes remain uncommitted.
- One initial browser run was interrupted by development hot reload during formatting; a fresh complete run passed. The first fault test reproduced cached module-import failure and drove the explicit reload recovery above.

## Deployment

- Deployed `film-web` version `6b7fe626-f72c-4fad-af92-f79e0c51798e` to `https://film.dustwave.xyz`. Previous version: `4c7ed000-74e7-435e-8dde-2def447ae451`.
- All 24 non-HTML public build assets matched local bytes exactly. All five HTML entry points retained expected titles, copy, and local resource references. Edge-injected scripts mean public HTML is not byte-identical to the source; the HTML check does not claim otherwise.
- Public Playwright verification passed 12 demo projects, system/default and persisted appearance, on-demand Backups, and mobile Sides recovery spacing with no horizontal page overflow, no demo API requests, and no browser errors. Desktop and phone screenshots were visually inspected.
- Production API health returned 200 and its deployment remained `36249ef6-ff24-4221-9a58-e85b25dbbd19`, the previously accepted Telnyx release. No API deploy or provider-setting change occurred.
- Restarted the normal local app at `http://127.0.0.1:5173` with Worker health at `http://127.0.0.1:8787/health`; both returned 200. This development process uses the explicit non-sending defaults above.

## Remaining Acceptance

- Google owner consent and connect/metadata-read/disconnect acceptance.
- Meta data handling/App Review and owned Page/linked-Instagram connect/read/disconnect acceptance; interactive Meta remains disabled.
- Real producer/contributor and VoiceOver rehearsal using the canonical flow catalog. Automated responsive/axe checks are not a blanket usability or WCAG certification.
- Pool/Store integration remains a verified contract with no Big Sword resource mappings, as requested. Optional local/BYOK model assistance remains deferred.
- Telnyx's accepted delivery/STOP/START/HELP state is unchanged; the owned-number recipient remains opted out. No additional SMS or sign-in email was sent by this frontend release.

Screenshots and generated backups remain under ignored `test-results/`, not in release artifacts or tracked evidence.
