# ADR 0036: Notion Production Planning Mapping

Date: 2026-07-08

## Status

Accepted

## Decision

Recognize production-planning Notion CSV databases in the importer and report mapped row counts before writing those records into the app model or D1.

## Context

D1 now has tables for locations, opportunities, meeting notes, equipment requests, shows, merch, media, and production roles. The browser workspace model does not yet expose those records, and the importer should not hide that limitation by turning them into generic docs.

## Consequences

- The importer summary now reports mapped counts for the new production-planning categories.
- The UI import summary shows those mapped counts separately from records actually created in the current workspace model.
- Unknown CSV databases still become imported documents with warnings.
- Future D1 import commits can use these categories as routing signals.
