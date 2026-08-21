# ADR 0149: Restore Preview Accessibility Smoke

## Status

Accepted.

## Decision

Extend `npm run test:browser` so the decrypted backup restore-preview state must pass serious/critical axe checks in Chromium.

The check runs after a local encrypted ZIP backup is exported, selected for preview, decrypted through the native passphrase prompt, and rendered with restore-preview warnings, action controls, and review content. It complements the existing desktop app-shell and mobile Backups accessibility checks.

## Context

Backup and restore controls are safety-critical. The browser smoke already proved the preview was non-destructive and did not overflow, but accessibility checks only covered the initial shell and mobile Backups workspace.

Running axe against the rendered restore-preview state catches severe semantic, labeling, and contrast regressions in the controls users rely on before any destructive restore path.

## Consequences

- Restore preview regressions can fail the normal `npm run smoke` gate.
- The check remains deterministic because it uses local encrypted backup export and preview, not live Worker restore commits.
- Native browser prompts and deeper live restore apply states still need separate targeted accessibility coverage.
