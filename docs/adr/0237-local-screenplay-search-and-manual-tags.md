# ADR 0237: Local Screenplay Search And Manual Tags

Date: 2026-08-21

## Status

Accepted

## Decision

Add search and manual tagging as shared operations over the existing browser-local screenplay breakdown graph. Search normalizes a bounded query and returns ordered scene IDs with explicit heading, source, synopsis, and active-element match categories. The browser keeps query text in ephemeral UI state and excludes it from persisted UI preferences.

Add missed elements through a shared schema transition keyed by selected scene, supported production category, and normalized element name. Reuse an existing element with the same category/name across the revision. When that element already occurs in the selected scene, confirm the existing occurrences instead of creating duplicates. Otherwise append one confirmed manual occurrence using a bounded display name/excerpt and a line clamped to the selected scene. Enforce the parser graph's 5,000-element and 50,000-occurrence limits.

Use one exported element-name normalizer in both the parser and manual transition. Source text is immutable; manual tags enrich only the production graph. Existing review controls can dismiss or reconfirm the resulting occurrence, and existing schedule, DOOD, call-sheet, Location, Talent, revision, export, and backup paths consume it without special cases.

## Context

Deterministic parsing intentionally favors explainability and will miss production-specific references. Requiring a filmmaker to edit and re-import the source file for every missed prop or sound cue breaks down during prep. Local source search and direct scene tagging cover that correction loop without a model, upload, parallel element store, or duplicated downstream logic.

## Consequences

- Search queries disappear on reload and never enter workspace backups, operation payloads, D1, Worker logs, providers, or model calls.
- Manual elements and occurrences enter the existing local breakdown graph and encrypted backups.
- Manual tags are immediately available to every graph-derived workspace.
- Adding the same category/name to the same scene is idempotent at the graph level.
- Search results expose match categories, not copied snippets or a second search index.
