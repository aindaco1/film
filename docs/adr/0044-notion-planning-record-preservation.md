# ADR 0044: Notion Planning Record Preservation

Date: 2026-07-08

## Status

Accepted

## Decision

Have the Notion importer preserve bounded normalized row metadata for first-class production-planning databases while continuing to keep the current browser workspace model unchanged.

## Context

Film now has D1 tables for locations, opportunities, meeting notes, equipment requests, shows, merch, media, and production roles. The importer recognized those Notion CSV databases but only retained counts. A later Worker-owned D1 import commit path needs actual normalized rows, not just summary counts.

## Consequences

- `AppliedNotionImport` now includes `planningRecords` with record kind, title, source path, the raw project relation hint, split normalized project relation titles, and non-empty CSV fields.
- Planning field keys and values are bounded before they leave the importer helper.
- The queued `import.notion_applied` operation and Worker commit payload include a capped planning-record sample, normalized relation titles, and total/truncation metadata so sync remains under the existing operation payload limit.
- The Worker accepts normalized relation-title arrays while keeping the older single `projectTitle` field as a fallback for compatibility.
- The visible browser workspace still does not pretend to store these planning tables locally.
- Future D1 import commits can use this shape as the conservative input contract.
