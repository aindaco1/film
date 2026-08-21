# ADR 0156: Attachment Object Plan Policy Fields

## Status

Accepted.

## Decision

Restore attachment object plans now include explicit policy and proof fields while remaining non-destructive:

- `destinationPolicy = workspace_scoped_deterministic_object_keys`
- `overwritePolicy = blocked_until_explicit_overwrite_rules`
- `byteSourcePolicy = verified_package_manifest_only`
- `sourceVerificationStatus = metadata_hash_verified_without_bytes`

Each planned object also reports candidate destination status, overwrite status, byte-source status, and manifest-hash verification status. The action remains `blocked_destination_write_rules`, `canRestoreBytes` remains false, and no endpoint accepts or writes raw attachment bytes.

## Context

ADR 0086 added object-level attachment restore planning, but the response only exposed a destination key and a generic blocker. Before any destructive byte restore can exist, operators need a clearer contract for which destination rule, overwrite rule, and byte-source proof are missing.

## Consequences

- The Worker can persist richer object-plan JSON without a schema migration because `restore_attachment_object_plans.plan_json` already stores the full plan.
- The browser restore panel can explain why byte restore remains blocked after package verification.
- ADR 0163 adds a durable non-destructive commit preflight for R2/D1 destination absence checks. Future destructive byte restore still needs explicit byte-source submission/streaming, byte-source verification against package bytes at commit time, and destination write authorization before any R2 write path is added.
