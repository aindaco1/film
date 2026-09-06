# Demo Portfolio and Trustworthy Summaries

Date: September 5, 2026. Follow-up to the [appearance and UX review](2026-09-05-ux-review.md). Scope: empty-state spacing, varied demo workloads, evidence-based project summaries, and the remaining local verification priorities. The approved neutral palette is unchanged.

## Implemented

- Sides, Shots, Locations, and Talent empty states share a consistent layout: readable heading/copy separation and a 16px gap before the recovery action.
- Projects has one entry to a fictional 12-project demo at `/?demo=portfolio`. The demo has separate local persistence, does not hydrate real account data, and cannot call the Worker. Returning to the normal workspace preserves its data. Appearance remains a shared user preference.
- All six project types and four phases are represented. The portfolio includes a sparse zero-budget project, a development project without a script, an undated schedule, an over-budget documentary, an overnight music video, long titles, issued daily documents, availability conflicts, and a 72-scene/12-day series with 80 open tasks and second-unit days.
- The demo uses real schema factories and the existing local screenplay parser. Crew, scenes, shots, scouting, talent, schedules, estimates, call sheets, and reports share valid references. Names and screenplay text are fictional; no contact details, credentials, or real production exports are included.
- Project lists show type, phase, scheduled dates, ledger spend, and actual task totals. A task completion percentage is not described as overall production completion. Mobile rows retain all metadata and wrap long titles instead of hiding columns.
- Overview uses the latest edited schedule, actual scene/strip/day counts, issued report counts, and a generated call sheet. Its call-sheet link opens that exact record. Entered target shoot dates remain separate in the inspector.
- Call Sheets, Overview, and project packets share split-aware strip counting. Historical summaries select the newest edited call sheet when several share a date, rather than falling back to an older revision.
- Overview lists are capped at five records with counts and canonical drilldowns. Schedule previews are capped at six days. The same renderer owns Tasks, Docs, People, and Equipment summaries; the same projections feed project directories, packets, and expense top sheets.
- New real projects no longer inherit invented budgets, crew, gear, timelines, or a nonexistent spreadsheet. Starter tasks and the empty Markdown document get unique IDs.
- Backup status reports local encrypted export evidence, not a template restore-point timestamp. Stored restore-point metadata is distinguished from actual backup bytes. Automatic backups are reported as not configured.
- Dense demo data exposed keyboard-inaccessible scrollable location/talent usage lists. Those lists are now named, focusable, and laid out without clipped resource names.
- Backup serialization, Notion review/apply, and demo construction load at their domain boundaries. No UI framework or runtime dependency was added.

## Product Alignment

The prior review's template-era summary gap is addressed locally. Production data remains local/private; Notion remains an importer, and Meta remains read-only. The application still needs observed producer/contributor acceptance. Automated regression is evidence of repeatable behavior, not proof that a crew finds every governance workflow intuitive.

The main browser module remains large. This pass extracts a coherent overview renderer and removes optional import/backup work from the initial entry. Further extraction should follow measured runtime and ownership needs, not a generic component framework.

## External Gates

The strict deployment and SMS preflight checks passed using configured values and 16 remote secret names, without retrieving remote secret values or changing provider settings. This verifies configuration shape, not actual provider approval or delivery.

- Google OAuth live configuration is present; this pass did not perform owner consent or Drive acceptance.
- Meta remains disabled pending review and owned-account acceptance.
- Telnyx sender/campaign configuration is present; signed webhook and live-send gates remain disabled. No carrier approval or delivery is inferred from the configuration check.
- Stripe, Pool, and Store remain disabled until real project mappings exist. No Big Sword resources were fabricated.
- No production deployment, message delivery, live OAuth flow, or destructive production restore was performed.

## Real-Team Rehearsal

Use the canonical flow IDs in [USER_FLOWS.md](../USER_FLOWS.md); do not maintain a second regression inventory. Record completion, hesitation, accidental actions, recovery, and whether a participant needed help.

| Session | Representative job | Acceptance evidence to collect |
| --- | --- | --- |
| Solo producer, desktop | Start from The Quiet Room; create a task and doc; import a small Fountain script; correct one element; schedule two days. | PROJECT-01, TASKS-01, DOCS-01, BREAKDOWN-01, SCHEDULE-01 complete without fabricated budget/progress or hidden prerequisites. |
| Production coordinator, phone | Find Pocket Change by type/phase; inspect shoot dates; open Call Sheets; generate a day sheet and review Sides. | NAV-02, CALLSHEET-01, SIDES-01: visible metadata, readable controls, no clipped title, and successful recovery from the empty state. |
| Director and producer | Reorder a dense Juniper day, inspect availability conflicts, update a draft call sheet after source changes, and issue a report. | SCHEDULE-02..05, CALLSHEET-01, REPORTS-01: source drift is explicit; issued snapshots are not silently rewritten. |
| Producer and contributor, separate sessions | In an approved local/staging workspace, edit assigned work, attempt a forbidden change, request review, inspect a diff, and apply an approved change. | TEAM-01..04 and SYNC-01: clear role boundaries, stale-write recovery, auditable results, and no unauthorized write. This cannot be meaningfully rehearsed in the intentionally account-free demo. |
| Producer, recovery | Export an encrypted demo backup, change local records, preview the backup, and review restore conflicts. Rehearse protected apply only in a disposable local/staging workspace. | BACKUP-01..02, RESTORE-01..03: source data remains encrypted; preview and destructive apply are unmistakably different. |
| Keyboard/VoiceOver participant | Navigate Projects, a dense resource list, the create-project dialog, and the inspector. | Visible focus, usable list scrolling, correct field names, modal dismissal/focus return, and understandable announcements. Native VoiceOver acceptance remains unperformed. |

## Local Evidence

- Full build, web typecheck, and 627 script/unit tests passed: 45 script, 222 web, 277 Worker, and 83 shared-package tests.
- The main entry decreased from 609.53 to 567.27 kB minified, and from 121.98 to 110.74 kB gzip. The existing over-500-kB warning remains explicit.
- The final full browser suite passed the isolated portfolio, 384 seed/populated appearance combinations, dense demo coverage, linked production workflows, imports, in-context edits, protected review/recovery UI, and mobile navigation. The demo contributes 102 dense workspace combinations plus project list/board and per-project overview checks. Browser routes for canonical collaboration are mocked here; the real local Worker suite is separate below.
- Compiled offline checks passed for the normal shell, legal pages, saved appearance, and the already-loaded demo portfolio. Query URLs and private API responses are not retained in the shell cache. Unopened optional features are not claimed to work offline before their assets have loaded.
- The real local Worker suite passed canonical hydration/replay, member/session changes, permissions, stale-write protection, encrypted backup handoff, bounded restore proofs, and cleanup. Provider portions stayed dry or explicitly skipped live reads/sends.
- Secret scanning and all 37 SQLite-compatible migrations passed.

Browser screenshots and detailed gate output are generated under ignored `test-results/`. They contain fictional fixtures, not private production data. The demo is intended for varied functional and responsive testing; it is not a server load test or production collaboration simulation.

Representative rendered checks:

- [Desktop project portfolio](../../test-results/ux-audit/demo-1440-dark-list.png)
- [Mobile project portfolio](../../test-results/ux-audit/demo-390-light-list.png)
- [Dense production overview](../../test-results/ux-audit/demo-1440-dark-slate.png)
- [Sides empty-state spacing](../../test-results/ux-audit/demo-1440-dark-sides.png)
