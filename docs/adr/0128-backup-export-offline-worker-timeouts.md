# ADR 0128: Backup Export Offline Worker Timeouts

Date: 2026-07-08

## Status

Accepted

## Decision

Use short client-side timeouts for optional Worker calls made during browser backup export.

The local backup export flow still:

- asks for a passphrase,
- creates the encrypted ZIP in the browser,
- downloads the ZIP locally,
- then attempts Worker planning-export, R2 backup-object storage, and restore-point metadata handoff when available.

If those optional Worker calls are unavailable, blocked by development CORS, or slow, Film reports the skipped Worker handoff but does not block the local encrypted ZIP download.

## Context

Core user data must be exportable before deep integrations. Browser backup export already has the right trust boundary, but optional Worker calls can hang long enough to make an offline/local backup feel broken. A local encrypted backup should be reliable even when D1/R2 routes are unavailable.

## Consequences

- Local backup export remains usable offline and in mismatched local-origin development sessions.
- Worker planning rows and stored R2 restore-point metadata are best-effort additions during browser export.
- Explicit Worker actions, such as Planning `Refresh D1`, can still use normal client behavior because the user is intentionally asking for Worker-backed data.
