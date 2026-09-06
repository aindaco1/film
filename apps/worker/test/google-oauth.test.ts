import { describe, expect, it, vi } from "vitest";
import {
  createGoogleOAuthAuthorization,
  decryptGoogleToken,
  encryptGoogleToken,
  exchangeGoogleAuthorizationCode,
  googleOAuthScopes,
  googleTokenRefreshFailure,
  hasValidGoogleTokenEncryptionKey,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from "../src/google-oauth";

const configuration = {
  clientId: "google-client-id",
  clientSecret: "google-client-secret",
  redirectUri: "https://api.film.test/api/providers/google/oauth/callback",
};

describe("google oauth", () => {
  it("builds a PKCE authorization request with least-privilege scopes", async () => {
    const authorization = await createGoogleOAuthAuthorization(configuration, {
      includeDocsExport: false,
      includeCalendarSync: true,
    });
    const url = new URL(authorization.authorizationUrl);

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("state")).toBe(authorization.state);
    expect(authorization.codeVerifier).toBeTruthy();
    expect(authorization.scopes).toEqual([
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ]);
  });

  it("defaults to metadata-only Drive access", () => {
    expect(googleOAuthScopes({})).toEqual([
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ]);
  });

  it("encrypts tokens with bound authenticated data", async () => {
    const key = base64(new Uint8Array(32).fill(7));
    const encrypted = await encryptGoogleToken("refresh-token", key, "google|workspace_a|refresh|v1");

    expect(encrypted).not.toContain("refresh-token");
    await expect(decryptGoogleToken(encrypted, key, "google|workspace_a|refresh|v1"))
      .resolves.toBe("refresh-token");
    await expect(decryptGoogleToken(encrypted, key, "google|workspace_b|refresh|v1"))
      .rejects.toThrow();
    expect(hasValidGoogleTokenEncryptionKey(key)).toBe(true);
    expect(hasValidGoogleTokenEncryptionKey(base64(new Uint8Array(16)))).toBe(false);
  });

  it("exchanges and refreshes tokens through the standards client", async () => {
    const authorization = await createGoogleOAuthAuthorization(configuration, {});
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body as URLSearchParams;
      if (body.get("grant_type") === "refresh_token") {
        return Response.json({
          access_token: "access-refreshed",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
          token_type: "Bearer",
        });
      }
      return Response.json({
        access_token: "access-initial",
        refresh_token: "refresh-initial",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
        token_type: "Bearer",
      });
    });
    const callback = new URL(configuration.redirectUri);
    callback.searchParams.set("code", "authorization-code");
    callback.searchParams.set("state", authorization.state);

    const initial = await exchangeGoogleAuthorizationCode(
      configuration,
      callback,
      authorization.state,
      authorization.codeVerifier,
      authorization.scopes,
      fetcher as typeof fetch,
    );
    expect(initial.accessToken).toBe("access-initial");
    expect(initial.refreshToken).toBe("refresh-initial");
    expect(initial.tokenType).toBe("bearer");

    const refreshed = await refreshGoogleAccessToken(
      configuration,
      "refresh-initial",
      initial.scopes,
      fetcher as typeof fetch,
    );
    expect(refreshed.accessToken).toBe("access-refreshed");
    expect(refreshed.refreshToken).toBe("refresh-initial");
  });

  it("revokes using the provider endpoint", async () => {
    const requests: Array<{ url: string | URL | Request; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url, init });
      return new Response(null, { status: 200 });
    });
    await expect(revokeGoogleToken("provider-token", fetcher as typeof fetch)).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect((requests[0]?.init?.body as URLSearchParams).get("token")).toBe("provider-token");
  });

  it.each(["invalid_grant", "invalid_client", "temporarily_unavailable"])("classifies refresh error %s without exposing provider details", async code => {
    const fetcher = vi.fn(async () => Response.json({ error: code, error_description: "private-provider-diagnostic" }, { status: 400 }));
    const error = await refreshGoogleAccessToken(configuration, "private-refresh", [], fetcher as typeof fetch).catch(error => error);
    const failure = googleTokenRefreshFailure(error);
    expect(failure.status).toBe(code === "invalid_grant" ? 409 : 502);
    expect(failure.error).toBe(code === "invalid_grant" ? "google_reauthorization_required" : "google_token_refresh_failed");
    expect(JSON.stringify(failure)).not.toContain("private");
    expect(googleTokenRefreshFailure(new Error("invalid_grant")).status).toBe(502);
  });

  it.each([512, 2048])("round-trips realistic %i-byte provider tokens with context binding", async length => {
    const key = base64(new Uint8Array(32).fill(7));
    const token = "a".repeat(length);
    const encrypted = await encryptGoogleToken(token, key, "google|workspace_a|access|v1");
    await expect(decryptGoogleToken(encrypted, key, "google|workspace_a|access|v1")).resolves.toBe(token);
    await expect(decryptGoogleToken(encrypted, key, "google|workspace_b|access|v1")).rejects.toThrow();
  });
});

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
