# ADR 0118: Local Planning Review Panel

Date: 2026-07-08

## Status

Accepted

## Decision

Add a read-only Planning panel to the static app shell. The panel derives rows from the bounded `planningRecords` samples already stored in local `import.notion_applied` operation payloads by default, and can explicitly refresh a bounded D1 view through the existing protected planning export dry-run route.

The panel:

- groups rows by first-class production-planning kind,
- shows rows related to the selected project plus rows with no project relation,
- displays bounded titles, project hints, field keys, and source paths,
- marks whether rows came from local import operation samples or a Worker D1 export refresh,
- does not create a new planning persistence model,
- does not bypass the Worker-owned D1 planning commit, backup export, or restore commit paths.

## Context

Film can import, commit, back up, and restore first-class production-planning rows, but the main workspace mostly surfaced those rows through import and restore summaries. Solo filmmakers need a quick operational view of locations, opportunities, meetings, equipment requests, shows, merch, media, and roles without waiting for deeper planning CRUD.

## Consequences

- Planning rows become visible in the workspace after a Notion import while staying metadata-bounded.
- Signed-in users can check the canonical D1 rows from the same Planning panel without granting the browser direct database access.
- Reloaded sessions can reconstruct the review table from persisted local import operation payloads.
- The panel is intentionally not authoritative. D1 planning rows remain owned by the Worker commit/export/restore flows.
- Future CRUD or richer planning views should promote planning rows into an explicit shared schema contract instead of expanding operation-payload parsing indefinitely.
