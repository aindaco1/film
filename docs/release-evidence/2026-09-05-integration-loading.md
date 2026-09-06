# Integration Loading and Session Boundaries

Date: 2026-09-05

## Scope

- Extract the provider inspector into `integration-view.ts` over a bounded state contract. The renderer receives redacted results and capability booleans, not auth credentials or production records.
- Reuse `deferred-view.ts` for both Backups and Integrations. One implementation owns in-flight imports, cached revisits, stale-mount protection, local focus handling, and explicit reload after failed module downloads. Loading a screen does not call a provider.
- Load provider, backup, and restore API clients inside existing action error boundaries. No runtime package or framework was added.
- Keep the provider catalog, initial/cleared results, and request-context guard in `integration-state.ts`. Each of the 21 provider actions checks its captured session/workspace after asynchronous boundaries. Sign-out clears integration results before waiting for Worker logout; obsolete successes and errors cannot repopulate a later session or replace its drafts.
- Preserve native button semantics and selected state for the provider picker. Prevent cached Drive and Stripe results from appearing in a different provider's details.
- Extend the existing flow catalog, not a second inventory, with deferred-screen recovery and session-race coverage. The 54 canonical flows remain the source of truth.

These browser checks do not cancel requests already accepted by the Worker. Worker authorization, canonical operations, consent, signatures, restore approvals, and persistence contracts remain unchanged.

## Size Evidence

- Entry: 509,863 bytes, down from 536,388 in the preceding frontend release.
- Total initial JS: 602,514 bytes and 128,869 gzip bytes across eight chunks, down from 628,041 / 133,143.
- Build ceilings tightened to 515,000 entry, 610,000 initial, and 135,000 initial gzip bytes. Static graph checks reject accidentally eager view/client imports.
- The over-500-kB warning remains visible. The main module is still roughly 16.9k lines; this is incremental reduction, not completed decomposition.

## Verification

- Final `npm run smoke` passed builds, typecheck, 683 script/unit tests (55 scripts, 233 web, 312 Worker, 83 shared), secret scanning, 37 migrations, full browser flows and appearance/demo audits, and compiled offline checks after the shared initial-state/attribute-escaping cleanup.
- Shared browser scenarios exercise held downloads, navigation away, failed import recovery, persistence, preserved account drafts/focus, cached revisits, bound controls, and desktop/mobile light/dark layouts.
- Session-boundary tests hold valid consent data and failed requests across sign-out and a second sign-in. Neither may show old recipients, enable sending, replace new-session input, or steal focus. No real SMS is sent.
- Compiled offline coverage now exports and previews an encrypted backup with all Worker routes unavailable, in addition to reloading previously fetched recovery/integration screens and the demo. Never-fetched lazy assets are still unavailable offline.
- Strict deployment readiness passed using 16 remote secret names without reading their values. Web Wrangler dry-run passed.
- The real local-Worker suite passed: canonical hydration and in-place D1 editing, member/collaboration transactions, core/attachment restore proofs, document/profile mutation flows, encrypted export/preview, disabled-provider readiness, logout, and disposable-resource cleanup. Pool/Store companion contracts also passed without creating resource mappings.
- `node scripts/browser-smoke.mjs --deferred-views-only --built` passed again against the final compiled assets, with unmocked API requests explicitly blocked in the session-race fixtures. Final secret scanning and `git diff --check` passed. CI was not run, and the existing worktree remains uncommitted.

## Deployment

- Deployed `film-web` version `e6b8b808-7cd8-4eeb-b08e-a1ad6849d220` to `https://film.dustwave.xyz`. Previous version: `6b7fe626-f72c-4fad-af92-f79e0c51798e`.
- All 30 non-HTML public build files matched local bytes. All five HTML entry points retained expected copy and local resource references; edge-injected scripts remain excluded from the byte-identity claim.
- Public Playwright checks passed the 12-project demo, system/persisted appearance, on-demand Backups and Integrations, cached revisits, and mobile empty-state spacing. The integration screen was not requested before it opened. No demo API request, browser error, or horizontal page overflow occurred. Desktop integration and mobile Sides screenshots were visually inspected.
- API health returned 200. Its deployment was `36249ef6-ff24-4221-9a58-e85b25dbbd19`, the separately accepted Telnyx release; no API deployment or provider setting changed in this pass.
- The normal local app remained available at `http://127.0.0.1:5173`, with Worker health at `http://127.0.0.1:8787/health`; both returned 200. Local provider modes remain explicitly non-sending.

## Acceptance Boundaries

- No API Worker deployment, production data mutation, provider configuration change, SMS enrollment, or SMS/sign-in email is included.
- Google owner consent and Meta owned-account/App Review acceptance still require their separate real-account steps. Meta remains disabled.
- Telnyx's accepted delivery/STOP/START/HELP evidence remains in the dedicated activation record; its test recipient remains opted out.
- Real producer/contributor and VoiceOver sessions remain pending. Browser regression and axe results are not a blanket usability or accessibility certification.
