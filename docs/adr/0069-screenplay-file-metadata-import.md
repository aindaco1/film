# ADR 0069: Screenplay File Metadata Import

Date: 2026-07-08

## Status

Superseded by ADR 0227

## Decision

Add a local metadata-only screenplay file import for `.fountain`, `.fdx`, and `.gwx` files.

The importer preflights selected files with the same safe-path and size-bound posture as other local imports. Accepted files become asset document records on the selected project with source path, size, content type, and `metadata_only` attachment status. Film does not parse screenplay contents, upload bytes, or treat screenplay tooling as canonical in this slice.

## Context

The product plan names Grainery as the better screenplay-tooling integration target than rebuilding screenplay editing inside Film. Film still needs to track screenplay files in project docs and backups. A metadata-only import gives the workspace a linkable record without taking ownership of screenplay parsing, collaboration, or file storage.

## Consequences

- The app exposes `Import screenplay` in the Imports panel.
- Supported files create local document records and `document.created` operations.
- Raw screenplay bytes stay on the user's machine unless a later explicit attachment-storage flow is used.
- Future Grainery work can add file launch/export handoff, `.gwx` metadata reading, and safer attachment packaging after restore/export policies mature.
