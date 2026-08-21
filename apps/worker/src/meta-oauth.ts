export const META_OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const META_TOKEN_KEY_VERSION = "v1";
export const META_REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_manage_insights",
] as const;
export const META_ALLOWED_GRANTED_SCOPES = [...META_REQUIRED_SCOPES, "public_profile"] as const;

export type MetaOAuthConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  graphVersion: string;
  loginConfigurationId: string;
};

export type MetaOAuthAuthorization = {
  authorizationUrl: string;
  state: string;
  scopes: string[];
};

export type MetaOAuthTokens = {
  userAccessToken: string;
  userId: string;
  scopes: string[];
  expiresAt: string | null;
};

export type MetaPageCandidate = {
  id: string;
  name: string;
  tasks: string[];
  instagramAccount: { id: string; username: string | null } | null;
};

export type MetaPageSelection = MetaPageCandidate & {
  pageAccessToken: string;
};

type MetaTokenResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
};

export function hasValidMetaOAuthConfiguration(configuration: MetaOAuthConfiguration): boolean {
  return /^\d{5,40}$/.test(configuration.clientId)
    && configuration.clientSecret.length >= 16
    && configuration.clientSecret.length <= 256
    && /^https:\/\//.test(configuration.redirectUri)
    && /^v\d{1,2}\.\d$/.test(configuration.graphVersion)
    && /^\d{5,40}$/.test(configuration.loginConfigurationId);
}

export function createMetaOAuthAuthorization(configuration: MetaOAuthConfiguration): MetaOAuthAuthorization {
  if (!hasValidMetaOAuthConfiguration(configuration)) throw new Error("invalid_meta_oauth_configuration");
  const state = randomBase64Url(32);
  const authorizationUrl = new URL(`https://www.facebook.com/${configuration.graphVersion}/dialog/oauth`);
  authorizationUrl.searchParams.set("client_id", configuration.clientId);
  authorizationUrl.searchParams.set("redirect_uri", configuration.redirectUri);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("config_id", configuration.loginConfigurationId);
  authorizationUrl.searchParams.set("override_default_response_type", "true");
  authorizationUrl.searchParams.set("scope", META_REQUIRED_SCOPES.join(","));
  return { authorizationUrl: authorizationUrl.toString(), state, scopes: [...META_REQUIRED_SCOPES] };
}

export async function exchangeMetaAuthorizationCode(
  configuration: MetaOAuthConfiguration,
  callbackUrl: URL,
  expectedState: string,
  fetcher: typeof fetch = fetch,
): Promise<MetaOAuthTokens> {
  if (!hasValidMetaOAuthConfiguration(configuration)) throw new Error("invalid_meta_oauth_configuration");
  const state = callbackUrl.searchParams.get("state") ?? "";
  const code = callbackUrl.searchParams.get("code") ?? "";
  if (!constantTimeTextEqual(state, expectedState) || !/^[A-Za-z0-9._-]{8,2048}$/.test(code)) {
    throw new Error("invalid_meta_oauth_callback");
  }
  const tokenUrl = new URL(`${graphOrigin(configuration)}/oauth/access_token`);
  const tokenResponse = await fetcher(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      redirect_uri: configuration.redirectUri,
      code,
    }),
  });
  const shortLived = await readMetaTokenResponse(tokenResponse, "meta_oauth_exchange_failed");
  const scopes = await readAndValidateMetaPermissions(configuration, shortLived.accessToken, fetcher);
  const userId = await readMetaUserId(configuration, shortLived.accessToken, fetcher);
  const longLived = await exchangeLongLivedMetaToken(configuration, shortLived.accessToken, fetcher);
  return {
    userAccessToken: longLived.accessToken,
    userId,
    scopes,
    expiresAt: longLived.expiresAt,
  };
}

export async function listMetaPageCandidates(
  configuration: Pick<MetaOAuthConfiguration, "graphVersion">,
  userAccessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<MetaPageCandidate[]> {
  const url = new URL(`${graphOrigin(configuration)}/me/accounts`);
  url.searchParams.set("fields", "id,name,tasks,instagram_business_account{id,username}");
  url.searchParams.set("limit", "25");
  const response = await fetcher(url, { headers: metaBearerHeaders(userAccessToken) });
  const parsed = await readMetaJson(response, "meta_page_candidates_failed");
  if (!isRecord(parsed) || !Array.isArray(parsed.data)) throw new Error("meta_page_candidates_invalid");
  return parsed.data.flatMap((value) => {
    const candidate = normalizePageCandidate(value);
    return candidate ? [candidate] : [];
  }).slice(0, 25);
}

export async function readMetaPageSelection(
  configuration: Pick<MetaOAuthConfiguration, "graphVersion">,
  userAccessToken: string,
  pageId: string,
  fetcher: typeof fetch = fetch,
): Promise<MetaPageSelection> {
  if (!isMetaId(pageId)) throw new Error("invalid_meta_page_id");
  const url = new URL(`${graphOrigin(configuration)}/${pageId}`);
  url.searchParams.set("fields", "id,name,access_token,tasks,instagram_business_account{id,username}");
  const parsed = await readMetaJson(
    await fetcher(url, { headers: metaBearerHeaders(userAccessToken) }),
    "meta_page_selection_failed",
  );
  const candidate = normalizePageCandidate(parsed);
  const pageAccessToken = isRecord(parsed) ? boundedToken(parsed.access_token) : null;
  if (!candidate || candidate.id !== pageId || !pageAccessToken) throw new Error("meta_page_selection_invalid");
  if (!candidate.tasks.includes("ANALYZE")) throw new Error("meta_page_analyze_task_required");
  if (!candidate.instagramAccount) throw new Error("meta_linked_instagram_account_required");
  return { ...candidate, pageAccessToken };
}

export async function revokeMetaPermissions(
  configuration: Pick<MetaOAuthConfiguration, "graphVersion">,
  userAccessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const url = new URL(`${graphOrigin(configuration)}/me/permissions`);
  const response = await fetcher(url, {
    method: "DELETE",
    headers: metaBearerHeaders(userAccessToken),
  });
  return response.ok;
}

export async function encryptMetaToken(token: string, encodedKey: string, additionalData: string): Promise<string> {
  const normalizedToken = boundedToken(token);
  if (!normalizedToken) throw new Error("invalid_meta_token");
  const key = await importTokenEncryptionKey(encodedKey, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: copyArrayBuffer(iv),
      additionalData: copyArrayBuffer(new TextEncoder().encode(additionalData)),
    },
    key,
    copyArrayBuffer(new TextEncoder().encode(normalizedToken)),
  );
  return `${META_TOKEN_KEY_VERSION}.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptMetaToken(encryptedToken: string, encodedKey: string, additionalData: string): Promise<string> {
  const [version, encodedIv, encodedCiphertext, ...extra] = encryptedToken.split(".");
  if (version !== META_TOKEN_KEY_VERSION || !encodedIv || !encodedCiphertext || extra.length > 0) {
    throw new Error("invalid_meta_token_ciphertext");
  }
  const iv = base64ToBytes(encodedIv);
  const ciphertext = base64ToBytes(encodedCiphertext);
  if (!iv || iv.byteLength !== 12 || !ciphertext) throw new Error("invalid_meta_token_ciphertext");
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
  const token = new TextDecoder().decode(plaintext);
  if (!boundedToken(token)) throw new Error("invalid_meta_token_ciphertext");
  return token;
}

export function hasValidMetaTokenEncryptionKey(encodedKey: string): boolean {
  return base64ToBytes(encodedKey)?.byteLength === 32;
}

export function metaTokenAdditionalData(workspaceId: string, kind: "user" | "page"): string {
  return `meta|${workspaceId}|${kind}|${META_TOKEN_KEY_VERSION}`;
}

export function isMetaId(value: string): boolean {
  return /^\d{5,40}$/.test(value);
}

async function readAndValidateMetaPermissions(
  configuration: MetaOAuthConfiguration,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<string[]> {
  const url = new URL(`${graphOrigin(configuration)}/me/permissions`);
  const parsed = await readMetaJson(
    await fetcher(url, { headers: metaBearerHeaders(accessToken) }),
    "meta_permission_check_failed",
  );
  if (!isRecord(parsed) || !Array.isArray(parsed.data)) throw new Error("meta_permission_check_invalid");
  const granted = parsed.data.flatMap((entry) => {
    if (!isRecord(entry) || entry.status !== "granted" || typeof entry.permission !== "string") return [];
    return [entry.permission.trim()];
  }).filter(Boolean);
  const grantedSet = new Set(granted);
  if (META_REQUIRED_SCOPES.some((scope) => !grantedSet.has(scope))) throw new Error("meta_required_scope_missing");
  const allowed = new Set<string>(META_ALLOWED_GRANTED_SCOPES);
  if (granted.some((scope) => !allowed.has(scope))) throw new Error("meta_scope_expansion_blocked");
  return [...new Set(granted)].sort();
}

async function readMetaUserId(
  configuration: MetaOAuthConfiguration,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<string> {
  const url = new URL(`${graphOrigin(configuration)}/me`);
  url.searchParams.set("fields", "id");
  const parsed = await readMetaJson(
    await fetcher(url, { headers: metaBearerHeaders(accessToken) }),
    "meta_user_read_failed",
  );
  const id = isRecord(parsed) && typeof parsed.id === "string" ? parsed.id.trim() : "";
  if (!isMetaId(id)) throw new Error("meta_user_read_invalid");
  return id;
}

async function exchangeLongLivedMetaToken(
  configuration: MetaOAuthConfiguration,
  shortLivedAccessToken: string,
  fetcher: typeof fetch,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  const url = new URL(`${graphOrigin(configuration)}/oauth/access_token`);
  const token = await readMetaTokenResponse(await fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      fb_exchange_token: shortLivedAccessToken,
    }),
  }), "meta_long_lived_exchange_failed");
  return { accessToken: token.accessToken, expiresAt: token.expiresAt };
}

async function readMetaTokenResponse(
  response: Response,
  errorCode: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  const parsed = await readMetaJson(response, errorCode) as MetaTokenResponse;
  const accessToken = boundedToken(parsed.access_token);
  if (!accessToken) throw new Error(errorCode);
  const expiresIn = typeof parsed.expires_in === "number" && Number.isFinite(parsed.expires_in)
    ? Math.max(0, Math.min(parsed.expires_in, 90 * 24 * 60 * 60))
    : null;
  return {
    accessToken,
    expiresAt: expiresIn === null ? null : new Date(Date.now() + Math.max(0, expiresIn - 30) * 1000).toISOString(),
  };
}

async function readMetaJson(response: Response, errorCode: string): Promise<unknown> {
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new Error(errorCode);
  }
  if (!response.ok) throw new Error(errorCode);
  return parsed;
}

function normalizePageCandidate(value: unknown): MetaPageCandidate | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = boundedText(value.name, 160);
  if (!isMetaId(id) || !name) return null;
  const tasks = Array.isArray(value.tasks)
    ? [...new Set(value.tasks.filter((task): task is string => typeof task === "string" && /^[A-Z_]{2,40}$/.test(task)))].sort()
    : [];
  const instagram = isRecord(value.instagram_business_account) ? value.instagram_business_account : null;
  const instagramId = instagram && typeof instagram.id === "string" ? instagram.id.trim() : "";
  const username = instagram ? boundedText(instagram.username, 64) : null;
  return {
    id,
    name,
    tasks,
    instagramAccount: isMetaId(instagramId) ? { id: instagramId, username } : null,
  };
}

function graphOrigin(configuration: Pick<MetaOAuthConfiguration, "graphVersion">): string {
  if (!/^v\d{1,2}\.\d$/.test(configuration.graphVersion)) throw new Error("invalid_meta_graph_version");
  return `https://graph.facebook.com/${configuration.graphVersion}`;
}

function boundedToken(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9._-]{16,4096}$/.test(value.trim()) ? value.trim() : null;
}

function metaBearerHeaders(accessToken: string): Record<string, string> {
  const token = boundedToken(accessToken);
  if (!token) throw new Error("invalid_meta_token");
  return {
    accept: "application/json",
    authorization: `Bearer ${token}`,
  };
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

async function importTokenEncryptionKey(encodedKey: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const bytes = base64ToBytes(encodedKey);
  if (!bytes || bytes.byteLength !== 32) throw new Error("invalid_meta_token_encryption_key");
  return crypto.subtle.importKey("raw", copyArrayBuffer(bytes), "AES-GCM", false, usages);
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

function randomBase64Url(byteLength: number): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(byteLength)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < maxLength; index += 1) mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  return mismatch === 0;
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
