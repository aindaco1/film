export const META_SIGNED_REQUEST_MAX_BYTES = 16 * 1024;

export type VerifiedMetaSignedRequest = {
  userId: string;
  issuedAt: string | null;
  requestFingerprint: string;
};

export async function verifyMetaSignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<VerifiedMetaSignedRequest> {
  if (!appSecret || appSecret.length < 16 || appSecret.length > 256) {
    throw new Error("invalid_meta_app_secret");
  }
  if (!signedRequest || signedRequest.length > META_SIGNED_REQUEST_MAX_BYTES) {
    throw new Error("invalid_meta_signed_request");
  }
  const [encodedSignature, encodedPayload, ...extra] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload || extra.length > 0) throw new Error("invalid_meta_signed_request");
  const signature = base64UrlToBytes(encodedSignature);
  const payloadBytes = base64UrlToBytes(encodedPayload);
  if (!signature || signature.byteLength !== 32 || !payloadBytes || payloadBytes.byteLength > 8 * 1024) {
    throw new Error("invalid_meta_signed_request");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)));
  if (!constantTimeBytesEqual(signature, expected)) throw new Error("invalid_meta_signed_request_signature");

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payloadBytes));
  } catch {
    throw new Error("invalid_meta_signed_request_payload");
  }
  if (!isRecord(payload) || String(payload.algorithm ?? "").toUpperCase() !== "HMAC-SHA256") {
    throw new Error("invalid_meta_signed_request_algorithm");
  }
  const userId = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
  if (!/^\d{5,40}$/.test(userId)) throw new Error("invalid_meta_signed_request_user");
  const issuedAtSeconds = typeof payload.issued_at === "number" && Number.isSafeInteger(payload.issued_at)
    ? payload.issued_at
    : null;
  if (issuedAtSeconds !== null && issuedAtSeconds * 1000 > Date.now() + 5 * 60 * 1000) {
    throw new Error("invalid_meta_signed_request_time");
  }
  return {
    userId,
    issuedAt: issuedAtSeconds === null ? null : new Date(issuedAtSeconds * 1000).toISOString(),
    requestFingerprint: await sha256Hex(signedRequest),
  };
}

export function createMetaDeletionConfirmationCode(): string {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function metaUserIdSha256(userId: string): Promise<string> {
  if (!/^\d{5,40}$/.test(userId)) throw new Error("invalid_meta_user_id");
  return sha256Hex(userId);
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function constantTimeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  const maxLength = Math.max(left.byteLength, right.byteLength);
  let mismatch = left.byteLength ^ right.byteLength;
  for (let index = 0; index < maxLength; index += 1) mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return mismatch === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
