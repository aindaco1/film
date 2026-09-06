# Film SMS Program

This is the maintained registration and consent contract, not a pending resubmission task. The earlier 603 identity mismatch was resolved; approved-campaign and owned-number acceptance are recorded in [Telnyx evidence](release-evidence/2026-09-05-telnyx-activation.md). [Project Status](PROJECT_STATUS.md) owns current activation state and [Operations](OPERATIONS.md#telnyx-consent-and-webhook-activation) owns provisioning/retest steps.

Use one identity chain throughout registration and public review:

- Registered operator/brand: `Dust Wave`
- Product and SMS program: `Film by Dust Wave`
- Production context: `Big Sword`

`Big Sword` is a production title, not the sender or registered business. Every sample message must begin with `Film by Dust Wave:`.

Before any future registration edit, confirm the verified brand's exact display name matches this identity chain. Do not create another brand/campaign merely because this document contains example registration fields. The legal operator is Fumblers LLC dba Dust Wave; the product and production title do not replace that legal identity.

## Public review URLs

- Application: `https://film.dustwave.xyz/`
- SMS terms and call to action: `https://film.dustwave.xyz/sms.html`
- Consent screenshot: `https://film.dustwave.xyz/sms-consent-review.png`
- Privacy: `https://film.dustwave.xyz/privacy.html`
- Terms: `https://film.dustwave.xyz/terms.html`
- Operator contact: `https://dustwave.xyz/contact.html`

## Registration Examples

These examples preserve the intended non-marketing program and disclosure. They are not a verbatim export of the current Telnyx portal. Recheck provider settings before changing them; the accepted handset HELP response is documented in the dated evidence above.

Vertical: `Entertainment`

Use case: `Low Volume Mixed`

Campaign description:

> Film by Dust Wave is a private production operations workspace for invited film crews. Crew members who explicitly opt in receive non-marketing messages about call-sheet availability and delivery, production schedule changes, and time-sensitive production safety or location updates. Messages are sent only for the production workspace in which the crew member enrolled.

Opt-in workflow description:

> Invited crew members sign in to Film at https://film.dustwave.xyz, open the SMS enrollment form, enter their own mobile number, choose one or more categories (Call sheets, Schedule changes, or Safety and locations), and check an unchecked consent box. The box states: "I agree to receive recurring production operations text messages from Film by Dust Wave for the categories selected above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of employment or participation." The crew member then submits Enable crew texts. Workspace membership alone does not enroll a number. The public terms and enrollment screenshot are available at https://film.dustwave.xyz/sms.html and https://film.dustwave.xyz/sms-consent-review.png.

Opt-in keywords: `START`

Opt-out keywords: `STOP,UNSUBSCRIBE`

Help keywords: `HELP`

Opt-in message:

> Film by Dust Wave: START received. To enroll or re-enroll for crew texts, sign in at https://film.dustwave.xyz and enable crew texts. Frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.

Opt-out message:

> Film by Dust Wave: You are unsubscribed and will receive no further messages.

Help message:

> Film by Dust Wave support: Visit https://film.dustwave.xyz/sms.html for help. Frequency varies. Msg & data rates may apply. Reply STOP to opt out.

Sample 1:

> Film by Dust Wave: Big Sword's call sheet for July 18 is ready in Film. Reply STOP to opt out or HELP for help.

Sample 2:

> Film by Dust Wave: Big Sword's call time changed to 6:30 AM on July 18. Check Film for details. Reply STOP to opt out or HELP for help.

Sample 3:

> Film by Dust Wave: Big Sword location update: use the south parking entrance today. Reply STOP to opt out or HELP for help.

Privacy policy: `https://film.dustwave.xyz/privacy.html`

Terms and conditions: `https://film.dustwave.xyz/sms.html`

Campaign attributes:

- Embedded link: `No` (the representative production messages above contain no links)
- Embedded phone number: `No`
- Number pooling: `No`
- Age-gated content: `No`
- Direct lending or loan arrangement: `No`

Leave campaign provisioning webhook fields blank unless Telnyx provisioning events are explicitly being consumed. The messaging profile's inbound message webhook is a separate setting.

## Consent And Identity Invariants

- Keep the public application, SMS terms, disclosure and representative messages consistent with the registered operator and non-marketing use case. The original 603 remediation removed conflicting placeholder identities; it is historical, not an open blocker.
- Workspace membership is not SMS consent. Enrollment requires an explicit category selection and unchecked disclosure acknowledgment.
- STOP revokes Film consent. A carrier START acknowledgment does not re-enroll a recipient in Film; a fresh explicit enrollment is required.
- An owned-number acceptance test does not authorize crew-wide or promotional messages.
- Preserve the shared program name and disclosure from `packages/providers`; [the consistency test](../apps/web/test/sms-campaign-consistency.test.ts) checks this document and the public terms against that contract.
