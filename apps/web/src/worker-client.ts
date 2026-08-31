export type Fetcher = typeof fetch;

export type WorkerJsonResponse<T> = {
  response: Response;
  body: T & { error?: string };
};

export async function parseWorkerJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? fallbackMessage);
  }
  return body;
}

export async function postWorkerJsonResponse<T>(
  workerUrl: string,
  path: string,
  body: unknown,
  csrfToken: string | null,
  fetcher: Fetcher = fetch,
): Promise<WorkerJsonResponse<T>> {
  const response = await postWorkerJsonRequest(workerUrl, path, body, csrfToken, fetcher);
  return {
    response,
    body: (await response.json()) as T & { error?: string },
  };
}

export function postWorkerJsonRequest(
  workerUrl: string,
  path: string,
  body: unknown,
  csrfToken: string | null,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (csrfToken) headers["x-film-csrf"] = csrfToken;

  return fetcher(`${workerUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function postWorkerJson<T>(
  workerUrl: string,
  path: string,
  body: unknown,
  csrfToken: string | null,
  fallbackMessage: string,
  fetcher: Fetcher = fetch,
): Promise<T> {
  const result = await postWorkerJsonResponse<T>(workerUrl, path, body, csrfToken, fetcher);
  if (!result.response.ok) {
    throw new Error(result.body.error ?? fallbackMessage);
  }
  return result.body;
}
