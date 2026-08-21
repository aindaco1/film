# ADR 0153: Restore Application Preflight Accessibility Smoke

## Status

Accepted.

## Decision

Extend `npm run test:browser` so the desktop smoke drives the restore UI beyond encrypted backup preview.

After exporting and previewing an encrypted backup, the smoke signs in again through mocked Worker auth, accepts the exact `RESTORE workspace_acme` confirmation phrase for each restore step, and mocks:

- restore gate check
- restore approval record
- restore commit-storage check
- restore application-preflight check

It then runs axe serious/critical checks on the resulting application-preflight state, including the dense restore status panels and snapshot review table.

## Context

Restore preview already had axe coverage, but the confirmation-driven Worker restore panels are denser and closer to the eventual apply path. They include repeated status regions, conditional action buttons, hash snippets, rollback guidance, and a scrollable row-review table.

The deterministic browser smoke should catch accessibility regressions in those states without requiring a live Worker or applying destructive restore commits.

## Consequences

- Browser QA now covers the critical restore progression through application preflight.
- The route mocks assert CSRF headers and exact confirmation phrases.
- Deterministic smoke still stops before destructive restore apply because the same-state backup has no create/update rows to apply.
- Live Worker restore commit validation remains covered by Worker tests and manual/local-staging verification.
