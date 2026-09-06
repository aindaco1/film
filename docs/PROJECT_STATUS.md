# Film: Current State And Next Steps

Updated: 2026-09-06. This is the single current-state and next-step ledger. Stable scope belongs in [Product Goals](PRODUCT_GOALS.md); commands and evidence live in the linked documents rather than being duplicated here.

## Bottom Line

Film has a published, deployed **0.1.0-beta.1 controlled beta** with the main local production workflow implemented. It is not yet a generally approved public-provider MVP. The remaining critical work is Meta verification/review, the Google public-access decision, and observed real-team/accessibility/recovery acceptance. Maintainability work can proceed independently of those external gates.

The product remains on track for private, micro-budget, non-union production planning. The principal gaps are breadth of live provider access and evidence from real users, not another visual redesign or a framework replacement. Local production-graph collaboration, Docs/Calendar and broader planning workspaces must not be implied by the existing core-record collaboration or importer.

## Release And Evidence

| Boundary | Verified state |
| --- | --- |
| Published release | [v0.1.0-beta.1 prerelease](https://github.com/aindaco1/film/releases/tag/v0.1.0-beta.1), published September 6; GitHub release state rechecked during this cleanup |
| Tested application source | `c4c44100a662ac98a6b04d9fd69f95f5257286b1`; the release tag targets this commit |
| CI | [Successful run 34056824696](https://github.com/aindaco1/film/actions/runs/34056824696), including full smoke, fresh-D1 workflows and retained build |
| Deployment | [Film](https://film.dustwave.xyz) and its API are deployed; exact Worker versions and rollback targets are in [beta evidence](release-evidence/2026-09-06-beta-1.md) |
| Artifact acceptance | All 37 CI artifact files matched the compiled build; 32 non-HTML public assets matched hashes and five HTML pages passed response/title checks, as recorded in the beta ledger |
| Automated release evidence | 774 unit/script tests, 37 migrations over two fresh SQLite passes, browser/responsive/appearance checks, compiled offline checks and real local-Worker proofs |
| Workflow inventory | [54 canonical user flows](USER_FLOWS.md), mapped to unit/integration/browser evidence; not a claim of 54 independently complete live end-to-end tests |
| Provider acceptance | Separate dated records below. This cleanup did not repeat portal verification, send messages, reconnect accounts or deploy |

The starting `main` commit for this cleanup was `4efcf6a170c00cd00d284e224265d4e198e4675c`, an evidence-only follow-up to the tested source. These documentation/test changes are not a new application release. Historical evidence can contain then-pending language; the verified publication state above supersedes that language.

## What Works And Where It Lives

| Area | Implemented capability | Boundary or remaining acceptance |
| --- | --- | --- |
| Workspace and UX | Real empty-workspace onboarding, projects/tasks/docs/people/equipment/expenses, in-context edits, bounded inspector, search, shared high-contrast System/Light/Dark appearance | Automated coverage is broad; observe producer/contributor and VoiceOver use |
| Demo stress cases | Isolated fictional portfolio: 12 projects, six project types, four phases, populated and empty workflows | No Worker requests or real data; not a server load or multi-user simulation |
| Screenplay and breakdown | Fountain/Final Draft import, versioned scenes/elements, manual review/tags, occurrences, duplicate merge, category moves, copy/paste and exports | Local/private; Grainery remains metadata-only without an agreed source format |
| Scheduling and estimates | Versioned main/second-unit stripboards, bounded batch moves and scene splits, availability/conflicts, Travel/Hold DOOD, scenarios and explicit cost assumptions | Deterministic and user-reviewed, not an optimizer, payroll engine or union-compliance calculator |
| Production resources | Shots, scouting and talent linked to existing breakdown/schedule records | Local graph; private handoff exports have explicit content boundaries |
| Daily production | Schedule-linked draft/final call sheets, explicit draft sync, pinned sides, daily reports and revision carry-forward | Issued documents stay stable; rehearse a real revision and two-day production handoff |
| Core collaboration | Worker/D1 sessions, roles, invites, scoped canonical records, queued replay, stale-checked Markdown and audited reviewed mutations | Screenplay/schedule/resource/daily-document graph is not real-time shared D1 editing |
| Notion | One-way folder/ZIP import, deterministic create-only core/planning commits, provenance and idempotent retries | HTML ignored; up to 200 rows per commit route; imported planning rows do not imply full planning CRUD |
| Portability and recovery | Human-readable handoffs, encrypted ZIP/legacy previews, local export, optional R2 storage and proof-bound guarded restore | Core/planning atomic commits are capped at 150 records each; attachment bytes use a separate chain; larger restores/uploads need additional design |
| Offline | Local work, cached shell, appearance and previously fetched lazy workflows, including encrypted recovery | Never-fetched lazy assets are not guaranteed offline; private/API data is excluded from service-worker caches |
| Assistance | Deterministic parsing, projections and validation without cloud inference | No local model or BYOK cloud workflow is enabled; optional suggestions require human review and explicit privacy boundaries |

Detailed runtime ownership and safety limits: [Architecture](ARCHITECTURE.md), [Security](SECURITY.md), [UI ownership](UI_SURFACE_OWNERSHIP.md). The original Desktop plan is no longer present at its supplied path; this assessment uses maintained goals, implemented contracts, accepted product decisions and retained history rather than claiming a fresh line-by-line audit of that missing file.

## Provider Posture

These observations are dated September 5-6 and backed by the linked ledgers. Configured mode is not proof that an account's consent remains valid indefinitely.

| Provider | Current posture | Next gate |
| --- | --- | --- |
| Resend | Member-only magic links and eligible invites configured live, with signed invite events and suppression handling | Operational bounce/suppression review and an approved real-team invitation rehearsal |
| Telnyx | Approved campaign and sender; send and webhook modes live. Owned-number delivery plus STOP/HELP/START accepted. STOP revoked Film consent; START did not reactivate it | Preserve accepted settings and revoked test consent. New crew enrollment/sends need their own explicit consent, not another brand/campaign. [Evidence](release-evidence/2026-09-05-telnyx-activation.md), [program contract](SMS_PROGRAM.md) |
| Google | External/Testing, owner-only `drive.metadata.readonly`; owner reauthorization and an approved empty-folder metadata read passed. Saved connection intentionally retained | Public scope/privacy choice and applicable verification; non-empty pagination and refresh/disconnect acceptance remain distinct. Docs/Calendar are not covered. [Evidence](release-evidence/2026-09-06-provider-followup.md), [scope evaluation](google-selected-file-evaluation.md) |
| Meta | Dust Wave portfolio assigned to Film for Fumblers LLC dba Dust Wave. Facebook-only owned test Page consent/read/disconnect accepted. Production OAuth remains disabled outside controlled tests | Resolve the mismatched/unclear authorized-representative record, then business/access verification, reviewer access/recording and App Review. Instagram has no accepted linked professional asset. [Facebook evidence](release-evidence/2026-09-05-meta-facebook-only.md), [follow-up](release-evidence/2026-09-06-provider-followup.md) |
| Pool / Store / Stripe | Summary-only adapters implemented; mappings empty and summaries disabled because there are no real Big Sword campaign/products | Intentionally deferred until real companion resources exist. Validate exact project/ref mapping and aggregate-only reads then; no fabricated resources or direct Stripe fallback |

Social owns publishing. Film's Meta scope is read-only calendar/analytics. Detailed reviewer permissions, recording steps and Google tradeoffs belong in [Provider Review Preparation](provider-review-preparation.md).

## Ordered Next Steps

### 1. Finish Meta Verification And Facebook Review

**Dependency:** operator confirmation of the correct legal representative/official record. Do not guess the masked person or submit an identity document for an unconfirmed record.

After that confirmation, complete the required business and access verification for the existing portfolio; do not create a duplicate. Establish a dedicated reviewer workspace and an approved magic-link login path, then capture the real Facebook-only consent, Page selection, bounded reads and disconnect sequence using the existing packet. Submit only the three justified Facebook read permissions after operator review of declarations.

**Done when:** the dashboard records the applicable approvals, a permitted non-developer/reviewer account can complete the real flow, revocation/deletion cleanup passes, and a separate activation release records the enabled mode. Empty test-Page metrics are acceptable empty results, not Instagram acceptance. Add Instagram later only after a consented professional account is linked and independently tested.

### 2. Resolve Google Public Access Without Silently Broadening Consent

**Dependency:** an explicit product/privacy decision. The current read-only metadata scope is restricted and its server-mediated public use carries verification/assessment requirements described in the source-linked evaluation. Picker's `drive.file` alternative limits access to selected files but is write-capable and requires a browser access token, conflicting with the current absolute Worker-only token rule.

Keep the current owner-only beta unchanged until one path is approved: retain the read-only scope and complete applicable verification, or explicitly authorize the selected-file UX and tightly bounded browser-token exception. The tested selected-file adapter is unexposed feasibility work, not a shipping Picker workflow.

Then exercise an approved non-sensitive, non-empty folder/selection, bounded pagination, consent expiry/reconnect and explicit disconnect cleanup. Do not disconnect the existing owner connection without agreement. Prepare the real reviewer recording and verify actual public access rather than only publishing the consent screen.

**Done when:** the chosen privacy contract is documented and implemented, the applicable provider approval is recorded, and both happy-path and lifecycle acceptance pass without content reads or extra scopes. Separately specify and build any required Docs/Calendar use case; current metadata acceptance does not satisfy those features.

### 3. Complete A Real Production Rehearsal And Recovery Acceptance

**Dependency:** a producer and contributor, an approved representative project and an isolated restore target. Preparation and fixture improvements can proceed now; final acceptance requires actual participants.

Use the existing [human acceptance sequence](TESTING.md#human-acceptance) and [flow IDs](USER_FLOWS.md), not a second test inventory. Cover a two-day production, changed screenplay/schedule after issuing a sheet, task/Markdown collaboration and denial paths, mobile/keyboard/VoiceOver, offline/reconnect, exports, encrypted recovery and required attachment bytes. Record completion, confusion, data loss risks and recovery behavior. Fix observed failures and add focused regressions using existing helpers.

**Done when:** participants can finish without undocumented assistance, no critical accessibility/data-loss issue remains, and recovery has verified record/graph/attachment evidence within the supported limits. If a representative project exceeds those limits, segmented recovery becomes a release gate rather than an undocumented failure.

### 4. Continue Targeted Maintainability Work Independently

**No provider dependency.** Browser `main.ts` is still 15,939 lines and Worker `index.ts` 25,987 lines. Shared deferred views, provider contracts, projections, mutation helpers and process supervision already reduce duplication; line count alone is not a reason for another abstraction.

Start by extracting one cohesive Worker route family behind the existing session/CSRF/scope/transaction contracts, and one browser event/controller family behind the existing deferred lifecycle. Keep route URLs, state ownership and behavior unchanged. Use a before/after call-site inventory to remove actual duplication, not merely move it. Preserve bundle ceilings and tests for stale navigation/session results. Upgrade deprecated CI action runtimes in a separate focused change, with a full successful CI run and artifact check.

**Done when:** extracted modules have explicit inputs/outputs, no duplicate write paths or UI owners, unchanged privacy/authorization behavior, passing unit/real-D1/browser gates and no initial-bundle regression. Do not combine architectural extraction with provider scope or schema changes.

### 5. Close The Remaining Product-Scope Decisions Before Calling MVP Complete

Keep these visible rather than silently treating the beta as the entire original plan:

- Confirm whether local-only screenplay/schedule collaboration is sufficient for the first production team. If not, design versioned shared graph operations and a user-approved privacy boundary before implementation.
- Decide which broader planning/distribution jobs need first-class editable workflows instead of imported read-only rows. Build selected flows through canonical schema/Worker/UI paths, not a parallel CRUD framework.
- Confirm the first required Google Docs/Calendar outcomes and their incremental-consent scope. No blanket additional grant is authorized.
- Test a representative large project before deciding whether proof-bound segmented restores and larger attachment uploads can remain deferred.
- Optional local-model assistance can remain a separate experiment; select a task, small-model/runtime budget and deterministic review contract before downloading or enabling a model. Cloud/BYOK remains opt-in only.
- Activate companion summaries only after real resources exist; the user explicitly deferred empty Big Sword campaign/product mappings.

**Done when:** each item is either accepted with concrete flow evidence or explicitly deferred in the release scope. Provider and human-acceptance gates above remain mandatory for the capabilities advertised as generally ready.

## Repository Cleanup And Documentation Ownership

The September 6 cleanup reduces README/Architecture/Testing/Release duplication, separates stable goals from changing status, replaces the obsolete 603 resubmission packet with the maintained SMS program contract, and consolidates all 250 incremental ADR bodies verbatim into [five historical collections](adr/README.md). Unique dated release, provider and design evidence is retained. Generated screenshots are no longer required documentation links.

Branch inspection after fetch/prune found only `main` locally and on GitHub, with one active worktree and no open pull requests. No stale branch or release tag was deleted. Generated output cleanup is recoverable; credentials, dependencies, local Wrangler state, private imports and uncertain backups are preserved. Follow [Repository Hygiene](OPERATIONS.md#repository-hygiene) for future passes.

Cleanup moved 888 generated files (118,224,071 bytes across 72 reviewed paths) into a dated `Film-cleanup` folder in macOS Trash, with a per-path recovery manifest. All moves and the retained local-state/private-import paths were verified. This removes output from the checkout, not from disk until Trash is emptied.

The follow-up consolidation places dated screenplay results in [release evidence](release-evidence/2026-08-21-screenplay-acceptance.md), with the reusable runner contract in Testing. Security now groups its 88 existing boundary statements by topic without changing their wording. Testing and Operations own the consolidated command/procedure details; Deployment and the provider review packet link to those owners and the status/evidence ledgers. Root documentation remains README, LICENSE and AGENTS.

Validation: 777 unit/script tests passed, including three new documentation tests and the updated SMS contract test. The secret scan and `git diff --check` passed. Every archived original ADR body was compared with Git history, and documentation/flow checks passed again after generated outputs were removed. The generated flow catalog and application/configuration sources are unchanged. Local web and Worker health checks still return 200. Browser/build/deployment gates were not rerun locally for this documentation/test-only cleanup; the earlier release evidence is separate.

Publishing the consolidation exposed a pre-existing browser-helper race in [CI run 34063048160](https://github.com/aindaco1/film/actions/runs/34063048160): the empty-workspace sign-in form could mount after the helper had already checked for its disclosure. The shared helper now waits for attachment before opening the disclosure. A delayed-mount regression reproduced the original failure and passes with the fix; all 66 script tests and the desktop/mobile empty-workspace flow pass locally. Four generated screenshots were moved to a recoverable Trash folder with a hash-verified manifest. This changes test timing only, not application behavior or provider configuration.
