# 0086 - Restore Attachment Object Plans

## Status

Accepted.

## Context

ADR 0085 verifies attachment package manifest metadata and hashes, but it still does not decide where bytes would be written during restore. Film needs object-level planning before any destructive attachment restore route can exist, and that plan must remain non-destructive until overwrite and destination rules are explicit.

## Decision

Add `POST /api/restores/attachment-objects-plan-dry-run`.

The route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, workspace scope, a matching `restore_attachment_package_verifications` row when D1 is available, package and manifest hashes, and a bounded package manifest. It creates deterministic destination object-key candidates for each package object, marks every object `blocked_destination_write_rules`, and persists `restore_attachment_object_plans` with `destructive_write = 0`.

## Consequences

- Attachment restore now has a durable per-object plan after package verification.
- The plan can be reviewed by the web app or future restore workers without accepting raw bytes.
- No object is restorable yet; destination write rules, overwrite policy, and byte-source validation remain future destructive work.
