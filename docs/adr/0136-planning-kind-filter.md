# ADR 0136: Planning Kind Filter

## Status

Accepted.

## Decision

Add a production-planning kind filter to the dedicated Planning workspace.

The filter is stored with browser UI preferences and can show all planning rows or one of the supported production-planning kinds: locations, opportunities, meeting notes, equipment requests, shows, merch, media, or roles. It filters the bounded read-only Planning table only.

The filter does not import rows, write D1 rows, update local planning records, or call the Worker.

## Context

The Notion importer can preserve several first-class production-planning row types. A single combined table is useful for auditability, but it is hard to scan once imports contain more than a few rows. A local view filter lets users inspect the imported cache by operational domain without changing the underlying import, backup, or restore contracts.

## Consequences

- Planning review remains one bounded read-only surface while becoming easier to scan.
- The filter state is a UI preference, not user data or sync metadata.
- Future saved views, edits, or canonical planning dashboards must add explicit data contracts and Worker-owned write/audit rules before they become durable collaboration features.
