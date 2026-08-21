# ADR 0246: Local Cast DOOD Travel and Hold Days

## Status

Accepted.

## Context

A work/off day-out-of-days report omits travel and paid or reserved hold days that affect a micro-budget cast plan. Treating those states as free-form notes would make them difficult to compare, duplicate, reconcile, and export.

## Decision

Store explicit `travel` or `hold` annotations on a versioned production schedule, keyed by active screenplay cast element ID and shoot-day ID. Off is represented by no annotation. Work remains derived from assigned scene requirements and cannot be manually overridden.

The shared schema helper validates the matching breakdown, active cast identity, existing day, unlocked schedule, allowed state, duplicate key, and a 5,000-annotation cap. Schedule duplication remaps annotation day IDs, day removal deletes affected annotations, element merge relinks and deduplicates them, and category moves away from Cast fail while a live annotation exists. Revision carry-forward retains annotations only when both the day and cast identity resolve.

The web DOOD matrix exposes Off, Travel, and Hold controls only for non-work cells. Locked schedules disable them. Analysis returns separate work, travel, hold, and idle totals; idle counts only unannotated off days between first and last work days. Existing encrypted backup and explicit metadata-only stripboard export paths carry the versioned annotations without screenplay source text, Worker requests, D1 writes, provider calls, or model calls.

## Consequences

- Producers can account for cast travel and hold commitments without a second calendar or resource store.
- Work always reflects the stripboard, so manual status cannot conceal a scheduled scene.
- Unresolved cast identities are dropped instead of being guessed across screenplay revisions.
- Historical call-sheet cast snapshots remain unchanged when live breakdown elements merge or move.
