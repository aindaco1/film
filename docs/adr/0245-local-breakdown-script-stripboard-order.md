# ADR 0245: Local Breakdown Script and Stripboard Order

## Status

Accepted.

## Context

Breakdown review naturally starts in screenplay order, while production review often needs to follow the current shooting sequence. Copying scene rows into a schedule-specific breakdown view would create another scene store and make split strips or revision drift capable of hiding source scenes.

## Decision

Film keeps script order as the default and persists only a `script` or `schedule` UI preference. A shared schema projection accepts one breakdown and one schedule. It uses schedule order only when project and breakdown IDs match; otherwise it returns screenplay order.

Schedule order walks each shoot day in stored order, followed by unassigned strips. Scene IDs and split-part source scene IDs enter the same ordered set, so multiple parts expose the source scene once. Any known screenplay scene absent from the schedule is appended in script order. Search filters the chosen projection after ordering.

The segmented control disables Schedule when no matching stripboard exists. The projection mutates and copies neither screenplay nor schedule records and creates no Worker, D1, provider, or model path.

## Consequences

- Breakdown review can follow the active shooting plan without leaving the source workspace.
- Split scenes and stale schedules cannot duplicate or hide source scenes.
- Switching order changes presentation only; scene selection, tags, review state, and exports retain the same identities.
- Day-break labels and per-part rows remain Stripboard concerns; Breakdown intentionally shows each source scene once.
