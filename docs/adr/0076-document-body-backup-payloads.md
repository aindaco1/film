# ADR 0076: Document Body Backup Payloads

Date: 2026-07-08

## Status

Accepted

## Decision

Split native Markdown document body snapshots out of the encrypted workspace snapshot and into a separate encrypted ZIP payload at `payload/document-bodies.enc`.

## Context

Film's ZIP backup container was designed to grow beyond one opaque encrypted workspace JSON file. Native documents are canonical app data, and imported Notion Markdown pages already store local `markdownSnapshot` content. Keeping document bodies addressable as their own encrypted payload makes future document restore, Google Docs sync, and body-specific validation easier without exposing document text in the plaintext manifest.

## Consequences

- New `.filmbackup.zip` exports remove `markdownSnapshot` values from the encrypted workspace snapshot payload and store them in an encrypted `film.document-bodies` payload.
- The plaintext manifest records only the document-body payload path and count. It does not include document names, document text, project titles, or body snippets.
- ZIP decrypt rehydrates document bodies into the returned `BackupSnapshot`, so existing restore preview code keeps working.
- Legacy `.filmbackup.json` bundles and older ZIP backups without a document-body payload remain readable.
- Malformed document-body payloads are rejected when they do not match the workspace snapshot, exceed bounded counts/sizes, or reference unknown documents.
