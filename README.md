# Film

Film by Dust Wave is a private production workspace for solo filmmakers and small teams, optimized for micro-budget non-union productions. It uses a framework-light TypeScript web app and a Cloudflare Worker API.

[Live workspace](https://film.dustwave.xyz) | [Isolated demo](https://film.dustwave.xyz/?demo=portfolio) | [Releases](https://github.com/aindaco1/film/releases)

**Start with [Project Status and Next Steps](docs/PROJECT_STATUS.md).** It owns current release evidence, supported capabilities, limitations, and the ordered path to MVP acceptance. A published beta does not imply public provider approval.

## Product

- Local screenplay import and breakdown, versioned scheduling, availability/DOOD, transparent estimates, shots, locations, talent, call sheets, sides, and daily reports.
- Project/task/document/crew/equipment/expense workflows with Worker-authorized core-record collaboration.
- One-way Notion import, portable handoffs, encrypted backups, and guarded recovery.
- Optional provider integrations with explicit consent and activation gates. Meta is read-only; Social owns publishing. No cloud AI is required or enabled.
- System-default high-contrast light/dark appearance and a fictional demo portfolio isolated from real workspaces.

The production graph is local-first, not real-time shared screenplay/schedule editing. See the status document for exact data and provider boundaries.

## Develop

```bash
git submodule update --init --recursive
npm ci
npm run dev
```

Use the printed local URL. The command starts Vite and Wrangler with explicitly non-sending provider modes, even if production credentials exist locally. `npm run dev:web` and `npm run dev:worker` run either side separately. Keep credentials in ignored files or Wrangler secrets, never source.

## Verify

```bash
npm run smoke
npm run smoke:local:worker
```

The first command builds and runs type, unit/script, secret, migration, browser, and compiled-offline checks. The second exercises real local D1/Worker workflows and cleans up its processes. Neither establishes live-provider acceptance. Focused commands and explicit production-send boundaries live in [Testing](docs/TESTING.md).

## Documentation

| Document | Owns |
| --- | --- |
| [Project Status](docs/PROJECT_STATUS.md) | Current state, evidence, blockers, concrete next steps |
| [Product Goals](docs/PRODUCT_GOALS.md) | Stable scope, principles, MVP acceptance criteria |
| [Architecture](docs/ARCHITECTURE.md) | Modules, data ownership, runtime contracts |
| [UI Surface Ownership](docs/UI_SURFACE_OWNERSHIP.md) | One canonical UI owner per user job |
| [Security](docs/SECURITY.md) | Authorization, privacy, import and recovery invariants |
| [Testing](docs/TESTING.md) / [User Flows](docs/USER_FLOWS.md) | How to verify / generated flow and regression inventory |
| [Email delivery](docs/EMAIL_DELIVERABILITY.md) | Shared transport defaults, content ownership, rollout and rollback |
| [Deployment](docs/DEPLOYMENT.md) | Hosting, configuration, secrets, provisioning |
| [Operations](docs/OPERATIONS.md) | Recovery, rotation, incidents, approved operator actions |
| [Release](docs/RELEASE.md) | Build-to-publication checklist |
| [Provider Review](docs/provider-review-preparation.md) | Meta/Google review preparation and consent decisions |
| [Evidence Index](docs/release-evidence/README.md) | Dated release/provider acceptance records |
| [Decision Index](docs/adr/README.md) | Current decision owners and consolidated historical rationale |

Generated builds, screenshots, test exports, and scratch logs are disposable local output, not documentation dependencies. Preserve local Wrangler state, credentials, private imports, and dependencies during cleanup. See [Operations](docs/OPERATIONS.md#repository-hygiene).
