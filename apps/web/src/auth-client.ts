export type MagicLinkRequestResult = {
  dryRun: boolean;
  delivery: "not_sent" | "email_if_eligible";
  persistence?: string;
  emailHash: string | null;
  devOnlyToken: string | null;
  expiresAt?: string;
  expiresInMinutes: number;
};

export type FilmSession = {
  id: string;
  role: string;
  csrfToken: string;
  expiresAt: string;
};

export type FilmSessionMetadata = Omit<FilmSession, "csrfToken">;

type AuthResponseError = {
  error?: string;
};

type MagicLinkVerifyResult = {
  dryRun: boolean;
  persistence?: string;
  session: FilmSession;
};

type SessionMetadataResult = {
  dryRun: boolean;
  persistence?: string;
  session: FilmSessionMetadata | null;
};

type Fetcher = typeof fetch;

export async function requestMagicLink(
  workerUrl: string,
  email: string,
  fetcher: Fetcher = fetch,
): Promise<MagicLinkRequestResult> {
  const response = await fetcher(`${workerUrl}/api/auth/magic-link/request`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return parseJsonResponse<MagicLinkRequestResult>(response, "Magic link request failed");
}

export async function verifyMagicLink(
  workerUrl: string,
  token: string,
  fetcher: Fetcher = fetch,
): Promise<FilmSession> {
  const result = await parseJsonResponse<MagicLinkVerifyResult>(
    await fetcher(`${workerUrl}/api/auth/magic-link/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }),
    "Magic link verification failed",
  );

  return result.session;
}

export async function readSessionMetadata(
  workerUrl: string,
  fetcher: Fetcher = fetch,
): Promise<FilmSessionMetadata | null> {
  const result = await parseJsonResponse<SessionMetadataResult>(
    await fetcher(`${workerUrl}/api/auth/session`, {
      method: "GET",
      credentials: "include",
    }),
    "Session check failed",
  );

  return result.session;
}

export async function logoutSession(
  workerUrl: string,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<void> {
  await parseJsonResponse<{ ok: boolean }>(
    await fetcher(`${workerUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
    }),
    "Sign out failed",
  );
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = (await response.json()) as T & AuthResponseError;
  if (!response.ok) {
    throw new Error(body.error ?? fallbackMessage);
  }
  return body;
}
