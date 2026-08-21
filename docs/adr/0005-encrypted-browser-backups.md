# ADR 0005: Encrypted Browser Backups

Date: 2026-07-07

## Status

Accepted

## Decision

Export browser backups using passphrase-derived AES-GCM encryption. ADR 0022 upgrades the active export container from legacy `.filmbackup.json` to `.filmbackup.zip`.

## Context

Film stores sensitive production-shaped data locally. Raw JSON backups are useful for early development but not acceptable as the default backup path for an app that will handle private contacts, releases, contracts, attendee lists, and production documents.

## Consequences

- The user must provide a passphrase of at least 12 characters before export.
- The passphrase is not stored and cannot be recovered.
- Legacy `.filmbackup.json` bundles encrypt the workspace snapshot as one payload and remain readable for previews.
- Current exports use the ZIP-container format described in ADR 0022.
