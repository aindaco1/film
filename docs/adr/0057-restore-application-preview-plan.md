# 0057 Restore Application Preview Plan

## Status

Accepted

Updated by ADR 0066, ADR 0067, ADR 0081, ADR 0082, and ADR 0083.

## Context

Film can decrypt browser backups locally and ask the Worker to check a restore confirmation gate, but there is still no durable destructive restore commit path. Before adding one, the product needs an explicit restore application contract that states what would be created or updated and why application remains blocked.

## Decision

`summarizeRestorePreview` now includes a preview-only restore application plan. The plan reports create, update, unchanged, and field-conflict counts; attachment and planning restore policies; whether a pre-restore backup is required; bounded operation samples; and blockers that must be cleared before any destructive commit can exist.

The plan still returns `destructiveWrite: false`, `canApply: false`, and `requiresWorkerCommit: true` because preview itself is non-destructive. Later ADRs add gated Worker commit endpoints for workspace snapshot rows and planning rows; the preview plan remains the contract those commits validate against. Attachment bytes stay blocked pending package verification and destination write rules.

## Consequences

- The browser can show restore application rules without overwriting records.
- Future Worker restore commits have a stable preview contract to validate against.
- ADR 0067 adds bounded operation samples for create, update, skip, and planning preview-only records.
- Attachment byte packaging remains separate work before destructive byte restore can ship.
