# ADR 0105: Local Operational Record Create Flows

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0108.

## Context

The first app shell already allowed local task and Markdown document creation, but the People, Equipment, and Expenses panels were still mostly read-only. Those records are central to a film production workspace, and the MVP needs them to behave like operational working lists before deeper collaboration and provider integrations exist.

People and expenses can contain sensitive contact or financial data, so browser-to-Worker operation sync must stay metadata-only. Equipment records are less sensitive and can use the existing project membership and record-permission replay guard.

## Decision

Add local create forms for selected-project people, equipment, and expenses. The browser updates the local IndexedDB-backed workspace immediately and queues new operation kinds:

- `person.created`
- `equipment.created`
- `expense.created`

Shared schema helpers normalize bounded display metadata for each row. Person operations include display name, role, and initials only. Expense operations include category plus bounded spend/budget numbers only. Operation payloads do not include contact details, payment details, private notes, provider identifiers, or attachment bytes.

When D1 operation storage is available, the Worker can apply those operations to canonical `people`, `project_people`, `equipment`, and `expenses` tables. Person replay is limited to owner/producer/director sessions. Expense replay is limited to owner/producer sessions. Equipment replay can use the same project-membership, owner metadata, explicit project permission, exact record permission, and department-scope checks used by task and document creates.

## Consequences

- The operational workspace becomes directly usable for core production rows without adding a UI framework.
- Local-first behavior remains intact when the Worker or D1 is unavailable.
- Sensitive person and expense details stay out of operation sync payloads.
- The worker replay surface grows, but remains bounded by allowed kind/entity pairs, idempotent operation logs, create conflict checks, and role/permission guards.
