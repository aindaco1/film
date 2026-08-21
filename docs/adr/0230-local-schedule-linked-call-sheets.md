# ADR 0230: Local Schedule-Linked Call Sheets

Date: 2026-08-20

## Status

Accepted

## Decision

Generate production call sheets as browser-local records from a selected production schedule day. A generated record references the project, screenplay breakdown, schedule version, and shoot day; snapshots the ordered scene IDs, day ordinal, total shoot days, and source schedule update timestamp; and derives a cast-call snapshot from reviewed cast occurrences in those scenes.

Keep generation, bounded detail edits, cast-call edits, draft/final transitions, and manifest construction in `packages/schema`. Editable fields are title, date, general call, estimated wrap, primary location, parking/access, nearest hospital, weather notes, general notes, safety notes, and per-cast call/notes. Final sheets reject edits until explicitly reopened.

Do not copy project crew, equipment, or document rows into the call sheet. The workspace and export read those existing collections directly. Do not automatically update a generated sheet after its source schedule changes; report source drift and preserve the issued snapshot.

Store call sheets in IndexedDB and encrypted workspace backups. Explicit Markdown export includes bounded scene metadata, cast calls, logistics/safety notes, and existing project crew/gear/document metadata. It omits screenplay source text, contact fields, provider credentials, OAuth values, raw attachment bytes, private Worker state, and raw import paths. No call-sheet state enters Worker requests, D1, operation payloads, provider logs, or model calls.

## Context

Micro-budget productions need an editable daily handoff derived from the schedule, but a call sheet is an issued operational artifact rather than a live stripboard view. Snapshotting stable IDs prevents later schedule experiments from silently altering a finalized day's instructions. Reusing project collections avoids drift in crew, gear, and attachment lists.

## Consequences

- Assigned schedule days can become usable call sheets without cloud processing.
- Final/reopen state makes issuance intentional without pretending to provide signatures or distribution proof.
- Source changes are visible and do not mutate the snapshot.
- Cast requirements come from the same reviewed screenplay occurrence graph as schedule DOOD and availability analysis.
- PDF rendering, live weather, email/SMS distribution, acknowledgments, and canonical collaboration remain separate future decisions.
