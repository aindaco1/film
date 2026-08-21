# ADR 0008: Notion Import Preflight

Date: 2026-07-07

## Status

Accepted

## Decision

Start Notion imports with a Worker-owned manifest preflight before local Markdown/CSV parsing, ZIP entry decompression, and record writes.

## Context

Notion exports can contain Markdown pages, CSV database exports, attachments, nested folders, and unsafe archive paths. The product needs an importer, but content reads and record writes must happen only after path sanitization and size bounds are checked.

## Consequences

- `packages/importers` can summarize Notion export file manifests, plan page/database/asset candidates, and map Markdown/CSV content plus attachment metadata into Film records.
- The app shell uses a directory picker or ZIP central-directory parser to build a file manifest from names, sizes, and content types before reading Markdown/CSV files.
- `/api/imports/notion/dry-run` requires CSRF metadata and accepts at most 2,000 manifest entries.
- Unsafe paths and oversized files are ignored and reported before content is parsed.
- ZIP support must reuse these sanitization rules before producing import records.
