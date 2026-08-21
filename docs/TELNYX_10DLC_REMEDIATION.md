# Telnyx 10DLC 603 remediation

Use one identity chain throughout registration and public review:

- Registered operator/brand: `Dust Wave`
- Product and SMS program: `Film by Dust Wave`
- Production context: `Big Sword`

`Big Sword` is a production title, not the sender or registered business. Every sample message must begin with `Film by Dust Wave:`.

Before resubmission, confirm the verified Telnyx brand's exact display name is `Dust Wave`. If the verified value differs, do not submit this packet until the website and campaign use the exact verified value.

## Public review URLs

- Application: `https://film.dustwave.xyz/`
- SMS terms and call to action: `https://film.dustwave.xyz/sms.html`
- Consent screenshot: `https://film.dustwave.xyz/sms-consent-review.png`
- Privacy: `https://film.dustwave.xyz/privacy.html`
- Terms: `https://film.dustwave.xyz/terms.html`
- Operator contact: `https://dustwave.xyz/contact.html`

## Campaign fields

Vertical: `Entertainment`

Use case: `Low Volume Mixed`

Campaign description:

> Film by Dust Wave is a private production operations workspace for invited film crews. Crew members who explicitly opt in receive non-marketing messages about call-sheet availability and delivery, production schedule changes, and time-sensitive production safety or location updates. Messages are sent only for the production workspace in which the crew member enrolled.

Opt-in workflow description:

> Invited crew members sign in to Film at https://film.dustwave.xyz, open the SMS enrollment form, enter their own mobile number, choose one or more categories (Call sheets, Schedule changes, or Safety and locations), and check an unchecked consent box. The box states: "I agree to receive recurring production operations text messages from Film by Dust Wave for the categories selected above. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of employment or participation." The crew member then submits Enable crew texts. Workspace membership alone does not enroll a number. The public terms and enrollment screenshot are available at https://film.dustwave.xyz/sms.html and https://film.dustwave.xyz/sms-consent-review.png.

Opt-in keywords: `START,YES`

Opt-out keywords: `STOP,UNSUBSCRIBE`

Help keywords: `HELP`

Opt-in message:

> Film by Dust Wave: You are enrolled for production operations texts. Frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.

Opt-out message:

> Film by Dust Wave: You are unsubscribed and will receive no further messages.

Help message:

> Film by Dust Wave support: Visit https://film.dustwave.xyz/sms.html for help. Msg & data rates may apply. Reply STOP to opt out.

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

## Resubmission rule

Do not appeal the unchanged campaign. If Telnyx permits field edits, replace the description, message flow, responses, and samples with the values above before resubmitting. If those fields are locked, create a corrected campaign. Use an appeal only after an external website-only issue has been corrected or after Telnyx confirms the corrected campaign values are attached to the appeal.

For a website-only appeal after deployment:

> The public Film website has been updated to consistently identify the program as Film by Dust Wave and to state that Dust Wave operates Film. The placeholder Acme Films workspace identity was removed. Big Sword is identified only as a production title. The root application, SMS terms, privacy policy, terms, and public consent screenshot now present the same sender, use case, and opt-in flow.
