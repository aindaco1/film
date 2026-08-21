# ADR 0217: Canonical Notion Core Import

## Status

Accepted

## Context

Film's Notion importer already created a useful local review model and could persist production-planning rows, but imported tasks, documents, people, equipment, and expenses were not canonical D1 records. That left a core MVP migration gap and made a successful browser import appear more durable than it was.

## Decision

Emit bounded normalized core records from `packages/importers` with source provenance and project title. A protected owner/producer-only Worker route accepts at most 200 records for one canonical project, derives stable IDs from workspace/project/kind/provenance, validates project scope, and atomically creates missing rows plus count-only audit evidence.

Exact existing rows are idempotent. Changed existing rows return record kind and changed field names only; imports never update or overwrite canonical rows. Direct Markdown bodies are capped at 64 KiB and stay out of responses, operation metadata, and audit metadata. The browser commits selected-project core rows before planning rows and rehydrates the canonical workspace after a signed D1 commit.

## Consequences

- Notion exports can populate the canonical MVP core without routing trust-sensitive writes through browser-owned operation payloads.
- Retries are deterministic and safe; update review uses existing mutation/restore boundaries.
- A project must already exist canonically, and records related to another project stay local with a warning.
- Attachments, screenplay bytes, and unsupported funding semantics remain outside this route.
