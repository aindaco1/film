# ADR 0231: Local Daily Production Reports

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local daily production reports derived one-to-one from generated call sheets. A report snapshots the call-sheet/project/schedule/breakdown identities, planned scene IDs, date, day ordinal, primary location, cast count, crew count, and source call-sheet update timestamp.

Keep creation, bounded detail updates, per-scene planned/completed/partial/held transitions, draft/final transitions, and summary calculations in `packages/schema`. Actual detail fields cover crew call, first shot, meal start/end, camera wrap, crew wrap, crew/cast/background/meal/setup/take/recorded-minute counts, actual weather, delays, production notes, safety/incident notes, and next-day/pickup notes. Summary calculations report exact scene counts and completion percentage plus overnight-safe gross, meal, and working minutes. They do not infer overtime, union compliance, or payroll obligations.

Do not copy actual spending into production reports. Expenses remain the planned/actual ledger. Do not automatically rewrite a report after its source call sheet changes; show source drift and preserve the report snapshot.

Store reports in IndexedDB and encrypted workspace backups. Explicit local exports provide a human-readable Markdown daily report and a UTF-8 CSV scene-status table with stable columns. Every CSV cell is quoted and formula-leading values are prefixed before export. Both formats omit screenplay source text, contact fields, provider credentials, OAuth values, raw attachment bytes, private Worker state, and raw import paths. No report state enters Worker requests, D1, operation payloads, provider logs, or model calls.

## Context

Micro-budget productions need a lightweight end-of-day record that connects what was planned to what was completed. The generated call sheet already owns the stable scene snapshot, so it is the correct source boundary. Local deterministic summaries preserve privacy and remain usable offline.

## Consequences

- Each generated call sheet can produce one traceable daily report.
- Overnight timing math is explicit, while labor and overtime compliance remain intentionally unsupported.
- Final/reopen state makes report handoff intentional without claiming signatures or delivery proof.
- Markdown supports human review and formula-safe CSV supports spreadsheet handoff.
- PDF rendering, signatures, live distribution, and canonical collaborative reports remain separate future decisions.
