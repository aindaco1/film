import { describe, expect, it, vi } from "vitest";
import {
  META_REQUIRED_SCOPES,
  createMetaOAuthAuthorization,
  decryptMetaToken,
  encryptMetaToken,
  exchangeMetaAuthorizationCode,
  hasValidMetaTokenEncryptionKey,
  listMetaPageCandidates,
  readMetaPageSelection,
  revokeMetaPermissions,
} from "../src/meta-oauth";

const configuration = {
  clientId: "123456789012345",
  clientSecret: "meta-client-secret-value",
  redirectUri: "https://api.film.test/api/providers/meta/oauth/callback",
  graphVersion: "v23.0",
  loginConfigurationId: "987654321098765",
};

describe("meta oauth", () => {
  it("builds an exact Facebook Login for Business request", () => {
    const authorization = createMetaOAuthAuthorization(configuration);
    const url = new URL(authorization.authorizationUrl);

    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.pathname).toBe("/v23.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe(configuration.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(configuration.redirectUri);
    expect(url.searchParams.get("config_id")).toBe(configuration.loginConfigurationId);
    expect(url.searchParams.get("override_default_response_type")).toBe("true");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe(authorization.state);
    expect(authorization.scopes).toEqual(META_REQUIRED_SCOPES);
    expect(url.searchParams.get("scope")?.split(",")).toEqual(META_REQUIRED_SCOPES);
  });

  it("exchanges a code only when the granted permission set stays bounded", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/oauth/access_token") && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(URLSearchParams);
        const body = init.body as URLSearchParams;
        expect(url.searchParams.size).toBe(0);
        expect(body.get("client_secret")).toBe(configuration.clientSecret);
        if (body.get("grant_type") === "fb_exchange_token") {
          expect(body.get("fb_exchange_token")).toBe("short_meta_token_123456");
          return Response.json({ access_token: "long_meta_token_1234567", expires_in: 5_184_000 });
        }
        expect(body.get("code")).toBe("meta_authorization_code_12345");
        return Response.json({ access_token: "short_meta_token_123456", expires_in: 3600 });
      }
      if (url.pathname.endsWith("/me/permissions")) {
        expect(url.searchParams.has("access_token")).toBe(false);
        expect((init?.headers as Record<string, string>).authorization).toBe("Bearer short_meta_token_123456");
        return Response.json({
          data: [
            ...META_REQUIRED_SCOPES.map((permission) => ({ permission, status: "granted" })),
            { permission: "public_profile", status: "granted" },
          ],
        });
      }
      if (url.pathname.endsWith("/me")) {
        expect(url.searchParams.has("access_token")).toBe(false);
        expect((init?.headers as Record<string, string>).authorization).toBe("Bearer short_meta_token_123456");
        return Response.json({ id: "123456789012345" });
      }
      throw new Error(`Unexpected Meta request: ${url}`);
    });
    const callback = new URL(configuration.redirectUri);
    callback.searchParams.set("code", "meta_authorization_code_12345");
    callback.searchParams.set("state", "expected-state");

    const tokens = await exchangeMetaAuthorizationCode(
      configuration,
      callback,
      "expected-state",
      fetcher as typeof fetch,
    );

    expect(tokens.userAccessToken).toBe("long_meta_token_1234567");
    expect(tokens.userId).toBe("123456789012345");
    expect(tokens.scopes).toEqual([...META_REQUIRED_SCOPES, "public_profile"].sort());
    expect(tokens.expiresAt).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("blocks a provider response that grants an expanded permission", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/oauth/access_token")) {
        return Response.json({ access_token: "short_meta_token_123456" });
      }
      return Response.json({
        data: [
          ...META_REQUIRED_SCOPES.map((permission) => ({ permission, status: "granted" })),
          { permission: "pages_manage_posts", status: "granted" },
        ],
      });
    });
    const callback = new URL(configuration.redirectUri);
    callback.searchParams.set("code", "meta_authorization_code_12345");
    callback.searchParams.set("state", "expected-state");

    await expect(exchangeMetaAuthorizationCode(
      configuration,
      callback,
      "expected-state",
      fetcher as typeof fetch,
    )).rejects.toThrow("meta_scope_expansion_blocked");
  });

  it("returns redacted candidates and only selects an analyzable linked Page", async () => {
    const candidateFetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.searchParams.has("access_token")).toBe(false);
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer long_meta_token_1234567");
      const page = {
        id: "111111111111111",
        name: "Big Sword",
        access_token: "must_not_be_returned_123456",
        tasks: ["ANALYZE", "CREATE_CONTENT"],
        instagram_business_account: { id: "222222222222222", username: "bigswordfilm" },
      };
      return Response.json(url.pathname.endsWith("/me/accounts") ? { data: [page] } : page);
    });
    const candidates = await listMetaPageCandidates(
      configuration,
      "long_meta_token_1234567",
      candidateFetcher as typeof fetch,
    );

    expect(candidates).toEqual([{
      id: "111111111111111",
      name: "Big Sword",
      tasks: ["ANALYZE", "CREATE_CONTENT"],
      instagramAccount: { id: "222222222222222", username: "bigswordfilm" },
    }]);
    expect(JSON.stringify(candidates)).not.toContain("must_not_be_returned");

    const selection = await readMetaPageSelection(
      configuration,
      "long_meta_token_1234567",
      "111111111111111",
      candidateFetcher as typeof fetch,
    );
    expect(selection.pageAccessToken).toBe("must_not_be_returned_123456");

    await expect(readMetaPageSelection(
      configuration,
      "long_meta_token_1234567",
      "111111111111111",
      vi.fn(async () => Response.json({
        id: "111111111111111",
        name: "Big Sword",
        access_token: "must_not_be_returned_123456",
        tasks: ["CREATE_CONTENT"],
        instagram_business_account: { id: "222222222222222" },
      })) as typeof fetch,
    )).rejects.toThrow("meta_page_analyze_task_required");
  });

  it("encrypts tokens with a provider, workspace, and kind binding", async () => {
    const key = base64(new Uint8Array(32).fill(19));
    const encrypted = await encryptMetaToken("long_meta_token_1234567", key, "meta|workspace_a|user|v1");

    expect(encrypted).not.toContain("long_meta_token");
    await expect(decryptMetaToken(encrypted, key, "meta|workspace_a|user|v1"))
      .resolves.toBe("long_meta_token_1234567");
    await expect(decryptMetaToken(encrypted, key, "meta|workspace_a|page|v1"))
      .rejects.toThrow();
    expect(hasValidMetaTokenEncryptionKey(key)).toBe(true);
    expect(hasValidMetaTokenEncryptionKey(base64(new Uint8Array(16)))).toBe(false);
  });

  it("revokes the user grant through the versioned permissions endpoint", async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => (
      new Response(null, { status: 200 })
    ));
    await expect(revokeMetaPermissions(
      configuration,
      "long_meta_token_1234567",
      fetcher as typeof fetch,
    )).resolves.toBe(true);
    const [input, init] = fetcher.mock.calls[0] ?? [];
    expect(String(input)).toContain("/v23.0/me/permissions");
    expect(new URL(String(input)).searchParams.has("access_token")).toBe(false);
    expect(init?.method).toBe("DELETE");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer long_meta_token_1234567");
  });
});

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
