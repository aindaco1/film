export { parseCliArgs } from "./script-input.mjs";

export function createWorkerJsonClient(baseUrl, { requestTimeoutMs = 10_000 } = {}) {
  return async function requestJson(method, path, options = {}) {
    let response;
    try {
      response = await fetchWithTimeout(`${baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          ...(method === "POST" ? { "content-type": "application/json" } : {}),
          ...(options.headers ?? {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      }, requestTimeoutMs);
    } catch (error) {
      throw new Error(`${method} ${path} request failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const text = await response.text();
    const body = parseJson(text);
    if (!response.ok) {
      const error = body && typeof body.error === "string" ? body.error : response.statusText;
      throw new Error(`${method} ${path} returned ${response.status}: ${error}`);
    }
    return { response, body };
  };
}

export function sessionCookieFrom(setCookie) {
  const cookie = setCookie?.split(";")[0]?.trim() ?? "";
  if (!cookie.startsWith("film_session=")) {
    throw new Error("Magic-link verification did not return a film_session cookie");
  }
  return cookie;
}

export function normalizeHttpBaseUrl(value, label = "Worker smoke origin") {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} must be an http(s) URL`);
  }
  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

export function timeoutMsFrom(value, fallback, label = "Smoke timeout") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) {
    throw new Error(`${label} must be an integer between 1000 and 300000 milliseconds.`);
  }
  return timeoutMs;
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Worker returned a non-JSON response");
  }
}
