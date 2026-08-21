# ADR 0024: Backup Secret Redaction

Date: 2026-07-08

## Status

Accepted

## Decision

Backup snapshots must recursively remove provider-token-shaped fields before encryption, even when those fields are not part of the current typed workspace schema.

## Context

Provider integrations are dry-run today, but future OAuth and API integrations will introduce sensitive token-shaped values. TypeScript prevents those fields in normal code paths, but imported data, migration experiments, or provider adapter mistakes could still attach extra runtime properties to workspace records before backup export.

## Consequences

- `createBackupSnapshot` sanitizes a cloned workspace tree instead of storing the input object by reference.
- Common secret containers such as `providerSecrets` and `credentials` are removed.
- Common token/key fields such as access tokens, refresh tokens, API keys, private keys, webhook secrets, signing secrets, passwords, authorization headers, and bearer values are removed.
- Known live-token-looking string values are redacted even when they appear under an unexpected key.
- Policy metadata such as `secretPolicy` and provider `secretsPolicy` remains allowed.
- This is a defense-in-depth guard, not a replacement for Worker-owned OAuth token storage and provider adapter reviews.
