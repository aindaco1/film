# ADR 0229: Local Schedule Budget Estimates

Date: 2026-08-20

## Status

Accepted

## Decision

Add optional browser-local budget scenarios keyed to production schedule versions. Each scenario stores explicit user-entered assumptions for crew day cost, cast day rate, location day rate, equipment day cost, company-move cost, crew headcount, meal cost per person, and contingency basis points. Every assumption defaults to zero and money remains integer cents throughout calculation and persistence.

Keep creation, bounded updates, and estimation in `packages/schema`. The estimator reuses the schedule resource-requirement, day-out-of-days, and scenario-analysis helpers: shoot days come from days with assigned scenes, cast work days come from DOOD, location days come from unique reviewed scene-heading locations per scheduled day, company moves come from adjacent scene-location transitions, and meal person-days combine the entered crew headcount with working cast. The web app renders and persists this shared result rather than reimplementing production calculations.

Treat this output as a transparent planning estimate, not an accounting ledger or compliance engine. Film does not infer rates, union or guild rules, fringes, payroll taxes, overtime, turnaround, penalties, kit rentals, insurance, or local labor requirements. The existing Expenses workspace remains the source for planned and actual ledger entries.

Budget scenarios remain in IndexedDB and encrypted workspace backups. Explicit stripboard export may include the assumptions and calculated line items under `user_requested_schedule_metadata_export`; the export remains metadata-only and omits screenplay source text. No budget scenario or estimate enters Worker requests, D1, provider logs, operation payloads, or model calls.

## Context

Micro-budget non-union productions need a fast way to understand how schedule choices affect broad cost categories before building a detailed budget. The versioned schedule already owns the relevant days, reviewed cast/location requirements, and company-move count. Reusing those contracts keeps cost estimates explainable and prevents a second production graph from drifting.

## Consequences

- A filmmaker can compare rough schedule costs without cloud processing or hidden rate assumptions.
- Every line item can be traced to an entered rate and an observed schedule quantity.
- Schedule estimates and expense-ledger records remain deliberately separate.
- Unsupported labor, tax, and compliance calculations are visible omissions instead of misleading defaults.
- Canonical D1 persistence and collaborative budget editing remain deferred with the rest of the private screenplay/schedule graph.
