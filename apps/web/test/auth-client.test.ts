import { describe, expect, it } from "vitest";
import { logoutSession, readSessionMetadata, requestMagicLink, verifyMagicLink } from "../src/auth-client";

describe("auth client", () => {
  it("requests a dry-run magic link without persisting the token", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/auth/magic-link/request");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(JSON.stringify({ email: "alonso@example.com" }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          delivery: "not_sent",
          emailHash: "a".repeat(64),
          devOnlyToken: "dry_12345678901234567890",
          expiresInMinutes: 15,
        }),
        { status: 200 },
      );
    };

    const result = await requestMagicLink("https://worker.test", "alonso@example.com", fetcher);

    expect(result.devOnlyToken).toBe("dry_12345678901234567890");
    expect(result.emailHash).toHaveLength(64);
  });

  it("verifies a dry-run token into session metadata", async () => {
    const fetcher: typeof fetch = async (_input, init) => {
      expect(init?.body).toBe(JSON.stringify({ token: "dry_12345678901234567890" }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          session: {
            id: "sess_1",
            role: "owner",
            csrfToken: "csrf_1234567890",
            expiresAt: "2026-07-08T00:00:00.000Z",
          },
        }),
        { status: 200 },
      );
    };

    const session = await verifyMagicLink("https://worker.test", "dry_12345678901234567890", fetcher);

    expect(session.role).toBe("owner");
    expect(session.csrfToken).toBe("csrf_1234567890");
  });

  it("sends csrf metadata when signing out", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/auth/logout");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    await expect(logoutSession("https://worker.test", "csrf_1234567890", fetcher)).resolves.toBeUndefined();
  });

  it("reads session metadata without csrf recovery", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/auth/session");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_kv_auth_records",
          session: {
            id: "sess_1",
            role: "producer",
            expiresAt: "2026-07-08T00:00:00.000Z",
          },
        }),
        { status: 200 },
      );
    };

    const session = await readSessionMetadata("https://worker.test", fetcher);

    expect(session).toEqual({
      id: "sess_1",
      role: "producer",
      expiresAt: "2026-07-08T00:00:00.000Z",
    });
    expect("csrfToken" in (session ?? {})).toBe(false);
  });

  it("throws worker errors for blocked auth paths", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "invalid_email" }), { status: 400 });

    await expect(requestMagicLink("https://worker.test", "bad", fetcher)).rejects.toThrow("invalid_email");
  });
});
