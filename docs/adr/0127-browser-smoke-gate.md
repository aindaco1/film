# ADR 0127: Browser Smoke Gate

Date: 2026-07-08

## Status

Accepted

## Decision

Add `npm run test:browser` as a Playwright-backed browser smoke gate and include it in `npm run smoke`.

The script starts its own Vite dev server, opens Chromium, and verifies:

- desktop app shell loading,
- serious/critical axe checks for the desktop app shell and mobile Backups workspace,
- mocked magic-link request, verification, and sign-out UI state,
- protected record mutation request, approval, diff, and apply UI state through mocked Worker routes,
- mocked provider dry-run chip summaries for every MVP provider,
- nested metadata search filtering,
- Projects workspace search reuse,
- local create flows for tasks, docs, people, equipment, and expenses,
- partial reconnect sync that leaves rejected local operations queued,
- encrypted ZIP backup export and non-destructive encrypted restore preview,
- desktop document overflow checks,
- mobile search overflow checks,
- mobile navigation to Backups.

## Context

The source-string tests catch important wiring, but they cannot prove that the app is reachable, clickable, and responsive in a real browser. Manual Playwright QA caught a mobile navigation gap after dedicated workspace sections were added. That class of issue should be part of the automated smoke path.

## Consequences

- `npm run smoke` now exercises the static app in Chromium.
- The script stores failure screenshots under ignored `test-results/` paths.
- Live Worker session browser automation remains a separate follow-up gate because it needs configured local or staging Worker origin setup.
- The protected mutation smoke remains mocked at the HTTP boundary; Worker authorization, stale checks, and D1 writes stay covered by `apps/worker/test`.
