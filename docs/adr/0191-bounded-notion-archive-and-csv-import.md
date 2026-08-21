# ADR 0191: Bounded Notion Archive and CSV Import

Date: 2026-07-09

## Status

Accepted

## Decision

Treat every stage of a Notion import as a bounded, integrity-checked pipeline.

- The browser ZIP reader accepts only single-disk, non-ZIP64, unencrypted stored or deflated archives. It validates UTF-8 paths, exact EOCD and central-directory bounds, central/local path, flag, and compression agreement, normalized duplicate paths, entry data bounds, declared output size, CRC-32, and sequential rather than concurrent inflation.
- Browser ZIP limits are 250 MiB per archive, 5,000 entries, 512 MiB aggregate declared uncompressed data, 25 MiB per entry, and a 200:1 compression ratio with a 1 MiB small-entry allowance.
- Worker metadata preflight requires a declared non-negative size for every entry and rejects more than 2,000 files, more than 512 MiB aggregate declared data, paths over 1,024 characters, or content types over 255 characters.
- After Worker preflight, folder and ZIP readers read only returned candidate paths and process text sequentially. The shared importer applies only candidates returned by its bounded plan. When the 50-candidate default cap is reached, project databases are selected before other CSV, Markdown, and asset candidates so related records retain a valid project target.
- CSV parsing is bounded to 5,000,000 characters, 2,000 data rows, 100 columns, and 8,192 characters per cell. Incomplete quoted rows are discarded, control characters are removed, and empty or duplicate headers are ignored with the first named column retained.
- Notion HTML remains unsupported and is never parsed or imported.

## Context

Metadata-only preflight and per-file size checks did not by themselves prevent a crafted ZIP from declaring inconsistent central/local metadata, expanding beyond its declaration, duplicating paths, or consuming memory through concurrent decompression. The import plan also showed at most 50 candidates while application still processed every supplied file, and CSV parsing retained an unbounded row matrix.

## Consequences

- Preview and application now share the same candidate boundary.
- Corrupt or decompression-heavy ZIPs fail before records or attachment blobs are created.
- Large and malformed CSVs produce bounded warnings instead of unbounded browser work.
- Very large valid exports must be split or imported in deliberate batches.
- Rich HTML import would require a separate sanitizer and target-data decision.
