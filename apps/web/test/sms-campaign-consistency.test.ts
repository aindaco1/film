import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  TELNYX_SMS_CATEGORIES,
  TELNYX_SMS_CATEGORY_LABELS,
  TELNYX_SMS_CONSENT_DISCLOSURE,
  TELNYX_SMS_PROGRAM_NAME,
  TELNYX_SMS_SENDER_PREFIX,
} from "@film/providers";

describe("Telnyx campaign surface consistency", () => {
  it("keeps the public CTA and carrier resubmission packet aligned with the shared program contract", async () => {
    const [smsTerms, remediation] = await Promise.all([
      readFile("public/sms.html", "utf8"),
      readFile("../../docs/TELNYX_10DLC_REMEDIATION.md", "utf8"),
    ]);

    expect(smsTerms).toContain(`<strong>${TELNYX_SMS_PROGRAM_NAME}</strong>`);
    expect(remediation).toContain(`Product and SMS program: \`${TELNYX_SMS_PROGRAM_NAME}\``);
    expect(remediation).toContain(TELNYX_SMS_CONSENT_DISCLOSURE);
    for (const category of TELNYX_SMS_CATEGORIES) {
      expect(TELNYX_SMS_CATEGORY_LABELS[category]).toBeTruthy();
    }
    const samples = remediation.match(/^> Film by Dust Wave:.*$/gm) ?? [];
    expect(samples.length).toBeGreaterThanOrEqual(5);
    expect(samples.every((sample) => sample.startsWith(`> ${TELNYX_SMS_SENDER_PREFIX}`))).toBe(true);
    for (const sample of samples.slice(-3)) {
      expect(sample).toContain("Reply STOP to opt out");
    }
  });

  it("renders and validates SMS categories from the shared catalog", async () => {
    const [webSource, consentSource, sendSource] = await Promise.all([
      readFile("src/main.ts", "utf8"),
      readFile("../worker/src/sms-consent.ts", "utf8"),
      readFile("../worker/src/telnyx-send.ts", "utf8"),
    ]);

    expect(webSource).toContain("TELNYX_SMS_CATEGORIES.map");
    expect(webSource).toContain("isTelnyxSmsCategory(category)");
    expect(consentSource).toContain("SMS_CONSENT_CATEGORIES = TELNYX_SMS_CATEGORIES");
    expect(sendSource).toContain("FILM_SMS_SENDER_PREFIX = TELNYX_SMS_SENDER_PREFIX");
    expect(`${webSource}\n${consentSource}`).not.toContain(
      '["call_sheet", "schedule_change", "safety_location_alert"]',
    );
  });
});
