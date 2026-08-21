# ADR 0130: Expanded Core Mutation Metadata Fields

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0117 added a guarded mutation request, approval, diff, and apply path for core records. The first allowlist covered the minimum operational fields, but common production review work also needs to correct bounded metadata such as project type, document links, sensitivity flags, and short operational notes.

## Decision

Expand `packages/schema` record mutation field definitions for fixed base-table metadata:

- projects: `projectType`
- documents: `externalUrl`
- people: `sensitive`
- equipment: `notes`
- expenses: `comment`

The Worker maps each field to a fixed D1 column, reuses the existing stale `updated_at` gate, and keeps values bounded. Document external URLs must be http(s) URLs without embedded credentials.

Contact details, payment identifiers, raw document bodies, provider credentials, and cross-table `film_profiles` edits remain outside this path.

## Consequences

- Owner/producers can approve a wider set of practical metadata fixes without bypassing the mutation review flow.
- The browser renders the extra fields from the shared contract; local reconciliation updates only fields represented in the current static workspace model.
- Film-profile fields such as runtime, format, shoot dates, and budgets still need a separate design because they live outside the base core-record table used by this stale-check path.
