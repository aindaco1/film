import { describe, expect, it } from "vitest";
import {
  decryptSmsRecipient,
  encryptSmsRecipient,
  hashSmsRecipient,
  hasValidSmsRecipientEncryptionKey,
  hasValidSmsRecipientHashKey,
  normalizeSmsRecipient,
  smsRecipientAdditionalData,
} from "../src/sms-identity";

describe("SMS recipient identity", () => {
  it("accepts only canonical E.164 input", () => {
    expect(normalizeSmsRecipient(" +15555550100 ")).toBe("+15555550100");
    expect(normalizeSmsRecipient("15555550100")).toBeNull();
    expect(normalizeSmsRecipient("+1 (555) 555-0100")).toBeNull();
    expect(normalizeSmsRecipient("+0123456789")).toBeNull();
    expect(normalizeSmsRecipient("+1234567")).toBeNull();
  });

  it("encrypts recipient identity with workspace and record-bound authenticated data", async () => {
    const key = base64(new Uint8Array(32).fill(17));
    const additionalData = smsRecipientAdditionalData("workspace_acme", "sms_recipient_a");
    const encrypted = await encryptSmsRecipient("+15555550100", key, additionalData);

    expect(encrypted).not.toContain("+15555550100");
    await expect(decryptSmsRecipient(encrypted, key, additionalData)).resolves.toBe("+15555550100");
    await expect(decryptSmsRecipient(
      encrypted,
      key,
      smsRecipientAdditionalData("workspace_other", "sms_recipient_a"),
    )).rejects.toThrow();
  });

  it("uses a keyed workspace-scoped hash instead of plain recipient hashing", async () => {
    const hashKey = base64(new Uint8Array(32).fill(23));
    const first = await hashSmsRecipient("+15555550100", hashKey, "workspace_acme");
    const second = await hashSmsRecipient("+15555550100", hashKey, "workspace_other");

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("15555550100");
    expect(second).not.toBe(first);
  });

  it("requires independent 256-bit encryption and hash keys", () => {
    const valid = base64(new Uint8Array(32));
    const short = base64(new Uint8Array(16));
    expect(hasValidSmsRecipientEncryptionKey(valid)).toBe(true);
    expect(hasValidSmsRecipientHashKey(valid)).toBe(true);
    expect(hasValidSmsRecipientEncryptionKey(short)).toBe(false);
    expect(hasValidSmsRecipientHashKey(short)).toBe(false);
  });
});

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
