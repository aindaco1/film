# Daily Documents and Checked Integration Status

Date: 2026-09-06

## Scope

- Move Call Sheets, Sides, and Production Reports into one on-demand view module with explicit local render inputs. Existing controller selectors, mutations, exports, persistence, and Worker authorization remain authoritative.
- Reuse the deferred-view lifecycle already shared by Backups and Integrations, including stale-container protection, cached revisits, focus retention, and explicit reload after a failed chunk download. All three daily-document screens can reload offline after the shared module has been cached.
- Keep one call-sheet selector renderer and one workspace-navigation binder instead of copying controls or handlers.
- Give call-sheet scenes and cast calls the full content width. A shared container layout reflows narrower screens; crew and gear wrap within their columns. Native mobile time fields retain room for AM/PM and the picker, and cast notes no longer compete with the save button for a narrow column.
- Include the preceding [checked integration-status changes](2026-09-06-integration-status.md): explicit configuration checks, consistent header/picker badges, failure/retry, preserved drafts/focus, and old-session response rejection. No new provider mode or account access is enabled.

## Build and Regression Evidence

- Startup entry: 489,310 bytes. Complete initial JavaScript: 581,961 bytes, 125,191 gzip bytes, eight initial chunks. The preceding integration-status candidate was 512,400 / 605,051 / 129,674 bytes respectively. This removes 23,090 raw initial bytes and the over-500-kB entry warning; it does not claim the main controller is fully decomposed.
- Regression ceilings are now 495,000 entry bytes, 590,000 total initial bytes, and 128,000 initial gzip bytes. The budget check rejects eager inclusion of the daily-document view module.
- The catalog still covers 54 user flows. The suite contains 725 script/unit tests: 57 scripts, 248 web, 337 Worker, and 83 shared-package tests.
- `npm run smoke` passed builds, strict web typecheck, all 725 tests, secret scanning, 37 migrations over two fresh SQLite passes, full browser flows, empty/populated appearance audits, and compiled offline recovery. The final compiled demo also passed `node scripts/browser-smoke.mjs --demo-only --built` after the last responsive layout adjustment.
- `node scripts/browser-smoke.mjs --deferred-views-only` and the same command with `--built` passed development and compiled deferred-view/session-boundary checks.
- The common five-screen browser matrix covers pending imports, draft/focus retention, navigation away during loading, failed-chunk reload, cached revisits, persisted selection, action binding, and desktop/mobile light/dark rendering.
- The populated demo and full appearance matrix share assertions for call-sheet internal list/control clipping and native time-field width. This supplements page-level overflow and axe checks; it is not a usability or WCAG certification.
- `npm run smoke:local:worker` passed real local D1 edits and hydration, membership/session revocation, collaboration, protected mutations, core/attachment restore proofs, encrypted backup export/preview, provider dry-runs, and disposable-resource cleanup. Local provider modes remained non-sending.
- `npm run check:deploy:strict -- --wrangler-secrets` passed with 16 remote secret names counted, no values printed. Meta OAuth and Stripe summaries remain deliberately disabled in deployment configuration. `npm run check:companions -- --strict` passed without creating Pool campaigns, Store products, or resource mappings.
- `npm audit --omit=dev --audit-level=high` passed with no reported vulnerabilities. `npx wrangler deploy --dry-run` in `apps/web` packaged the static app with no bindings.
- Final `git diff --check` and `npm run test:security` passed after the release notes were updated.

## Deployment

- Deployed only `film-web` with `npx wrangler deploy --message "Lazy daily documents, readable call-sheet forms, and checked integration status"` from `apps/web`.
- Public app: `https://film.dustwave.xyz`. Deployed version: `911fb03d-4295-429e-8800-e8771b6c21b1`.
- Previous web version / rollback target: `224f969a-81de-40c7-bff3-4ad5b3e4ccdd`. No rollback was required.
- All 31 non-HTML public assets matched local SHA-256 hashes. All five HTML pages returned 200 and matched local titles, headings, module references, and stylesheets; edge-injected HTML was not treated as a byte-for-byte match. The generated manifest is `test-results/public-release/asset-verification.json`.
- Entry `assets/index-DeYab3LC.js`: SHA-256 `99cf1bf75ca996992f208ca8d4f4f2cf9b55228df85ff0ad1b38003060d7741d`.
- Stylesheet `assets/index-BE2GJXtQ.css`: SHA-256 `4635f5bc845f1f83902591f7f65f77db81a1e8ad076b74cdf7c2e1130e2b7d36`.
- `node scripts/browser-smoke.mjs --release-origin https://film.dustwave.xyz` passed the public demo, populated call-sheet layout, provider-status fixtures, and all five deferred-view suites. It used isolated local data and mocked/blocked API requests, including for auth and provider checks. Representative local and public screenshots were visually inspected; public evidence is under `test-results/public-release/ux-audit`.
- No API Worker deployment or migration was performed. Its version remained `571717d4-b285-4342-b45e-dfa45418a95a`, and production health returned 200 before and after the web deployment.
- The local app at `http://127.0.0.1:5173/` and local Worker at `http://127.0.0.1:8787/health` also returned 200 and remain available.

## Acceptance Boundaries

- Browser provider/auth flows use isolated data and mocked or blocked API routes. They do not grant account access or prove live message delivery.
- The API Worker's controlled Meta acceptance ended with Meta disabled. Existing Telnyx delivery/keyword evidence is separate; no SMS or login email was sent for this frontend release.
- General-user Meta review and business ownership, Instagram acceptance, unconsented Google account access, and actual producer/contributor and VoiceOver rehearsals remain explicit external gates. Absent Pool/Store resource mappings remain intentionally deferred.
- The build comes from the existing uncommitted worktree, including the prior local UX work. No GitHub CI result, Git tag, or repository commit is implied by a Cloudflare deployment.
