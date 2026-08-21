# 0056 Dust Wave Workspace Fixture

## Status

Accepted

## Context

The importer tests already use Dust Wave-shaped relation-list CSV data. Future smoke tests need a reusable workspace that exercises relation-heavy projects, stored attachment metadata, backup manifests, roles, expenses, and operational records without mutating the default app seed.

## Decision

Export `dustWaveWorkspace` from `packages/schema` as a deterministic fixture. It is not the app default. The fixture includes a Dust Wave feature project, an operations project, relation-oriented tasks/docs/people/equipment/expenses, hashed members only, and one stored-R2 attachment metadata row. The backup package round-trips this fixture through encrypted ZIP creation, manifest reading, decryption, and non-destructive restore preview smoke coverage.

## Consequences

- Tests and future smoke flows can opt into richer production-shaped data.
- Backup restore-preview coverage now exercises a relation-heavy workspace with stored-R2 attachment metadata.
- The default Film app seed remains stable for the current UI.
- Fixture data remains metadata-only for stored attachments; no raw provider secrets, emails, or backup/attachment bytes are included.
