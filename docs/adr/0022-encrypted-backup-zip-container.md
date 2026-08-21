# ADR 0022: Encrypted Backup ZIP Container

Date: 2026-07-07

## Status

Accepted

## Decision

Export encrypted browser backups as `.filmbackup.zip` containers with a plaintext non-secret `manifest.json`, an encrypted workspace snapshot payload file, and separately addressable encrypted payload files for sensitive record bodies.

## Context

The first backup format encrypted the whole workspace snapshot into one JSON bundle. That was enough for local backup safety, but future restore workflows need a container that can add manifests, record payloads, document payloads, and attachment policy files without making one large opaque JSON object the only format.

## Consequences

- Current browser exports download `.filmbackup.zip` files.
- ZIP entries are stored without an archive dependency; the encrypted payload already has high entropy, so compression is not useful for this slice.
- The manifest includes format, version, workspace ID, snapshot timestamps, encryption metadata, payload references, secret policy, attachment counts, and document-body payload counts. It does not include project titles, contact data, document contents, raw attachment bytes, or provider secrets.
- The workspace snapshot remains encrypted with PBKDF2-derived AES-GCM and uses the backup secret redaction policy from ADR 0024 before encryption.
- Legacy `.filmbackup.json` files remain readable by the preview flow.
- ADR 0076 splits native Markdown document bodies into an additional encrypted payload file without replacing the container format.
- ADR 0077 adds encrypted attachment restore-policy payloads without replacing the container format.
