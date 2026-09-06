# Google Selected-File Evaluation

Date: 2026-09-06. Outcome: backend feasibility proven with fixtures; live scope migration is not authorized or enabled.

## Recommendation

Keep the accepted owner-only metadata connection unchanged for this beta. Do not publish Google's OAuth application or exchange the existing grant merely to avoid verification. A selected-file integration is feasible, but it changes two deliberate Film boundaries: provider tokens in the browser and a write-capable permission. Those changes need an explicit product/security decision before a real Picker consent test.

Google recommends `drive.file` for per-file access and classifies it as non-sensitive. Film's current `drive.metadata.readonly` scope is restricted; server transmission of restricted data requires a security assessment under Google's published guidance. `drive.file` includes modification capabilities for authorized files, even if Film implements GET requests only. [Drive authorization scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

## What Actually Changes

| Boundary | Current Film connection | Proposed Picker flow |
| --- | --- | --- |
| User selection | Paste a folder ID; read one page of immediate-child metadata | Explicitly select individual files in Google's dialog |
| OAuth authority | Account-wide, read-only metadata | Read/write authority for app-authorized files |
| Token location | Encrypted Worker storage; no browser token endpoint | Picker receives an OAuth access token in browser memory |
| Folder semantics | Up to 100 child records per page | Selecting a folder is not treated as recursive authorization |
| File bodies | Never requested by manifest reads | Still not requested by the feasibility adapter |
| Offline | Last local project data, not a live Drive browser | Picker requires Google networking; native Film remains usable |

Picker's browser API requires `setOAuthToken`. Its token cannot be replaced by Film's HTTP-only session cookie or a Worker proxy URL. [Picker token contract](https://developers.google.com/workspace/drive/picker/reference/picker.pickerbuilder.setoauthtoken)

Google's browser token model can obtain an access token through an explicit user gesture without handing out the Worker's refresh token. It still introduces an access token in browser memory, so it is not compatible with an absolute no-browser-provider-token rule. [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)

## Implemented Feasibility Boundary

`readSelectedGoogleDriveFiles` in `apps/worker/src/google-drive.ts` is an unexposed adapter, not an enabled endpoint. It accepts at most 20 explicitly selected IDs, deduplicates them in selection order, and issues only individual `files.get` metadata requests. The selected IDs remain untrusted: Google's authorization must still enforce whether the current token can access each file. There is no folder enumeration, upload, export, content download, retry loop, or write operation.

Both existing folder listing and this adapter reuse one metadata projection, normalization path, provider-error mapping, and redirect-denial policy. Browser and Worker use one manifest contract in `packages/providers`. The planner now derives scopes from the same capability function as OAuth, eliminating its previous extra `documents.readonly` claim.

Google documents `files.get` for metadata and separately identifies the `alt=media` content-download mode. The adapter never sets that mode. [Files get reference](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get)

Fixture tests prove bounded selection, cancellation with no request, duplicate handling, no child traversal, no extra metadata retention, exact returned-ID matching, malformed-response rejection, and failure without partial-success claims. They do not prove Google's per-file enforcement, Picker interaction, consent, or approval on a real account.

## Activation Plan, After Approval

1. Approve the specific tradeoff: selected-file write-capable consent and an ephemeral access token in browser memory. Keep refresh tokens, client secrets, and existing broad tokens Worker-only. Never serve an existing metadata token through a new browser endpoint.
2. Use a separately gated, deliberately selected connection flow. Require a clean scope set; do not combine the old restricted grant with `drive.file` through incremental consent. Preserve the existing connection until the user explicitly chooses migration/disconnection.
3. Configure the Google Picker API, same-project app/client IDs, authorized origins, and an API key restricted to the required APIs and Google's documented referring origins. Do not place an unrestricted key in the bundle. [Picker prerequisites](https://developers.google.com/workspace/drive/picker/guides/sample)
4. Load Google's scripts only after the user chooses the connected action, outside demo/offline paths. Keep upload disabled and no automatic file selection. Add a narrow CSP allowance after reviewing the exact script/frame origins.
5. Reuse this metadata adapter behind authenticated owner/producer, CSRF, workspace, rate-limit, and scope checks. Do not interpret client-supplied metadata as verified provider output or trust an ID allowlist as authorization.
6. With an approved test account, demonstrate select, cancel, deny, expiry, account switching, inaccessible file, no arbitrary-folder traversal, reconnect, disconnect, browser-memory cleanup, and keyboard/mobile behavior. Recheck Google verification requirements for the final scope set.

Until those gates are met, there is no Picker button, new browser token route, new credential, or new production permission. Docs export and Calendar remain separate work; this evaluation does not silently activate them.
