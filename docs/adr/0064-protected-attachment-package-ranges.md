# ADR 0064: Protected Attachment Package Ranges

Date: 2026-07-08

## Status

Accepted

## Decision

Support bounded single-range responses for protected stored attachment package ZIP downloads.

`POST /api/attachments/r2/package` still requires owner/producer authorization, CSRF/session checks, workspace scope, D1 object validation, R2 byte validation, a matching unexpired package plan token, and the 25 MB source-byte cap before it creates the package ZIP. After the package bytes are built and hashed, the Worker can honor a single standard `Range` header and return `206 Partial Content` with `Content-Range` and `Accept-Ranges`.

## Context

Package downloads can be larger than individual attachment previews. Supporting single-range responses gives clients a resumable-download path without exposing R2 keys, signed URLs, or arbitrary bucket access.

## Consequences

- Package ZIP range responses are capped at 5 MB per request.
- Multi-range, malformed, unsatisfiable, or over-cap ranges return `416`.
- `x-film-package-sha256` continues to refer to the full package ZIP, not the partial body.
- The Worker still builds and validates the full ZIP before returning a partial response; streaming ZIP assembly can be revisited later if package sizes grow.
