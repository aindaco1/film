# ADR 0186: Operation Replay Unavailable Keeps Local Queue

## Status

Accepted.

## Decision

If D1 is bound and canonical operation replay returns `d1_unavailable_dry_run`, the sync route returns `503 operation_replay_unavailable`, an empty accepted list, and bounded ID/reason rejections. It does not record an accepted sync result.

The browser already marks operations synced only after a successful response with accepted IDs, so those operations remain queued for retry.

## Context

The replay helper previously returned every validated operation as accepted after a D1 exception even though no operation-log or canonical write completed. A browser could then mark its only local copy synced, creating a data-loss window.

## Consequences

- D1 failures cannot acknowledge operations that were not durably replayed.
- Local-first operations remain retryable after transient Worker storage errors.
- The response contains operation IDs and a fixed reason only, not operation payloads.
- Intentional no-D1 development continues to use validation-only dry-run acceptance.
