# ADR 0139: Operational Handoff Exports

## Status

Accepted.

## Decision

Add local Markdown handoff exports to the selected-project People and Equipment workspaces.

People exports a crew directory from existing project person metadata. The crew directory excludes email addresses and phone numbers because those fields are not part of the current local person model and should not be inferred from provider/import data.

Equipment exports a gear pull from existing project equipment metadata and status fields.

Both exports are generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown. They exclude provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. They do not queue operations, create D1 rows, call providers, or update canonical project data.

## Context

Solo filmmakers and small crews need quick handoff artifacts for crew coordination and gear checks. Film already has local people and equipment records, and the first MVP should make those records portable before deeper collaboration and provider integrations.

Local Markdown exports provide useful artifacts without committing to live email delivery, contact storage, inventory sync, or external document generation.

## Consequences

- Users get crew and gear handoff files without credentials or network dependencies.
- The People and Equipment workspaces remain local-first and reuse existing queued create flows.
- Future contact fields, vendor inventory sync, email delivery, or branded PDFs must add explicit Worker-owned authorization, audit, redaction, backup/restore, and provider contracts before live behavior is enabled.
