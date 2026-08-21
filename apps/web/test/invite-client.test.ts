import { describe, expect, it } from "vitest";
import {
  acceptWorkspaceInvite,
  checkInviteDeliveryReadiness,
  createWorkspaceInvite,
  exportInviteDeliverySuppressions,
  exportWorkspaceInviteManifest,
  revokeWorkspaceInvite,
} from "../src/invite-client";

describe("invite client", () => {
  it("creates a dry-run workspace invite with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/invites/create-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        email: "crew@example.com",
        role: "contributor",
      }));

      return new Response(
	        JSON.stringify({
	          dryRun: true,
	          delivery: "queued_dry_run",
	          persistence: "d1_invite_records",
	          deliveryPersistence: "d1_invite_delivery_attempts",
	          deliveryAttempt: {
	            id: "invite_delivery_1",
	            provider: "resend",
	            channel: "email",
	            targetHash: "a".repeat(64),
	            templateKey: "workspace_invite",
	            deliveryMode: "dry_run_outbox",
	            status: "queued_dry_run",
	            providerMessageId: null,
	            errorCode: null,
	          },
	          invite: {
            id: "invite_1",
            workspaceId: "workspace_acme",
            emailHash: "a".repeat(64),
            role: "contributor",
            expiresAt: "2026-07-15T00:00:00.000Z",
            devOnlyInviteToken: "dry_invite_123456789012345678901234567890",
          },
        }),
        { status: 200 },
      );
    };

    const result = await createWorkspaceInvite(
      "https://worker.test",
      "workspace_acme",
      "crew@example.com",
      "contributor",
      "csrf_1234567890",
      fetcher,
    );

	    expect(result.delivery).toBe("queued_dry_run");
	    expect(result.deliveryPersistence).toBe("d1_invite_delivery_attempts");
	    expect(result.deliveryAttempt?.targetHash).toBe(result.invite.emailHash);
    expect(result.invite.emailHash).toHaveLength(64);
    expect(result.invite.devOnlyInviteToken).toMatch(/^dry_invite_/);
  });

  it("rejects suppressed invite creation with the Worker error code", async () => {
    const fetcher: typeof fetch = async () => new Response(
      JSON.stringify({
        error: "invite_delivery_suppressed",
        delivery: "blocked_suppressed",
        suppressionPolicy: "invite_delivery_suppression_blocks_invite_creation",
      }),
      { status: 409 },
    );

    await expect(
      createWorkspaceInvite("https://worker.test", "workspace_acme", "crew@example.com", "contributor", "csrf_1234567890", fetcher),
    ).rejects.toThrow("invite_delivery_suppressed");
  });

  it("accepts a dry-run workspace invite without csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/invites/accept-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({ "content-type": "application/json" });
      expect(init?.body).toBe(JSON.stringify({
        token: "dry_invite_123456789012345678901234567890",
        displayName: "Crew Member",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_invite_records",
          member: {
            id: "member_1",
            workspaceId: "workspace_acme",
            emailHash: "a".repeat(64),
            role: "contributor",
            status: "active",
          },
        }),
        { status: 200 },
      );
    };

    const result = await acceptWorkspaceInvite(
      "https://worker.test",
      "dry_invite_123456789012345678901234567890",
      "Crew Member",
      fetcher,
    );

    expect(result.member.role).toBe("contributor");
    expect(result.member.status).toBe("active");
  });

  it("checks invite delivery readiness with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/invites/delivery-readiness");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme" }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_kv_auth_records",
          readiness: {
            provider: "resend",
            channel: "email",
            mode: "readiness_only",
            status: "blocked_live_delivery",
            dryRunOutboxAllowed: true,
            liveDeliveryAllowed: false,
            configured: {
              resendApiKey: false,
              fromEmail: false,
              appOrigin: false,
	              webhookSecret: false,
	              productionOrigin: false,
	              liveMode: false,
	            },
	            requiredConfiguration: ["RESEND_API_KEY", "INVITE_DELIVERY_MODE=live"],
	            blockers: ["Missing RESEND_API_KEY."],
	            complianceNotes: ["Live delivery requires Resend webhook verification."],
	          },
        }),
        { status: 200 },
      );
    };

    const result = await checkInviteDeliveryReadiness(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      fetcher,
    );

    expect(result.readiness.provider).toBe("resend");
    expect(result.readiness.liveDeliveryAllowed).toBe(false);
    expect(result.readiness.blockers).toContain("Missing RESEND_API_KEY.");
  });

  it("exports pending invite manifests with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/invites/manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        limit: 25,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_invite_records",
          workspaceId: "workspace_acme",
          manifestPolicy: "pending_invites_hash_only",
          rowCount: 1,
          truncated: false,
          invites: [
            {
              id: "invite_1",
              workspaceId: "workspace_acme",
              emailHash: "a".repeat(64),
              role: "reviewer",
              status: "pending",
              expiresAt: "2026-07-15T00:00:00.000Z",
              createdAt: "2026-07-08T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportWorkspaceInviteManifest(
      "https://worker.test",
      "workspace_acme",
      25,
      "csrf_1234567890",
      fetcher,
    );

    expect(result.manifestPolicy).toBe("pending_invites_hash_only");
    expect(result.invites[0]?.emailHash).toHaveLength(64);
    expect(JSON.stringify(result)).not.toContain("token");
  });

  it("exports invite delivery suppression manifests with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/invites/delivery-suppressions");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        limit: 25,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_invite_delivery_suppressions",
          workspaceId: "workspace_acme",
          manifestPolicy: "invite_delivery_suppressions_hash_only",
          rowCount: 1,
          truncated: false,
          suppressions: [
            {
              id: "suppression_1",
              provider: "resend",
              targetHash: "a".repeat(64),
              reason: "bounced",
              workspaceId: "workspace_acme",
              inviteId: "invite_1",
              deliveryAttemptId: "invite_delivery_1",
              providerMessageId: "email_1",
              sourceWebhookEventId: "invite_delivery_webhook_1",
              firstSeenAt: "2026-07-08T00:01:00.000Z",
              lastSeenAt: "2026-07-08T00:02:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportInviteDeliverySuppressions(
      "https://worker.test",
      "workspace_acme",
      25,
      "csrf_1234567890",
      fetcher,
    );

    expect(result.manifestPolicy).toBe("invite_delivery_suppressions_hash_only");
    expect(result.suppressions[0]?.targetHash).toHaveLength(64);
    expect(JSON.stringify(result)).not.toContain("crew@example.com");
  });

  it("revokes pending invites with exact manifest row metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/invites/revoke-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        inviteId: "invite_1",
        emailHash: "a".repeat(64),
        role: "reviewer",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_invite_records",
          revokePolicy: "pending_invite_exact_match_only",
          invite: {
            id: "invite_1",
            workspaceId: "workspace_acme",
            emailHash: "a".repeat(64),
            role: "reviewer",
            status: "pending",
            expiresAt: "2026-07-15T00:00:00.000Z",
            createdAt: "2026-07-08T00:00:00.000Z",
          },
        }),
        { status: 200 },
      );
    };

    const result = await revokeWorkspaceInvite(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        inviteId: "invite_1",
        emailHash: "a".repeat(64),
        role: "reviewer",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.revokePolicy).toBe("pending_invite_exact_match_only");
    expect(result.invite.id).toBe("invite_1");
  });

  it("throws worker errors for blocked invite paths", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "missing_csrf" }), { status: 403 });

    await expect(
      createWorkspaceInvite("https://worker.test", "workspace_acme", "crew@example.com", "reviewer", "", fetcher),
    ).rejects.toThrow("missing_csrf");
  });
});
