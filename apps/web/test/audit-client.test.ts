import { describe, expect, it } from "vitest";
import { exportWorkerAuditEventManifest } from "../src/audit-client";

describe("audit client", () => {
  it("requests a Worker audit event manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/audit-events/export-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme", limit: 50 }));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          persistence: "d1_audit_events",
          auditPersistence: "d1_audit_events",
          workspaceId: "workspace_acme",
          exportPolicy: "audit_event_manifest_only",
          metadataPolicy: "keys_only",
          rowCount: 1,
          truncated: false,
          offset: 0,
          nextOffset: null,
          actionPrefix: null,
          events: [
            {
              id: "audit_1",
              action: "provider.dry_run_checked",
              projectId: null,
              actorMemberId: "member_owner",
              createdAt: "2026-07-08T00:00:00.000Z",
              metadataKeys: ["provider"],
              metadataKeyCount: 1,
            },
          ],
        }),
        { status: 200 },
      );
    };

    const manifest = await exportWorkerAuditEventManifest(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      50,
      fetcher,
    );

    expect(manifest.exportPolicy).toBe("audit_event_manifest_only");
    expect(manifest.metadataPolicy).toBe("keys_only");
    expect(manifest.auditPersistence).toBe("d1_audit_events");
    expect(manifest.offset).toBe(0);
    expect(manifest.nextOffset).toBeNull();
    expect(manifest.events[0]?.metadataKeys).toEqual(["provider"]);
  });

  it("requests filtered Worker audit event pages", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/audit-events/export-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        limit: 10,
        offset: 20,
        actionPrefix: "provider.",
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          persistence: "d1_audit_events",
          auditPersistence: "d1_audit_events",
          workspaceId: "workspace_acme",
          exportPolicy: "audit_event_manifest_only",
          metadataPolicy: "keys_only",
          rowCount: 1,
          truncated: true,
          offset: 20,
          nextOffset: 21,
          actionPrefix: "provider.",
          events: [
            {
              id: "audit_2",
              action: "provider.readiness_checked",
              projectId: null,
              actorMemberId: "member_owner",
              createdAt: "2026-07-08T00:01:00.000Z",
              metadataKeys: ["provider"],
              metadataKeyCount: 1,
            },
          ],
        }),
        { status: 200 },
      );
    };

    const manifest = await exportWorkerAuditEventManifest(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      {
        limit: 10,
        offset: 20,
        actionPrefix: " provider. ",
      },
      fetcher,
    );

    expect(manifest.actionPrefix).toBe("provider.");
    expect(manifest.nextOffset).toBe(21);
  });

  it("throws Worker audit manifest errors", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "workspace_mismatch" }), { status: 403 });

    await expect(
      exportWorkerAuditEventManifest("https://worker.test", "workspace_other", "csrf_1234567890", 50, fetcher),
    ).rejects.toThrow("workspace_mismatch");
  });
});
