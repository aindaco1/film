# ADR 0010: Native Document Drafts

Date: 2026-07-07

## Status

Accepted

## Decision

Represent native app documents as first-class project records before adding a rich editor or Google Docs sync.

## Context

Film's product direction says native folders/docs are canonical and Google Drive/Docs is optional import/export/sync. The MVP needs document records and backup coverage before it needs a full editor.

## Consequences

- `ProjectDoc` records now have stable IDs.
- The app shell can create Markdown draft document records locally.
- Document creation writes a queued `document.created` operation for future Worker replay.
- Rich editing, document body storage, Google sync, and per-document restore remain later slices.
