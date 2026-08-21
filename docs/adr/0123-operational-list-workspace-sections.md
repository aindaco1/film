# ADR 0123: Operational List Workspace Sections

Date: 2026-07-08

## Status

Accepted

## Decision

Promote People, Equipment, and Expenses from static sidebar labels into selected-project workspace sections.

The sections:

- render larger selected-project tables for people, equipment, and budget lines,
- reuse the existing local create forms and operation payloads,
- keep people and expense records marked as sensitive where the existing operation flow already does so,
- do not add live provider sync, destructive edits, or new Worker mutation routes.

## Context

People, gear, and expenses are central operational records for solo filmmakers and small teams. The Slate dashboard already had compact panels and local create flows, but the sidebar labels were inert. Promoting the sections makes those records easier to use while keeping the current local-first and Worker-replay boundaries intact.

## Consequences

- The sidebar now has real destinations for the main local operational records.
- Create behavior remains unchanged and continues to queue IndexedDB operations.
- Future edit/delete/assignment behavior should extend shared schemas, authorization, and Worker replay rules before becoming authoritative.
