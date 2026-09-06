# Film Architecture

Film is a static-first TypeScript/DOM app with Worker-owned trust boundaries. This document owns implementation structure, not release status. See [Project Status](PROJECT_STATUS.md), [Security](SECURITY.md), and the [decision index](adr/README.md).

## Repository Map

| Area | Responsibility |
| --- | --- |
| `apps/web` | Static PWA, IndexedDB workspace and attachment blobs, views/controllers, local exports |
| `apps/worker` | Sessions, authorization, canonical reads/writes, providers, R2 handoffs, recovery and audit |
| `packages/schema` | Shared records, validation, deterministic production graph operations and projections |
| `packages/importers` | Bounded Notion/Fountain/Final Draft parsing and normalization |
| `packages/backup` | Encrypted backup formats, previews and restore planning |
| `packages/providers` | Provider capability/scope/program contracts shared by browser and Worker |
| `migrations` | SQLite-compatible D1 schema; applied migrations are not cleanup candidates |
| `scripts` | Development, build budgets, regression runners and gated operator tools |
| `.github/workflows/ci.yml` | Secret-free builds, regression, real-D1 proofs and retained static artifacts |

## Data Ownership

| Data | Canonical owner and transfer boundary |
| --- | --- |
| Screenplay revisions, breakdown, schedules, availability, scenarios, estimates, shots, scouting, talent, call sheets and reports | Local graph in IndexedDB; encrypted backup and explicit handoffs. Not automatically sent to D1, providers or models |
| Projects, tasks, documents, people, equipment, expenses, imported planning rows, membership and reviewed mutations | Worker/D1 for authenticated canonical workflows; local mirror and bounded queued operations preserve offline edits |
| Staged attachment bytes | IndexedDB blobs; explicit verified storage/export/restore through Worker/R2, not silently embedded in workspace JSON |
| Provider credentials and recipient identity | Encrypted Worker-managed state, excluded from browser results, workspace snapshots and backups |
| Appearance and transient selection | Separate UI state; never production records or provider payloads |

A first-class D1 planning table does not imply a complete editable UI or shared live production graph. Native Film documents remain canonical; Google manifests are external references, and Notion is a one-way import.

## Browser Composition

`main.ts` coordinates state, selection, event binding and persistence. Extract real domain boundaries incrementally, not a generic framework solely to reduce line count.

- `public/theme.css` owns neutral colors; `public/appearance.js` applies System/Light/Dark without rerendering or losing drafts. The app and legal pages share both.
- `project-summary.ts` and `project-overview.ts` derive bounded summaries from actual tasks, ledgers and production records, without a second progress/timeline store or invented backup schedule.
- `deferred-view.ts` owns single-flight imports, cached revisits, stale-mount rejection, focus preservation and explicit reload after failed module downloads.
- `production-documents-view.ts` owns Call Sheets/Sides/Reports; `production-resources-view.ts` owns Shots/Locations/Talent. Their loaders reuse `createDeferredViewGroup`. Render contracts exclude sessions/secrets; controller binders remain the write path.
- `backup-workspace.ts` and `integration-view.ts` share that deferred lifecycle. Domain clients, import tools, demo fixtures and serializers load at workflow boundaries.
- `restore-records.ts`, shared options/create controls, icons and presentation/export helpers prevent parallel planning or handoff implementations.
- Desktop/mobile navigation shares destinations and project-availability rules. Empty workspaces retain creation, session, recovery and integration controls without synthesizing a project.

[UI Surface Ownership](UI_SURFACE_OWNERSHIP.md) owns the detailed responsibility map. Summary navigation is allowed; duplicate forms are not.

## Local Production Graph

Fountain/Final Draft import creates revision, scene, element and occurrence identities. Human review, manual tags, reports, copy/paste, duplicate merge and category changes share normalization and graph transitions. Search and copied selections are transient. Grainery is metadata-only pending a format contract.

Versioned main/second-unit schedules reference whole/split-scene strips. Shared operations own bounded batch moves, explicit source-range splits, locks, availability, unit conflicts, Travel/Hold DOOD annotations and revision carry-forward. Scenario assumptions and integer-cent estimates are explicit inputs, not automatic optimization or payroll/union advice. Expenses remains the actual/planned ledger.

Call-sheet creation and explicit draft synchronization share a source-snapshot builder. Unit, ordered scene/split references and reviewed cast are snapshotted; synchronization preserves manual logistics and matching performer calls. Final sheets require reopening before changes. Sides and reports derive from pinned snapshots; revision reconciliation never silently rewrites issued documents.

Shots, talent and locations reference existing graph records. Element cleanup relinks live records while preserving historical sheets. Exports share projections; explicit source-bearing/private handoffs remain distinct from metadata-only exports.

## Canonical Collaboration

Live auth uses member-eligible Resend magic links. Hashed one-time links are transactionally consumed into D1 sessions; D1 member/status/workspace state overrides stale KV cache roles. The browser consumes/removes token fragments and restores same-tab sessions. CORS, CSRF, role and record checks remain server-side.

Hydration returns bounded scoped snapshots, replaces fixtures and retains queued local changes. Replay validates entity/project relationships and atomically commits creates, contextual edits and audit evidence. Failed D1 replay accepts no IDs. Markdown body writes use a separate 64 KiB stale-checked path for existing canonical documents.

Invites, member status, project assignment, ownership, permissions and reviewed core/profile mutations use guarded transactions with audit evidence. Reactivation does not revive revoked sessions. Review, diff, apply, rollback requests and delete-recovery planning are distinct operations. Detailed invariants belong in [Security](SECURITY.md).

## Import and Recovery

Notion preflight selects bounded folder/ZIP candidates; local parsing validates archive metadata, paths, compression, size, CRC, Markdown and CSV. HTML is ignored. Core/planning commits are separate owner/producer-only deterministic create-only batches of at most 200 rows per route. Exact replays are idempotent; changed rows produce previews, not overwrites.

Encrypted backups have a count-only plaintext manifest and encrypted workspace/document-body/attachment-policy payloads. Passphrases/decrypted data stay in the browser. R2 handoff is optional for local download; stored metadata is not proof of retained bytes. Legacy encrypted JSON previews remain readable.

Recovery requires preview, exact confirmation, verified pre-restore backup, durable approval/preflight chain and fresh target checks. Core/planning commits are bounded atomic batches of 150 records each. Attachment bytes use a separate verified package/object chain and create-only R2 writes. Cross-service finalization failures stay recoverable, not falsely successful. Larger proof-bound restores/uploads remain separate work.

## Providers and Offline Behavior

Configuration readiness, usable connection and real delivery are different states. Async browser actions capture/recheck session and workspace; old results cannot repopulate a new session. The Worker reauthorizes every operation.

- Google folder reads return at most 100 metadata items per page. Refresh success/failure compares original ciphertext and active connection so stale work cannot overwrite a reconnect or continue after disconnect. Picker feasibility is unexposed; see the [scope evaluation](google-selected-file-evaluation.md).
- Meta uses read-only Facebook and optional Instagram grants, explicit eligible Page selection, bounded analytics and signed cleanup callbacks. Disabling OAuth does not disable authorized cleanup.
- SMS consent, STOP suppression, signed callbacks, idempotency and per-recipient dispatch checks are Worker-owned. START never reactivates Film consent; message bodies are transient.
- Stripe reads only mapped Pool/Store aggregates, never direct payment/customer data. Resend handles eligible transactional delivery and signed suppression callbacks.

The service worker caches allowlisted public same-origin assets, not private/API/error/credential/query responses, except the exact isolated demo navigation reusing the root shell. Lazy features must have been fetched before offline use. Demo mode has separate storage and blocks Worker transport.

## Engineering Gates

Vite checks the final entry and complete static dependency graph, excluding dynamic feature chunks. Current ceilings and commands live in [Testing](TESTING.md). Real-D1/browser runners share process-tree teardown and bounded asynchronous supervision. [Release](RELEASE.md) separates local checks, CI, deployment, artifact verification and provider acceptance.
