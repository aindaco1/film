# ADR 0135: Locations Workspace Section

## Status

Accepted.

## Decision

Add a dedicated selected-project Locations workspace section to the static app shell.

The Locations workspace renders:

- the active call-sheet location from the selected project
- call, wrap, scene, page, people, and weather metadata for that location
- bounded imported Notion planning rows with kind `location` from the existing local planning review cache

The imported-location table shows bounded field keys and source labels, but not raw import source paths.

## Context

Locations are central to production operations, but Film already has two sources that can support a first useful view: selected-project call-sheet metadata and Notion planning rows imported into the local review cache. Creating another canonical location store now would duplicate the first-class planning tables and force premature decisions about maps, releases, permits, contacts, and sync semantics.

## Consequences

- Users can inspect active and imported location context without leaving the project workspace.
- The slice remains static-first and credential-free.
- Future location editing, maps, permits, releases, or live provider enrichment must use Worker-owned contracts, authorization, audit, and backup/restore rules before becoming canonical writes.
