# UI Surface Ownership

Film gives each user job one canonical interactive surface. Overview may summarize data owned elsewhere, but it does not repeat the corresponding create, edit, import, refresh, or recovery controls.

## Rules

1. A user command has one visible owner. Do not render a second button, form, or detached selector for the same job.
2. Summary surfaces are read-only. They may link to the canonical workspace or selected record.
3. Routine fields are edited on the visible row or record. Governance review remains in the inspector because it is a different, trust-sensitive job.
4. Sidebar buttons and the mobile workspace picker are one responsive navigation system. They may share destinations because they are not visible at the same viewport size.
5. A prerequisite recovery link is allowed in an empty state, such as opening Breakdown when Schedule has no screenplay. It must not repeat the destination's primary command.
6. Repeated row controls use one action contract and shared renderer. Repetition across records is not a second surface.

## Workspace Owners

| Workspace | Canonical responsibility | Summary or derived exceptions |
| --- | --- | --- |
| Overview | Selected-project phase, timeline, operational summaries, upcoming call sheet, and planning coverage | Links to detailed workspaces; no create or edit forms |
| Projects | Project search, board/list selection, creation, and directory export | None |
| Breakdown | Screenplay import, revision review, scenes, elements, and breakdown exports | Schedule order is a projection of Schedule data |
| Schedule | Stripboard versions, shoot days, availability, DOOD, scenarios, and schedule estimate | Project packet export reuses existing project metadata |
| Shots | Scene-linked shot creation, editing, ordering, and exports | Scene and schedule use are derived |
| Call Sheets | Draft generation, editing, synchronization, issuing, and export | Crew, gear, and documents remain references |
| Sides | Pinned call-sheet source review and explicit local exports | Empty-state link to Call Sheets only |
| Reports | Daily report creation, editing, issuing, and exports | Planned scenes derive from Call Sheets |
| Locations | Scouting records, logistics, call-sheet application, and export | Imported planning locations remain source review |
| Talent | Casting records, readiness, call-sheet application, and export | Cast and schedule use are derived |
| Planning | Imported planning review, kind filtering, D1 refresh, and export | Overview shows count-only coverage |
| Tasks | Task creation, inline status/due editing, completion, and export | Overview shows a bounded read-only task summary |
| Docs | Document creation, selection, body editing, and export | Overview links to bounded recent-document references |
| People | Crew-record creation, inline editing, and export | Team membership is a separate access-control job |
| Equipment | Gear creation, inline editing, and export | Overview shows a bounded read-only gear summary |
| Expenses | Ledger creation, inline editing, top sheet, and export | Schedule estimates remain scenario data, not ledger entries |
| Backups | Backup creation, stored manifests, encrypted preview, restore gates, apply flows, and recovery status | Topbar shows passive latest-backup status only |

## Inspector Owners

| View | Canonical responsibility |
| --- | --- |
| Overview | Selected project profile fields and description |
| Team | Workspace membership, project assignments, invites, and roster export |
| Ownership | Record ownership review and transfer |
| Change requests | Protected mutation request, review, apply, audit, and rollback planning |
| Permissions | Scoped project, task, and document grants and history |
| Integrations | Provider capability, connection, readiness, and dry-run controls |
| Imports | Notion import and attachment storage/export workflows |

Backups are intentionally absent from the inspector. Screenplay import is intentionally absent from Imports because Breakdown owns that domain workflow.

## Allowed Repetition

- `contextual-record-update`, reorder, merge, and selector controls repeat across visible rows but share one handler and one domain surface.
- Overview drilldowns to Tasks, Docs, People, Equipment, Expenses, Call Sheets, and Planning are navigation, not duplicate commands.
- Schedule and Sides may show a prerequisite recovery link when their required source does not exist.

## Regression Contract

`apps/web/test/ui-surface-ownership.test.ts` inventories static rendered commands and fails when a singleton action gains a second UI owner. It also protects Overview/Projects separation, central backup recovery, the bounded drilldown allowlist, and the absence of duplicated schedule summaries. Browser smoke covers every workspace on desktop and mobile and verifies command behavior, accessibility, and document overflow.
