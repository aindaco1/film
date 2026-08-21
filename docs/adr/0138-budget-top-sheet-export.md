# ADR 0138: Budget Top Sheet Export

## Status

Accepted.

## Decision

Enhance the selected-project Expenses workspace with a read-only Budget Top Sheet.

The top sheet summarizes total budget, spent amount, remaining budget, used percentage, line budget, line spend, largest line, and near/over-budget line counts from existing project and expense metadata.

Add a local Markdown `Export budget` action. The export is generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown.

The budget top sheet explicitly excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call Stripe or other providers, update canonical expense data, or become a replacement accounting ledger.

## Context

Film needs useful production finance visibility before live Stripe, Pool, Store, or accounting integrations. The app already has project budget totals and expense lines, so a static top sheet gives filmmakers a practical production artifact without weakening the existing provider boundary.

A local Markdown export is sufficient for this slice and keeps financial provider reads behind the existing Worker-owned dry-run/readiness gates.

## Consequences

- Users get a quick selected-project budget handoff artifact without credentials or network dependencies.
- The Expenses workspace becomes easier to scan while preserving the existing local create and queued operation flow.
- Future live finance summaries, accounting exports, or Stripe/Pool/Store reconciliation must use Worker-owned authorization, audit, redaction, and provider adapter contracts before becoming live behavior.
