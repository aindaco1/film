import { describe, expect, it, vi } from "vitest";
import {
  META_REQUIRED_SCOPES,
  META_REQUESTED_SCOPES,
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
    expect(authorization.scopes).toEqual(META_REQUESTED_SCOPES);
    expect(url.searchParams.has("scope")).toBe(false);
    expect([...url.searchParams.keys()].sort()).toEqual([
      "client_id", "config_id", "override_default_response_type", "redirect_uri", "response_type", "state",
    ]);
  });

  it.each([{ scopes: META_REQUESTED_SCOPES }, { scopes: META_REQUIRED_SCOPES }])("exchanges a code with bounded granted permissions: %j", async ({ scopes: grantedScopes }) => {
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
            ...grantedScopes.map((permission) => ({ permission, status: "granted" })),
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
    expect(tokens.scopes).toEqual([...grantedScopes, "public_profile"].sort());
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

  it.each([true, false])("returns redacted candidates and selects analyzable Pages; Instagram linked: %s", async (linked) => {
    const candidateFetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/v23.0/me/accounts");
      expect(url.searchParams.get("limit")).toBe("25");
      expect(url.searchParams.has("access_token")).toBe(false);
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer long_meta_token_1234567");
      const page = {
        id: "111111111111111",
        name: "Big Sword",
        access_token: "must_not_be_returned_123456",
        tasks: ["ANALYZE", "CREATE_CONTENT"],
        instagram_business_account: linked ? { id: "222222222222222", username: "bigswordfilm" } : null,
      };
      return Response.json({ data: [page] });
    });
    const candidates = await listMetaPageCandidates(
      configuration,
      "long_meta_token_1234567",
      META_REQUESTED_SCOPES,
      candidateFetcher as typeof fetch,
    );

    expect(candidates).toEqual([{
      id: "111111111111111",
      name: "Big Sword",
      tasks: ["ANALYZE", "CREATE_CONTENT"],
      instagramAccount: linked ? { id: "222222222222222", username: "bigswordfilm" } : null,
    }]);
    expect(JSON.stringify(candidates)).not.toContain("must_not_be_returned");

    const selection = await readMetaPageSelection(
      configuration,
      "long_meta_token_1234567",
      "111111111111111",
      META_REQUESTED_SCOPES,
      candidateFetcher as typeof fetch,
    );
    expect(selection.pageAccessToken).toBe("must_not_be_returned_123456");
    const requestedFields = candidateFetcher.mock.calls.map(([input]) => new URL(String(input)).searchParams.get("fields"));
    expect(requestedFields[0]).not.toContain("access_token");
    expect(requestedFields[1]).toContain("access_token");

    await expect(readMetaPageSelection(
      configuration,
      "long_meta_token_1234567",
      "111111111111111",
      META_REQUESTED_SCOPES,
      vi.fn(async () => Response.json({ data: [{
        id: "111111111111111",
        name: "Big Sword",
        access_token: "must_not_be_returned_123456",
        tasks: ["CREATE_CONTENT"],
        instagram_business_account: { id: "222222222222222" },
      }] })) as typeof fetch,
    )).rejects.toThrow("meta_page_analyze_task_required");
  });

  it.each([
    { data: [] },
    { data: [{ id: "999999999999999", name: "Other Page", tasks: ["ANALYZE"], access_token: "page_meta_token_123456789" }] },
    { data: [{ id: "111111111111111", name: "Social Test", tasks: ["ANALYZE"] }] },
    { id: "111111111111111", name: "Social Test", tasks: ["ANALYZE"], access_token: "page_meta_token_123456789" },
  ])("rejects selections without a matching authorized Page token: %j", async (response) => {
    await expect(readMetaPageSelection(configuration, "user_meta_token_123456789", "111111111111111",
      META_REQUIRED_SCOPES, vi.fn(async () => Response.json(response)) as typeof fetch))
      .rejects.toThrow("meta_page_selection_invalid");
  });

  it("omits Instagram fields and mappings without both Instagram scopes", async () => {
    for (const scopes of [META_REQUIRED_SCOPES, [...META_REQUIRED_SCOPES, "instagram_basic"]]) {
      const fetcher = vi.fn(async (input: string | URL | Request) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("fields")).not.toContain("instagram");
        const page = {
          id: "111111111111111", name: "Social Test", tasks: ["ANALYZE"],
          access_token: "page_meta_token_123456789",
          instagram_business_account: { id: "222222222222222", username: "notauthorized" },
        };
        return Response.json(url.pathname.endsWith("/me/accounts") ? { data: [page] } : page);
      });
      const pages = await listMetaPageCandidates(configuration, "user_meta_token_123456789", scopes, fetcher as typeof fetch);
      expect(pages[0].instagramAccount).toBeNull();
      const selection = await readMetaPageSelection(configuration, "user_meta_token_123456789", "111111111111111", scopes, fetcher as typeof fetch);
      expect(selection.instagramAccount).toBeNull();
    }
  });

  it.each(META_REQUIRED_SCOPES)("rejects a missing required Facebook permission: %s", async (missing) => {
    const callback = new URL(configuration.redirectUri);
    callback.searchParams.set("code", "meta_authorization_code_12345");
    callback.searchParams.set("state", "expected-state");
    const fetcher = vi.fn(async (input: string | URL | Request) => new URL(String(input)).pathname.endsWith("/me/permissions")
      ? Response.json({ data: META_REQUESTED_SCOPES.filter(scope => scope !== missing).map(permission => ({ permission, status: "granted" })) })
      : Response.json({ access_token: "short_meta_token_123456" }));
    await expect(exchangeMetaAuthorizationCode(configuration, callback, "expected-state", fetcher as typeof fetch))
      .rejects.toThrow("meta_required_scope_missing");
  });

  it.each([16, 256, 1024, 4096])("round-trips a %i-character token with a workspace and kind binding", async (length) => {
    const key = base64(new Uint8Array(32).fill(19));
    const token = "E".repeat(length);
    const encrypted = await encryptMetaToken(token, key, "meta|workspace_a|user|v1");

    expect(encrypted).not.toContain(token);
    await expect(decryptMetaToken(encrypted, key, "meta|workspace_a|user|v1"))
      .resolves.toBe(token);
    await expect(decryptMetaToken(encrypted, key, "meta|workspace_a|page|v1"))
      .rejects.toThrow();
    await expect(decryptMetaToken(encrypted, key, "meta|workspace_b|user|v1"))
      .rejects.toThrow();
    expect(hasValidMetaTokenEncryptionKey(key)).toBe(true);
    expect(hasValidMetaTokenEncryptionKey(base64(new Uint8Array(16)))).toBe(false);
  });

  it("rejects oversized token envelopes and invalid key/IV sizes", async () => {
    const key = base64(new Uint8Array(32).fill(19));
    const iv = base64(new Uint8Array(12));
    await expect(encryptMetaToken("E".repeat(4097), key, "meta|workspace_a|user|v1"))
      .rejects.toThrow("invalid_meta_token");
    for (const envelope of [
      `v1.${iv}.${base64(new Uint8Array(4113))}`,
      `v1.${base64(new Uint8Array(13))}.${base64(new Uint8Array(32))}`,
    ]) {
      await expect(decryptMetaToken(envelope, key, "meta|workspace_a|user|v1"))
        .rejects.toThrow("invalid_meta_token_ciphertext");
    }
    expect(hasValidMetaTokenEncryptionKey(base64(new Uint8Array(33)))).toBe(false);
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
