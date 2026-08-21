# ADR 0063: Protected Attachment Object Ranges

Date: 2026-07-08

## Status

Accepted

## Decision

Support bounded single-range downloads for protected stored R2 attachment objects.

`GET /api/attachments/r2/object` accepts standard single `Range` headers after owner/producer authorization, CSRF/session checks, workspace scope checks, D1 object-key ownership validation, and R2 binding availability checks. The Worker rejects multi-range, malformed, unsatisfiable, or over-cap ranges with `416` and serves valid ranges as `206 Partial Content` with `Content-Range` and `Accept-Ranges`.

## Context

Attachment objects can become large enough that future previews or resumable downloads should not require a full object read. The object route already validates D1 ownership before reading R2, so range support belongs inside that protected route rather than exposing R2 keys or signed URLs.

## Consequences

- Range responses are capped at 5 MB per request.
- Full-object downloads remain available for stored attachments up to the existing upload limit.
- `x-film-sha256` continues to refer to the full stored object hash; clients must not treat it as a partial-body hash.
- Package ZIP downloads do not support byte ranges yet.
