# ADR 0160: Film Profile Mutation Preflight

## Status

Accepted.

## Context

Core record mutations use base-table `updated_at` values for stale checks. Film-profile metadata such as runtime, format, shoot dates, and budgets lives in `film_profiles`, so it needs a separate preflight surface before request/diff/apply routes can safely edit those fields.

## Decision

Add `POST /api/projects/film-profile/mutation-preflight` as an owner/producer protected Worker route.

The route validates workspace and project scope, accepts optional allowlisted profile field keys, reads the selected project's `film_profiles.updated_at` value when D1 is available, and returns:

- `destructiveWrite: false`
- `profileMutationPolicy: "film_profile_stale_check_preflight"`
- the normalized field keys and shared-schema field definitions
- a bounded profile snapshot with `expectedUpdatedAt`

The field contract lives in `packages/schema` and covers runtime minutes, format, shoot start/end, budget cents, and spent cents. Without D1, the route can return seed-project dry-run profile metadata for local development. If D1 is unavailable at read time, the route reports `d1_unavailable_dry_run` only when it can safely fall back to seed data.

## Consequences

- Browser and future UI work can discover profile-edit fields without reusing the base project mutation allowlist.
- Future film-profile request/diff/apply routes can require a fresh `film_profiles.updated_at` match.
- No film-profile edits are applied by this ADR.
- Cross-table profile edits remain separate from the core record mutation request/apply pipeline until their own approval and stale-write checks are implemented.
