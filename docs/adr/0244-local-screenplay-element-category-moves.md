# ADR 0244: Local Screenplay Element Category Moves

## Status

Accepted.

## Context

Deterministic parsing and manual tags can classify the right production element under the wrong department. Deleting the element and re-tagging every scene would discard reviewed occurrence identity and can split downstream production planning. Category changes also cannot silently invalidate cast/location availability, talent, or scouting links.

## Decision

Film exposes an explicit destination-category form on each active Element List row. The shared workspace helper changes the existing element category without changing its ID or occurrences. The UI follows the element into the destination filter after success.

When the destination already contains an active element with the same normalized name, the option discloses that it will combine with the existing item. The transaction temporarily recategorizes the source and delegates to the canonical merge helper from ADR 0243, preserving its occurrence deduplication and reference rules rather than implementing a second merge path.

Before either path, Film checks live references. Availability requires a destination matching its cast/location resource category, location records require `location`, and talent records require `cast`. An incompatible move fails without mutation. Generated call-sheet cast calls are historical snapshots and remain unchanged.

The transaction is browser-local, persists through the existing IndexedDB/encrypted-backup path, and creates no Worker operation, D1 write, provider request, or model call.

## Consequences

- A department correction preserves reviewed scene work and stable graph identity.
- Exact destination collisions cannot create a second same-name item.
- Live resource semantics fail closed instead of becoming dangling or misleading.
- Resolving an incompatible live link requires a separate explicit resource-management workflow; the category move does not delete availability, scouting, or talent data.
