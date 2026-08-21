# ADR 0077: Attachment Restore Policy Payloads

Date: 2026-07-08

## Status

Accepted

## Decision

Add a separate encrypted attachment restore-policy payload to `.filmbackup.zip` exports when the backup contains attachment metadata.

## Context

Attachment bytes intentionally stay out of workspace JSON, operation payloads, and backup snapshots. Film still needs future restore tooling to reason about which attachment records exist, what metadata is available, and why restore remains blocked without an explicit byte package. Keeping that policy in its own encrypted payload lets restore packaging evolve without placing attachment paths or object keys in the plaintext manifest.

## Consequences

- Backups with attachment metadata now include `payload/attachment-restore-policy.enc`.
- The plaintext manifest records only the policy payload path and attachment count. Source paths, object keys, hashes, names, and byte metadata remain encrypted.
- ZIP decrypt validates that the attachment restore-policy payload matches the decrypted snapshot attachment manifest.
- The policy remains `metadata_only`; it does not include attachment bytes and does not enable destructive attachment restore.
- Legacy backups without this payload remain readable.
