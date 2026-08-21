# ADR 0148: Backup ZIP Parser Edge-Case Tests

## Status

Accepted.

## Decision

Cover backup ZIP parser rejection paths by generating a valid encrypted Film backup ZIP in tests and mutating its first central-directory header in memory.

The tests now assert rejection for:

- encrypted ZIP entries
- ZIP64 size sentinels
- malformed central-directory signatures

The fixtures are generated at test time instead of committed as binary archives.

## Context

Film backup ZIPs intentionally use a small stored-entry container: no compression, no encrypted ZIP entries, and no ZIP64 support. The actual sensitive backup payloads are encrypted application payloads inside the ZIP. The parser already rejects unsupported central-directory features, but the automated coverage did not exercise those failure paths.

Central-directory mutation tests keep the coverage close to the parser boundary while avoiding static binary fixtures that are harder to audit.

## Consequences

- Parser hard-fail behavior for unsupported ZIP features is covered.
- Tests remain readable and do not add committed binary fixtures.
- Future support for compressed or ZIP64 backup containers must update both parser behavior and these edge-case tests deliberately.
