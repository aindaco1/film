# ADR 0014: Notion ZIP and Attachment Metadata

Date: 2026-07-07

## Status

Accepted

## Decision

Support Notion ZIP imports in the static app shell by parsing the ZIP central directory locally, sending only entry metadata to the Worker preflight, then decompressing Markdown and CSV entries after preflight succeeds.

## Context

Notion exports commonly arrive as ZIP files. Adding a large ZIP dependency would increase the static app surface area for a narrow need. The MVP also needs attachment continuity, but Worker/R2 upload commit, retention policy, restore behavior, and backup rules need explicit design before raw bytes move to server storage.

## Consequences

- The web app supports stored and deflated ZIP entries without adding a ZIP package dependency.
- ZIP metadata preflight uses the same path and size checks as extracted-folder imports.
- Markdown and CSV entries are decoded locally only after Worker preflight succeeds.
- Asset entries create Film document metadata records with source path, size, and content type.
- Attachment bytes remain out of workspace JSON, encrypted backup bundles, operation payloads, and Worker dry-run requests until R2 upload/commit is designed.
