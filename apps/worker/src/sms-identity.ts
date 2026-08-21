export const SMS_RECIPIENT_KEY_VERSION = "v1";

export function normalizeSmsRecipient(value: string): string | null {
  const normalized = value.trim();
  return /^\+[1-9][0-9]{7,14}$/.test(normalized) ? normalized : null;
}

export function hasValidSmsRecipientEncryptionKey(encodedKey: string): boolean {
  return base64ToBytes(encodedKey)?.byteLength === 32;
}

export function hasValidSmsRecipientHashKey(encodedKey: string): boolean {
  return base64ToBytes(encodedKey)?.byteLength === 32;
}

export function smsRecipientAdditionalData(workspaceId: string, recipientId: string): string {
  return `telnyx|${workspaceId}|${recipientId}|recipient|${SMS_RECIPIENT_KEY_VERSION}`;
}

export async function encryptSmsRecipient(
  e164: string,
  encodedKey: string,
  additionalData: string,
): Promise<string> {
  const normalized = normalizeSmsRecipient(e164);
  if (!normalized) throw new Error("invalid_sms_recipient");
  const key = await importKey(encodedKey, "AES-GCM", ["encrypt"], "invalid_sms_recipient_encryption_key");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: copyArrayBuffer(iv),
      additionalData: copyArrayBuffer(new TextEncoder().encode(additionalData)),
    },
    key,
    copyArrayBuffer(new TextEncoder().encode(normalized)),
  );
  return `${SMS_RECIPIENT_KEY_VERSION}.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptSmsRecipient(
  encryptedRecipient: string,
  encodedKey: string,
  additionalData: string,
): Promise<string> {
  const [version, encodedIv, encodedCiphertext, ...extra] = encryptedRecipient.split(".");
  if (version !== SMS_RECIPIENT_KEY_VERSION || !encodedIv || !encodedCiphertext || extra.length > 0) {
    throw new Error("invalid_sms_recipient_ciphertext");
  }
  const iv = base64ToBytes(encodedIv);
  const ciphertext = base64ToBytes(encodedCiphertext);
  if (!iv || iv.byteLength !== 12 || !ciphertext) {
    throw new Error("invalid_sms_recipient_ciphertext");
  }
  const key = await importKey(encodedKey, "AES-GCM", ["decrypt"], "invalid_sms_recipient_encryption_key");
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: copyArrayBuffer(iv),
      additionalData: copyArrayBuffer(new TextEncoder().encode(additionalData)),
    },
    key,
    copyArrayBuffer(ciphertext),
  );
  const normalized = normalizeSmsRecipient(new TextDecoder().decode(plaintext));
  if (!normalized) throw new Error("invalid_sms_recipient_ciphertext");
  return normalized;
}

export async function hashSmsRecipient(
  e164: string,
  encodedHashKey: string,
  workspaceId: string,
): Promise<string> {
  const normalized = normalizeSmsRecipient(e164);
  if (!normalized) throw new Error("invalid_sms_recipient");
  const key = await importKey(encodedHashKey, "HMAC", ["sign"], "invalid_sms_recipient_hash_key");
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    copyArrayBuffer(new TextEncoder().encode(`${workspaceId}|${normalized}`)),
  );
  return bytesToHex(new Uint8Array(digest));
}

async function importKey(
  encodedKey: string,
  algorithm: "AES-GCM" | "HMAC",
  usages: KeyUsage[],
  errorCode: string,
): Promise<CryptoKey> {
  const bytes = base64ToBytes(encodedKey);
  if (!bytes || bytes.byteLength !== 32) throw new Error(errorCode);
  return crypto.subtle.importKey(
    "raw",
    copyArrayBuffer(bytes),
    algorithm === "HMAC" ? { name: "HMAC", hash: "SHA-256" } : "AES-GCM",
    false,
    usages,
  );
}

function base64ToBytes(value: string): Uint8Array | null {
  if (!value || value.length > 128 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
