# ADR 0216: Activate Metadata-Only Google OAuth

## Status

Accepted.

## Context

ADR 0212 kept production Google OAuth disabled until the consent copy, client credentials, production callback, least-privilege scope, and operating owner were approved. Those gates are now complete for the external testing audience in Google Cloud project `film-502013`.

## Decision

Enable `GOOGLE_OAUTH_MODE=live` with only `https://www.googleapis.com/auth/drive.metadata.readonly`. Keep Google credentials and the existing token-encryption key in Worker secrets, with operator recovery copies under Film-specific Keychain service names. Allow only `https://film.dustwave.xyz` as the web origin and `https://api.film.dustwave.xyz/api/providers/google/oauth/callback` as the callback.

The production operator smoke must fail closed unless Google reports live readiness and an authorization start produces the exact metadata scope, production callback, PKCE S256 challenge, offline access, granular consent, and Google authorization origin. The probe must not navigate to consent, exchange a code, or store a Google token.

Keep the app in Google's external testing audience until verification and publication are intentionally approved. Drive file-content reads, Docs export, Calendar access, and background webhook sync remain separate consent and implementation increments.

## Consequences

- An owner or producer can explicitly begin Google consent; no connection exists before that action.
- At activation time production readiness expected five live provider gates. ADR 0223 later disabled unmapped Pool/Store/Stripe summaries, so the current truthful production posture is two live provider families (Resend and Google) and five blocked families.
- Meta Insights and Telnyx SMS remain blocked production contracts.
- Any Google incident can be contained by restoring `GOOGLE_OAUTH_MODE=dry_run` without deleting encrypted connection rows or rotating the token key.
