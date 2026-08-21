# ADR 0214: Read-Only Meta Social Analytics

Date: 2026-07-10

## Status

Accepted for MVP implementation. Live OAuth remains blocked.

## Decision

Use a Meta app with Facebook Login for Business as Film's first social integration. V1 reads analytics and calendar metadata for an explicitly connected Facebook Page and its linked Instagram professional account.

Request only:

- `pages_show_list`
- `pages_read_engagement`
- `read_insights`
- `instagram_basic`
- `instagram_manage_insights`

Do not request `pages_manage_posts`, `instagram_content_publish`, `ads_management`, `ads_read`, or another write/advertising permission in v1. Film does not publish, schedule provider-side posts, moderate comments, send messages, or mutate account data. The separate Social application remains the publishing system.

Film's content calendar is a local read model derived from provider media timestamps, captions or labels needed for identification, and bounded engagement summaries. It is not a publishing queue.

Primary sources checked on 2026-07-10:

- https://developers.facebook.com/documentation/instagram-platform/insights
- https://developers.facebook.com/docs/permissions#pages_read_engagement
- https://developers.facebook.com/docs/development/create-an-app
- https://developers.facebook.com/docs/app-review

## Access Rollout

1. Start with Standard Access for Dust Wave-owned or managed accounts added to the Meta App Dashboard.
2. Complete Business Verification, data handling questions, App Review, and Advanced Access before connecting accounts Film does not own or manage.
3. Demonstrate the complete consent flow and read-only insight surfaces in the App Review screencast.
4. Keep ad and boosted-media aggregate metrics out of v1 so `ads_management` and `ads_read` are unnecessary.

## Live Gates

1. Create the Meta app, configure exact production OAuth redirect URIs, and keep the app in development mode during the owned-account smoke.
2. Store access and refreshable token material only in the Worker using the existing encrypted provider-connection pattern; never return tokens to browser storage or exports.
3. Persist explicit workspace-to-Page-to-Instagram mappings and require an owner or producer to change them.
4. Bound analytics reads by project, account, date window, metric allowlist, pagination, and response size.
5. Verify Meta webhook signatures and deduplicate event IDs before any background refresh is enabled.
6. Define token renewal, deauthorization, data deletion callback, retention, and disconnected-account cleanup behavior.
7. Add OAuth state tests, scope regression tests, read fixtures, rate-limit behavior, disconnect tests, and one owned-account smoke before enabling live mode.

## Consequences

- Film can provide a useful cross-network production calendar and analytics summary without becoming another publisher.
- The App Review scope is smaller and easier to explain because all write, messaging, comment, and ad-management permissions are absent.
- Published content continues to originate from the Social application; Film only reflects provider state.
- External customer accounts remain blocked until Meta Advanced Access and data handling requirements are complete.
