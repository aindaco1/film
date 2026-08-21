# ADR 0159: Film Profile Stale-Check Timestamps

## Status

Accepted.

## Context

Core record mutation requests use each base table's `updated_at` column for stale-checking before applying approved changes. Film-profile fields such as runtime, format, shoot dates, and budget live in `film_profiles`, not `projects`, so they need their own stale-check surface before cross-table edits can be enabled.

## Decision

Add `created_at` and `updated_at` columns to `film_profiles` through migration `0024_film_profile_timestamps.sql`, and require those columns in the migration validator.

## Consequences

- Future film-profile mutation requests can compare against `film_profiles.updated_at` instead of relying on `projects.updated_at`.
- The existing core-record mutation path remains scoped to base tables.
- This migration does not enable profile edits by itself.
