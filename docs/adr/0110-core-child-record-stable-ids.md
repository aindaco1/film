# ADR 0110: Core Child Record Stable IDs

Date: 2026-07-08

## Status

Accepted.

## Context

The D1 core tables for people, equipment, and expenses already use stable `id` primary keys, and ADR 0109 made owner review/transfer available for every core owner-bearing table. The browser workspace model still treated people, equipment, and expenses as display-only rows keyed by natural names or categories. That was workable for local panels, but it made owner transfer, restore review, and operation replay target different identifiers depending on whether the row came from the browser or D1.

## Decision

Add stable `id` fields to the shared `ProjectPerson`, `EquipmentItem`, and `ExpenseLine` contracts. Local factories, seed fixtures, Notion import mapping, local create flows, restore snapshot records, and backup restore matching now preserve or generate those IDs.

The Team inspector owner control uses explicit entity-type and record selectors for projects, tasks, documents, people, equipment, and expenses. Protected Worker owner routes still validate the selected fixed table and row ID before returning or updating owner metadata.

Older backup payloads that lack child IDs continue to fall back to the previous project/natural-key restore identifier.

## Consequences

- Browser-created people, equipment, and expense rows now target the same D1-shaped core row IDs used by owner manifests, owner transfers, and replay.
- Restore previews can match child rows by ID before falling back to display-name/category matching.
- This does not add contact details, payment details, or provider data to operation sync or backup manifests.
- Ownership history, approval workflows, reviewer/comment semantics, and update/delete authorization remain future work.
