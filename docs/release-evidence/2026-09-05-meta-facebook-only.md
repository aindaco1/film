# Facebook-Only Meta Deployment and Acceptance

## Account Decision

- The user chose Dust Wave Social Test for initial testing. Its existing asset was selected in Helium's Meta Business Suite; the Page offers Connect Instagram and has no linked Instagram account.
- The real Dust Wave Page is administered by someone else and is not needed for this test. Initial inspection changed no account permissions. The later user-approved grant below is limited to the test Page; no ownership, business portfolio, real Dust Wave permissions, or Page content was changed.

## Local Implementation

- Page selection now requires ANALYZE access, not a linked Instagram account. The existing encrypted connection storage already supports a null Instagram mapping; no migration is needed.
- The three Facebook permissions remain required; the two Instagram permissions remain within the bounded read-only allowlist. Facebook-only grants are accepted without Instagram permissions. Business Login configurations make their requested permissions mandatory, so the configuration correction below is needed to obtain that grant in the real consent UI. Expanded permissions, including publishing, remain rejected.
- Discovery and selection omit Instagram fields and mappings unless both Instagram permissions were granted. Analytics skips Instagram endpoints without an authorized linked account; empty Facebook results are complete, not a false partial failure.
- The inspector identifies Facebook-only connections, counts eligible Pages accurately, and keeps selection controls beside their account labels. Shared provider-list CSS owns the action layout.
- Existing lifecycle tests cover linked, unlinked, and Facebook-permissions-only connections through disconnect and token cleanup. The browser flow reuses the authentication/provider fixtures and is included in the canonical suite.

## Validation

- `npm test`: all script and workspace tests passed.
- `npm run build`, `npm run typecheck:web`, `npm run test:security`, and `git diff --check`: passed. Vite's existing large-entry-chunk warning remains; the startup budget passes.
- `node scripts/browser-smoke.mjs --meta-only`: passed with intercepted provider fixtures, desktop/mobile light/dark accessibility and overflow checks, and explicit button/label geometry assertions. Screenshots inspected.
- `node scripts/browser-smoke.mjs --meta-only --built`: verifies the same flow from the compiled static app.
- The existing local app at `http://127.0.0.1:5173/` returned HTTP 200.

## Deployment

- `npm run smoke`: passed, including 697 script/unit tests, the full browser flow suite, security checks, 37 migrations in fresh SQLite runs, and compiled offline/backup recovery checks.
- `npm run smoke:local:worker`: passed against disposable local D1/Worker resources. These checks do not send provider messages or prove real-account OAuth acceptance.
- `npm run check:deploy:strict -- --wrangler-secrets`, both Wrangler deployment dry runs, and `git diff --check`: passed. Remote verification read secret binding names, not values.
- Worker version `fcb2153f-323b-43c0-9edb-1f3de395feef` deployed the Facebook-only implementation with Meta disabled. Web version `224f969a-81de-40c7-bff3-4ad5b3e4ccdd` deployed the corresponding UI.
- Production health returned HTTP 200 with `live_member_only` authentication. An unauthenticated Meta selection request was rejected with HTTP 403 / `missing_csrf` and `Cache-Control: no-store`.
- All 30 non-HTML published assets matched the compiled files byte-for-byte; five HTML entry points returned HTTP 200 with the expected local asset references.
- Deployed auth, Google, invite delivery, SMS, and Telnyx webhook modes remained live; Stripe summary and Meta modes remained disabled. All four required Meta secret bindings were present.
- Before and after the implementation deployment, aggregate production D1 checks found zero Meta connection rows and zero stored user/Page token ciphertext values.

## Controlled Owner-Session Run

- Used the normal Film sign-in form and the newly received email link in the owner's already-authenticated mailbox in Helium. Film confirmed an owner session and loaded the canonical workspace. No synthetic session or owner bootstrap mutation was used.
- Worker version `0d15352e-dfe9-4880-9120-b7aaf63af958` temporarily enabled `META_OAUTH_MODE=live` using an explicit CLI override for this acceptance run. The checked-in configuration remains disabled.
- Film's live connection readiness passed, and its normal Connect Meta action reached the dedicated Film app's Facebook Login for Business consent screen.
- Stopped before the Continue action that shares ongoing name/profile-picture access, pending action-time user confirmation. No Page was authorized, selected, or read; no publishing access was requested.
- Paused with Worker version `7b2358bd-bdc0-4126-a2da-b929440ee37c`, restoring `META_OAUTH_MODE=disabled` and preserving other provider modes. The consent tab remains open in Helium; resume with a fresh OAuth flow if its short-lived state has expired.
- After pausing, production D1 still contained zero Meta connections, zero user token ciphertext values, and zero Page token ciphertext values.

## User-Approved Consent and Configuration Correction

- The user confirmed Continue at the Meta name/profile-picture consent screen, with Page access restricted to Dust Wave Social Test and no publishing permissions.
- The existing Film Read Only configuration required an Instagram selection even with zero accounts selected; Continue remained disabled. That flow was abandoned without authorizing unrelated Instagram accounts. The original combined configuration was retained.
- Created Film Facebook Read Only in the same dedicated Film Meta app: General configuration, User access token, and exactly `pages_show_list`, `pages_read_engagement`, and `read_insights`. Its public configuration ID is `1537168588183472`; the existing Worker configuration binding now points to it. No app, business portfolio, ownership, or access-level changes were made.
- Removed the redundant OAuth URL `scope` parameter. Business Login now takes its mandatory permission set from `config_id`; callback validation retains the bounded five-scope allowlist and requires the three Facebook scopes. See the [official Business Login configuration contract](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business#create-a-configuration).
- Selected current Pages only, with only Dust Wave Social Test checked. The final consent review showed three Facebook read permissions for one Page, with no Instagram, publishing, messaging, or advertising permissions. Meta confirmed connection to Film; Film's callback stored a pending Page-selection connection.
- Redacted D1 verification found the three Facebook scopes plus `public_profile`, one encrypted user token, no Page token, and no Page or Instagram mapping. The five-scope count in the OAuth-start audit is the bounded request-state allowlist, not the actual granted permissions.

## Real-Token Failure and Safe Pause

- Page discovery initially returned `meta_reauthorization_required`. The actual cause was a shared base64 decoder rejecting inputs over 128 characters, including real encrypted token ciphertext. The stored ciphertext was 324 characters; prior short fake tokens did not expose this defect.
- Regression tests reproduced failure at 256, 1024, and 4096 token characters before the fix. Decoding now applies separate bounds for the 12-byte IV, 32-byte key, and 4096-byte token plus the AES-GCM tag. Workspace/kind authentication, oversized input rejection, and token redaction remain covered. No key rotation, encryption format change, or migration was needed.
- The canonical linked/unlinked/Facebook-only lifecycle tests now reuse realistic 512-character user and 1024-character Page token fixtures through discovery, selection, analytics, and disconnect.
- Added one shared live-mode check for stored-token reads. Disabling Meta now blocks discovery, selection, and analytics without contacting the provider; disconnect and signed deletion/deauthorization callbacks remain available. All three lifecycle variants verify blocked reads and successful disconnect while disabled.
- Deployed the configuration correction in Worker version `0a7b43b4-3e28-4a7b-94b9-8f25f0fc5e4c` and the decoder fix in `39b18a9c-ab08-48de-8f06-24768bd41870` during controlled acceptance.
- Helium automation then timed out repeatedly. A later recovery check could read Film but stalled again before saved-connection controls could be operated reliably while the browser was in use. No successful post-fix Page discovery, selection, analytics read, or disconnect has been observed.
- Worker version `a877124f-7c5f-4130-b5ab-3073844b4383` deployed the shared stored-token gate and restored Meta disabled. Remote version inspection confirms auth, Google, invite delivery, SMS, and Telnyx webhook modes remain live; Stripe summary remains disabled. Production health returned HTTP 200 with `live_member_only` authentication.
- Final validation: `npm test` passed all 701 tests, including 329 Worker tests. Worker build, security checks, and `git diff --check` passed. The earlier full browser/local-Worker smoke remains separate evidence; it does not prove real Meta analytics acceptance.
- The pending encrypted user token is retained, not deleted or revoked. No Page token, Page mapping, or Instagram mapping is stored. No SMS was sent, no content was published, and the real Dust Wave Page and Instagram account were untouched.

## Helium Recovery and Completed Facebook Acceptance

- The user requested continuation and diagnosis of Helium control. Browser discovery consistently found the actual `net.imput.helium` application and its extension-backed Film tab; this was not the Codex in-app browser. Native app observation continued to work while some extension actions timed out.
- A fresh claim of the exact Film tab plus tab-scoped Playwright locators restored reliable page actions. The saved connection check completed and a Page read while Meta was disabled returned `meta_token_runtime_unavailable`, verifying the deployed fail-closed gate through the real owner session.
- Background focus/native confirmation handling remained unreliable. The Disconnect click timed out in `Input.dispatchMouseEvent` while `getJsDialog()` reported a confirmation, then dialog acceptance hit `Emulation.setFocusEmulationEnabled` timeouts. D1 initially remained active, so the attempted action was not counted as successful.
- Helium's native Tabs menu reliably activated the original signed-in Film tab when tab-strip targeting did not. Native accessibility controls then opened and accepted the visible Film disconnect dialog. No browser restart, extension removal, Proton Pass setting change, security bypass, or synthetic Film session was needed. The evidence identifies a browser-control focus/dialog failure mode; it does not establish the underlying extension or Chromium defect, or prove that another task caused it.
- Worker version `b607f49c-26bd-4c5d-a350-8fd83efabd1c` temporarily enabled Meta for the approved run. Discovery returned exactly one eligible Page, Dust Wave Social Test, with no Instagram mapping.
- Initial selection failed because it queried the standalone Page node with task fields. Discovery and selection now share a bounded managed-Pages read from `/me/accounts`; only selection requests Page tokens and it accepts only the matching authorized Page with `ANALYZE`. This follows [Meta's managed-Pages token example](https://www.postman.com/meta/facebook/request/bqfxwbp/get-access-tokens-of-pages-you-manage). Tests rejected the old endpoint before the fix, then passed with the shared implementation, including missing/mismatched tokens and malformed responses.
- Worker version `69af976e-72ac-4a76-a012-016a7670d248` deployed that correction. The same real grant then selected Dust Wave Social Test successfully; Film displayed Facebook only and enabled Read 30 days.
- The first read returned an empty calendar and partial insights. Added bounded HTTP/provider numeric codes to existing warnings and audit metadata, without reflecting messages, traces, URLs, or credentials. Worker version `6cb5b02b-4778-479e-b5e1-a3b91ec30f74` deployed those diagnostics. A single subsequent bounded read succeeded without changing metrics or permissions; the earlier provider failure's exact cause remains unknown.
- At `2026-09-06T00:11:17.694Z`, both Film and its redacted production audit confirmed `complete`, zero calendar items, three insight series, and zero warnings for August 8 through September 6. Film displayed Page Post Engagements, Page Follows, and Page Media View, with zero values on this test Page. No content was created to populate the test.
- Worker version `571717d4-b285-4342-b45e-dfa45418a95a` restored Meta disabled before native disconnect. At `2026-09-06T00:16:55.346Z`, Film confirmed provider access revoked; the production audit reported `providerRevoked`, `localTokensDeleted`, and `localMappingDeleted` all true. D1 confirmed disconnected status, zero user/Page ciphertext values, and zero Page/Instagram mappings. Disconnect while disabled is now verified live as well as in regression tests.
- Final validation: `npm test` passed all 709 tests, including 337 Worker tests. Worker build, secret scan, and `git diff --check` passed. Production health returned HTTP 200. No frontend assets were changed in this recovery pass.

## Remaining Boundary

The owned Facebook-only acceptance chain is complete: consent, encrypted callback storage, authorized Page discovery/selection, bounded calendar/insights read, provider revocation, and local token/mapping cleanup. Meta remains disabled outside controlled testing. Instagram acceptance, business ownership, and general-customer App Review remain separate work; the test Page's zero-valued data does not validate those boundaries or a populated production calendar. Helium can be operated with the recovery procedure above, but the intermittent extension focus/dialog issue has not been fixed in the browser software itself.
