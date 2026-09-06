# Checked Integration Status

Date: 2026-09-06

Deployment follow-up: these changes were subsequently included in the [daily-document frontend release](2026-09-06-daily-documents-release.md). The evidence below records the earlier local candidate; the linked release records the public verification.

## Scope

- Replace the header and picker counts derived from saved workspace integration modes with one `integrationRuntimeStatus` projection of checked Worker configuration.
- Distinguish unchecked, checking, failed, live-enabled, partly-enabled, blocked, and offline-demo states. Missing or duplicated provider entries stay unchecked; counts come from the canonical provider catalog, not untrusted aggregate counters.
- Keep one explicit status command, one picker, and selected-provider runtime details. Checking configuration does not connect accounts or prove delivery.
- Refresh only status-owned DOM nodes through `integration-runtime-view.ts`; unrelated provider forms and focus survive pending, successful, and failed checks. Failed refreshes hide old success badges and retain the last-success timestamp.
- Reuse the existing session/workspace guard to reject old responses, prevent duplicate in-flight checks, and keep the isolated demo off the network.
- Extend the existing 54-flow catalog and reuse a shared runtime fixture in browser tests. No framework or dependency was added.

## Verification

- `npm run smoke` passed all workspace builds, web typecheck, 716 script/unit tests (55 scripts, 241 web, 337 Worker, 83 shared), secret scanning, 37 migrations over two fresh SQLite passes, full browser flows, appearance/demo audits, and compiled offline checks.
- `node scripts/browser-smoke.mjs --provider-status-only` and the same command with `--built` passed against development and compiled assets.
- Status regressions cover unchecked startup with no automatic call, held request and duplicate suppression, header/picker agreement, preserved drafts and focus, failure/retry, selected-provider details, navigation away, and late success/failure across sign-out and a new session.
- Desktop 1440px and mobile 390px passed light/dark axe and overflow checks. Representative screenshots were visually inspected under `test-results/ux-audit/provider-status-*.png`.
- `npm run smoke:local:worker` passed real local D1 hydration and edits, member/session revocation, collaboration, core/attachment restore proofs, browser document and protected mutation flows, encrypted backup export/preview, provider readiness, logout, and disposable-resource cleanup. All provider modes stayed explicitly non-sending.
- Startup remains within the existing budgets: 512,400 entry bytes, 605,051 total initial JS bytes, and 129,674 gzip bytes across eight initial chunks. The over-500-kB warning remains open; this change adds 2,537 initial bytes and is not a bundle-reduction claim.
- Final secret scanning and `git diff --check` passed. The local web app at `http://127.0.0.1:5173` and Worker health at `http://127.0.0.1:8787/health` both returned 200 after restarting the shared dev supervisor outside the transient command session. The worktree remains uncommitted; CI was not run.

## Acceptance Boundaries

- Local source and test evidence only. No production deployment, provider configuration change, message delivery, new account consent, or ownership change is included.
- Runtime readiness describes configuration, not OAuth completion, carrier acceptance, account access, or successful delivery.
- Real producer/contributor and VoiceOver acceptance remain separate from the automated checks. External provider decisions remain listed in `docs/PRODUCT_GOALS.md`.
