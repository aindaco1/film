# 0085 - Restore Attachment Package Verification

## Status

Accepted. Extended by ADR 0086.

## Context

ADR 0079 added a restore attachment-package preflight that records package-plan blockers without accepting bytes. The next conservative step before destructive attachment restore is to verify package manifest metadata and hashes against a prior preflight while still avoiding byte writes and destination mutation.

## Decision

Add `POST /api/restores/attachment-package-verify-dry-run`.

The route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, workspace scope, matching snapshot workspace, a valid prior `restore_attachment_package_preflights` row when D1 is available, a bounded attachment package plan, a bounded `film.attachment-package` manifest, safe package paths, workspace-prefixed attachment object keys, valid SHA-256 hashes, and manifest object-count/source-byte totals that match the restore package plan.

Successful verification persists `restore_attachment_package_verifications` with package and manifest hashes, bounded manifest JSON, `status = verified_until_destination_rules`, and `destructive_write = 0`. The response keeps `canRestoreBytes: false` and reports that destination write rules are still required.

## Consequences

- Attachment package metadata can be verified under the restore safety chain without accepting raw attachment bytes.
- The web app can parse downloaded package `manifest.json` locally and submit the manifest metadata plus package hash to this dry-run route after package preflight.
- Stale, mismatched, unsafe, or oversized manifests fail before any durable verification record is written.
- Destructive attachment byte restore remains blocked until destination object mapping, overwrite policy, and write rules are explicit. ADR 0086 adds blocked object-level restore planning without byte writes.
