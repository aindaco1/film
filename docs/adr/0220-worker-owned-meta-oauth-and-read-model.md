# ADR 0220: Worker-Owned Meta OAuth and Read Model

Date: 2026-07-10

## Status

Implemented behind a disabled production gate.

## Context

ADR 0214 selected Facebook Login for Business and a read-only Facebook/Instagram boundary. Film still needed an implementation that could connect a workspace without exposing tokens, reject permission expansion, select one analyzable Page with a linked Instagram professional account, and render useful calendar and engagement data without becoming a publisher.

## Decision

Add a dedicated `meta_provider_connections` table. Store user and Page access tokens as AES-256-GCM ciphertext using an independent `META_TOKEN_ENCRYPTION_KEY` and workspace/token-kind additional data. OAuth state is random, hashed in KV, valid for ten minutes, and bound to the current Film session, workspace, and owner/producer member.

The callback verifies the actual granted permission set. It requires the five ADR 0214 scopes, allows Meta's implicit `public_profile`, and rejects every other granted permission. Successful authorization stops at `pending_page_selection`. An owner or producer must select a Page that returns the `ANALYZE` task and a linked Instagram professional account before reads become active.

Analytics reads are limited to 31 days, 50 Facebook posts, 50 Instagram media rows, allowlisted Page/Instagram insight metrics, and bounded output. Responses may include labels or captions, publication timestamps, safe Facebook/Instagram permalinks, media type, and aggregate reactions/comments/shares. They never include access tokens, token ciphertext, media asset URLs, messages, comments, moderation data, ad data, or publishing controls. Independent endpoint failures produce redacted partial warnings.

Disconnect attempts provider revocation and always deletes local user/Page token ciphertext and account mappings. Provider tokens and connection rows remain excluded from workspace snapshots, exports, and backups.

## Production Gate

`META_OAUTH_MODE` remains `disabled`. Live mode requires all of:

- a Meta app and numeric app ID/secret;
- Facebook Login for Business and a numeric configuration ID;
- exact redirect `https://api.film.dustwave.xyz/api/providers/meta/oauth/callback`;
- an explicit reviewed `META_GRAPH_API_VERSION`;
- an independent recoverable 32-byte token encryption key;
- owned-account consent and disconnect smoke;
- Business Verification, data handling answers, and the required App Review/Advanced Access before external accounts.

Signed deauthorization and data-deletion callbacks are implemented independently of the interactive OAuth live gate; ADR 0221 records their verification, replay, deletion, and status boundary. Background refresh remains out of scope until a separate Graph webhook verification and deduplication path is implemented and verified. Publishing, messaging, moderation, and advertising permissions remain ineligible for Film social v1.

## Consequences

- The Worker owns every trust-sensitive Meta operation and the browser receives only redacted connection, candidate, calendar, and insight data.
- The Social application remains the only publishing surface.
- The implementation can ship while disabled without pretending that Meta account resources or review are complete.
- Losing the token key requires clearing affected connection rows and reconnecting; key rotation needs multi-key decryption before any active connection exists.
