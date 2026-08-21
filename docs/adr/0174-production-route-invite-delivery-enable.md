# ADR 0174: Configure Production Route and Invite Delivery

## Status

Accepted

## Decision

Configure the Film Worker for the Dust Wave production custom domain `api.film.dustwave.xyz`, add `https://film.dustwave.xyz` to `ALLOWED_ORIGINS`, set `INVITE_APP_ORIGIN=https://film.dustwave.xyz`, and enable invite sending with `INVITE_DELIVERY_MODE=live`.

Use `Film <invites@dustwave.xyz>` as the invite sender because the Resend account already has the root `dustwave.xyz` domain verified. Store the Resend webhook signing secret only as the Cloudflare Worker secret `INVITE_DELIVERY_WEBHOOK_SECRET`.

Deploy the static app as the separate `film-web` Worker with static assets and the custom domain `film.dustwave.xyz`, keeping the API Worker and browser app deploy targets separate.

## Context

Deployment readiness had only production identity and invite-delivery blockers remaining after remote Wrangler secrets were counted: app origin, Worker route, invite sender, invite app origin, Resend webhook signing secret, and live delivery mode.

Pool and Store already use explicit `dustwave.xyz` zone routes rather than `workers.dev`, and Film keeps `workers_dev = false`.

## Consequences

- `npm run check:deploy -- --wrangler-secrets` and `npm run check:deploy:strict` can now act as real production readiness gates for Worker configuration.
- Browser CORS allows the production app origin plus local Vite origins.
- Live invite sends remain Worker-owned and require the Resend key, sender, app origin, webhook secret, and live mode.
- Static app hosting uses Workers static assets instead of requiring a separate DNS-write token for Cloudflare Pages.
