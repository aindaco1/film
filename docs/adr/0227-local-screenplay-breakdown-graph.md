# ADR 0227: Local Screenplay Breakdown Graph

Date: 2026-08-20

## Status

Accepted

## Decision

Replace the metadata-only Fountain and Final Draft handoff from ADR 0069 with a deterministic, revisioned screenplay breakdown graph stored in the browser-local workspace. Keep Grainery `.gwx` files metadata-only until that format has a documented parser contract.

The shared graph contains a screenplay revision, ordered scenes, canonical production elements, occurrence-level provenance, and explicit `suggested`, `confirmed`, or `dismissed` review state. Fountain and Final Draft parsers share one materialization path for stable IDs, element deduplication, occurrence limits, and review-state persistence. Fountain scene headings and character cues produce location and cast suggestions. Structured `[[category: value]]` tags cover deterministic production-element markup without a model. Final Draft XML uses a bounded XML parser and rejects DTD and entity declarations.

The browser stores source text and the parsed graph in the existing IndexedDB workspace mirror. Encrypted workspace backups include the graph. Import, review, and export do not call the Worker, upload source text, or invoke a model. A user-requested JSON export is intentionally plaintext and labels that policy in the export envelope.

Do not add canonical D1 screenplay tables yet. Server persistence requires a separate decision covering client-side content encryption, key recovery, authorization, revision conflicts, and backup/restore semantics. Canonical workspace reconciliation preserves the local screenplay collection in the meantime.

## Context

Film is replacing scheduling and budgeting tools for micro-budget non-union productions. Scheduling, day-out-of-days, budgeting, call sheets, and production reports all depend on one stable chain from script revision to scene and production element. A metadata-only document record cannot support that chain.

Local deterministic parsing covers reliable structure without sending confidential scripts to a cloud service. Small local models may later assist with ambiguous tags, synopsis drafting, or duplicate suggestions, but model output must remain optional, reviewable, and outside the canonical parse path. Optional bring-your-own-key cloud inference requires a separate explicit consent and data-boundary decision.

## Consequences

- The Breakdown workspace presents scenes, source excerpts, production elements, review progress, revision selection, and JSON export.
- Re-importing identical content keeps stable graph IDs and preserves occurrence review decisions.
- Source text participates in encrypted workspace backup because it is part of the local workspace contract.
- No screenplay source or parsed content enters operation payloads, Worker requests, D1, provider logs, or model calls.
- The next scheduling slice can consume confirmed scene and element IDs instead of reparsing files or duplicating breakdown logic.
