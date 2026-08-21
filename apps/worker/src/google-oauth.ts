import * as oauth from "oauth4webapi";

export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const GOOGLE_TOKEN_KEY_VERSION = "v1";
export const GOOGLE_DRIVE_METADATA_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";
export const GOOGLE_DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const GOOGLE_CALENDAR_READ_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";

const googleAuthorizationServer: oauth.AuthorizationServer = {
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  revocation_endpoint: "https://oauth2.googleapis.com/revoke",
  code_challenge_methods_supported: ["S256"],
};

export type GoogleOAuthConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleOAuthRequestedCapabilities = {
  includeDocsExport?: boolean;
  includeCalendarSync?: boolean;
};

export type GoogleOAuthAuthorization = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  scopes: string[];
};

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scopes: string[];
  expiresAt: string | null;
};

export function googleOAuthScopes(capabilities: GoogleOAuthRequestedCapabilities): string[] {
  const includeDocsExport = capabilities.includeDocsExport ?? false;
  return [
    includeDocsExport ? GOOGLE_DRIVE_READ_SCOPE : GOOGLE_DRIVE_METADATA_SCOPE,
    ...(capabilities.includeCalendarSync ? [GOOGLE_CALENDAR_READ_SCOPE] : []),
  ];
}

export async function createGoogleOAuthAuthorization(
  configuration: GoogleOAuthConfiguration,
  capabilities: GoogleOAuthRequestedCapabilities,
): Promise<GoogleOAuthAuthorization> {
  const state = oauth.generateRandomState();
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  const scopes = googleOAuthScopes(capabilities);
  const authorizationUrl = new URL(googleAuthorizationServer.authorization_endpoint ?? "");
  authorizationUrl.searchParams.set("client_id", configuration.clientId);
  authorizationUrl.searchParams.set("redirect_uri", configuration.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", scopes.join(" "));
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("include_granted_scopes", "true");
  authorizationUrl.searchParams.set("enable_granular_consent", "true");
  authorizationUrl.searchParams.set("prompt", "consent");

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
    codeVerifier,
    scopes,
  };
}

export async function exchangeGoogleAuthorizationCode(
  configuration: GoogleOAuthConfiguration,
  callbackUrl: URL,
  expectedState: string,
  codeVerifier: string,
  requestedScopes: string[],
  fetcher: typeof fetch = fetch,
): Promise<GoogleOAuthTokens> {
  const client: oauth.Client = { client_id: configuration.clientId };
  const callbackParameters = oauth.validateAuthResponse(
    googleAuthorizationServer,
    client,
    callbackUrl.searchParams,
    expectedState,
  );
  const tokenResponse = await oauth.authorizationCodeGrantRequest(
    googleAuthorizationServer,
    client,
    oauth.ClientSecretPost(configuration.clientSecret),
    callbackParameters,
    configuration.redirectUri,
    codeVerifier,
    { [oauth.customFetch]: fetcher },
  );
  const tokens = await oauth.processAuthorizationCodeResponse(
    googleAuthorizationServer,
    client,
    tokenResponse,
  );
  const expiresAt = typeof tokens.expires_in === "number"
    ? new Date(Date.now() + Math.max(0, tokens.expires_in - 30) * 1000).toISOString()
    : null;

  return {
    accessToken: tokens.access_token,
    refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
    tokenType: tokens.token_type,
    scopes: normalizeScopes(tokens.scope, requestedScopes),
    expiresAt,
  };
}

export async function refreshGoogleAccessToken(
  configuration: GoogleOAuthConfiguration,
  refreshToken: string,
  existingScopes: string[],
  fetcher: typeof fetch = fetch,
): Promise<GoogleOAuthTokens> {
  const client: oauth.Client = { client_id: configuration.clientId };
  const tokenResponse = await oauth.refreshTokenGrantRequest(
    googleAuthorizationServer,
    client,
    oauth.ClientSecretPost(configuration.clientSecret),
    refreshToken,
    { [oauth.customFetch]: fetcher },
  );
  const tokens = await oauth.processRefreshTokenResponse(
    googleAuthorizationServer,
    client,
    tokenResponse,
  );
  const expiresAt = typeof tokens.expires_in === "number"
    ? new Date(Date.now() + Math.max(0, tokens.expires_in - 30) * 1000).toISOString()
    : null;

  return {
    accessToken: tokens.access_token,
    refreshToken: typeof tokens.refresh_token === "string" ? tokens.refresh_token : refreshToken,
    tokenType: tokens.token_type,
    scopes: normalizeScopes(tokens.scope, existingScopes),
    expiresAt,
  };
}

export async function revokeGoogleToken(token: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  const body = new URLSearchParams({ token });
  const response = await fetcher(googleAuthorizationServer.revocation_endpoint ?? "", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return response.ok;
}

export async function encryptGoogleToken(
  token: string,
  encodedKey: string,
  additionalData: string,
): Promise<string> {
  const key = await importTokenEncryptionKey(encodedKey, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: copyArrayBuffer(iv),
      additionalData: copyArrayBuffer(new TextEncoder().encode(additionalData)),
    },
    key,
    copyArrayBuffer(new TextEncoder().encode(token)),
  );
  return `${GOOGLE_TOKEN_KEY_VERSION}.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptGoogleToken(
  encryptedToken: string,
  encodedKey: string,
  additionalData: string,
): Promise<string> {
  const [version, encodedIv, encodedCiphertext, ...extra] = encryptedToken.split(".");
  if (version !== GOOGLE_TOKEN_KEY_VERSION || !encodedIv || !encodedCiphertext || extra.length > 0) {
    throw new Error("invalid_google_token_ciphertext");
  }
  const iv = base64ToBytes(encodedIv);
  const ciphertext = base64ToBytes(encodedCiphertext);
  if (!iv || iv.byteLength !== 12 || !ciphertext) {
    throw new Error("invalid_google_token_ciphertext");
  }
  const key = await importTokenEncryptionKey(encodedKey, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: copyArrayBuffer(iv),
      additionalData: copyArrayBuffer(new TextEncoder().encode(additionalData)),
    },
    key,
    copyArrayBuffer(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export function hasValidGoogleTokenEncryptionKey(encodedKey: string): boolean {
  return base64ToBytes(encodedKey)?.byteLength === 32;
}

function normalizeScopes(value: unknown, fallback: string[]): string[] {
  const scopes = typeof value === "string"
    ? value.split(/\s+/).map((scope) => scope.trim()).filter(Boolean)
    : fallback;
  return [...new Set(scopes)].sort();
}

async function importTokenEncryptionKey(
  encodedKey: string,
  keyUsages: KeyUsage[],
): Promise<CryptoKey> {
  const bytes = base64ToBytes(encodedKey);
  if (!bytes || bytes.byteLength !== 32) {
    throw new Error("invalid_google_token_encryption_key");
  }
  return crypto.subtle.importKey("raw", copyArrayBuffer(bytes), "AES-GCM", false, keyUsages);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
