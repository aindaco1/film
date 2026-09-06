# Provider Review Preparation

This document owns reviewer preparation, scope justifications and recording steps. [Project Status](PROJECT_STATUS.md#provider-posture) owns activation, approval blockers and next steps; [dated provider evidence](release-evidence/2026-09-06-provider-followup.md) records portal and account observations. Never include account credentials, tokens, private folder links or business identity documents in this repository.

## Shared Product Statement

Film by Dust Wave is a production workspace for solo filmmakers and small teams. Core screenplay and production planning work remains local and private by default. Optional integrations are initiated by an authorized workspace owner or producer. Film is not a social publishing application; publishing remains in Social. Provider tokens are encrypted and held by the Worker, never returned to the browser.

Public app: https://film.dustwave.xyz. Privacy, terms, and deletion information are linked from the application. Reviewer access must use a separately authorized Film account/workspace, not the operator's credentials or the Big Sword production workspace. The public isolated demo is useful for general UI review but cannot demonstrate real provider consent or reads.

## Meta: Facebook-Only Submission Scope

Use Film's existing **Fumblers LLC dba Dust Wave** business portfolio. Confirm its authorized administrator and legal/alternative names before submitting declarations; do not create a duplicate or use an unrelated portfolio. The portfolio assignment and verification observations are retained in [Meta evidence](release-evidence/2026-09-06-provider-followup.md#meta-portal-observations).

The first review should cover the working Facebook-only flow. Do not request Instagram permissions until a consented professional Instagram account is linked to the test Page and its own acceptance chain has passed.

| Permission | Draft justification | Reviewer evidence |
| --- | --- | --- |
| `pages_show_list` | Film lists the Facebook Pages managed by the signed-in person so an authorized Film owner or producer can deliberately select a Page for their workspace. It does not choose unrelated Pages or expose Page tokens. | Connect, grant the test Page, list eligible Pages, select the named Page. |
| `pages_read_engagement` | Film reads the selected managed Page's identity and published Page content for a read-only project social calendar. It does not create, edit, delete, or publish content, or read private messages. | Show the chosen Page and a bounded calendar read; demonstrate any empty result honestly. |
| `read_insights` | Film displays aggregate engagement, follower, and media-view metrics for the selected managed Page over a bounded date range. It does not profile individuals or access unrelated accounts. | Show the selected Page, date range, successful insights response, and the three rendered series. |

`public_profile` is part of the login prerequisite, not a reason to collect extra profile information. Do not request email, ads, publishing, messaging, public-content discovery, or business-management scopes for this flow.

### Submission Checklist

1. Confirm the legal operator's business portfolio and authorized administrator. Assigning app ownership requires a separate explicit confirmation; a Facebook Page is not a business portfolio.
2. Complete the business/access verification required by the actual app dashboard. Film serving other filmmakers' businesses is a different deployment posture from an owner-only development test.
3. Establish a dedicated reviewer workspace and supported reviewer login path. Film currently uses member-only magic-link authentication; do not give reviewers the owner's mailbox or bypass account authorization. Confirm how reviewers will receive their own permitted access before submission.
4. In a controlled test window, enable only the approved Facebook-only configuration and record the real sequence below. Do not submit a video of mocked API responses as provider evidence.
5. Confirm icon, display name, site URL, privacy, terms, deauthorization, and deletion URLs are current. Open every public policy page while signed out.
6. Add only the permissions above to a draft after confirming the requested access. Paste the scoped justifications, exact reviewer steps, and the real recording; review any legal declarations with the operator before submitting.
7. Verify the resulting submission status. Do not enable general-user access just because local tests pass or test calls are marked Active.

### Recording Script

1. Open Film; sign in as the separately authorized test/reviewer account without showing a magic-link token or inbox contents.
2. Open Integrations, select Meta insights, and check connection readiness.
3. Connect through Film's Facebook-only Login for Business configuration. Show the exact consented permissions and named test Page, not a broad grant.
4. Select an eligible Page with analytics permission. Show its Facebook-only label if no Instagram account is linked.
5. Read the bounded 30-day calendar and insights. An empty calendar and zero metrics on a new test Page are valid empty results, not evidence of production engagement. Record any unavailable metric as unavailable.
6. Disconnect explicitly. Verify revocation and local credential/mapping cleanup without displaying ciphertext or token contents.

Portal references: [App Review](https://developers.facebook.com/docs/resp-plat-initiatives/appreview/), [access verification](https://developers.facebook.com/docs/development/release/access-verification/). The live Film dashboard, not the existence of these documentation links, determines its current eligibility.

## Google: Testing Versus Public Release

Use [Project Status](PROJECT_STATUS.md#provider-posture) for the approved audience and scope posture and [Google evidence](release-evidence/2026-09-06-provider-followup.md#google-portal-and-live-observations) for dated project/account observations. A Testing exemption does not establish public verification. The [scope evaluation](google-selected-file-evaluation.md) owns the restricted-scope and server-assessment tradeoffs.

Testing authorizations using `drive.metadata.readonly` expire after seven days, including refresh tokens. An `invalid_grant` refresh response must lead to deliberate reconnection, not endless retries or automatic broader consent. Temporary service failures must remain distinct. [Google OAuth token lifecycle](https://developers.google.com/identity/protocols/oauth2)

### Current Scope Justification Draft

Film reads a user-specified Drive folder's immediate child metadata to review external production references. The Worker requests only file identifiers, names, MIME types, modified times, sizes, web links, and pagination metadata. It does not download file bodies, traverse subfolders automatically, edit Drive files, or request Calendar access in the current connection flow. Native Film documents remain canonical. The user can disconnect and delete stored provider credentials.

This is an implementation description, not yet a sufficient restricted-scope justification: the OAuth permission itself is account-wide metadata access, even though Film's requests are bounded to the chosen folder. Do not claim that selecting a folder narrows Google's underlying grant.

### Product Decision Before Public Verification

Resolve the [selected-file evaluation](google-selected-file-evaluation.md#what-actually-changes) before choosing a public-review path. It owns the comparison with metadata-only access, the browser-token/write-capable scope tradeoffs, the feasibility boundary and the activation requirements. Retain the approved owner-only connection until that decision is made; do not silently swap scopes or publish the OAuth app merely to remove the testing expiry. Apply [Google minimum-scope guidance](https://support.google.com/cloud/answer/13807380?hl=en) to the chosen contract.

### Owner Acceptance and Public Review Evidence

1. Use the existing signed-in Film owner and the approved Google test user.
2. Check the saved connection, including token usability, not just row status or configured secrets.
3. Reauthorize through the exact Film callback, metadata-only scope, PKCE, and one-time state. Hand off unverified-app warnings or additional consent decisions when required; never synthesize a provider callback.
4. Read only a user-approved non-sensitive test folder. Record aggregate counts, bounded pagination, returned field names, and absence of file-content requests; do not commit the folder's private identifier or contents.
5. Verify refresh and reconnect/error behavior with deterministic fixtures in addition to the live read. A successful empty read does not prove non-empty pagination or long-term refresh acceptance.
6. For public review, prepare matching branding, domain ownership, privacy/data-use disclosures, scope justification, an accurate data-flow diagram, reviewer access, and a real OAuth/feature recording. Resolve the restricted-scope/assessment decision first.

Use the exact callback and credential configuration in [Deployment: Google OAuth](DEPLOYMENT.md#google-oauth). Docs export and Calendar remain separate incremental-consent features; this review packet does not authorize them.
