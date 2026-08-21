# ADR 0142: Planning View Export

## Status

Accepted.

## Decision

Add a local Markdown `Export view` action to the dedicated Planning workspace.

The export uses the current production-planning kind filter and the same bounded row view rendered in the workspace. It includes row kind, title, project label, bounded field summaries, and safe source labels, but excludes raw local import source paths.

The export is generated in browser memory and downloaded directly as Markdown. It does not import rows, refresh D1, call the Worker, create D1 rows, update planning records, or expose raw attachment bytes.

## Context

The Notion importer preserves first-class production-planning rows, and the Planning workspace can filter those rows by operational domain. Users need a shareable review artifact for meetings and cleanup without creating another planning database or leaking local filesystem paths from import records.

A local view export gives a portable review artifact while keeping canonical planning writes and D1 refresh behavior behind existing explicit actions.

## Consequences

- Users can export the current Planning view without credentials or network access.
- Raw import source paths stay out of the handoff file.
- Future saved planning views, edits, or live planning dashboards must define durable data contracts, authorization, audit, and backup/restore behavior first.
