# ADR 0243: Local Screenplay Element Duplicate Merge

## Status

Accepted.

## Context

Manual and parsed breakdown work can produce near-identical element names that split scene counts and planning references. Automatically collapsing names is unsafe: similar names may represent distinct characters, places, props, or units, and any model or provider path would weaken the screenplay's private-by-default boundary.

## Decision

Film derives duplicate candidates locally from active elements in one selected category. The shared schema helper compares at most 300 deterministically sorted names and returns at most 100 normalized-match, contained-name, shared-term, or similar-spelling candidates. The result contains names, IDs, counts, scores, and reasons only; it contains no screenplay source text or occurrence excerpts.

Film never auto-merges. The Breakdown Element List requires the user to open a candidate and choose the canonical element. One shared workspace transaction then:

- removes the unkept element;
- reassigns its distinct occurrences to the kept element;
- collapses exact scene/line collisions while aggregating review state;
- relinks live availability, location, and talent references;
- removes exact duplicate availability windows created by the relink; and
- leaves generated call-sheet cast-call IDs and names unchanged as issued-document snapshots.

The transaction updates only local workspace data and enters the existing IndexedDB and encrypted-backup paths. It creates no Worker operation, D1 row, provider request, or model call.

## Consequences

- Departments can repair split counts and planning links without re-tagging scenes.
- Similar names remain distinct until a human chooses the canonical identity.
- Detection and mutation semantics are reusable and testable outside the browser renderer.
- Name-only matching will miss semantic aliases and may surface false positives; optional local-model assistance remains a future, separately consented decision.
