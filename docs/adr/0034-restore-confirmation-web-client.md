# ADR 0034: Restore Confirmation Web Client

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0059.

## Decision

Add a typed web client and visible non-destructive UI action for the Worker restore commit dry-run confirmation gate without wiring it to a destructive restore UI.

## Context

The Worker now owns a restore confirmation gate that requires owner/producer authorization, exact confirmation, and bounded preview counts. The app needs a typed client contract and visible gate check before future UI work can ask a user to perform a destructive restore commit.

## Consequences

- `apps/web/src/restore-client.ts` posts to `POST /api/restores/commit-dry-run` with credentials and CSRF metadata.
- The client sends workspace IDs, backup timestamp, optional stored R2 pre-restore backup proof, exact confirmation phrase, and restore preview counts.
- The Backup inspector shows `Check restore gate` after a restore preview exists, prompts for `RESTORE <workspaceId>`, and reports the Worker commit status plus pre-restore backup proof state.
- Worker-provided expected confirmation phrases are surfaced as thrown errors for UI prompts.
- The current Restore button remains a non-destructive local dry-run. No records are overwritten.
