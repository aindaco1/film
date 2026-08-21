# ADR 0079: Restore Attachment Package Preflights

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0085.

## Decision

Add a Worker-owned attachment restore package preflight at `POST /api/restores/attachment-package-dry-run`.

## Context

Encrypted backup previews now produce a structured attachment package plan, but byte restore still needs a Worker boundary before any package verification or destination writes can exist. The conservative step is to validate the package plan under owner/producer authorization and persist non-destructive proof that attachment byte restore remains blocked.

## Consequences

- The route requires owner/producer auth, workspace scope, matching snapshot workspace, valid backup timestamp metadata, and bounded attachment package-plan counts.
- D1 stores `restore_attachment_package_preflights` rows with metadata counts, source-byte totals, status, and `destructive_write = 0`.
- The route records a D1 audit event when audit storage is available.
- The web restore preview exposes `Check attachment package` when a backup includes attachment metadata.
- No attachment bytes are accepted, uploaded, copied, restored, or written by this route. ADR 0085 adds a follow-on package manifest/hash verification dry-run that remains non-destructive.
