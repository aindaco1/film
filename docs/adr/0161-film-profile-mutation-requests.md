# ADR 0161: Film Profile Mutation Requests

## Status

Accepted.

## Context

ADR 0160 added a preflight route for `film_profiles` metadata. The remaining gap was durable review and stale-checked application for runtime, format, shoot-date, and budget updates without overloading the core `record_mutation_requests` table, which is constrained to base project/task/document/person/equipment/expense rows.

## Decision

Add migration `0025_film_profile_mutation_requests.sql` with a dedicated `film_profile_mutation_requests` table.

Add protected owner/producer Worker routes for:

- `POST /api/projects/film-profile/mutations/request-dry-run`
- `POST /api/projects/film-profile/mutations/requests/manifest`
- `POST /api/projects/film-profile/mutations/requests/resolve-dry-run`
- `POST /api/projects/film-profile/mutations/diff-dry-run`
- `POST /api/projects/film-profile/mutations/apply`

Profile request creation stores bounded metadata, normalized allowlisted field keys, and the selected profile row's `expected_updated_at`. Resolution is approval/rejection only and remains non-destructive. Diff preview reads fixed `film_profiles` columns and reports before/after metadata plus stale status.

Apply requires:

- owner/producer auth
- an approved request
- exact `APPLY FILM PROFILE MUTATION <requestId>` confirmation
- allowlisted update fields
- a fresh `film_profiles.updated_at` match

When the request expected no profile row, apply may insert a first profile row for an existing project. Otherwise it updates only the matching profile row. Stale requests are marked `stale_record_blocked` without applying changes.

## Consequences

- Film-profile edits get the same review shape as core mutations while keeping table constraints and parsers separate.
- Budget/runtime metadata can be corrected without opening raw document bodies, contacts, payment identifiers, or provider credentials to mutation requests.
- ADR 0162 exposes this route family in the Team inspector; broader browser-against-Worker smoke coverage remains a separate release gate.
