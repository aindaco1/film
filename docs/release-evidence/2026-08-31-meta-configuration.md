# Meta Read-Only Configuration Evidence - 2026-08-31

## Boundary

- Film uses a dedicated Meta Business app in Development mode. Publishing remains owned by the Social application.
- `META_OAUTH_MODE=disabled` remains the production interaction gate. This evidence does not claim App Review approval, account consent, Page selection, analytics acceptance, or Live-mode readiness.
- Secret values, access tokens, signed requests, and recovery values are not recorded here.

## Portal Configuration

- Meta app: `Film` (`4380217052290003`).
- Facebook Login for Business configuration: `Film Read Only` (`2239436700246794`), General variation, user access token.
- Requested permissions are limited to `pages_show_list`, `pages_read_engagement`, `read_insights`, `instagram_basic`, and `instagram_manage_insights`.
- OAuth redirect: `https://api.film.dustwave.xyz/api/providers/meta/oauth/callback`.
- Deauthorization callback: `https://api.film.dustwave.xyz/api/webhooks/meta/deauthorize`.
- Data-deletion callback: `https://api.film.dustwave.xyz/api/webhooks/meta/data-deletion`.
- App domains, contact email, privacy policy, terms, category, strict HTTPS redirect, and the callback settings were saved in the Meta portal.
- App Review currently reports Standard access, zero ready-to-use calls, and no review request for each of the five read-only permissions. `public_profile` is automatically granted at Standard access but reports verification required. This is an owned app-role development posture, not general customer approval.

## Worker Configuration

- Wrangler stores `META_OAUTH_CLIENT_ID`, `META_OAUTH_CLIENT_SECRET`, `META_LOGIN_CONFIGURATION_ID`, and an independently generated 32-byte `META_TOKEN_ENCRYPTION_KEY` as secret bindings.
- Proton Pass stores a Film-specific private recovery note containing the App Secret and the same independent token-encryption key. The key was synchronized to Wrangler before any Meta connection existed.
- `npm run check:deploy:strict -- --wrangler-secrets` found 16 remote secret names and no deployment-readiness blockers while Meta remained explicitly disabled.
- `/health` returned HTTP 200 with production auth and invite delivery still live.

## Signed Callback Acceptance

- A valid signed deauthorization fixture returned HTTP 200, zero deleted connections, and `secretValuesExposed: false`.
- A valid signed data-deletion fixture returned HTTP 200 with a status URL and confirmation code; replay returned the same confirmation.
- The generated status URL returned HTTP 200, `provider: meta`, `status: completed`, and zero deleted connections.
- An invalid signed request returned HTTP 403.
- Remote D1 reported zero Meta connections and one completed synthetic deletion-request record after the smoke.

## Remaining Gates

1. Complete Meta data handling and any required Advanced Access/App Review steps.
2. Confirm the owned Facebook Page and linked Instagram professional account for the smoke.
3. Enable `META_OAUTH_MODE=live`, then connect, select the Page, read a bounded 30-day result, disconnect, and verify no token ciphertext or mapping remains in D1.
4. Keep the Meta app in Development mode and the Worker interaction gate disabled if any acceptance step fails.
