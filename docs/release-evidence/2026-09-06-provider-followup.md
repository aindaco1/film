# Provider and Maintainability Follow-Up

Date: 2026-09-06. Code deployment is complete; live provider follow-up is in progress. No public provider approval is implied.

## Meta Portal Observations

- Film app `4380217052290003` remains Business / Development.
- `pages_read_engagement` and `pages_show_list`: Standard access, Active (7), no App Review requested.
- `read_insights`: Standard access, Active (3), no App Review requested.
- `public_profile`: Standard access, Active (5), verification required.
- `instagram_basic` and `instagram_manage_insights`: Standard access, Ready to use (0); advanced-access request disabled.
- App Review submissions shows Not submitted with nothing added. The portal states each submission now reviews the whole app, not just new scopes.
- Basic settings initially had no business portfolio. The user confirmed the legal operator is Fumblers LLC dba Dust Wave and explicitly authorized portfolio creation with their contact details. Dust Wave portfolio `1374848441471690` was created, and Film's settings now show it assigned to that portfolio. The unrelated existing portfolios were untouched; the Social Test Page is not a portfolio.
- The user confirmed the business email with Meta. The portfolio is eligible for verification but remains Unverified. The verification form uses Private Company (LLC), legal name Fumblers LLC, and alternative name Dust Wave, plus the explicitly confirmed address, phone, and website. It reached Meta's reCAPTCHA and was handed to the user. Contact/address values and identity documents are intentionally omitted here. No final business verification or Tech Provider access verification has been submitted.
- The earlier owned Facebook-only acceptance remains in `2026-09-05-meta-facebook-only.md`. Successful test calls do not establish advanced access, Instagram acceptance, or public approval.

Later September 6 follow-up: Security Center showed Pending submission. Continuing the saved form reached an official-record review and then mandatory personal identity verification. Its four masked representative choices did not clearly match the authorized operator's name. No representative was selected, no identity document was uploaded, and no final submission was made. The operator was asked to confirm the correct record/representative directly in Helium; sensitive identifiers remain excluded from this ledger.

## Google Portal and Live Observations

- Cloud project Film (`film-502013`): External audience, Testing, one test user.
- Data Access lists only `drive.metadata.readonly`, under Restricted scopes.
- Verification Center says verification is not required while Testing. This is not a public verification result.
- After the user signed back into Film in Helium, Check Google found an active stored connection with one metadata scope and a July 10 access-token expiry. A saved active row was previously being presented as connected even when the token was unusable.
- The user supplied a private, empty Test folder for a bounded metadata read. The existing deployment returned `google_token_refresh_failed`; no file content was requested. The folder identifier is intentionally omitted from this tracked record.
- After deployment, the same read correctly returned a reconnect requirement. Reauthorization through Film completed and the callback restored the owner session with a fresh connection carrying only `drive.metadata.readonly`. The subsequent real Drive request returned zero items, a complete folder page, and the correct empty-folder state. No file content was requested. This proves owner consent and an empty metadata read, not non-empty pagination or long-term refresh; those paths retain deterministic regression coverage. The approved owner connection remains active.
- A read-only aggregate D1 check confirmed one active Google connection, one metadata-only scope set, a configured folder, and no recorded connection error. No token, ciphertext, account identifier, or private folder identifier was printed.
- Helium's JavaScript dialog path still stalled in focus emulation. Selecting Film through native Helium tabs and completing its native prompt worked. This is a workaround, not a fix to the external automation implementation.

## Prepared Work

- `docs/provider-review-preparation.md` contains scoped Meta justifications, the real reviewer journey, business/access prerequisites, Google's restricted-scope assessment issue, a minimum-scope decision table, and an owner acceptance checklist.
- Google token normalization is shared across code exchange and refresh. Validated `invalid_grant` responses produce a redacted reauthorization result; other errors remain temporary/service failures. The stored error update is guarded against a changed refresh token. The browser offers one explicit reconnect action while retaining disconnect.
- Shots, Locations, and Talent markup now lives behind one typed, render-only resource module. It reuses the shared deferred-view lifecycle, create disclosure, option renderer, source-candidate filtering, and production-usage markup. Controllers, schema operations, exports, and persistence remain authoritative.

## Build and Regression Evidence

- `npm run smoke` passed builds, strict web typecheck, 743 script/unit tests (57 script, 261 web, 342 Worker, 83 shared-package), secret scanning, 37 migrations over two fresh SQLite passes, full desktop/mobile browser flows, appearance/demo audits, and compiled offline recovery. The offline test now includes all six production resource/document workspaces after their modules have been fetched.
- `npm run smoke:local:worker` passed real local D1, membership/session revocation, collaboration, protected mutations, restore proofs, encrypted export/preview, provider dry-runs, and cleanup. Local modes remained explicitly non-sending.
- Focused Google recovery and eight-screen deferred-view suites passed development and compiled assets. Representative desktop/mobile screenshots were inspected. These provider fixtures block live calls.
- Startup entry is 462,355 bytes; complete initial JavaScript is 555,006 bytes, 120,846 gzip bytes over eight chunks. Compared with the preceding release, this removes 26,955 raw initial bytes and 4,345 gzip bytes. Regression ceilings are 470,000 / 565,000 / 124,000 bytes respectively. The main controller is still 15,925 lines; this is measured decomposition, not a claim of finished maintainability work.
- Strict deployment readiness with remote secret names passed without printing values. Production dependency audit reported zero vulnerabilities. Both Wrangler dry runs passed; Worker upload was 965.92 KiB, 158.09 KiB gzip.

## Deployment

- API version: `574616c6-5ab7-44a3-a78b-bd01fb04863b`; prior version/rollback target: `571717d4-b285-4342-b45e-dfa45418a95a`.
- Web version: `5322d1d7-c8ef-44e1-8c42-8c202d206437`; prior version/rollback target: `911fb03d-4295-429e-8800-e8771b6c21b1`.
- API health returned 200 before and after deployment. All 32 non-HTML public assets matched local SHA-256 hashes, and all five HTML pages returned 200 with matching titles.
- `node scripts/browser-smoke.mjs --release-origin https://film.dustwave.xyz` passed public demo, runtime-status, Google-recovery, and eight-screen deferred-view checks with isolated storage and mocked/blocked API routes. A representative public Google recovery screenshot was visually inspected. Post-deployment strict readiness passed with the same provider gates.
- Entry `assets/index-h9hCCX6g.js`: SHA-256 `dd2abb01ab241f9e5e02012ff57cd787cfab20061604e462ae7fcd1c6d3b8c70`. Stylesheet hash is unchanged from the preceding release.
- No migrations, secret changes, or provider-mode changes were made. Meta OAuth and Stripe summaries remain disabled; existing Google, Resend, and SMS modes are preserved. No SMS was sent.
- The deployment uses the existing uncommitted worktree. No Git commit, tag, or GitHub CI result is implied.
- Final documentation regeneration, secret scanning, and whitespace checks passed. Local web/API still return 200 on ports 5173/8787.
