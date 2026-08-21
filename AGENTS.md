# Film Agent Instructions

Use the reusable `web-application-builder` skill for this repo after Codex is restarted and the skill is discoverable.

Project conventions:

- Keep the app static-first and framework-light unless a specific feature proves that a heavier UI framework is worth the tradeoff.
- Keep trust-sensitive behavior in `apps/worker`, not browser code.
- Keep shared data contracts in `packages/schema`; make D1 migrations SQLite-compatible where practical.
- Provider integrations are essential to the MVP, but they start as dry-run adapters until scopes, credentials, compliance, and production resources are explicit.
- Core user data must be exportable. Backup and restore safety should ship before deep integrations.
- Add docs and tests with implementation work.
- Avoid committing local secrets, provider keys, raw OAuth tokens, private exports, or generated backup bundles.

Current product direction:

- Product name: `Film`
- Audience: solo filmmakers and small teams
- UI: dense operational dark-mode workspace, not a marketing page
- Stack: static TypeScript app shell, Cloudflare Worker API, D1/SQLite schema, future R2/KV/DO bindings
