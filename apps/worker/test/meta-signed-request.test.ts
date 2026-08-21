import { describe, expect, it } from "vitest";
import {
  createMetaDeletionConfirmationCode,
  metaUserIdSha256,
  verifyMetaSignedRequest,
} from "../src/meta-signed-request";

const signingKeyFixture = "x".repeat(32);

describe("Meta signed requests", () => {
  it("verifies an HMAC-SHA256 app-scoped user payload", async () => {
    const signedRequest = await sign({
      algorithm: "HMAC-SHA256",
      user_id: "123456789012345",
      issued_at: Math.floor(Date.now() / 1000),
    });
    const verified = await verifyMetaSignedRequest(signedRequest, signingKeyFixture);

    expect(verified.userId).toBe("123456789012345");
    expect(verified.issuedAt).toBeTruthy();
    expect(verified.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects tampering, algorithm changes, and invalid users", async () => {
    const signed = await sign({ algorithm: "HMAC-SHA256", user_id: "123456789012345" });
    await expect(verifyMetaSignedRequest(`${signed.slice(0, -1)}A`, signingKeyFixture)).rejects.toThrow();
    await expect(verifyMetaSignedRequest(
      await sign({ algorithm: "none", user_id: "123456789012345" }),
      signingKeyFixture,
    )).rejects.toThrow("invalid_meta_signed_request_algorithm");
    await expect(verifyMetaSignedRequest(
      await sign({ algorithm: "HMAC-SHA256", user_id: "not-a-user" }),
      signingKeyFixture,
    )).rejects.toThrow("invalid_meta_signed_request_user");
  });

  it("creates opaque alphanumeric status codes and hashes user IDs", async () => {
    const left = createMetaDeletionConfirmationCode();
    const right = createMetaDeletionConfirmationCode();
    expect(left).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(right).not.toBe(left);
    await expect(metaUserIdSha256("123456789012345")).resolves.toMatch(/^[a-f0-9]{64}$/);
  });
});

async function sign(payload: Record<string, unknown>): Promise<string> {
  const encodedPayload = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKeyFixture),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)));
  return `${base64Url(signature)}.${encodedPayload}`;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
