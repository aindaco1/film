# ADR 0232: Local Production Location Scouting

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local production location records for micro-budget scouting and shoot logistics. A record can link to one active screenplay location element or use a manual name against the selected local breakdown. It stores bounded scouting/hold/confirmed/released state, permit state, address/contact details, parking/access/load-in, power, sound, restroom, accessibility, nearest-hospital, manual weather, safety, general notes, and IDs referencing existing project documents.

Keep record creation, normalization, updates, derived manifests, and call-sheet mapping in `packages/schema`. Derive scene usage from the breakdown occurrence graph, schedule use from existing stripboard versions, and availability from existing resource windows. Do not copy those records into the location store. Do not copy document metadata or bytes; retain document IDs only.

Allow only a confirmed location to populate a draft call sheet. Applying it explicitly snapshots name/address, parking/access, hospital, weather, and safety fields through the existing call-sheet update helper. Final call sheets reject the mutation until reopened. Existing call-sheet source-drift behavior remains unchanged.

Store scouting records in IndexedDB and encrypted workspace backups. Do not send them to the Worker, D1, operation sync, providers, weather services, or models. Explicit local Markdown export includes contact details because it is an operational location handoff; the export states that policy and excludes screenplay source text, raw attachment bytes, provider/private state, and raw import paths. Imported Notion location rows remain a read-only source-review table.

## Context

Micro-budget productions need practical scouting and site-readiness information before issuing a call sheet. Film already owns breakdown locations, stripboards, availability, documents, and call-sheet logistics. A separate schedule, availability table, document store, or live weather dependency would create conflicting sources of truth and weaken local/private defaults.

## Consequences

- One scouting record can bridge script requirements, schedule use, resource availability, documents, and call-sheet logistics without copying those domains.
- Manual candidates remain useful before breakdown review, while linked records gain deterministic scene and schedule context.
- Contact and access details stay encrypted at rest in local backups and appear only in an explicit user-generated handoff.
- Weather is manual in this slice; local model assistance, live weather retrieval, maps, photos, permits/signatures, and collaborative canonical persistence remain separate decisions.
