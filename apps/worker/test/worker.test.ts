import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("film worker", () => {
  it("serves health status", async () => {
    const response = await worker.fetch(new Request("https://worker.test/health"), {});
    const body = (await response.json()) as {
      ok: boolean;
      mode: string;
      authMode: string;
      inviteDeliveryMode: string;
      stripeSummaryMode: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("dry-run");
    expect(body.authMode).toBe("dry_run");
    expect(body.inviteDeliveryMode).toBe("dry_run");
    expect(body.stripeSummaryMode).toBe("dry_run");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports production-shaped live modes without configuration values", async () => {
    const response = await worker.fetch(new Request("https://worker.test/health"), {
      AUTH_MAGIC_LINK_MODE: "live",
      INVITE_DELIVERY_MODE: "live",
      STRIPE_SUMMARY_MODE: "live",
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      service: "film-worker",
      mode: "production",
      authMode: "live_member_only",
      inviteDeliveryMode: "live",
      stripeSummaryMode: "live_summary_only",
    });
  });

  it("serves the demo fixture only outside live auth mode", async () => {
    const dryRunResponse = await worker.fetch(new Request("https://worker.test/api/workspaces/demo"), {});
    const liveResponse = await worker.fetch(
      new Request("https://worker.test/api/workspaces/demo"),
      { AUTH_MAGIC_LINK_MODE: "live" },
    );
    const liveBody = (await liveResponse.json()) as { error: string };

    expect(dryRunResponse.status).toBe(200);
    expect(liveResponse.status).toBe(404);
    expect(liveBody.error).toBe("not_found");
  });

  it("returns a bounded canonical workspace snapshot for an authenticated member", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaces.set("workspace_acme", { id: "workspace_acme", name: "Canonical Films" });
    fakeAuth.projects.set("proj_canonical", {
      id: "proj_canonical",
      workspace_id: "workspace_acme",
      title: "Canonical Feature",
      project_type: "Feature Film",
      status: "active",
      phase: "production",
      logline: "A bounded production workspace.",
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T01:00:00.000Z",
    });
    fakeAuth.filmProfiles.set("proj_canonical", {
      project_id: "proj_canonical",
      runtime_minutes: 95,
      format: "4K",
      shoot_start: "2026-08-01",
      shoot_end: "2026-08-12",
      budget_cents: 200_000,
      spent_cents: 50_000,
      created_at: "2026-07-09T00:00:00.000Z",
      updated_at: "2026-07-09T01:00:00.000Z",
    });
    fakeAuth.tasks.set("task_canonical", {
      id: "task_canonical",
      workspace_id: "workspace_acme",
      project_id: "proj_canonical",
      title: "Lock the shot list",
      status: "ready",
      priority: "high",
      due_at: "2026-07-12",
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T01:00:00.000Z",
    });
    fakeAuth.documents.set("doc_canonical", {
      id: "doc_canonical",
      workspace_id: "workspace_acme",
      project_id: "proj_canonical",
      title: "Director notes.md",
      document_type: "markdown",
      markdown_snapshot: "# Director notes",
      sensitive: 0,
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T01:00:00.000Z",
    });
    fakeAuth.people.set("person_canonical", {
      id: "person_canonical",
      workspace_id: "workspace_acme",
      display_name: "Mina O.",
      role_tags: "[\"Producer\"]",
      notes: "private notes excluded",
      sensitive: 0,
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T01:00:00.000Z",
    });
    fakeAuth.projectPeople.set("proj_canonical:person_canonical", {
      project_id: "proj_canonical",
      person_id: "person_canonical",
      project_role: "Producer",
    });
    fakeAuth.equipment.set("equipment_canonical", {
      id: "equipment_canonical",
      workspace_id: "workspace_acme",
      project_id: "proj_canonical",
      name: "Camera package",
      equipment_type: "teal",
      status: "ready",
      notes: "private gear notes excluded",
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T01:00:00.000Z",
    });
    fakeAuth.expenses.set("expense_canonical", {
      id: "expense_canonical",
      workspace_id: "workspace_acme",
      project_id: "proj_canonical",
      category: "Camera",
      amount_cents: 25_000,
      purchased_at: null,
      comment: "{\"budget\":500}",
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T01:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/workspaces/current/snapshot", {
        method: "POST",
        headers: { cookie, "x-film-csrf": csrfToken },
        body: "{}",
      }),
      env,
    );
    const body = (await response.json()) as {
      snapshot: {
        persistence: string;
        workspace: { name: string };
        projects: Array<{ id: string }>;
        tasks: Array<{ id: string }>;
        documents: Array<{ markdownSnapshot: string }>;
        people: Array<Record<string, unknown>>;
        equipment: Array<Record<string, unknown>>;
        expenses: Array<{ budgetCents: number }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.snapshot.persistence).toBe("d1_canonical_workspace_snapshot");
    expect(body.snapshot.workspace.name).toBe("Canonical Films");
    expect(body.snapshot.projects).toEqual([expect.objectContaining({ id: "proj_canonical" })]);
    expect(body.snapshot.tasks).toEqual([expect.objectContaining({ id: "task_canonical" })]);
    expect(body.snapshot.documents[0]?.markdownSnapshot).toBe("# Director notes");
    expect(body.snapshot.people[0]).not.toHaveProperty("notes");
    expect(body.snapshot.equipment[0]).not.toHaveProperty("notes");
    expect(body.snapshot.expenses[0]?.budgetCents).toBe(50_000);
  });

  it("keeps the seeded local workspace when a dry-run session finds an empty D1 shell", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const env = { DB: fakeAuth.db, SESSIONS: fakeSessions.kv };
    fakeAuth.workspaces.set("workspace_acme", { id: "workspace_acme", name: "Empty local shell" });

    const requestResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "local-preview@example.com" }),
      }),
      env,
    );
    const requestBody = (await requestResponse.json()) as { devOnlyToken: string };
    const verifyResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: requestBody.devOnlyToken }),
      }),
      env,
    );
    const verifyBody = (await verifyResponse.json()) as { session: { csrfToken: string } };
    const cookie = verifyResponse.headers.get("set-cookie")?.split(";")[0] ?? "";

    const response = await worker.fetch(
      new Request("https://worker.test/api/workspaces/current/snapshot", {
        method: "POST",
        headers: { cookie, "x-film-csrf": verifyBody.session.csrfToken },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      env,
    );
    const body = (await response.json()) as {
      snapshot: { persistence: string; members: unknown[]; projects: unknown[] };
    };

    expect(response.status).toBe(200);
    expect(body.snapshot.persistence).toBe("dry_run_seed_snapshot");
    expect(body.snapshot.members.length).toBeGreaterThan(0);
    expect(body.snapshot.projects.length).toBeGreaterThan(0);

    const assignmentResponse = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/assign-dry-run", {
        method: "POST",
        headers: { cookie, "x-film-csrf": verifyBody.session.csrfToken },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          projectTitle: "Echoes in the Static",
          memberId: "member_producer",
          role: "reviewer",
          department: "Production",
        }),
      }),
      env,
    );
    const assignmentBody = (await assignmentResponse.json()) as { persistence: string };
    expect(assignmentResponse.status).toBe(200);
    expect(assignmentBody.persistence).toBe("dry_run_memoryless");

    const statusResponse = await worker.fetch(
      new Request("https://worker.test/api/members/status/dry-run", {
        method: "POST",
        headers: { cookie, "x-film-csrf": verifyBody.session.csrfToken },
        body: JSON.stringify({ workspaceId: "workspace_acme", memberId: "member_producer", status: "disabled" }),
      }),
      env,
    );
    const statusBody = (await statusResponse.json()) as { persistence: string; member: { role: string; status: string } };
    expect(statusResponse.status).toBe(200);
    expect(statusBody.persistence).toBe("dry_run_memoryless");
    expect(statusBody.member).toMatchObject({ role: "producer", status: "disabled" });
  });

  it("requires csrf for canonical workspace snapshots", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/workspaces/current/snapshot", { method: "POST" }),
      {},
    );
    expect(response.status).toBe(403);
  });

  it("stores stale-checked Markdown bodies with bounded audit metadata", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.documents.set("doc_markdown_live", {
      id: "doc_markdown_live",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Production notes.md",
      document_type: "markdown",
      markdown_snapshot: "# Before",
      sensitive: 1,
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/documents/markdown", {
        method: "POST",
        headers: { cookie, "content-type": "application/json", "x-film-csrf": csrfToken },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          documentId: "doc_markdown_live",
          markdownSnapshot: "# Canonical production notes\n\nPrivate body.",
          expectedUpdatedAt: "2026-07-09T00:00:00.000Z",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      destructiveWrite: boolean;
      persistence: string;
      document: { markdownLength: number; markdownSha256: string; updatedAt: string };
    };

    expect(response.status).toBe(200);
    expect(body.destructiveWrite).toBe(true);
    expect(body.persistence).toBe("d1_document_markdown");
    expect(body.document.markdownSha256).toHaveLength(64);
    expect(body.document.updatedAt).not.toBe("2026-07-09T00:00:00.000Z");
    expect(fakeAuth.documents.get("doc_markdown_live")?.markdown_snapshot).toContain("Private body");
    const audit = [...fakeAuth.auditEvents.values()].find((event) => event.action === "document.markdown_updated");
    expect(audit).toBeDefined();
    expect(audit?.metadata_json).not.toContain("Private body");
  });

  it("rejects stale canonical Markdown saves without changing the document", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.documents.set("doc_markdown_stale", {
      id: "doc_markdown_stale",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Stale notes.md",
      document_type: "markdown",
      markdown_snapshot: "# Current",
      sensitive: 0,
      owner_member_id: "member_producer",
      updated_at: "2026-07-09T02:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/documents/markdown", {
        method: "POST",
        headers: { cookie, "content-type": "application/json", "x-film-csrf": csrfToken },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          documentId: "doc_markdown_stale",
          markdownSnapshot: "# Stale overwrite",
          expectedUpdatedAt: "2026-07-09T01:00:00.000Z",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("stale_document_version");
    expect(fakeAuth.documents.get("doc_markdown_stale")?.markdown_snapshot).toBe("# Current");
    expect(fakeAuth.auditEvents.size).toBe(0);
  });

  it("reflects allowed local origins on preflight requests", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/backups/dry-run", {
        method: "OPTIONS",
        headers: {
          origin: "http://127.0.0.1:5175",
          "access-control-request-method": "POST",
        },
      }),
      {},
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5175");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("uses configured CORS origins for credentialed API responses", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/health", {
        headers: { origin: "https://app.film.example" },
      }),
      { ALLOWED_ORIGINS: "https://app.film.example" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.film.example");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not reflect unconfigured browser origins", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/health", {
        headers: { origin: "https://untrusted.example" },
      }),
      { ALLOWED_ORIGINS: "https://app.film.example" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.film.example");
    expect(response.headers.get("access-control-allow-origin")).not.toBe("https://untrusted.example");
  });

  it("requires csrf for backup dry-run mutations", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/backups/dry-run", { method: "POST" }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("returns backup dry-run metadata with csrf", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/backups/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
      }),
      {},
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      persistence: string;
      backup: {
        secretPolicy: string;
        retentionPolicy: string;
        restorePoint: { id: string; snapshotRef: string };
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.persistence).toBe("dry_run_memoryless");
    expect(body.backup.secretPolicy).toBe("provider_secrets_excluded");
    expect(body.backup.retentionPolicy).toBe("last_5_restore_points");
    expect(body.backup.restorePoint.id).toMatch(/^restore_/);
    expect(body.backup.restorePoint.snapshotRef).toContain("r2://dry-run-backups/workspace_acme/");
  });

  it("records D1 backup restore-point metadata and keeps the latest five", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    for (let index = 0; index < 5; index += 1) {
      fakeAuth.restorePoints.set(`restore_old_${index}`, {
        id: `restore_old_${index}`,
        workspace_id: "workspace_acme",
        label: `Old restore ${index}`,
        snapshot_ref: `r2://old/${index}`,
        created_at: `2026-07-0${index + 1}T00:00:00.000Z`,
      });
    }

    const response = await worker.fetch(
      new Request("https://worker.test/api/backups/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      backup: { restorePoint: { id: string; snapshotRef: string } };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_restore_point_metadata");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(fakeAuth.restorePoints.size).toBe(5);
    expect(fakeAuth.restorePoints.has(body.backup.restorePoint.id)).toBe(true);
    expect(fakeAuth.restorePoints.has("restore_old_0")).toBe(false);
    expect(body.backup.restorePoint.snapshotRef).toContain(".filmbackup.zip");
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_producer",
        action: "backup.dry_run_created",
      }),
    ]);
  });

  it("stores encrypted backup bundles in R2 and records restore-point metadata", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const backups = createR2Bucket();
    const bytes = new TextEncoder().encode("encrypted zip backup bytes");
    const sha256 = await sha256HexForTest("encrypted zip backup bytes");
    const uploadRequest = () => new Request("https://worker.test/api/backups/r2/upload-object", {
      method: "PUT",
      headers: {
        "content-type": "application/zip",
        "x-film-csrf": csrfToken,
        "x-film-workspace-id": "workspace_acme",
        "x-film-backup-created-at": "2026-07-08T00:00:00.000Z",
        "x-film-size-bytes": String(bytes.byteLength),
        "x-film-sha256": sha256,
        "x-film-storage-confirmation": "STORE BACKUP workspace_acme",
        cookie,
      },
      body: bytes,
    });
    const failingEnv = {
      ...env,
      BACKUPS: backups.bucket,
      DB: {
        ...env.DB,
        async batch() {
          throw new Error("D1 backup metadata batch unavailable");
        },
      } as unknown as D1Database,
    };
    const failedResponse = await worker.fetch(uploadRequest(), failingEnv);
    expect(failedResponse.status).toBe(503);
    expect(await failedResponse.json()).toMatchObject({
      error: "backup_object_metadata_finalize_failed",
      persistence: "r2_backup_metadata_pending",
      idempotent: false,
    });
    expect(backups.putCount).toBe(1);
    expect(backups.objects.size).toBe(1);
    expect(fakeAuth.restorePoints.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);

    const response = await worker.fetch(uploadRequest(), { ...env, BACKUPS: backups.bucket });
    const body = (await response.json()) as {
      persistence: string;
      restorePointPersistence: string;
      auditPersistence: string;
      idempotent: boolean;
      backup: {
        objectKey: string;
        sizeBytes: number;
        sha256: string;
        restorePoint: { id: string; snapshotRef: string };
      };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("r2_backup_object");
    expect(body.restorePointPersistence).toBe("d1_restore_point_metadata");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.idempotent).toBe(true);
    expect(body.backup.objectKey).toMatch(/^workspaces\/workspace_acme\/backups\/2026-07-08T00-00-00-000Z-/);
    expect(body.backup.restorePoint.snapshotRef).toBe(`r2://film-backups/${body.backup.objectKey}`);
    expect(body.backup.sizeBytes).toBe(bytes.byteLength);
    expect(body.backup.sha256).toBe(sha256);
    expect(backups.putCount).toBe(1);
    expect(backups.objects.get(body.backup.objectKey)?.body.byteLength).toBe(bytes.byteLength);
    expect(backups.objects.get(body.backup.objectKey)?.options?.customMetadata).toMatchObject({
      workspaceId: "workspace_acme",
      sha256,
      backupFormat: "film.encrypted-backup.zip",
    });
    expect(fakeAuth.restorePoints.get(body.backup.restorePoint.id)?.snapshot_ref).toBe(body.backup.restorePoint.snapshotRef);
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_producer",
        action: "backup.object_stored",
      }),
    ]);

    const manifestResponse = await worker.fetch(
      new Request("https://worker.test/api/backups/r2/export-manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme", limit: 10 }),
      }),
      { ...env, BACKUPS: backups.bucket },
    );
    const manifestBody = (await manifestResponse.json()) as {
      persistence: string;
      rowCount: number;
      objects: Array<{ restorePointId: string; objectKey: string; snapshotRef: string }>;
    };

    expect(manifestResponse.status).toBe(200);
    expect(manifestBody.persistence).toBe("d1_restore_point_metadata");
    expect(manifestBody.rowCount).toBe(1);
    expect(manifestBody.objects[0]).toMatchObject({
      restorePointId: body.backup.restorePoint.id,
      objectKey: body.backup.objectKey,
      snapshotRef: body.backup.restorePoint.snapshotRef,
    });

    const directDownloadResponse = await worker.fetch(
      new Request(`https://worker.test/api/backups/r2/object?workspaceId=workspace_acme&restorePointId=${body.backup.restorePoint.id}`, {
        method: "GET",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
      }),
      { ...env, BACKUPS: backups.bucket },
    );
    const directDownloadBody = (await directDownloadResponse.json()) as { error: string };

    expect(directDownloadResponse.status).toBe(400);
    expect(directDownloadBody.error).toBe("invalid_backup_object_request");

    const planRequest = () => new Request("https://worker.test/api/backups/r2/object-download-plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          restorePointId: body.backup.restorePoint.id,
        }),
      });
    const auditCountBeforePlan = fakeAuth.auditEvents.size;
    const failedPlanResponse = await worker.fetch(
      planRequest(),
      {
        ...env,
        BACKUPS: backups.bucket,
        DB: {
          prepare: env.DB.prepare.bind(env.DB),
          async batch() {
            throw new Error("injected backup download plan batch failure");
          },
        } as unknown as D1Database,
      },
    );
    expect(failedPlanResponse.status).toBe(503);
    expect(await failedPlanResponse.json()).toMatchObject({
      error: "backup_download_plan_storage_unavailable",
      backupDownloadPlanPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.backupObjectDownloadPlans.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBeforePlan);

    const planResponse = await worker.fetch(
      planRequest(),
      { ...env, BACKUPS: backups.bucket },
    );
    const planBody = (await planResponse.json()) as {
      destructiveWrite: boolean;
      downloadPolicy: string;
      backupDownloadPlanId: string;
      backupDownloadToken: string;
      backupDownloadTokenExpiresAt: string;
      backupDownloadPlanPersistence: string;
    };

    expect(planResponse.status).toBe(200);
    expect(planBody.destructiveWrite).toBe(false);
    expect(planBody.downloadPolicy).toBe("expiring_backup_object_download_plan");
    expect(planBody.backupDownloadPlanId).toMatch(/^backup_object_download_plan_/);
    expect(planBody.backupDownloadToken).toMatch(/^bdl_/);
    expect(planBody.backupDownloadTokenExpiresAt).toContain("T");
    expect(planBody.backupDownloadPlanPersistence).toBe("d1_backup_object_download_plans");
    expect(fakeAuth.backupObjectDownloadPlans.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBeforePlan + 1);
    expect([...fakeAuth.auditEvents.values()].at(-1)?.action).toBe("backup.object_download_plan_created");

    const downloadParams = new URLSearchParams({
      workspaceId: "workspace_acme",
      restorePointId: body.backup.restorePoint.id,
      backupDownloadPlanId: planBody.backupDownloadPlanId,
      backupDownloadToken: planBody.backupDownloadToken,
    });
    const downloadResponse = await worker.fetch(
      new Request(`https://worker.test/api/backups/r2/object?${downloadParams.toString()}`, {
        method: "GET",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
      }),
      { ...env, BACKUPS: backups.bucket },
    );

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("content-type")).toBe("application/zip");
    expect(downloadResponse.headers.get("content-disposition")).toContain("film-backup-2026-07-08.filmbackup.zip");
    expect(downloadResponse.headers.get("x-film-restore-point-id")).toBe(body.backup.restorePoint.id);
    expect(downloadResponse.headers.get("x-film-backup-download-plan-id")).toBe(planBody.backupDownloadPlanId);
    expect(await downloadResponse.text()).toBe("encrypted zip backup bytes");
  });

  it("exports bounded audit manifests without metadata values", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.auditEvents.set("audit_old", {
      id: "audit_old",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "provider.dry_run_checked",
      metadata_json: JSON.stringify({
        provider: "stripe",
        blockerCount: 2,
        internalValue: "do-not-return-this-value",
      }),
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_new", {
      id: "audit_new",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      actor_member_id: "member_owner",
      action: "operation.sync_replay_checked",
      metadata_json: JSON.stringify({
        operationCount: 3,
        rejectedCount: 0,
      }),
      created_at: "2026-07-08T00:01:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_other_workspace", {
      id: "audit_other_workspace",
      workspace_id: "workspace_other",
      project_id: null,
      actor_member_id: "member_owner",
      action: "backup.dry_run_created",
      metadata_json: "{}",
      created_at: "2026-07-08T00:02:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/audit-events/export-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme", limit: 10 }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      persistence: string;
      auditPersistence: string;
      exportPolicy: string;
      metadataPolicy: string;
      rowCount: number;
      offset: number;
      nextOffset: number | null;
      actionPrefix: string | null;
      events: Array<{ id: string; action: string; metadataKeys: string[]; metadataKeyCount: number }>;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.persistence).toBe("d1_audit_events");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.exportPolicy).toBe("audit_event_manifest_only");
    expect(body.metadataPolicy).toBe("keys_only");
    expect(body.rowCount).toBe(2);
    expect(body.offset).toBe(0);
    expect(body.nextOffset).toBeNull();
    expect(body.actionPrefix).toBeNull();
    expect(body.events.map((event) => event.id)).toEqual(["audit_new", "audit_old"]);
    expect(body.events[1]?.metadataKeys).toEqual(["blockerCount", "internalValue", "provider"]);
    expect(body.events[1]?.metadataKeyCount).toBe(3);
    expect(JSON.stringify(body)).not.toContain("do-not-return-this-value");
    expect([...fakeAuth.auditEvents.values()].some((event) => event.action === "audit.export_manifest_created")).toBe(true);
  });

  it("filters and paginates protected audit manifests", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.auditEvents.set("audit_provider_old", {
      id: "audit_provider_old",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "provider.dry_run_checked",
      metadata_json: JSON.stringify({ provider: "stripe" }),
      created_at: "2026-07-08T00:01:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_backup", {
      id: "audit_backup",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "backup.dry_run_created",
      metadata_json: JSON.stringify({ backup: true }),
      created_at: "2026-07-08T00:02:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_provider_middle", {
      id: "audit_provider_middle",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "provider.readiness_checked",
      metadata_json: JSON.stringify({ provider: "resend" }),
      created_at: "2026-07-08T00:03:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_provider_new", {
      id: "audit_provider_new",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "provider.dry_run_checked",
      metadata_json: JSON.stringify({ provider: "google" }),
      created_at: "2026-07-08T00:04:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/audit-events/export-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 1,
          offset: 1,
          actionPrefix: "provider.",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      rowCount: number;
      truncated: boolean;
      offset: number;
      nextOffset: number | null;
      actionPrefix: string | null;
      events: Array<{ id: string; action: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.rowCount).toBe(1);
    expect(body.truncated).toBe(true);
    expect(body.offset).toBe(1);
    expect(body.nextOffset).toBe(2);
    expect(body.actionPrefix).toBe("provider.");
    expect(body.events).toEqual([
      expect.objectContaining({
        id: "audit_provider_middle",
        action: "provider.readiness_checked",
      }),
    ]);
  });

  it("rejects backup R2 uploads when bytes do not match the declared hash", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const backups = createR2Bucket();
    const bytes = new TextEncoder().encode("encrypted zip backup bytes");

    const response = await worker.fetch(
      new Request("https://worker.test/api/backups/r2/upload-object", {
        method: "PUT",
        headers: {
          "content-type": "application/zip",
          "x-film-csrf": csrfToken,
          "x-film-workspace-id": "workspace_acme",
          "x-film-backup-created-at": "2026-07-08T00:00:00.000Z",
          "x-film-size-bytes": String(bytes.byteLength),
          "x-film-sha256": await sha256HexForTest("different bytes"),
          "x-film-storage-confirmation": "STORE BACKUP workspace_acme",
          cookie,
        },
        body: bytes,
      }),
      { ...env, BACKUPS: backups.bucket },
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(422);
    expect(body.error).toBe("sha256_mismatch");
    expect(backups.putCount).toBe(0);
  });

  it("requires csrf for restore commit dry-run gates", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-dry-run", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
          },
        }),
      }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("rejects restore commit dry-runs without exact confirmation", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          confirmation: "restore workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: [],
          },
        }),
      }),
      {},
    );
    const body = (await response.json()) as { error: string; expectedConfirmation: string };

    expect(response.status).toBe(422);
    expect(body.error).toBe("restore_confirmation_required");
    expect(body.expectedConfirmation).toBe("RESTORE workspace_acme");
  });

  it("rejects restore commit dry-runs with inconsistent previews", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 2,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: [],
          },
        }),
      }),
      {},
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_restore_preview");
  });

  it("accepts restore commit dry-run gates for producers without writing data", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: ["Attachment bytes are not included in this preview."],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      auditPersistence: string;
      destructiveWrite: boolean;
      preRestoreBackupRequired: boolean;
      preRestoreBackupId: string | null;
      preRestoreBackupVerified: boolean;
      preRestoreBackupPersistence: string;
      preRestoreBackupBlocker: string | null;
      commitStatus: string;
      authorizationPolicy: string;
      preview: { incomingRecordCount: number; warnings: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.destructiveWrite).toBe(false);
    expect(body.preRestoreBackupRequired).toBe(true);
    expect(body.preRestoreBackupId).toBe("restore_current");
    expect(body.preRestoreBackupVerified).toBe(true);
    expect(body.preRestoreBackupPersistence).toBe("d1_restore_point_metadata");
    expect(body.preRestoreBackupBlocker).toBeNull();
    expect(body.commitStatus).toBe("blocked_until_restore_commit_storage");
    expect(body.authorizationPolicy).toBe("owner_or_producer");
    expect(body.preview.incomingRecordCount).toBe(12);
    expect(body.preview.warnings).toEqual(["Attachment bytes are not included in this preview."]);
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_producer",
        action: "restore.commit_dry_run_checked",
      }),
    ]);
  });

  it("keeps restore commit dry-run gates blocked without stored pre-restore backup proof", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: [],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      preRestoreBackupVerified: boolean;
      preRestoreBackupPersistence: string;
      preRestoreBackupBlocker: string | null;
      commitStatus: string;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.destructiveWrite).toBe(false);
    expect(body.preRestoreBackupVerified).toBe(false);
    expect(body.preRestoreBackupPersistence).toBe("not_provided");
    expect(body.preRestoreBackupBlocker).toContain("stored R2 pre-restore backup");
    expect(body.commitStatus).toBe("blocked_until_pre_restore_backup");
  });

  it("records durable restore approval dry-runs after stored pre-restore backup proof", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/approval-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: ["Attachment bytes are not included in this preview."],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      preRestoreBackupVerified: boolean;
      approvalId: string | null;
      approvalStatus: string;
      approvalPersistence: string;
      approvalBlockers: string[];
      restoreMode: string;
      commitStatus: string;
      authorizationPolicy: string;
      auditPersistence: string;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.destructiveWrite).toBe(false);
    expect(body.preRestoreBackupVerified).toBe(true);
    expect(body.approvalId).toMatch(/^restore_approval_/);
    expect(body.approvalStatus).toBe("approved_pending_commit");
    expect(body.approvalPersistence).toBe("d1_restore_approvals");
    expect(body.approvalBlockers).toEqual([]);
    expect(body.restoreMode).toBe("approval_record_only");
    expect(body.commitStatus).toBe("blocked_until_restore_commit_storage");
    expect(body.authorizationPolicy).toBe("owner_or_producer");
    expect(body.auditPersistence).toBe("d1_audit_events");

    const approval = Array.from(fakeAuth.restoreApprovals.values())[0];
    expect(approval).toBeDefined();
    expect(approval!).toEqual(expect.objectContaining({
      id: body.approvalId,
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-07T00:00:00.000Z",
      pre_restore_backup_id: "restore_current",
      status: "approved_pending_commit",
      destructive_write: 0,
    }));
    expect(JSON.parse(approval!.preview_json)).toEqual({
      incomingRecordCount: 12,
      changedRecordCount: 2,
      newRecordCount: 3,
      fieldConflictCount: 4,
      warnings: ["Attachment bytes are not included in this preview."],
    });
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_producer",
        action: "restore.approval_dry_run_created",
      }),
    ]);
  });

  it("records durable blocked restore commit storage attempts after approval", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 12,
      changedRecordCount: 2,
      newRecordCount: 3,
      fieldConflictCount: 4,
      warnings: ["Attachment bytes are not included in this preview."],
    };
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const approvalResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/approval-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          confirmation: "RESTORE workspace_acme",
          preview,
        }),
      }),
      env,
    );
    const approvalBody = (await approvalResponse.json()) as { approvalId: string };

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-storage-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: approvalBody.approvalId,
          confirmation: "RESTORE workspace_acme",
          preview,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      approvalId: string;
      approvalStatus: string;
      approvalPersistence: string;
      commitAttemptId: string | null;
      commitAttemptStatus: string;
      commitAttemptPersistence: string;
      restoreMode: string;
      commitStatus: string;
      auditPersistence: string;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.destructiveWrite).toBe(false);
    expect(body.approvalId).toBe(approvalBody.approvalId);
    expect(body.approvalStatus).toBe("approved_pending_commit");
    expect(body.approvalPersistence).toBe("d1_restore_approvals");
    expect(body.commitAttemptId).toMatch(/^restore_commit_attempt_/);
    expect(body.commitAttemptStatus).toBe("blocked_until_restore_apply");
    expect(body.commitAttemptPersistence).toBe("d1_restore_commit_attempts");
    expect(body.restoreMode).toBe("commit_storage_only");
    expect(body.commitStatus).toBe("blocked_until_restore_apply");
    expect(body.auditPersistence).toBe("d1_audit_events");

    const attempt = Array.from(fakeAuth.restoreCommitAttempts.values())[0];
    expect(attempt).toBeDefined();
    expect(attempt!).toEqual(expect.objectContaining({
      id: body.commitAttemptId,
      workspace_id: "workspace_acme",
      approval_id: approvalBody.approvalId,
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      status: "blocked_until_restore_apply",
      destructive_write: 0,
    }));
    expect(JSON.parse(attempt!.preview_json)).toEqual(preview);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.approval_dry_run_created",
      "restore.commit_storage_dry_run_created",
    ]);
  });

  it("records restore application preflight dry-runs after commit storage", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 12,
      changedRecordCount: 2,
      newRecordCount: 3,
      fieldConflictCount: 4,
      warnings: ["Department tag changed for Scene 12."],
    };
    const applicationTablePlan = [
      {
        tableName: "projects",
        source: "workspace_snapshot",
        entityType: "project",
        operationCount: 2,
        createCount: 1,
        updateCount: 1,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 2,
        restoreSupport: "blocked",
        blockers: ["Workspace snapshot writes require the Worker application commit gate after approval and preflight."],
      },
      {
        tableName: "locations",
        source: "d1_planning_export",
        entityType: "planning",
        operationCount: 1,
        createCount: 0,
        updateCount: 0,
        skipCount: 0,
        previewOnlyCount: 1,
        fieldConflictCount: 0,
        restoreSupport: "preview_only",
        blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
      },
    ];
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const approvalResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/approval-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          confirmation: "RESTORE workspace_acme",
          preview,
        }),
      }),
      env,
    );
    const approvalBody = (await approvalResponse.json()) as { approvalId: string };
    const commitResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-storage-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: approvalBody.approvalId,
          confirmation: "RESTORE workspace_acme",
          preview,
        }),
      }),
      env,
    );
    const commitBody = (await commitResponse.json()) as { commitAttemptId: string };

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/application-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: approvalBody.approvalId,
          commitAttemptId: commitBody.commitAttemptId,
          confirmation: "RESTORE workspace_acme",
          preview,
          applicationTablePlan,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      approvalId: string;
      commitAttemptId: string;
      applicationPreflightId: string | null;
      applicationPreflightStatus: string;
      applicationPreflightPersistence: string;
      restoreMode: string;
      commitStatus: string;
      rollbackGuidance: {
        preRestoreBackupId: string;
        destructiveWrite: boolean;
        blockers: string[];
        previewCounts: { warningCount: number };
        applicationTablePlan: typeof applicationTablePlan;
      };
      auditPersistence: string;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.destructiveWrite).toBe(false);
    expect(body.approvalId).toBe(approvalBody.approvalId);
    expect(body.commitAttemptId).toBe(commitBody.commitAttemptId);
    expect(body.applicationPreflightId).toMatch(/^restore_application_preflight_/);
    expect(body.applicationPreflightStatus).toBe("blocked_until_restore_apply_implementation");
    expect(body.applicationPreflightPersistence).toBe("d1_restore_application_preflights");
    expect(body.restoreMode).toBe("application_preflight_only");
    expect(body.commitStatus).toBe("blocked_until_restore_apply_implementation");
    expect(body.rollbackGuidance.preRestoreBackupId).toBe("restore_current");
    expect(body.rollbackGuidance.destructiveWrite).toBe(false);
    expect(body.rollbackGuidance.blockers).toContain("Workspace snapshot writes require the Worker application commit gate after approval and preflight.");
    expect(body.rollbackGuidance.previewCounts.warningCount).toBe(1);
    expect(body.rollbackGuidance.applicationTablePlan).toEqual(applicationTablePlan);
    expect(body.auditPersistence).toBe("d1_audit_events");

    const preflight = Array.from(fakeAuth.restoreApplicationPreflights.values())[0];
    expect(preflight).toBeDefined();
    expect(preflight!).toEqual(expect.objectContaining({
      id: body.applicationPreflightId,
      workspace_id: "workspace_acme",
      approval_id: approvalBody.approvalId,
      commit_attempt_id: commitBody.commitAttemptId,
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      status: "blocked_until_restore_apply_implementation",
      destructive_write: 0,
    }));
    expect(JSON.parse(preflight!.preview_json)).toEqual(preview);
    expect(JSON.parse(preflight!.rollback_guidance_json)).toEqual(body.rollbackGuidance);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.approval_dry_run_created",
      "restore.commit_storage_dry_run_created",
      "restore.application_dry_run_created",
    ]);
  });

  it("keeps restore approval, commit-attempt, and application-preflight proof records atomic with audit evidence", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 3,
      changedRecordCount: 1,
      newRecordCount: 2,
      fieldConflictCount: 0,
      warnings: [],
    };
    fakeAuth.restorePoints.set("restore_atomic_proof", {
      id: "restore_atomic_proof",
      workspace_id: "workspace_acme",
      label: "Atomic proof backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260709T010000000Z-atomicproof.filmbackup.zip",
      created_at: "2026-07-09T01:00:00.000Z",
    });

    const baseDb = env.DB;
    let failBatch = true;
    const db = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected restore proof-chain batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const atomicEnv = { ...env, DB: db };
    const headers = {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
      cookie,
    };
    const approvalRequest = () => new Request("https://worker.test/api/restores/approval-dry-run", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        backupCreatedAt: "2026-07-08T00:00:00.000Z",
        preRestoreBackupId: "restore_atomic_proof",
        confirmation: "RESTORE workspace_acme",
        preview,
      }),
    });

    const failedApproval = await worker.fetch(approvalRequest(), atomicEnv);
    expect(failedApproval.status).toBe(503);
    expect(await failedApproval.json()).toMatchObject({
      error: "restore_approval_storage_unavailable",
      approvalPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restoreApprovals.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);

    failBatch = false;
    const approvalResponse = await worker.fetch(approvalRequest(), atomicEnv);
    const approvalBody = (await approvalResponse.json()) as { approvalId: string };
    expect(approvalResponse.status).toBe(200);
    expect(fakeAuth.restoreApprovals.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(1);

    const commitRequest = () => new Request("https://worker.test/api/restores/commit-storage-dry-run", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        backupCreatedAt: "2026-07-08T00:00:00.000Z",
        preRestoreBackupId: "restore_atomic_proof",
        approvalId: approvalBody.approvalId,
        confirmation: "RESTORE workspace_acme",
        preview,
      }),
    });

    failBatch = true;
    const failedCommit = await worker.fetch(commitRequest(), atomicEnv);
    expect(failedCommit.status).toBe(503);
    expect(await failedCommit.json()).toMatchObject({
      error: "restore_commit_attempt_storage_unavailable",
      commitAttemptPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restoreCommitAttempts.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(1);

    failBatch = false;
    const commitResponse = await worker.fetch(commitRequest(), atomicEnv);
    const commitBody = (await commitResponse.json()) as { commitAttemptId: string };
    expect(commitResponse.status).toBe(200);
    expect(fakeAuth.restoreCommitAttempts.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(2);

    const preflightRequest = () => new Request("https://worker.test/api/restores/application-dry-run", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        backupCreatedAt: "2026-07-08T00:00:00.000Z",
        preRestoreBackupId: "restore_atomic_proof",
        approvalId: approvalBody.approvalId,
        commitAttemptId: commitBody.commitAttemptId,
        confirmation: "RESTORE workspace_acme",
        preview,
        applicationTablePlan: [],
      }),
    });

    failBatch = true;
    const failedPreflight = await worker.fetch(preflightRequest(), atomicEnv);
    expect(failedPreflight.status).toBe(503);
    expect(await failedPreflight.json()).toMatchObject({
      error: "restore_application_preflight_storage_unavailable",
      applicationPreflightPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restoreApplicationPreflights.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(2);

    failBatch = false;
    const preflightResponse = await worker.fetch(preflightRequest(), atomicEnv);
    expect(preflightResponse.status).toBe(200);
    expect(fakeAuth.restoreApplicationPreflights.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(3);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.approval_dry_run_created",
      "restore.commit_storage_dry_run_created",
      "restore.application_dry_run_created",
    ]);
  });

  it("commits workspace snapshot restore application records after approval, commit attempt, and preflight", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 7,
      changedRecordCount: 2,
      newRecordCount: 5,
      fieldConflictCount: 2,
      warnings: [],
    };
    const applicationTablePlan = [
      {
        tableName: "workspaces",
        source: "workspace_snapshot",
        entityType: "workspace",
        operationCount: 1,
        createCount: 0,
        updateCount: 1,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 1,
        restoreSupport: "commit_supported",
        blockers: [],
      },
      {
        tableName: "projects",
        source: "workspace_snapshot",
        entityType: "project",
        operationCount: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 0,
        restoreSupport: "commit_supported",
        blockers: [],
      },
      {
        tableName: "tasks",
        source: "workspace_snapshot",
        entityType: "task",
        operationCount: 1,
        createCount: 0,
        updateCount: 1,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 1,
        restoreSupport: "commit_supported",
        blockers: [],
      },
      {
        tableName: "documents",
        source: "workspace_snapshot",
        entityType: "document",
        operationCount: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 0,
        restoreSupport: "commit_supported",
        blockers: [],
      },
      {
        tableName: "people",
        source: "workspace_snapshot",
        entityType: "person",
        operationCount: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 0,
        restoreSupport: "commit_supported",
        blockers: [],
      },
      {
        tableName: "equipment",
        source: "workspace_snapshot",
        entityType: "equipment",
        operationCount: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 0,
        restoreSupport: "commit_supported",
        blockers: [],
      },
      {
        tableName: "expenses",
        source: "workspace_snapshot",
        entityType: "expense",
        operationCount: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 0,
        restoreSupport: "commit_supported",
        blockers: [],
      },
    ];
    fakeAuth.workspaces.set("workspace_acme", {
      id: "workspace_acme",
      name: "Acme Films",
      archived_project_count: 1,
      backup_policy: "Daily at 8:00 AM",
      next_backup: "In 11h 18m",
    });
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApprovals.set("restore_approval_core", {
      id: "restore_approval_core",
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-07T00:00:00.000Z",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "approved_pending_commit",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreCommitAttempts.set("restore_commit_attempt_core", {
      id: "restore_commit_attempt_core",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_core",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "blocked_until_restore_apply",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApplicationPreflights.set("restore_application_preflight_core", {
      id: "restore_application_preflight_core",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_core",
      commit_attempt_id: "restore_commit_attempt_core",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      rollback_guidance_json: JSON.stringify({ applicationTablePlan }),
      status: "blocked_until_restore_apply_implementation",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.projects.set("proj_existing", {
      id: "proj_existing",
      workspace_id: "workspace_acme",
      title: "Existing Project",
      phase: "production",
    });
    fakeAuth.tasks.set("task_existing", {
      id: "task_existing",
      workspace_id: "workspace_acme",
      project_id: "proj_existing",
      title: "Old task",
      status: "todo",
      priority: "normal",
      due_at: null,
    });

    const restoreBody = {
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: "restore_approval_core",
          commitAttemptId: "restore_commit_attempt_core",
          applicationPreflightId: "restore_application_preflight_core",
          confirmation: "RESTORE workspace_acme",
          preview,
          applicationTablePlan,
          records: [
            {
              entityType: "workspace",
              entityId: "workspace_acme",
              action: "update",
              title: "Restored Workspace",
              archivedProjectCount: 3,
              backupPolicy: "Manual after restore",
              nextBackup: "Not scheduled",
            },
            {
              entityType: "project",
              entityId: "proj_restored",
              action: "create",
              title: "Restored Project",
              phase: "Production",
            },
            {
              entityType: "task",
              entityId: "task_existing",
              action: "update",
              projectId: "proj_existing",
              title: "Revised task",
              status: "ready",
              priority: "normal",
              dueAt: "2026-07-09",
            },
            {
              entityType: "document",
              entityId: "doc_restored",
              action: "create",
              projectId: "proj_restored",
              title: "Notes.md",
              documentType: "MD",
              markdownSnapshot: "# Notes",
            },
            {
              entityType: "person",
              entityId: "proj_restored:person:julia_lee",
              action: "create",
              projectId: "proj_restored",
              name: "Julia Lee",
              role: "Director",
              initials: "JL",
            },
            {
              entityType: "equipment",
              entityId: "proj_restored:equipment:camera_package",
              action: "create",
              projectId: "proj_restored",
              name: "Camera Package",
              status: "Prepped",
              statusTone: "teal",
            },
            {
              entityType: "expense",
              entityId: "proj_restored:expense:crew",
              action: "create",
              projectId: "proj_restored",
              category: "Crew",
              spent: 1250,
              budget: 2500,
              percent: 50,
            },
          ],
    };
    const restoreRequest = () => new Request("https://worker.test/api/restores/application-commit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify(restoreBody),
    });
    const failingEnv = {
      ...env,
      DB: {
        ...env.DB,
        async batch() {
          throw new Error("D1 restore batch unavailable");
        },
      } as unknown as D1Database,
    };
    const failedResponse = await worker.fetch(restoreRequest(), failingEnv);
    await expect(failedResponse.json()).resolves.toMatchObject({
      error: "restore_application_commit_storage_unavailable",
      destructiveWrite: false,
    });
    expect(failedResponse.status).toBe(503);
    expect(fakeAuth.workspaces.get("workspace_acme")?.name).toBe("Acme Films");
    expect(fakeAuth.projects.has("proj_restored")).toBe(false);
    expect(fakeAuth.tasks.get("task_existing")?.title).toBe("Old task");
    expect(fakeAuth.documents.has("doc_restored")).toBe(false);
    expect(fakeAuth.people.size).toBe(0);
    expect(fakeAuth.equipment.size).toBe(0);
    expect(fakeAuth.expenses.size).toBe(0);
    expect(fakeAuth.restoreApplicationCommits.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);

    const response = await worker.fetch(
      restoreRequest(),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      restoreMode: string;
      applicationCommitId: string;
      applicationCommitStatus: string;
      applicationCommitPersistence: string;
      result: { appliedCount: number; skippedCount: number; personCount: number; equipmentCount: number; expenseCount: number };
      recordSummary: { createCount: number; updateCount: number; personCount: number; equipmentCount: number; expenseCount: number };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(false);
    expect(body.destructiveWrite).toBe(true);
    expect(body.restoreMode).toBe("workspace_snapshot_records_commit");
    expect(body.applicationCommitId).toMatch(/^restore_application_commit_/);
    expect(body.applicationCommitStatus).toBe("applied_workspace_snapshot_records");
    expect(body.applicationCommitPersistence).toBe("d1_restore_application_commits");
    expect(body.result).toMatchObject({ appliedCount: 7, skippedCount: 0, personCount: 1, equipmentCount: 1, expenseCount: 1 });
    expect(body.recordSummary).toMatchObject({ createCount: 5, updateCount: 2, personCount: 1, equipmentCount: 1, expenseCount: 1 });
    expect(fakeAuth.workspaces.get("workspace_acme")).toMatchObject({
      name: "Restored Workspace",
      archived_project_count: 3,
      backup_policy: "Manual after restore",
      next_backup: "Not scheduled",
    });
    expect(fakeAuth.projects.get("proj_restored")).toMatchObject({
      workspace_id: "workspace_acme",
      title: "Restored Project",
      phase: "production",
    });
    expect(fakeAuth.tasks.get("task_existing")).toMatchObject({
      title: "Revised task",
      status: "ready",
      due_at: "2026-07-09",
    });
    expect(fakeAuth.documents.get("doc_restored")).toMatchObject({
      project_id: "proj_restored",
      title: "Notes.md",
      document_type: "markdown",
      markdown_snapshot: "# Notes",
    });
    expect(fakeAuth.people.get("proj_restored:person:julia_lee")).toMatchObject({
      workspace_id: "workspace_acme",
      display_name: "Julia Lee",
      role_tags: "[\"Director\"]",
      notes: "Initials: JL",
      sensitive: 1,
    });
    expect(fakeAuth.projectPeople.get("proj_restored:proj_restored:person:julia_lee")).toMatchObject({
      project_id: "proj_restored",
      person_id: "proj_restored:person:julia_lee",
      project_role: "Director",
    });
    expect(fakeAuth.equipment.get("proj_restored:equipment:camera_package")).toMatchObject({
      workspace_id: "workspace_acme",
      project_id: "proj_restored",
      name: "Camera Package",
      equipment_type: "teal",
      status: "Prepped",
    });
    expect(fakeAuth.expenses.get("proj_restored:expense:crew")).toMatchObject({
      workspace_id: "workspace_acme",
      project_id: "proj_restored",
      category: "Crew",
      amount_cents: 125000,
      comment: "{\"budget\":2500,\"percent\":50}",
    });
    expect(fakeAuth.restoreApplicationCommits.size).toBe(1);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.application_workspace_snapshot_records_committed",
    ]);
  });

  it("rejects semantically invalid workspace snapshot restore records before writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const invalidRecords = [
      {
        entityType: "project",
        entityId: "proj_invalid_phase",
        action: "create",
        title: "Invalid phase",
        phase: "Distribution",
      },
      {
        entityType: "task",
        entityId: "task_invalid_status",
        action: "create",
        projectId: "proj_existing",
        title: "Invalid status",
        status: "executing",
        priority: "normal",
      },
      {
        entityType: "document",
        entityId: "doc_invalid_body",
        action: "create",
        projectId: "proj_existing",
        title: "Contract.pdf",
        documentType: "PDF",
        markdownSnapshot: "# Unexpected body",
      },
      {
        entityType: "equipment",
        entityId: "equipment_missing_project",
        action: "create",
        name: "Camera",
        status: "Ready",
        statusTone: "teal",
      },
      {
        entityType: "expense",
        entityId: "expense_invalid_percent",
        action: "create",
        projectId: "proj_existing",
        category: "Crew",
        spent: 10,
        budget: 10,
        percent: 101,
      },
      {
        entityType: "project",
        entityId: "proj_invalid_parent",
        action: "create",
        projectId: "proj_existing",
        title: "Invalid parent",
        phase: "Development",
      },
    ];

    for (const record of invalidRecords) {
      const response = await worker.fetch(
        new Request("https://worker.test/api/restores/application-commit", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-film-csrf": csrfToken,
            cookie,
          },
          body: JSON.stringify({
            workspaceId: "workspace_acme",
            snapshotWorkspaceId: "workspace_acme",
            approvalId: "restore_approval_invalid",
            commitAttemptId: "restore_commit_attempt_invalid",
            applicationPreflightId: "restore_application_preflight_invalid",
            confirmation: "RESTORE workspace_acme",
            preview: {
              incomingRecordCount: 1,
              changedRecordCount: 0,
              newRecordCount: 1,
              fieldConflictCount: 0,
              warnings: [],
            },
            applicationTablePlan: [],
            records: [record],
          }),
        }),
        env,
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "invalid_restore_application_records" });
    }

    expect(fakeAuth.restoreApplicationCommits.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);
  });

  it("rejects stale core restore creates before writing records", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 1,
      changedRecordCount: 0,
      newRecordCount: 1,
      fieldConflictCount: 0,
      warnings: [],
    };
    const applicationTablePlan = [
      {
        tableName: "projects",
        source: "workspace_snapshot",
        entityType: "project",
        operationCount: 1,
        createCount: 1,
        updateCount: 0,
        skipCount: 0,
        previewOnlyCount: 0,
        fieldConflictCount: 0,
        restoreSupport: "commit_supported",
        blockers: [],
      },
    ];
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApprovals.set("restore_approval_core", {
      id: "restore_approval_core",
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-07T00:00:00.000Z",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "approved_pending_commit",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreCommitAttempts.set("restore_commit_attempt_core", {
      id: "restore_commit_attempt_core",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_core",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "blocked_until_restore_apply",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApplicationPreflights.set("restore_application_preflight_core", {
      id: "restore_application_preflight_core",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_core",
      commit_attempt_id: "restore_commit_attempt_core",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      rollback_guidance_json: JSON.stringify({ applicationTablePlan }),
      status: "blocked_until_restore_apply_implementation",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.projects.set("proj_restored", {
      id: "proj_restored",
      workspace_id: "workspace_acme",
      title: "Existing Project",
      phase: "production",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/application-commit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: "restore_approval_core",
          commitAttemptId: "restore_commit_attempt_core",
          applicationPreflightId: "restore_application_preflight_core",
          confirmation: "RESTORE workspace_acme",
          preview,
          applicationTablePlan,
          records: [
            {
              entityType: "project",
              entityId: "proj_restored",
              action: "create",
              title: "Restored Project",
              phase: "Production",
            },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      error: string;
      destructiveWrite: boolean;
      rejected: Array<{ entityType: string; entityId: string; reason: string }>;
    };

    expect(response.status).toBe(422);
    expect(body.error).toBe("restore_application_record_conflict");
    expect(body.destructiveWrite).toBe(false);
    expect(body.rejected).toEqual([
      { entityType: "project", entityId: "proj_restored", reason: "target_already_exists" },
    ]);
    expect(fakeAuth.projects.get("proj_restored")?.title).toBe("Existing Project");
    expect(fakeAuth.restoreApplicationCommits.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);
  });

  it("rejects restore application commits when records do not match the table plan", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 1,
      changedRecordCount: 0,
      newRecordCount: 1,
      fieldConflictCount: 0,
      warnings: [],
    };

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/application-commit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: "restore_approval_core",
          commitAttemptId: "restore_commit_attempt_core",
          applicationPreflightId: "restore_application_preflight_core",
          confirmation: "RESTORE workspace_acme",
          preview,
          applicationTablePlan: [],
          records: [
            {
              entityType: "project",
              entityId: "proj_restored",
              action: "create",
              title: "Restored Project",
              phase: "Production",
            },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; destructiveWrite: boolean };

    expect(response.status).toBe(422);
    expect(body.error).toBe("restore_application_table_plan_record_mismatch");
    expect(body.destructiveWrite).toBe(false);
    expect(fakeAuth.restoreApplicationCommits.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);
  });

  it("rejects restore application preflights without a stored commit attempt", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 12,
      changedRecordCount: 2,
      newRecordCount: 3,
      fieldConflictCount: 4,
      warnings: [],
    };
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const approvalResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/approval-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          confirmation: "RESTORE workspace_acme",
          preview,
        }),
      }),
      env,
    );
    const approvalBody = (await approvalResponse.json()) as { approvalId: string };

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/application-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: approvalBody.approvalId,
          commitAttemptId: "restore_commit_attempt_missing",
          confirmation: "RESTORE workspace_acme",
          preview,
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("restore_commit_attempt_not_found");
    expect(fakeAuth.restoreApplicationPreflights.size).toBe(0);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.approval_dry_run_created",
    ]);
  });

  it("rejects restore application preflights with invalid table-plan metadata", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/application-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: "restore_approval_123",
          commitAttemptId: "restore_commit_attempt_123",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: [],
          },
          applicationTablePlan: [
            {
              tableName: "../projects",
              source: "workspace_snapshot",
              entityType: "project",
              operationCount: 1,
              createCount: 0,
              updateCount: 1,
              skipCount: 0,
              previewOnlyCount: 0,
              fieldConflictCount: 1,
              restoreSupport: "blocked",
              blockers: [],
            },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_restore_application_table_plan");
    expect(fakeAuth.restoreApplicationPreflights.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);
  });

  it("rejects restore commit storage attempts when approval preview changed", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const approvedPreview = {
      incomingRecordCount: 12,
      changedRecordCount: 2,
      newRecordCount: 3,
      fieldConflictCount: 4,
      warnings: [],
    };
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const approvalResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/approval-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          confirmation: "RESTORE workspace_acme",
          preview: approvedPreview,
        }),
      }),
      env,
    );
    const approvalBody = (await approvalResponse.json()) as { approvalId: string };

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-storage-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: approvalBody.approvalId,
          confirmation: "RESTORE workspace_acme",
          preview: {
            ...approvedPreview,
            changedRecordCount: 3,
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(422);
    expect(body.error).toBe("restore_approval_preview_mismatch");
    expect(fakeAuth.restoreCommitAttempts.size).toBe(0);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.approval_dry_run_created",
    ]);
  });

  it("records blocked restore approval dry-runs without pre-restore backup proof", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/approval-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: [],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      preRestoreBackupVerified: boolean;
      approvalId: string | null;
      approvalStatus: string;
      approvalPersistence: string;
      approvalBlockers: string[];
      commitStatus: string;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.destructiveWrite).toBe(false);
    expect(body.preRestoreBackupVerified).toBe(false);
    expect(body.approvalId).toMatch(/^restore_approval_/);
    expect(body.approvalStatus).toBe("blocked");
    expect(body.approvalPersistence).toBe("d1_restore_approvals");
    expect(body.approvalBlockers.join(" ")).toContain("stored R2 pre-restore backup");
    expect(body.commitStatus).toBe("blocked_until_pre_restore_backup");
    expect(Array.from(fakeAuth.restoreApprovals.values())[0]).toEqual(expect.objectContaining({
      id: body.approvalId,
      status: "blocked",
      destructive_write: 0,
      pre_restore_backup_id: null,
    }));
  });

  it("rejects restore commit dry-run gates for reviewers", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("reviewer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/commit-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          confirmation: "RESTORE workspace_acme",
          preview: {
            incomingRecordCount: 12,
            changedRecordCount: 2,
            newRecordCount: 3,
            fieldConflictCount: 4,
            warnings: [],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("insufficient_role");
  });

  it("lists provider dry-run statuses", async () => {
    const response = await worker.fetch(new Request("https://worker.test/api/provider-status"), {});
    const body = (await response.json()) as { integrations: Array<{ key: string; secretsPolicy: string }> };

    expect(response.status).toBe(200);
    expect(body.integrations.map((integration) => integration.key).sort()).toEqual([
      "google",
      "pool",
      "resend",
      "sms",
      "social",
      "store",
      "stripe",
    ]);
    expect(body.integrations.every((integration) => integration.secretsPolicy === "worker_only")).toBe(true);
  });

  it("requires csrf for provider dry-run preflights", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/pool/dry-run", { method: "POST" }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("returns provider dry-run preflight metadata", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/pool/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
      }),
      {},
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      provider: { key: string; capabilities: string[]; secretsPolicy: string };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.provider.key).toBe("pool");
    expect(body.provider.capabilities).toContain("campaign_status");
    expect(body.provider.secretsPolicy).toBe("worker_only");
  });

  it("reports explicit live and blocked provider runtime gates without configuration values", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession();
    const privateValue = "runtime_readiness_private_value";
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/runtime-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      {
        ...env,
        ALLOWED_ORIGINS: "https://film.example.com",
        AUTH_MAGIC_LINK_MODE: "live",
        RESEND_API_KEY: privateValue,
        INVITE_FROM_EMAIL: "Film <invites@example.com>",
        INVITE_APP_ORIGIN: "https://film.example.com",
        INVITE_DELIVERY_WEBHOOK_SECRET: privateValue,
        INVITE_DELIVERY_MODE: "live",
        POOL_STRIPE_SUMMARY_ADAPTER_URL: "https://pool.example.com/film/stripe-summary",
        STORE_STRIPE_SUMMARY_ADAPTER_URL: "https://store.example.com/film/stripe-summary",
        STRIPE_PROJECT_MAPPINGS: '{"workspace_acme":{"proj_echoes":{"poolRefs":["pool-ref"],"storeRefs":["store-ref"]}}}',
        STRIPE_WEBHOOK_SECRET: privateValue,
        STRIPE_REDACTED_AUDIT: "true",
        STRIPE_SUMMARY_ADAPTER_SECRET: privateValue,
        STRIPE_SUMMARY_MODE: "live",
      },
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      readiness: {
        secretValuesExposed: boolean;
        liveCount: number;
        partialLiveCount: number;
        blockedCount: number;
        providers: Array<{ key: string; status: string; runtimeMode: string; blockers: string[]; requiredDecisions: string[] }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.readiness).toMatchObject({
      secretValuesExposed: false,
      liveCount: 4,
      partialLiveCount: 0,
      blockedCount: 3,
    });
    expect(body.readiness.providers.filter((provider) => provider.status === "live").map((provider) => provider.key)).toEqual([
      "pool",
      "store",
      "stripe",
      "resend",
    ]);
    expect(body.readiness.providers.filter((provider) => provider.status === "blocked").map((provider) => provider.key)).toEqual([
      "google",
      "social",
      "sms",
    ]);
    expect(body.readiness.providers.find((provider) => provider.key === "stripe")?.runtimeMode).toBe("live_summary_only");
    expect(body.readiness.providers.find((provider) => provider.key === "sms")).toMatchObject({
      label: "Telnyx SMS",
      status: "blocked",
      runtimeMode: "dry_run_only",
    });
    expect(body.readiness.providers.find((provider) => provider.key === "sms")?.blockers.join(" ")).toContain("10DLC");
    expect(body.readiness.providers.find((provider) => provider.key === "social")).toMatchObject({
      label: "Meta Insights",
      status: "blocked",
      runtimeMode: "dry_run_only",
    });
    expect(body.readiness.providers.find((provider) => provider.key === "social")?.requiredDecisions.join(" ")).toContain("outside social v1");
    expect(JSON.stringify(body)).not.toContain(privateValue);
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(expect.objectContaining({
      action: "provider.runtime_readiness_checked",
    }));
  });

  it("checks live Telnyx resources read-only while SMS activation gates remain closed", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession();
    const apiKey = "test_telnyx_readiness_key_123456789";
    const profileId = "4000eba1-a0c0-4563-9925-b25e842a7cb6";
    const campaignId = "823d6b1a-6ed6-41a3-9c50-c8ff41b682ba";
    const senderNumber = "+15055550199";
    const providerFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith("/v2/messaging_profiles/")) {
        return new Response(JSON.stringify({ data: {
          name: "Film",
          enabled: true,
          webhook_url: "https://worker.test/api/webhooks/telnyx/messaging",
          webhook_api_version: "2",
        } }), { status: 200 });
      }
      if (url.pathname.endsWith("/operationStatus")) {
        return new Response(JSON.stringify({ "10017": "APPROVED", "10035": "REVIEW" }), { status: 200 });
      }
      if (url.pathname.startsWith("/v2/10dlc/campaign/")) {
        return new Response(JSON.stringify({ campaignStatus: "PENDING MNO REVIEW" }), { status: 200 });
      }
      if (url.pathname.startsWith("/v2/messaging_phone_numbers/")) {
        return new Response(JSON.stringify({ data: {
          messaging_profile_id: profileId,
          features: { sms: { domestic_two_way: true } },
        } }), { status: 200 });
      }
      return new Response(JSON.stringify({ errors: [{ detail: "private not-found detail" }] }), { status: 404 });
    });
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/provider-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      {
        ...env,
        TELNYX_API_KEY: apiKey,
        TELNYX_MESSAGING_PROFILE_ID: profileId,
        TELNYX_CAMPAIGN_ID: campaignId,
        TELNYX_INBOUND_NUMBER_MAPPINGS: JSON.stringify({ [senderNumber]: "workspace_acme" }),
        TELNYX_WEBHOOK_PUBLIC_KEY: base64ForTest(new Uint8Array(32).fill(17)),
        SMS_RECIPIENT_ENCRYPTION_KEY: base64ForTest(new Uint8Array(32).fill(19)),
        SMS_RECIPIENT_HASH_KEY: base64ForTest(new Uint8Array(32).fill(23)),
        SMS_QUIET_HOURS_TIME_ZONE: "America/Denver",
        SMS_QUIET_HOURS_START: "22:00",
        SMS_QUIET_HOURS_END: "07:00",
        SMS_DELIVERY_RETENTION_DAYS: "90",
        TELNYX_WEBHOOK_MODE: "disabled",
        SMS_MODE: "disabled",
      },
    );
    const body = (await response.json()) as {
      readiness: {
        status: string;
        configured: Record<string, boolean>;
        activationGates: { webhookLive: boolean; sendLive: boolean };
        campaign: { mno: { approved: number; review: number; rejected: number } };
        secretValuesExposed: boolean;
      };
    };

    expect(response.status).toBe(200);
    expect(body.readiness).toMatchObject({
      status: "pending_campaign_review",
      activationGates: { webhookLive: false, sendLive: false },
      campaign: { mno: { approved: 1, review: 1, rejected: 0 } },
      secretValuesExposed: false,
    });
    expect(Object.values(body.readiness.configured).every(Boolean)).toBe(true);
    expect(providerFetch).toHaveBeenCalledTimes(5);
    const serialized = JSON.stringify(body);
    for (const privateValue of [apiKey, profileId, campaignId, senderNumber, "private not-found detail"]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("requires a D1-backed session for protected mutations when auth storage is available", async () => {
    const fakeAuth = createAuthD1();
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/pool/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
      }),
      { DB: fakeAuth.db },
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("missing_session");
    expect(body.persistence).toBe("d1_kv_auth_records");
  });

  it("accepts protected mutations with an authorized D1/KV session", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession();
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/pool/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
      }),
      env,
    );
    const body = (await response.json()) as { dryRun: boolean; provider: { key: string } };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.provider.key).toBe("pool");
  });

  it("returns a metadata-only Telnyx crew send plan without recipient or message values", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/send-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          category: "call_sheet",
          recipientCount: 8,
          consentedRecipientCount: 8,
          estimatedSegments: 16,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      provider: Record<string, unknown> & { policyEligible: boolean; liveSendAllowed: boolean };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.provider.policyEligible).toBe(true);
    expect(body.provider.liveSendAllowed).toBe(false);
    expect(body.provider).not.toHaveProperty("recipients");
    expect(body.provider).not.toHaveProperty("messageBody");
  });

  it("rejects raw recipient or content-shaped Telnyx send requests", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/send-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          category: "call_sheet",
          recipientCount: 1,
          consentedRecipientCount: 1,
          estimatedSegments: 1,
          recipients: ["+15555550100"],
          messageBody: "Private content",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_telnyx_sms_send_dry_run");
  });

  it("keeps the Telnyx live-send route authenticated and disabled by default", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const messageBody = "Private call sheet content";
    const recipientId = "sms_recipient_0123456789abcdef0123456789abcdef";
    const unauthorized = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      env,
    );
    const disabled = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          recipientIds: [recipientId],
          category: "call_sheet",
          messageBody,
          requestKey: "send_request_route_0001",
        }),
      }),
      env,
    );
    const disabledText = await disabled.text();

    expect(unauthorized.status).toBe(403);
    expect(disabled.status).toBe(503);
    expect(JSON.parse(disabledText)).toEqual({ error: "telnyx_sms_send_disabled" });
    expect(disabledText).not.toContain(messageBody);
    expect(disabledText).not.toContain(recipientId);
  });

  it("protects SMS consent routes and never reflects recipient input in errors", async () => {
    const unauthorized = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/consent/manifest", {
        method: "POST",
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      {},
    );
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const rawRecipient = "+15555550100";
    const invalid = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/consent/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          recipientE164: rawRecipient,
          evidenceId: "consent-evidence-route-001",
          disclosureVersion: "crew-sms-v1",
          categories: ["call_sheet"],
          source: "untrusted_source",
        }),
      }),
      env,
    );
    const invalidText = await invalid.text();

    expect(unauthorized.status).toBe(403);
    expect(invalid.status).toBe(400);
    expect(JSON.parse(invalidText)).toEqual({ error: "invalid_sms_consent_request" });
    expect(invalidText).not.toContain(rawRecipient);
  });

  it("requires explicit self-consent and prevents member impersonation or operator enrollment", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("contributor");
    const headers = {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
      cookie,
    };
    const base = {
      workspaceId: "workspace_acme",
      recipientE164: "+15055550100",
      evidenceId: "workspace-form:test-consent-001",
      disclosureVersion: "crew-sms-v1-2026-07-13",
      categories: ["call_sheet"],
      source: "workspace_form",
    };
    const missingAcknowledgment = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/consent/commit", {
        method: "POST",
        headers,
        body: JSON.stringify(base),
      }),
      env,
    );
    const forgedMember = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/consent/commit", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...base, disclosureAcknowledged: true, memberId: "member_owner" }),
      }),
      env,
    );
    const operatorEnrollment = await worker.fetch(
      new Request("https://worker.test/api/providers/sms/consent/commit", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...base, source: "operator", memberId: "member_contributor" }),
      }),
      env,
    );

    expect(missingAcknowledgment.status).toBe(400);
    expect(forgedMember.status).toBe(400);
    expect(operatorEnrollment.status).toBe(403);
    expect(await missingAcknowledgment.json()).toEqual({ error: "invalid_sms_consent_request" });
    expect(await forgedMember.json()).toEqual({ error: "invalid_sms_consent_request" });
    expect(await operatorEnrollment.json()).toEqual({ error: "insufficient_role" });
  });

  it("keeps the Telnyx webhook hidden until its explicit gate and rejects unsigned payloads", async () => {
    const rawRecipient = "+15555550100";
    const rawBody = JSON.stringify({
      data: {
        id: "event_route_001",
        event_type: "message.received",
        occurred_at: "2026-07-10T16:10:00.000Z",
        payload: {
          direction: "inbound",
          autoresponse_type: "STOP",
          from: { phone_number: rawRecipient },
          to: [{ phone_number: "+15555550999" }],
        },
      },
    });
    const disabled = await worker.fetch(
      new Request("https://worker.test/api/webhooks/telnyx/messaging", { method: "POST", body: rawBody }),
      {},
    );
    const unconfigured = await worker.fetch(
      new Request("https://worker.test/api/webhooks/telnyx/messaging", { method: "POST", body: rawBody }),
      { TELNYX_WEBHOOK_MODE: "live" },
    );
    const unsigned = await worker.fetch(
      new Request("https://worker.test/api/webhooks/telnyx/messaging", { method: "POST", body: rawBody }),
      {
        DB: {} as D1Database,
        SMS_RECIPIENT_HASH_KEY: base64ForTest(new Uint8Array(32).fill(23)),
        TELNYX_WEBHOOK_PUBLIC_KEY: base64ForTest(new Uint8Array(32)),
        TELNYX_INBOUND_NUMBER_MAPPINGS: '{"+15555550999":"workspace_acme"}',
        TELNYX_WEBHOOK_MODE: "live",
      },
    );
    const unsignedText = await unsigned.text();

    expect(disabled.status).toBe(404);
    expect(unconfigured.status).toBe(503);
    expect(unsigned.status).toBe(400);
    expect(JSON.parse(unsignedText)).toEqual({ error: "telnyx_webhook_signature_headers_required" });
    expect(unsignedText).not.toContain(rawRecipient);
  });

  it("rejects workspace-scoped mutations outside the session workspace", async () => {
    const { env, cookie, csrfToken, sessionId, fakeAuth } = await createAuthorizedTestSession("producer");
    const session = fakeAuth.sessions.get(sessionId);
    const member = fakeAuth.workspaceMembers.get("member_producer");
    if (!session || !member) throw new Error("Expected producer session and member");
    session.workspace_id = "workspace_other";
    member.workspace_id = "workspace_other";

    const backupResponse = await worker.fetch(
      new Request("https://worker.test/api/backups/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
      }),
      env,
    );
    const backupBody = (await backupResponse.json()) as { error: string; persistence: string };

    expect(backupResponse.status).toBe(403);
    expect(backupBody).toEqual({
      error: "workspace_mismatch",
      persistence: "d1_kv_auth_records",
    });
  });

  it("rejects protected mutations when the session role is not allowed", async () => {
    const session = await createAuthorizedTestSession("reviewer");

    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/pool/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": session.csrfToken,
          cookie: session.cookie,
        },
      }),
      session.env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("insufficient_role");
    expect(body.persistence).toBe("d1_kv_auth_records");
  });

  it("returns Stripe dry-run preflight metadata", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/stripe/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
      }),
      {},
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      provider: {
        key: string;
        capabilities: string[];
        secretsPolicy: string;
        productionReadPolicy?: { source: string; liveReadAllowed: boolean; dataBoundary: string; blockers: string[] };
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.provider.key).toBe("stripe");
    expect(body.provider.capabilities).toContain("payment_summary");
    expect(body.provider.secretsPolicy).toBe("worker_only");
    expect(body.provider.productionReadPolicy?.source).toBe("pool_store_summary_adapter");
    expect(body.provider.productionReadPolicy?.liveReadAllowed).toBe(false);
    expect(body.provider.productionReadPolicy?.dataBoundary).toBe("summary_only");
    expect(body.provider.productionReadPolicy?.blockers).toContain("Register production webhooks and redacted audit logging before live Stripe reads.");
  });

  it("returns Stripe summary readiness blockers without direct Stripe reads", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/stripe/summary-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      env,
    );
    const body = (await response.json()) as {
      readiness: {
        provider: string;
        source: string;
        status: string;
        dataBoundary: string;
        directStripeReadAllowed: boolean;
        liveSummaryReadAllowed: boolean;
        configured: { poolAdapter: boolean; storeAdapter: boolean; redactedAudit: boolean; adapterSecret: boolean; liveMode: boolean };
        blockers: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.readiness.provider).toBe("stripe");
    expect(body.readiness.source).toBe("pool_store_summary_adapter");
    expect(body.readiness.status).toBe("blocked_summary_adapter");
    expect(body.readiness.dataBoundary).toBe("summary_only");
    expect(body.readiness.directStripeReadAllowed).toBe(false);
    expect(body.readiness.liveSummaryReadAllowed).toBe(false);
    expect(body.readiness.configured).toMatchObject({
      poolAdapter: false,
      storeAdapter: false,
      redactedAudit: false,
      adapterSecret: false,
      liveMode: false,
    });
    expect(body.readiness.blockers).toContain("Missing POOL_STRIPE_SUMMARY_ADAPTER_URL.");
  });

  it("reports Stripe summary readiness when adapter configuration is complete before live mode", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const configuredEnv = {
      ...env,
      POOL_STRIPE_SUMMARY_ADAPTER_URL: "https://pool.example.com/film/stripe-summary",
      STORE_STRIPE_SUMMARY_ADAPTER_URL: "https://store.example.com/film/stripe-summary",
      STRIPE_PROJECT_MAPPINGS: "configured",
      STRIPE_WEBHOOK_SECRET: "test_webhook_secret",
      STRIPE_REDACTED_AUDIT: "true",
      STRIPE_SUMMARY_ADAPTER_SECRET: "test_adapter_secret",
    };
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/stripe/summary-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      configuredEnv,
    );
    const body = (await response.json()) as {
      auditPersistence: string;
      readiness: {
        status: string;
        directStripeReadAllowed: boolean;
        liveSummaryReadAllowed: boolean;
        configured: {
          poolAdapter: boolean;
          storeAdapter: boolean;
          projectMappings: boolean;
          webhookSecret: boolean;
          redactedAudit: boolean;
          adapterSecret: boolean;
          liveMode: boolean;
        };
        blockers: string[];
        complianceNotes: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.readiness.status).toBe("ready_for_summary_adapter");
    expect(body.readiness.directStripeReadAllowed).toBe(false);
    expect(body.readiness.liveSummaryReadAllowed).toBe(false);
    expect(body.readiness.configured).toEqual({
      poolAdapter: true,
      storeAdapter: true,
      projectMappings: true,
      webhookSecret: true,
      redactedAudit: true,
      adapterSecret: true,
      liveMode: false,
    });
    expect(body.readiness.blockers).toEqual([]);
    expect(body.readiness.complianceNotes.join(" ")).toContain("Stripe summaries must come through Pool/Store");
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_producer",
        action: "provider.stripe_summary_readiness_checked",
      }),
    ]);
  });

  it("blocks Stripe summary adapter reads until live mode is explicit", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const configuredEnv = {
      ...env,
      POOL_STRIPE_SUMMARY_ADAPTER_URL: "https://pool.example.com/film/stripe-summary",
      STORE_STRIPE_SUMMARY_ADAPTER_URL: "https://store.example.com/film/stripe-summary",
      STRIPE_PROJECT_MAPPINGS: JSON.stringify({
        workspace_acme: {
          proj_echoes: {
            pool: ["campaign_echoes"],
            store: ["store_echoes"],
          },
        },
      }),
      STRIPE_WEBHOOK_SECRET: "test_webhook_secret",
      STRIPE_REDACTED_AUDIT: "true",
      STRIPE_SUMMARY_ADAPTER_SECRET: "test_adapter_secret",
    };

    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/stripe/summary", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme", projectId: "proj_echoes" }),
      }),
      configuredEnv,
    );
    const body = (await response.json()) as {
      error: string;
      readiness: { status: string; liveSummaryReadAllowed: boolean };
    };

    expect(response.status).toBe(409);
    expect(body.error).toBe("stripe_summary_not_live_enabled");
    expect(body.readiness.status).toBe("ready_for_summary_adapter");
    expect(body.readiness.liveSummaryReadAllowed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        project_id: "proj_echoes",
        actor_member_id: "member_producer",
        action: "provider.stripe_summary_blocked",
      }),
    ]);
  });

  it("fetches Stripe summary aggregates through Pool and Store adapters without direct Stripe reads", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        authorization: "Bearer test_adapter_secret",
        "content-type": "application/json",
      });
      const payload = JSON.parse(String(init?.body)) as {
        workspaceId: string;
        projectId: string;
        source: string;
        mappedRefs: string[];
        dataBoundary: string;
      };
      expect(payload.workspaceId).toBe("workspace_acme");
      expect(payload.projectId).toBe("proj_echoes");
      expect(payload.dataBoundary).toBe("summary_only");

      if (String(input).includes("pool.example.com")) {
        expect(payload.source).toBe("pool");
        expect(payload.mappedRefs).toEqual(["campaign_echoes"]);
        return new Response(JSON.stringify({
          source: "pool",
          generatedAt: "2026-07-08T00:00:00.000Z",
          currency: "USD",
          totals: {
            actualStripeGrossAmount: 120000,
            actualStripeFeeAmount: 4000,
            actualStripeNetAmount: 116000,
            pledgedAmount: 150000,
            chargedAmount: 120000,
          },
          counts: {
            chargedPledgeCount: 12,
            paymentFailedPledgeCount: 1,
          },
          paymentIntentId: "pi_should_not_return",
          customerEmail: "supporter@example.com",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      expect(payload.source).toBe("store");
      expect(payload.mappedRefs).toEqual(["store_echoes"]);
      return new Response(JSON.stringify({
        source: "store",
        generatedAt: "2026-07-08T00:01:00.000Z",
        currency: "USD",
        totals: {
          grossAmountCents: 60000,
          feeAmountCents: 1800,
          netAmountCents: 58200,
          orderRevenueCents: 60000,
        },
        counts: {
          paymentCount: 6,
        },
        chargeId: "ch_should_not_return",
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const configuredEnv = {
      ...env,
      POOL_STRIPE_SUMMARY_ADAPTER_URL: "https://pool.example.com/film/stripe-summary",
      STORE_STRIPE_SUMMARY_ADAPTER_URL: "https://store.example.com/film/stripe-summary",
      STRIPE_PROJECT_MAPPINGS: JSON.stringify({
        workspace_acme: {
          proj_echoes: {
            pool: ["campaign_echoes"],
            store: ["store_echoes"],
          },
        },
      }),
      STRIPE_WEBHOOK_SECRET: "test_webhook_secret",
      STRIPE_REDACTED_AUDIT: "true",
      STRIPE_SUMMARY_ADAPTER_SECRET: "test_adapter_secret",
      STRIPE_SUMMARY_MODE: "live",
    };

    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/stripe/summary", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme", projectId: "proj_echoes" }),
      }),
      configuredEnv,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      auditPersistence: string;
      summary: {
        status: string;
        directStripeReadAllowed: boolean;
        liveSummaryReadAllowed: boolean;
        adapters: Array<{ source: string; status: string; mappedRefCount: number; errorCode: string | null }>;
        totals: {
          grossAmountCents: number;
          feeAmountCents: number;
          netAmountCents: number;
          pledgedAmountCents: number;
          orderRevenueCents: number;
        };
        counts: { paymentCount: number; paymentFailedCount: number };
        warnings: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(false);
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.summary.status).toBe("complete_summary");
    expect(body.summary.directStripeReadAllowed).toBe(false);
    expect(body.summary.liveSummaryReadAllowed).toBe(true);
    expect(body.summary.adapters).toEqual([
      expect.objectContaining({ source: "pool", status: "available", mappedRefCount: 1, errorCode: null }),
      expect.objectContaining({ source: "store", status: "available", mappedRefCount: 1, errorCode: null }),
    ]);
    expect(body.summary.totals).toMatchObject({
      grossAmountCents: 180000,
      feeAmountCents: 5800,
      netAmountCents: 174200,
      pledgedAmountCents: 150000,
      orderRevenueCents: 60000,
    });
    expect(body.summary.counts).toMatchObject({
      paymentCount: 18,
      paymentFailedCount: 1,
    });
    expect(body.summary.warnings).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(body)).not.toContain("pi_should_not_return");
    expect(JSON.stringify(body)).not.toContain("supporter@example.com");
    expect(JSON.stringify(body)).not.toContain("ch_should_not_return");
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        project_id: "proj_echoes",
        actor_member_id: "member_producer",
        action: "provider.stripe_summary_checked",
      }),
    ]);
  });

  it("returns Resend dry-run preflight metadata", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/resend/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      auditPersistence: string;
      provider: { key: string; capabilities: string[]; secretsPolicy: string };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.provider.key).toBe("resend");
    expect(body.provider.capabilities).toContain("magic_link_delivery");
    expect(body.provider.secretsPolicy).toBe("worker_only");
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_producer",
        action: "provider.dry_run_checked",
      }),
    ]);
  });

  it("returns invite delivery readiness without sending email", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/delivery-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      readiness: {
        provider: string;
        status: string;
        dryRunOutboxAllowed: boolean;
        liveDeliveryAllowed: boolean;
        configured: { resendApiKey: boolean; fromEmail: boolean; appOrigin: boolean; webhookSecret: boolean };
        requiredConfiguration: string[];
        blockers: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.readiness.provider).toBe("resend");
    expect(body.readiness.status).toBe("blocked_live_delivery");
    expect(body.readiness.dryRunOutboxAllowed).toBe(true);
    expect(body.readiness.liveDeliveryAllowed).toBe(false);
    expect(body.readiness.configured).toMatchObject({
      resendApiKey: false,
      fromEmail: false,
      appOrigin: false,
      webhookSecret: false,
    });
    expect(body.readiness.requiredConfiguration).toContain("RESEND_API_KEY");
    expect(body.readiness.blockers).toContain("Missing RESEND_API_KEY.");
  });

  it("reports invite delivery as ready for a future live adapter when configuration is complete", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const configuredEnv = {
      ...env,
      RESEND_API_KEY: "test_resend_key",
      INVITE_FROM_EMAIL: "Film <invites@example.com>",
      INVITE_APP_ORIGIN: "https://film.example.com",
      INVITE_DELIVERY_WEBHOOK_SECRET: "test_webhook_secret",
      ALLOWED_ORIGINS: "https://film.example.com",
    };
    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/delivery-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      configuredEnv,
    );
    const body = (await response.json()) as {
      readiness: {
        status: string;
        liveDeliveryAllowed: boolean;
        configured: { productionOrigin: boolean; liveMode: boolean };
        blockers: string[];
        complianceNotes: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.readiness.status).toBe("ready_for_live_adapter");
    expect(body.readiness.liveDeliveryAllowed).toBe(false);
    expect(body.readiness.configured.productionOrigin).toBe(true);
    expect(body.readiness.configured.liveMode).toBe(false);
    expect(body.readiness.blockers).toEqual([]);
    expect(body.readiness.complianceNotes.join(" ")).toContain("Live delivery requires the signed Resend webhook endpoint");
  });

  it("allows invite live delivery only when explicitly enabled", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const configuredEnv = {
      ...env,
      RESEND_API_KEY: "test_resend_key",
      INVITE_FROM_EMAIL: "Film <invites@example.com>",
      INVITE_APP_ORIGIN: "https://film.example.com",
      INVITE_DELIVERY_WEBHOOK_SECRET: "test_webhook_secret",
      INVITE_DELIVERY_MODE: "live",
      ALLOWED_ORIGINS: "https://film.example.com",
    };
    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/delivery-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      configuredEnv,
    );
    const body = (await response.json()) as {
      readiness: {
        status: string;
        liveDeliveryAllowed: boolean;
        configured: { liveMode: boolean; productionOrigin: boolean };
        blockers: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.readiness.status).toBe("live_delivery_enabled");
    expect(body.readiness.liveDeliveryAllowed).toBe(true);
    expect(body.readiness.configured).toMatchObject({
      liveMode: true,
      productionOrigin: true,
    });
    expect(body.readiness.blockers).toEqual([]);
  });

  it("connects and disconnects Google with one-time state and encrypted token storage", async () => {
    const { env, cookie, csrfToken, fakeAuth, fakeSessions } = await createAuthorizedTestSession("producer");
    const tokenKey = base64ForTest(new Uint8Array(32).fill(11));
    const configuredEnv = {
      ...env,
      INVITE_APP_ORIGIN: "https://film.test",
      GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://worker.test/api/providers/google/oauth/callback",
      GOOGLE_OAUTH_MODE: "live",
      GOOGLE_TOKEN_ENCRYPTION_KEY: tokenKey,
    };
    const providerFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) {
        const body = init?.body as URLSearchParams | undefined;
        if (body?.get("grant_type") === "refresh_token") {
          return Response.json({
            access_token: "google-access-refreshed-private",
            expires_in: 3600,
            scope: "https://www.googleapis.com/auth/drive.readonly",
            token_type: "Bearer",
          });
        }
        return Response.json({
          access_token: "google-access-private",
          refresh_token: "google-refresh-private",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/drive.readonly",
          token_type: "Bearer",
        });
      }
      if (url.includes("www.googleapis.com/drive/v3/files")) {
        return Response.json({
          files: [{
            id: "google_doc_12345",
            name: "Production bible",
            mimeType: "application/vnd.google-apps.document",
            modifiedTime: "2026-07-09T22:00:00.000Z",
            webViewLink: "https://docs.google.com/document/d/google_doc_12345/edit",
          }],
        });
      }
      if (url.includes("oauth2.googleapis.com/revoke")) {
        return new Response(null, { status: 200 });
      }
      throw new Error(`Unexpected Google request: ${url}`);
    });

    const startResponse = await worker.fetch(
      new Request("https://worker.test/api/providers/google/oauth/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme", includeDocsExport: true }),
      }),
      configuredEnv,
    );
    const startBody = (await startResponse.json()) as {
      authorizationUrl: string;
      scopes: string[];
      persistence: string;
    };
    const authorizationUrl = new URL(startBody.authorizationUrl);
    const state = authorizationUrl.searchParams.get("state") ?? "";

    expect(startResponse.status).toBe(200);
    expect(startBody.persistence).toBe("kv_oauth_state");
    expect(startBody.scopes).toEqual(["https://www.googleapis.com/auth/drive.readonly"]);
    const stateKey = `oauth:google:${await sha256HexForTest(state)}`;
    expect(fakeSessions.values.has(stateKey)).toBe(true);

    const callbackUrl = new URL(configuredEnv.GOOGLE_OAUTH_REDIRECT_URI);
    callbackUrl.searchParams.set("code", "google-authorization-code");
    callbackUrl.searchParams.set("state", state);
    const callbackResponse = await worker.fetch(
      new Request(callbackUrl, { headers: { cookie } }),
      configuredEnv,
    );

    expect(callbackResponse.status).toBe(303);
    expect(callbackResponse.headers.get("location")).toBe("https://film.test/?google=connected");
    expect(fakeSessions.values.has(stateKey)).toBe(false);
    expect(providerFetch).toHaveBeenCalledOnce();
    const stored = fakeAuth.providerConnections.get("workspace_acme:google");
    expect(stored).toMatchObject({
      status: "active",
      token_key_version: "v1",
      scopes_json: JSON.stringify(["https://www.googleapis.com/auth/drive.readonly"]),
    });
    expect(stored?.access_token_ciphertext).not.toContain("google-access-private");
    expect(stored?.refresh_token_ciphertext).not.toContain("google-refresh-private");

    const statusResponse = await worker.fetch(
      new Request("https://worker.test/api/providers/google/connection", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      configuredEnv,
    );
    const statusText = await statusResponse.text();
    const statusBody = JSON.parse(statusText) as {
      connection: { status: string; hasRefreshToken: boolean };
      readiness: { liveOAuthAllowed: boolean };
    };
    expect(statusResponse.status).toBe(200);
    expect(statusBody.connection).toMatchObject({ status: "active", hasRefreshToken: true });
    expect(statusBody.readiness.liveOAuthAllowed).toBe(true);
    expect(statusText).not.toContain("google-access-private");
    expect(statusText).not.toContain("google-refresh-private");
    expect(statusText).not.toContain(stored?.access_token_ciphertext ?? "missing-ciphertext");
    const initialAccessCiphertext = stored?.access_token_ciphertext;
    if (stored) stored.token_expires_at = "2026-07-09T00:00:00.000Z";

    const manifestResponse = await worker.fetch(
      new Request("https://worker.test/api/providers/google/drive-manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme", rootFolderId: "drive_folder_12345" }),
      }),
      configuredEnv,
    );
    const manifestText = await manifestResponse.text();
    const manifestBody = JSON.parse(manifestText) as {
      tokenRefreshed: boolean;
      manifest: { rootFolderId: string; files: Array<{ id: string; name: string }> };
    };
    expect(manifestResponse.status).toBe(200);
    expect(manifestBody.tokenRefreshed).toBe(true);
    expect(manifestBody.manifest).toMatchObject({
      rootFolderId: "drive_folder_12345",
      files: [{ id: "google_doc_12345", name: "Production bible" }],
    });
    expect(manifestText).not.toContain("google-access-private");
    expect(manifestText).not.toContain("google-access-refreshed-private");
    expect(fakeAuth.providerConnections.get("workspace_acme:google")?.access_token_ciphertext).not.toBe(initialAccessCiphertext);

    const disconnectResponse = await worker.fetch(
      new Request("https://worker.test/api/providers/google/disconnect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      configuredEnv,
    );
    const disconnectBody = (await disconnectResponse.json()) as {
      providerRevoked: boolean;
      connection: { status: string; hasRefreshToken: boolean };
    };
    expect(disconnectResponse.status).toBe(200);
    expect(disconnectBody.providerRevoked).toBe(true);
    expect(disconnectBody.connection).toMatchObject({ status: "disconnected", hasRefreshToken: false });
    expect(fakeAuth.providerConnections.get("workspace_acme:google")).toMatchObject({
      status: "disconnected",
      access_token_ciphertext: null,
      refresh_token_ciphertext: null,
    });

    const replayResponse = await worker.fetch(
      new Request(callbackUrl, { headers: { cookie } }),
      configuredEnv,
    );
    expect(replayResponse.status).toBe(303);
    expect(replayResponse.headers.get("location")).toContain("google=error");
    expect(providerFetch).toHaveBeenCalledTimes(4);
    expect(JSON.stringify([...fakeAuth.auditEvents.values()])).not.toContain("google-access-private");
    expect(JSON.stringify([...fakeAuth.auditEvents.values()])).not.toContain("google-refresh-private");
  });

  it("reports Google OAuth blockers without returning configuration values", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/google/connection", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      { GOOGLE_OAUTH_CLIENT_SECRET: "private-google-client-secret" },
    );
    const text = await response.text();
    const body = JSON.parse(text) as {
      connection: null;
      readiness: { liveOAuthAllowed: boolean; blockers: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.connection).toBeNull();
    expect(body.readiness.liveOAuthAllowed).toBe(false);
    expect(body.readiness.blockers).toContain("Missing GOOGLE_OAUTH_CLIENT_ID.");
    expect(text).not.toContain("private-google-client-secret");
  });

  it("connects Meta, selects a linked Page, reads bounded analytics, and disconnects", async () => {
    const { env, cookie, csrfToken, fakeAuth, fakeSessions } = await createAuthorizedTestSession("producer");
    const tokenKey = base64ForTest(new Uint8Array(32).fill(23));
    const configuredEnv = {
      ...env,
      INVITE_APP_ORIGIN: "https://film.test",
      META_OAUTH_CLIENT_ID: "123456789012345",
      META_OAUTH_CLIENT_SECRET: "private-meta-client-secret",
      META_OAUTH_REDIRECT_URI: "https://worker.test/api/providers/meta/oauth/callback",
      META_GRAPH_API_VERSION: "v23.0",
      META_LOGIN_CONFIGURATION_ID: "987654321098765",
      META_TOKEN_ENCRYPTION_KEY: tokenKey,
      META_OAUTH_MODE: "live",
    };
    const providerFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/oauth/access_token") && init?.method === "POST") {
        const body = init.body as URLSearchParams;
        expect(url.searchParams.size).toBe(0);
        if (body.get("grant_type") === "fb_exchange_token") {
          expect(body.get("fb_exchange_token")).toBe("meta-short-user-token-private");
          return Response.json({ access_token: "meta-long-user-token-private", expires_in: 5_184_000 });
        }
        return Response.json({ access_token: "meta-short-user-token-private", expires_in: 3600 });
      }
      if (url.pathname.endsWith("/me/permissions") && init?.method !== "DELETE") {
        return Response.json({
          data: [
            "pages_show_list",
            "pages_read_engagement",
            "read_insights",
            "instagram_basic",
            "instagram_manage_insights",
          ].map((permission) => ({ permission, status: "granted" })),
        });
      }
      if (url.pathname.endsWith("/me") && init?.method !== "DELETE") {
        return Response.json({ id: "333333333333333" });
      }
      if (url.pathname.endsWith("/me/accounts")) {
        return Response.json({ data: [{
          id: "111111111111111",
          name: "Big Sword",
          access_token: "meta-page-token-private-123456",
          tasks: ["ANALYZE", "CREATE_CONTENT"],
          instagram_business_account: { id: "222222222222222", username: "bigswordfilm" },
        }] });
      }
      if (url.pathname.endsWith("/111111111111111") && url.searchParams.get("fields")?.includes("access_token")) {
        return Response.json({
          id: "111111111111111",
          name: "Big Sword",
          access_token: "meta-page-token-private-123456",
          tasks: ["ANALYZE", "CREATE_CONTENT"],
          instagram_business_account: { id: "222222222222222", username: "bigswordfilm" },
        });
      }
      if (url.pathname.endsWith("/111111111111111/posts")) {
        return Response.json({ data: [{
          id: "facebook_post_12345",
          message: "Big Sword production update",
          created_time: "2026-07-09T18:00:00Z",
          permalink_url: "https://www.facebook.com/bigsword/posts/12345",
          reactions: { summary: { total_count: 18 } },
          comments: { summary: { total_count: 4 } },
          shares: { count: 2 },
        }] });
      }
      if (url.pathname.endsWith("/222222222222222/media")) {
        return Response.json({ data: [{
          id: "instagram_media_12345",
          caption: "On set",
          media_type: "IMAGE",
          media_url: "https://private.example/image.jpg",
          permalink: "https://www.instagram.com/p/ABC123/",
          timestamp: "2026-07-08T18:00:00Z",
          like_count: 80,
          comments_count: 6,
        }] });
      }
      if (url.pathname.endsWith("/111111111111111/insights")) {
        return Response.json({ data: [{
          name: "page_post_engagements",
          period: "day",
          values: [{ value: 24, end_time: "2026-07-10T00:00:00Z" }],
        }] });
      }
      if (url.pathname.endsWith("/222222222222222/insights")) {
        return Response.json({ data: [{ name: "reach", period: "day", total_value: { value: 1250 } }] });
      }
      if (url.pathname.endsWith("/me/permissions") && init?.method === "DELETE") {
        return Response.json({ success: true });
      }
      throw new Error(`Unexpected Meta request: ${url}`);
    });

    const protectedRequest = (path: string, body: Record<string, unknown>) => worker.fetch(
      new Request(`https://worker.test${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify(body),
      }),
      configuredEnv,
    );
    const startResponse = await protectedRequest("/api/providers/meta/oauth/start", { workspaceId: "workspace_acme" });
    const startBody = (await startResponse.json()) as { authorizationUrl: string; scopes: string[] };
    const authorizationUrl = new URL(startBody.authorizationUrl);
    const state = authorizationUrl.searchParams.get("state") ?? "";
    const stateKey = `oauth:meta:${await sha256HexForTest(state)}`;
    expect(startResponse.status).toBe(200);
    expect(authorizationUrl.hostname).toBe("www.facebook.com");
    expect(startBody.scopes).not.toContain("pages_manage_posts");
    expect(fakeSessions.values.has(stateKey)).toBe(true);

    const callbackUrl = new URL(configuredEnv.META_OAUTH_REDIRECT_URI);
    callbackUrl.searchParams.set("code", "meta-authorization-code-12345");
    callbackUrl.searchParams.set("state", state);
    const callbackResponse = await worker.fetch(new Request(callbackUrl, { headers: { cookie } }), configuredEnv);
    expect(callbackResponse.status).toBe(303);
    expect(callbackResponse.headers.get("location")).toBe("https://film.test/?meta=connected");
    expect(fakeSessions.values.has(stateKey)).toBe(false);
    const pending = fakeAuth.metaProviderConnections.get("workspace_acme");
    expect(pending).toMatchObject({ status: "pending_page_selection", meta_user_id: "333333333333333" });
    expect(pending?.user_access_token_ciphertext).not.toContain("meta-long-user-token-private");

    const pagesResponse = await protectedRequest("/api/providers/meta/pages", { workspaceId: "workspace_acme" });
    const pagesText = await pagesResponse.text();
    const pagesBody = JSON.parse(pagesText) as { pages: Array<{ id: string; name: string }> };
    expect(pagesResponse.status).toBe(200);
    expect(pagesBody.pages).toEqual([expect.objectContaining({ id: "111111111111111", name: "Big Sword" })]);
    expect(pagesText).not.toContain("meta-page-token-private");

    const selectionResponse = await protectedRequest("/api/providers/meta/select-page", {
      workspaceId: "workspace_acme",
      pageId: "111111111111111",
    });
    const selectionText = await selectionResponse.text();
    const selectionBody = JSON.parse(selectionText) as { connection: { status: string; page: { name: string } } };
    expect(selectionResponse.status).toBe(200);
    expect(selectionBody.connection).toMatchObject({ status: "active", page: { name: "Big Sword" } });
    expect(selectionText).not.toContain("meta-page-token-private");
    expect(fakeAuth.metaProviderConnections.get("workspace_acme")?.page_access_token_ciphertext)
      .not.toContain("meta-page-token-private");

    const analyticsResponse = await protectedRequest("/api/providers/meta/analytics", {
      workspaceId: "workspace_acme",
      since: "2026-07-01",
      until: "2026-07-10",
    });
    const analyticsText = await analyticsResponse.text();
    const analyticsBody = JSON.parse(analyticsText) as {
      analytics: { status: string; calendar: unknown[]; insights: unknown[]; secretValuesExposed: boolean };
    };
    expect(analyticsResponse.status).toBe(200);
    expect(analyticsBody.analytics).toMatchObject({ status: "complete", secretValuesExposed: false });
    expect(analyticsBody.analytics.calendar).toHaveLength(2);
    expect(analyticsBody.analytics.insights).toHaveLength(2);
    expect(analyticsText).not.toContain("meta-page-token-private");
    expect(analyticsText).not.toContain("private.example");

    const disconnectResponse = await protectedRequest("/api/providers/meta/disconnect", { workspaceId: "workspace_acme" });
    const disconnectBody = (await disconnectResponse.json()) as { providerRevoked: boolean; connection: { status: string } };
    expect(disconnectResponse.status).toBe(200);
    expect(disconnectBody).toMatchObject({ providerRevoked: true, connection: { status: "disconnected" } });
    expect(fakeAuth.metaProviderConnections.get("workspace_acme")).toMatchObject({
      status: "disconnected",
      user_access_token_ciphertext: null,
      page_access_token_ciphertext: null,
      page_id: null,
      instagram_account_id: null,
    });

    const replayResponse = await worker.fetch(new Request(callbackUrl, { headers: { cookie } }), configuredEnv);
    expect(replayResponse.status).toBe(303);
    expect(replayResponse.headers.get("location")).toContain("meta=error");
    const auditText = JSON.stringify([...fakeAuth.auditEvents.values()]);
    expect(auditText).not.toContain("meta-long-user-token-private");
    expect(auditText).not.toContain("meta-page-token-private");
    expect(providerFetch).toHaveBeenCalledTimes(11);
  });

  it("handles signed Meta data deletion, status replay, and deauthorization without retaining user IDs", async () => {
    const fakeAuth = createAuthD1();
    const signingKeyFixture = "x".repeat(32);
    const metaUserId = "333333333333333";
    const connection = (): FakeMetaProviderConnectionRow => ({
      id: "provider_meta_workspace_acme",
      workspace_id: "workspace_acme",
      connected_by_member_id: "member_producer",
      status: "active",
      scopes_json: JSON.stringify(["pages_show_list", "read_insights"]),
      user_access_token_ciphertext: "v1.user-private-ciphertext",
      page_access_token_ciphertext: "v1.page-private-ciphertext",
      token_expires_at: "2026-09-01T00:00:00.000Z",
      token_key_version: "v1",
      meta_user_id: metaUserId,
      page_id: "111111111111111",
      page_name: "Big Sword",
      instagram_account_id: "222222222222222",
      instagram_username: "bigswordfilm",
      last_error_code: null,
      connected_at: "2026-07-10T12:00:00.000Z",
      disconnected_at: null,
      updated_at: "2026-07-10T12:00:00.000Z",
    });
    fakeAuth.metaProviderConnections.set("workspace_acme", connection());
    const signedRequest = await metaSignedRequestForTest(signingKeyFixture, {
      algorithm: "HMAC-SHA256",
      user_id: metaUserId,
      issued_at: Math.floor(Date.now() / 1000),
    });
    const callbackRequest = () => new Request("https://worker.test/api/webhooks/meta/data-deletion", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ signed_request: signedRequest }),
    });

    const response = await worker.fetch(callbackRequest(), {
      DB: fakeAuth.db,
      META_OAUTH_CLIENT_SECRET: signingKeyFixture,
    });
    const responseText = await response.text();
    const body = JSON.parse(responseText) as { url: string; confirmation_code: string };
    expect(response.status).toBe(200);
    expect(body.confirmation_code).toMatch(/^[a-f0-9]{32}$/);
    expect(body.url).toBe(`https://worker.test/api/providers/meta/data-deletion/status?code=${body.confirmation_code}`);
    expect(fakeAuth.metaProviderConnections.size).toBe(0);
    expect(fakeAuth.metaDataDeletionRequests.size).toBe(1);
    expect(responseText).not.toContain(metaUserId);
    expect(JSON.stringify([...fakeAuth.metaDataDeletionRequests.values()])).not.toContain(metaUserId);

    const replay = await worker.fetch(callbackRequest(), {
      DB: fakeAuth.db,
      META_OAUTH_CLIENT_SECRET: signingKeyFixture,
    });
    const replayBody = (await replay.json()) as { confirmation_code: string };
    expect(replayBody.confirmation_code).toBe(body.confirmation_code);
    expect(fakeAuth.metaDataDeletionRequests.size).toBe(1);

    const statusResponse = await worker.fetch(new Request(body.url), { DB: fakeAuth.db });
    const statusBody = (await statusResponse.json()) as {
      status: string;
      deletedConnectionCount: number;
      secretValuesExposed: boolean;
    };
    expect(statusResponse.status).toBe(200);
    expect(statusBody).toMatchObject({ status: "completed", deletedConnectionCount: 1, secretValuesExposed: false });

    const invalid = await worker.fetch(new Request("https://worker.test/api/webhooks/meta/data-deletion", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ signed_request: `${signedRequest.slice(0, -1)}A` }),
    }), { DB: fakeAuth.db, META_OAUTH_CLIENT_SECRET: signingKeyFixture });
    expect(invalid.status).toBe(403);

    fakeAuth.metaProviderConnections.set("workspace_acme", connection());
    const deauthorization = await metaSignedRequestForTest(signingKeyFixture, {
      algorithm: "HMAC-SHA256",
      user_id: metaUserId,
      issued_at: Math.floor(Date.now() / 1000),
      reason: "deauthorization",
    });
    const deauthorizeResponse = await worker.fetch(new Request("https://worker.test/api/webhooks/meta/deauthorize", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ signed_request: deauthorization }),
    }), { DB: fakeAuth.db, META_OAUTH_CLIENT_SECRET: signingKeyFixture });
    const deauthorizeText = await deauthorizeResponse.text();
    expect(deauthorizeResponse.status).toBe(200);
    expect(deauthorizeText).not.toContain(metaUserId);
    expect(fakeAuth.metaProviderConnections.size).toBe(0);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toContain("provider.meta_deauthorized");
  });

  it("returns Google Drive sync dry-run plans without live reads", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/google/drive-sync-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          rootFolderId: "folder_abc123456",
          includeCalendarSync: true,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      auditPersistence: string;
      provider: {
        key: string;
        syncMode: string;
        rootFolderConfigured: boolean;
        oauthPolicy: string;
        webhookPolicy: string;
        requiredScopes: string[];
        plannedActions: Array<{ id: string; liveReadAllowed: boolean }>;
        blockers: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.provider.key).toBe("google");
    expect(body.provider.syncMode).toBe("metadata_preflight_only");
    expect(body.provider.rootFolderConfigured).toBe(true);
    expect(body.provider.oauthPolicy).toBe("worker_encrypted_oauth_ready");
    expect(body.provider.webhookPolicy).toBe("not_configured");
    expect(body.provider.requiredScopes).toContain("drive.metadata.readonly");
    expect(body.provider.requiredScopes).toContain("calendar.events.readonly");
    expect(body.provider.plannedActions.map((action) => action.id)).not.toContain("export_docs_markdown");
    expect(body.provider.plannedActions.every((action) => action.liveReadAllowed === false)).toBe(true);
    expect(body.provider.blockers).toContain("Configure the Google OAuth client secrets and explicit live-mode gate.");
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_owner",
        action: "provider.google_drive_sync_dry_run_checked",
      }),
    ]);
  });

  it("rejects unknown provider dry-run preflights", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/providers/airtable/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
      }),
      {},
    );

    expect(response.status).toBe(404);
  });

  it("requires csrf for Notion import dry runs", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/dry-run", { method: "POST" }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid Notion import manifests", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({ files: [{ path: "Tasks.csv", sizeBytes: -1 }] }),
      }),
      {},
    );

    expect(response.status).toBe(400);
  });

  it("rejects Notion manifests without declared sizes or above the aggregate byte cap", async () => {
    const missingSizeResponse = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({ files: [{ path: "Tasks.csv" }] }),
      }),
      {},
    );
    const aggregateResponse = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          files: Array.from({ length: 21 }, (_, index) => ({
            path: `Archive-${index}.md`,
            sizeBytes: 25 * 1024 * 1024,
          })),
        }),
      }),
      {},
    );

    expect(missingSizeResponse.status).toBe(400);
    expect(aggregateResponse.status).toBe(400);
    await expect(missingSizeResponse.json()).resolves.toEqual({ error: "invalid_import_manifest" });
    await expect(aggregateResponse.json()).resolves.toEqual({ error: "invalid_import_manifest" });
  });

  it("preflights a Notion export manifest without reading content", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          files: [
            { path: "Projects aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md", sizeBytes: 1200 },
            { path: "Projects aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Tasks.csv", sizeBytes: 500 },
            { path: "../private.env", sizeBytes: 12 },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      auditPersistence: string;
      preview: { markdownDocuments: number; csvDatabases: number; unsafeFiles: string[] };
      candidates: Array<{ kind: string; title: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.preview.markdownDocuments).toBe(1);
    expect(body.preview.csvDatabases).toBe(1);
    expect(body.preview.unsafeFiles).toEqual(["../private.env"]);
    expect(body.candidates.map((candidate) => [candidate.kind, candidate.title])).toEqual([
      ["page", "Projects"],
      ["database", "Tasks"],
    ]);
    const auditEvent = Array.from(fakeAuth.auditEvents.values())[0];
    expect(auditEvent).toEqual(expect.objectContaining({
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      action: "import.notion_preflight_checked",
    }));
    expect(auditEvent?.metadata_json).toContain("\"unsafeFileCount\":1");
    expect(auditEvent?.metadata_json).not.toContain("../private.env");
  });

  it("requires csrf for Notion planning import commits", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          records: [
            {
              kind: "location",
              title: "Desert Motel",
              sourcePath: "Planning/Locations.csv",
              fields: {},
            },
          ],
        }),
      }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("requires csrf and returns a bounded dry run for Notion core import commits", async () => {
    const body = JSON.stringify({
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      records: [{
        kind: "task",
        sourcePath: "Tasks.csv",
        sourceKey: "row:0",
        projectTitle: "Big Sword",
        title: "Lock picture",
        due: "Jul 30",
        status: "pending",
      }],
    });
    const missingCsrf = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/core/commit", { method: "POST", body }),
      {},
    );
    const dryRun = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/core/commit", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body,
      }),
      {},
    );
    const dryRunBody = (await dryRun.json()) as Record<string, unknown>;

    expect(missingCsrf.status).toBe(403);
    expect(dryRun.status).toBe(200);
    expect(dryRunBody).toMatchObject({
      ok: true,
      dryRun: true,
      persistence: "dry_run_memoryless",
      commitPolicy: "atomic_create_only_core_records",
      destructiveWrite: false,
    });
    expect(JSON.stringify(dryRunBody)).not.toContain("Tasks.csv");
  });

  it("uses separate KV rate-limit buckets for sequential Notion import stages", async () => {
    const fakeSessions = createSessionKV();
    const env = { SESSIONS: fakeSessions.kv };
    const headers = {
      "content-type": "application/json",
      "x-film-csrf": "local-test-csrf-token",
      "cf-connecting-ip": "203.0.113.44",
      "user-agent": "vitest-notion-import-buckets",
    };
    const preflight = await worker.fetch(new Request("https://worker.test/api/imports/notion/dry-run", {
      method: "POST",
      headers,
      body: JSON.stringify({ files: [{ path: "Tasks.csv", sizeBytes: 64 }] }),
    }), env);
    const core = await worker.fetch(new Request("https://worker.test/api/imports/notion/core/commit", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        projectId: "project_big_sword",
        records: [{
          kind: "task",
          sourcePath: "Tasks.csv",
          sourceKey: "row:0",
          projectTitle: "Big Sword",
          title: "Lock picture",
          due: "Jul 30",
          status: "pending",
        }],
      }),
    }), env);
    const planning = await worker.fetch(new Request("https://worker.test/api/imports/notion/planning/commit", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        records: [{
          kind: "location",
          title: "Desert Motel",
          sourcePath: "Locations.csv",
          projectTitle: null,
          projectTitles: [],
          fields: {},
        }],
      }),
    }), env);

    expect([preflight.status, core.status, planning.status]).toEqual([200, 200, 503]);
    await expect(planning.json()).resolves.toMatchObject({ error: "planning_import_storage_required" });
    const keys = [...fakeSessions.values.keys()];
    expect(keys.some((key) => key.startsWith("rl:notion_import_preflight:"))).toBe(true);
    expect(keys.some((key) => key.startsWith("rl:notion_core_import:"))).toBe(true);
    expect(keys.some((key) => key.startsWith("rl:notion_planning_import:"))).toBe(true);
  });

  it("commits Notion planning rows into D1 idempotently", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_planning", {
      id: "proj_planning",
      workspace_id: "workspace_acme",
      title: "Dust Wave Feature",
      phase: "production",
    });

    const records = [
      {
        kind: "location",
        title: "Desert Motel",
        sourcePath: "Planning/Locations.csv",
        projectTitle: "Archive, Dust Wave Feature",
        projectTitles: ["Archive", "Dust Wave Feature"],
        fields: {
          Type: "Interior",
          Address: "Route 66",
        },
      },
      {
        kind: "opportunity",
        title: "Festival premiere",
        sourcePath: "Planning/Opportunities.csv",
        projectTitle: "Dust Wave Feature",
        fields: {
          Type: "Festival",
          Tags: "submission, premiere",
        },
      },
      {
        kind: "role",
        title: "Location Manager",
        sourcePath: "Planning/Roles.csv",
        fields: {
          Department: "Production",
        },
      },
    ];
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        records,
      }),
    };
    const failingEnv = {
      ...env,
      DB: {
        ...env.DB,
        async batch() {
          throw new Error("D1 Notion planning import batch unavailable");
        },
      } as unknown as D1Database,
    };
    const failedResponse = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", request),
      failingEnv,
    );
    await expect(failedResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "planning_import_storage_unavailable",
      persistence: "d1_unavailable_import_blocked",
      destructiveWrite: false,
    });
    expect(failedResponse.status).toBe(503);
    expect(fakeAuth.planningRows.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);

    const response = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", request),
      env,
    );
    const body = (await response.json()) as {
      ok: boolean;
      dryRun: boolean;
      persistence: string;
      auditPersistence: string;
      accepted: Array<{ id: string; kind: string; title: string }>;
      committed: string[];
      idempotent: string[];
      updatePreview: string[];
      tableSummary: Array<{
        kind: string;
        tableName: string;
        acceptedCount: number;
        committedCount: number;
        idempotentCount: number;
        updatePreviewCount: number;
        rejectedCount: number;
      }>;
      rejected: Array<{ reason: string }>;
      commitPolicy: string;
      destructiveWrite: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(false);
    expect(body.persistence).toBe("d1_planning_import");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.accepted).toHaveLength(3);
    expect(body.committed).toEqual(body.accepted.map((record) => record.id));
    expect(body.idempotent).toEqual([]);
    expect(body.updatePreview).toEqual([]);
    expect(body.tableSummary).toEqual([
      {
        kind: "location",
        tableName: "locations",
        acceptedCount: 1,
        committedCount: 1,
        idempotentCount: 0,
        updatePreviewCount: 0,
        rejectedCount: 0,
      },
      {
        kind: "opportunity",
        tableName: "opportunities",
        acceptedCount: 1,
        committedCount: 1,
        idempotentCount: 0,
        updatePreviewCount: 0,
        rejectedCount: 0,
      },
      {
        kind: "role",
        tableName: "production_roles",
        acceptedCount: 1,
        committedCount: 1,
        idempotentCount: 0,
        updatePreviewCount: 0,
        rejectedCount: 0,
      },
    ]);
    expect(body.rejected).toEqual([]);
    expect(body.commitPolicy).toBe("atomic_create_only_planning_rows");
    expect(body.destructiveWrite).toBe(true);
    expect(fakeAuth.planningRows.size).toBe(3);
    expect(Array.from(fakeAuth.planningRows.values())).toEqual([
      expect.objectContaining({
        table: "locations",
        workspace_id: "workspace_acme",
        project_id: "proj_planning",
        title: "Desert Motel",
      }),
      expect.objectContaining({
        table: "opportunities",
        workspace_id: "workspace_acme",
        project_id: "proj_planning",
        title: "Festival premiere",
      }),
      expect.objectContaining({
        table: "production_roles",
        workspace_id: "workspace_acme",
        project_id: null,
        title: "Location Manager",
      }),
    ]);
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_producer",
        action: "import.notion_planning_committed",
      }),
    );

    const repeatResponse = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", request),
      env,
    );
    const repeatBody = (await repeatResponse.json()) as {
      committed: string[];
      idempotent: string[];
      updatePreview: string[];
      updatePreviewDetails: Array<{
        id: string;
        kind: string;
        tableName: string;
        title: string;
        fieldChangeCount: number;
        fieldChanges: Array<{ field: string; currentValue: string; incomingValue: string }>;
      }>;
      tableSummary: Array<{ tableName: string; committedCount: number; idempotentCount: number; updatePreviewCount: number }>;
    };

    expect(repeatResponse.status).toBe(200);
    expect(repeatBody.committed).toEqual([]);
    expect(repeatBody.idempotent).toEqual(body.accepted.map((record) => record.id));
    expect(repeatBody.updatePreview).toEqual([]);
    expect(repeatBody.tableSummary).toEqual([
      expect.objectContaining({ tableName: "locations", committedCount: 0, idempotentCount: 1, updatePreviewCount: 0 }),
      expect.objectContaining({ tableName: "opportunities", committedCount: 0, idempotentCount: 1, updatePreviewCount: 0 }),
      expect.objectContaining({ tableName: "production_roles", committedCount: 0, idempotentCount: 1, updatePreviewCount: 0 }),
    ]);
    expect(fakeAuth.planningRows.size).toBe(3);

    const changedRecords = [
      {
        ...records[0],
        fields: {
          ...records[0]!.fields,
          Type: "Exterior",
        },
      },
      records[1],
      records[2],
    ];
    const changedResponse = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", {
        ...request,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          records: changedRecords,
        }),
      }),
      env,
    );
    const changedBody = (await changedResponse.json()) as {
      committed: string[];
      idempotent: string[];
      updatePreview: string[];
      updatePreviewDetails: Array<{
        id: string;
        kind: string;
        tableName: string;
        title: string;
        fieldChangeCount: number;
        fieldChanges: Array<{ field: string; currentValue: string; incomingValue: string }>;
      }>;
      tableSummary: Array<{ tableName: string; committedCount: number; idempotentCount: number; updatePreviewCount: number }>;
    };

    expect(changedResponse.status).toBe(200);
    expect(changedBody.committed).toEqual([]);
    expect(changedBody.idempotent).toEqual([body.accepted[1]!.id, body.accepted[2]!.id]);
    expect(changedBody.updatePreview).toEqual([body.accepted[0]!.id]);
    expect(changedBody.updatePreviewDetails).toEqual([
      expect.objectContaining({
        id: body.accepted[0]!.id,
        kind: "location",
        tableName: "locations",
        title: "Desert Motel",
        fieldChangeCount: 1,
        fieldChanges: [
          {
            field: "fields.Type",
            currentValue: "Interior",
            incomingValue: "Exterior",
          },
        ],
      }),
    ]);
    expect(changedBody.tableSummary).toEqual([
      expect.objectContaining({ tableName: "locations", committedCount: 0, idempotentCount: 0, updatePreviewCount: 1 }),
      expect.objectContaining({ tableName: "opportunities", committedCount: 0, idempotentCount: 1, updatePreviewCount: 0 }),
      expect.objectContaining({ tableName: "production_roles", committedCount: 0, idempotentCount: 1, updatePreviewCount: 0 }),
    ]);
    expect(fakeAuth.planningRows.get(`locations:${body.accepted[0]!.id}`)?.fields.location_type).toBe("Interior");
  });

  it("rejects invalid Notion planning rows without partial D1 writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          records: [
            {
              kind: "location",
              title: "Valid location",
              sourcePath: "Planning/Locations.csv",
              fields: {},
            },
            {
              kind: "location",
              title: "Unsafe location",
              sourcePath: "../private/Locations.csv",
              fields: {},
            },
            {
              kind: "location",
              title: "Valid location",
              sourcePath: "Planning/Locations.csv",
              fields: {},
            },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      ok: boolean;
      accepted: Array<{ title: string }>;
      rejected: Array<{ index: number; reason: string }>;
      committed: string[];
      updatePreview: string[];
      tableSummary: Array<{ tableName: string; acceptedCount: number; rejectedCount: number; updatePreviewCount: number }>;
    };

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.accepted).toEqual([expect.objectContaining({ title: "Valid location" })]);
    expect(body.rejected).toEqual([
      { index: 1, reason: "invalid_source_path" },
      { index: 2, reason: "duplicate_id" },
    ]);
    expect(body.committed).toEqual([]);
    expect(body.updatePreview).toEqual([]);
    expect(body.tableSummary).toEqual([
      expect.objectContaining({
        tableName: "locations",
        acceptedCount: 1,
        rejectedCount: 2,
        updatePreviewCount: 0,
      }),
    ]);
    expect(fakeAuth.planningRows.size).toBe(0);
  });

  it("rejects Notion planning IDs owned by another workspace without exposing row differences", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const title = "Shared location";
    const sourcePath = "Planning/Locations.csv";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(["workspace_acme", "location", title.toLowerCase(), sourcePath].join(":")),
    );
    const id = `notion_location_${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32)}`;
    fakeAuth.planningRows.set(`locations:${id}`, {
      table: "locations",
      id,
      workspace_id: "workspace_other",
      project_id: null,
      title: "Private location",
      notes_json: null,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
      fields: { location_type: "Private" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          records: [{ kind: "location", title, sourcePath, fields: { Type: "Exterior" } }],
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      ok: boolean;
      destructiveWrite: boolean;
      rejected: Array<{ index: number; reason: string }>;
      committed: string[];
      idempotent: string[];
      updatePreview: string[];
      updatePreviewDetails: unknown[];
    };

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.destructiveWrite).toBe(false);
    expect(body.rejected).toEqual([{ index: 0, reason: "id_workspace_conflict" }]);
    expect(body.committed).toEqual([]);
    expect(body.idempotent).toEqual([]);
    expect(body.updatePreview).toEqual([]);
    expect(body.updatePreviewDetails).toEqual([]);
    expect(fakeAuth.planningRows.size).toBe(1);
    const auditMetadata = [...fakeAuth.auditEvents.values()].map((event) => event.metadata_json).join("\n");
    expect(auditMetadata).not.toContain("workspace_other");
    expect(auditMetadata).not.toContain("Private location");
  });

  it("requires csrf for planning export dry-runs", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/planning/export/dry-run", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "workspace_acme",
        }),
      }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("exports D1 planning rows for encrypted backup inclusion", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_planning", {
      id: "proj_planning",
      workspace_id: "workspace_acme",
      title: "Dust Wave Feature",
      phase: "production",
    });
    const authHeaders = {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
      cookie,
    };
    const commitResponse = await worker.fetch(
      new Request("https://worker.test/api/imports/notion/planning/commit", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          records: [
            {
              kind: "location",
              title: "Desert Motel",
              sourcePath: "Planning/Locations.csv",
              projectTitle: "Dust Wave Feature",
              fields: {
                Type: "Interior",
                Address: "Route 66",
              },
            },
          ],
        }),
      }),
      env,
    );
    expect(commitResponse.status).toBe(200);

    const response = await worker.fetch(
      new Request("https://worker.test/api/planning/export/dry-run", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 10,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      auditPersistence: string;
      planningExport: {
        policy: string;
        persistence: string;
        rowCount: number;
        truncated: boolean;
        records: Array<{
          kind: string;
          title: string;
          sourcePath?: string;
          projectId: string | null;
          fields: Record<string, unknown>;
        }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.planningExport).toMatchObject({
      policy: "d1_planning_rows",
      persistence: "d1_planning_export",
      rowCount: 1,
      truncated: false,
    });
    expect(body.planningExport.records[0]).toMatchObject({
      kind: "location",
      title: "Desert Motel",
      sourcePath: "Planning/Locations.csv",
      projectId: "proj_planning",
      fields: expect.objectContaining({
        Type: "Interior",
        locationType: "Interior",
      }),
    });
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        action: "planning.export_dry_run_created",
        actor_member_id: "member_producer",
      }),
    );
  });

  it("previews planning restore rows without applying D1 writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.planningRows.set("locations:restore_location_same", {
      table: "locations",
      id: "restore_location_same",
      workspace_id: "workspace_acme",
      project_id: "proj_planning",
      title: "Desert Motel",
      notes_json: null,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
      fields: { location_type: "Interior" },
    });
    fakeAuth.planningRows.set("locations:restore_location_changed", {
      table: "locations",
      id: "restore_location_changed",
      workspace_id: "workspace_acme",
      project_id: "proj_planning",
      title: "Warehouse",
      notes_json: null,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
      fields: { location_type: "Interior" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/planning-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          records: [
            {
              kind: "location",
              id: "restore_location_same",
              workspaceId: "workspace_acme",
              projectId: "proj_planning",
              title: "Desert Motel",
              fields: { locationType: "Interior" },
            },
            {
              kind: "location",
              id: "restore_location_changed",
              workspaceId: "workspace_acme",
              projectId: "proj_planning",
              title: "Warehouse",
              fields: { locationType: "Exterior" },
            },
            {
              kind: "media",
              id: "restore_media_new",
              workspaceId: "workspace_acme",
              projectId: null,
              title: "Press coverage",
              fields: { mediaType: "Press", url: "https://example.com", tags: ["press"] },
            },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      ok: boolean;
      dryRun: boolean;
      persistence: string;
      auditPersistence: string;
      restoreMode: string;
      commitPolicy: string;
      destructiveWrite: boolean;
      planningPreviewId: string | null;
      planningPreviewStatus: string;
      planningPreviewPersistence: string;
      accepted: Array<{ id: string; kind: string; title: string }>;
      createPreview: string[];
      idempotent: string[];
      updatePreview: string[];
      updatePreviewDetails: Array<{
        id: string;
        kind: string;
        tableName: string;
        fieldChanges: Array<{ field: string; currentValue: string; incomingValue: string }>;
      }>;
      tableSummary: Array<{
        kind: string;
        tableName: string;
        acceptedCount: number;
        createPreviewCount: number;
        idempotentCount: number;
        updatePreviewCount: number;
        rejectedCount: number;
      }>;
      rejected: Array<{ index: number; reason: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.persistence).toBe("d1_planning_restore_preview");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.restoreMode).toBe("planning_restore_preview_only");
    expect(body.commitPolicy).toBe("planning_rows_preview_only");
    expect(body.destructiveWrite).toBe(false);
    expect(body.planningPreviewId).toMatch(/^restore_planning_preview_/);
    expect(body.planningPreviewStatus).toBe("preview_only");
    expect(body.planningPreviewPersistence).toBe("d1_restore_planning_previews");
    expect(body.accepted).toHaveLength(3);
    expect(body.createPreview).toEqual(["restore_media_new"]);
    expect(body.idempotent).toEqual(["restore_location_same"]);
    expect(body.updatePreview).toEqual(["restore_location_changed"]);
    expect(body.updatePreviewDetails).toEqual([
      expect.objectContaining({
        id: "restore_location_changed",
        kind: "location",
        tableName: "locations",
        fieldChanges: [
          {
            field: "fields.locationType",
            currentValue: "Interior",
            incomingValue: "Exterior",
          },
        ],
      }),
    ]);
    expect(body.tableSummary).toEqual([
      expect.objectContaining({
        kind: "location",
        tableName: "locations",
        acceptedCount: 2,
        createPreviewCount: 0,
        idempotentCount: 1,
        updatePreviewCount: 1,
        rejectedCount: 0,
      }),
      expect.objectContaining({
        kind: "media",
        tableName: "media_items",
        acceptedCount: 1,
        createPreviewCount: 1,
        idempotentCount: 0,
        updatePreviewCount: 0,
        rejectedCount: 0,
      }),
    ]);
    expect(body.rejected).toEqual([]);
    const planningPreview = Array.from(fakeAuth.restorePlanningPreviews.values())[0];
    expect(planningPreview).toEqual(expect.objectContaining({
      id: body.planningPreviewId,
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-08T00:00:00.000Z",
      persistence: "d1_planning_restore_preview",
      accepted_count: 3,
      create_preview_count: 1,
      idempotent_count: 1,
      update_preview_count: 1,
      rejected_count: 0,
      status: "preview_only",
      destructive_write: 0,
    }));
    expect(JSON.parse(planningPreview!.table_summary_json)).toEqual(body.tableSummary);
    expect(JSON.parse(planningPreview!.update_preview_json)).toEqual([
      expect.objectContaining({
        id: "restore_location_changed",
        kind: "location",
        tableName: "locations",
        fieldKeys: ["fields.locationType"],
      }),
    ]);
    expect(planningPreview!.update_preview_json).not.toContain("Exterior");
    expect(JSON.parse(planningPreview!.rejected_json)).toEqual([]);
    expect(fakeAuth.planningRows.get("locations:restore_location_changed")?.fields.location_type).toBe("Interior");
    expect(fakeAuth.planningRows.has("media_items:restore_media_new")).toBe(false);
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        action: "restore.planning_dry_run_created",
        actor_member_id: "member_producer",
      }),
    );
  });

  it("keeps planning restore previews atomic with audit evidence", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const baseDb = env.DB;
    let failBatch = true;
    const db = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected planning preview batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const request = () => new Request("https://worker.test/api/restores/planning-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        backupCreatedAt: "2026-07-09T02:00:00.000Z",
        records: [{
          kind: "location",
          id: "restore_atomic_planning_preview",
          workspaceId: "workspace_acme",
          projectId: null,
          title: "Atomic planning preview",
          fields: { locationType: "Interior" },
        }],
      }),
    });

    const failed = await worker.fetch(request(), { ...env, DB: db });
    expect(failed.status).toBe(503);
    expect(await failed.json()).toMatchObject({
      error: "restore_planning_preview_storage_unavailable",
      planningPreviewPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restorePlanningPreviews.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);
    expect(fakeAuth.planningRows.has("locations:restore_atomic_planning_preview")).toBe(false);

    failBatch = false;
    const retried = await worker.fetch(request(), { ...env, DB: db });
    const retriedBody = (await retried.json()) as { planningPreviewId: string; auditPersistence: string };
    expect(retried.status).toBe(200);
    expect(retriedBody.planningPreviewId).toMatch(/^restore_planning_preview_/);
    expect(retriedBody.auditPersistence).toBe("d1_audit_events");
    expect(fakeAuth.restorePlanningPreviews.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(1);
    expect([...fakeAuth.auditEvents.values()][0]?.action).toBe("restore.planning_dry_run_created");
  });

  it("rejects invalid planning restore records without applying D1 writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/planning-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          records: [
            {
              kind: "location",
              id: "restore_location_valid",
              workspaceId: "workspace_acme",
              projectId: null,
              title: "Valid location",
              fields: { locationType: "Interior" },
            },
            {
              kind: "location",
              id: "restore_location_wrong_workspace",
              workspaceId: "workspace_other",
              projectId: null,
              title: "Wrong workspace",
              fields: {},
            },
            {
              kind: "media",
              id: "restore_media_bad_project",
              workspaceId: "workspace_acme",
              projectId: "../private",
              title: "Bad project",
              fields: {},
            },
            {
              kind: "location",
              id: "restore_location_valid",
              workspaceId: "workspace_acme",
              projectId: null,
              title: "Duplicate location",
              fields: {},
            },
            {
              kind: "role",
              id: "restore_role_project_scoped",
              workspaceId: "workspace_acme",
              projectId: "proj_planning",
              title: "Project-scoped role",
              fields: {},
            },
            {
              kind: "media",
              id: "restore_media_bad_timestamp",
              workspaceId: "workspace_acme",
              projectId: null,
              title: "Bad timestamp",
              fields: {},
              createdAt: "not-a-timestamp",
            },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      ok: boolean;
      destructiveWrite: boolean;
      planningPreviewId: string | null;
      planningPreviewPersistence: string;
      accepted: Array<{ id: string }>;
      createPreview: string[];
      rejected: Array<{ index: number; reason: string }>;
      tableSummary: Array<{ tableName: string; acceptedCount: number; rejectedCount: number }>;
    };

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.destructiveWrite).toBe(false);
    expect(body.planningPreviewId).toMatch(/^restore_planning_preview_/);
    expect(body.planningPreviewPersistence).toBe("d1_restore_planning_previews");
    expect(body.accepted).toEqual([expect.objectContaining({ id: "restore_location_valid" })]);
    expect(body.createPreview).toEqual(["restore_location_valid"]);
    expect(body.rejected).toEqual([
      { index: 1, reason: "workspace_mismatch" },
      { index: 2, reason: "invalid_project_id" },
      { index: 3, reason: "duplicate_id" },
      { index: 4, reason: "role_project_id_not_allowed" },
      { index: 5, reason: "invalid_created_at" },
    ]);
    expect(body.tableSummary).toEqual([
      expect.objectContaining({
        tableName: "locations",
        acceptedCount: 1,
        rejectedCount: 2,
      }),
      expect.objectContaining({
        tableName: "media_items",
        acceptedCount: 0,
        rejectedCount: 2,
      }),
      expect.objectContaining({
        tableName: "production_roles",
        acceptedCount: 0,
        rejectedCount: 1,
      }),
    ]);
    const planningPreview = Array.from(fakeAuth.restorePlanningPreviews.values())[0];
    expect(planningPreview).toEqual(expect.objectContaining({
      id: body.planningPreviewId,
      accepted_count: 1,
      create_preview_count: 1,
      rejected_count: 5,
      status: "preview_only",
      destructive_write: 0,
    }));
    expect(JSON.parse(planningPreview!.rejected_json)).toEqual(body.rejected);
    expect(fakeAuth.planningRows.size).toBe(0);
  });

  it("commits planning restore rows after durable preview and restore gates", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = {
      incomingRecordCount: 6,
      changedRecordCount: 1,
      newRecordCount: 1,
      fieldConflictCount: 1,
      warnings: [],
    };
    const planningRecords = [
      { kind: "location", id: "restore_location_same", workspaceId: "workspace_acme", projectId: "proj_planning", title: "Desert Motel", fields: { locationType: "Interior" } },
      { kind: "location", id: "restore_location_changed", workspaceId: "workspace_acme", projectId: "proj_planning", title: "Warehouse", fields: { locationType: "Exterior" } },
      { kind: "media", id: "restore_media_new", workspaceId: "workspace_acme", projectId: null, title: "Press coverage", fields: { mediaType: "Press", url: "https://example.com", tags: ["press"] } },
    ];
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApprovals.set("restore_approval_planning", {
      id: "restore_approval_planning",
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-07T00:00:00.000Z",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "approved_pending_commit",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreCommitAttempts.set("restore_commit_attempt_planning", {
      id: "restore_commit_attempt_planning",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_planning",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "blocked_until_restore_apply",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApplicationPreflights.set("restore_application_preflight_planning", {
      id: "restore_application_preflight_planning",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_planning",
      commit_attempt_id: "restore_commit_attempt_planning",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      rollback_guidance_json: "{}",
      status: "blocked_until_restore_apply_implementation",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.planningRows.set("locations:restore_location_same", {
      table: "locations",
      id: "restore_location_same",
      workspace_id: "workspace_acme",
      project_id: "proj_planning",
      title: "Desert Motel",
      notes_json: null,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
      fields: { location_type: "Interior" },
    });
    fakeAuth.planningRows.set("locations:restore_location_changed", {
      table: "locations",
      id: "restore_location_changed",
      workspace_id: "workspace_acme",
      project_id: "proj_planning",
      title: "Warehouse",
      notes_json: null,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
      fields: { location_type: "Interior" },
    });

    const dryRunResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/planning-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          records: planningRecords,
        }),
      }),
      env,
    );
    const dryRunBody = (await dryRunResponse.json()) as { planningPreviewId: string };
    expect(dryRunResponse.status).toBe(200);

    const planningCommitBody = {
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: "restore_approval_planning",
          commitAttemptId: "restore_commit_attempt_planning",
          applicationPreflightId: "restore_application_preflight_planning",
          planningPreviewId: dryRunBody.planningPreviewId,
          confirmation: "RESTORE workspace_acme",
          preview,
          applicationTablePlan: [
            {
              tableName: "locations",
              source: "d1_planning_export",
              entityType: "planning",
              operationCount: 3,
              createCount: 0,
              updateCount: 0,
              skipCount: 0,
              previewOnlyCount: 3,
              fieldConflictCount: 0,
              restoreSupport: "preview_only",
              blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
            },
          ],
          records: planningRecords,
    };
    const planningCommitRequest = () => new Request("https://worker.test/api/restores/planning-commit", {
      method: "POST",
      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
      body: JSON.stringify(planningCommitBody),
    });
    const failingEnv = {
      ...env,
      DB: {
        ...env.DB,
        async batch() {
          throw new Error("D1 planning restore batch unavailable");
        },
      } as unknown as D1Database,
    };
    const failedResponse = await worker.fetch(planningCommitRequest(), failingEnv);
    await expect(failedResponse.json()).resolves.toMatchObject({
      error: "restore_planning_commit_storage_unavailable",
      planningCommitPersistence: "d1_unavailable_restore_blocked",
      destructiveWrite: false,
    });
    expect(failedResponse.status).toBe(503);
    expect(fakeAuth.planningRows.get("locations:restore_location_changed")?.fields.location_type).toBe("Interior");
    expect(fakeAuth.planningRows.has("media_items:restore_media_new")).toBe(false);
    expect(fakeAuth.restorePlanningCommits.size).toBe(0);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.planning_dry_run_created",
    ]);

    const response = await worker.fetch(planningCommitRequest(), env);
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      restoreMode: string;
      planningCommitId: string;
      planningCommitStatus: string;
      planningCommitPersistence: string;
      result: {
        appliedCount: number;
        skippedCount: number;
        createCount: number;
        updateCount: number;
        tableSummary: Array<{ tableName: string; appliedCount: number; skippedCount: number }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(false);
    expect(body.destructiveWrite).toBe(true);
    expect(body.restoreMode).toBe("planning_records_commit");
    expect(body.planningCommitId).toMatch(/^restore_planning_commit_/);
    expect(body.planningCommitStatus).toBe("applied_planning_records");
    expect(body.planningCommitPersistence).toBe("d1_restore_planning_commits");
    expect(body.result).toMatchObject({ appliedCount: 2, skippedCount: 1, createCount: 1, updateCount: 1 });
    expect(body.result.tableSummary).toEqual([
      expect.objectContaining({ tableName: "locations", appliedCount: 1, skippedCount: 1 }),
      expect.objectContaining({ tableName: "media_items", appliedCount: 1, skippedCount: 0 }),
    ]);
    expect(fakeAuth.planningRows.get("locations:restore_location_changed")?.fields.location_type).toBe("Exterior");
    expect(fakeAuth.planningRows.get("media_items:restore_media_new")).toMatchObject({
      workspace_id: "workspace_acme",
      title: "Press coverage",
      fields: expect.objectContaining({ media_type: "Press", url: "https://example.com" }),
    });
    expect(fakeAuth.restorePlanningCommits.size).toBe(1);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.planning_dry_run_created",
      "restore.planning_records_committed",
    ]);
  });

  it("rejects stale planning restore previews before writing rows", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const preview = { incomingRecordCount: 1, changedRecordCount: 0, newRecordCount: 1, fieldConflictCount: 0, warnings: [] };
    const planningRecords = [
      { kind: "media", id: "restore_media_new", workspaceId: "workspace_acme", projectId: null, title: "Press coverage", fields: { mediaType: "Press" } },
    ];
    fakeAuth.restorePoints.set("restore_current", {
      id: "restore_current",
      workspace_id: "workspace_acme",
      label: "Pre-restore safety backup",
      snapshot_ref: "r2://film-backups/workspaces/workspace_acme/backups/20260708T000000000Z-aaaaaaaaaaaaaaaa.filmbackup.zip",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApprovals.set("restore_approval_planning", {
      id: "restore_approval_planning",
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-07T00:00:00.000Z",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "approved_pending_commit",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreCommitAttempts.set("restore_commit_attempt_planning", {
      id: "restore_commit_attempt_planning",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_planning",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      status: "blocked_until_restore_apply",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.restoreApplicationPreflights.set("restore_application_preflight_planning", {
      id: "restore_application_preflight_planning",
      workspace_id: "workspace_acme",
      approval_id: "restore_approval_planning",
      commit_attempt_id: "restore_commit_attempt_planning",
      actor_member_id: "member_producer",
      pre_restore_backup_id: "restore_current",
      preview_json: JSON.stringify(preview),
      rollback_guidance_json: "{}",
      status: "blocked_until_restore_apply_implementation",
      destructive_write: 0,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const dryRunResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/planning-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({ workspaceId: "workspace_acme", snapshotWorkspaceId: "workspace_acme", backupCreatedAt: "2026-07-07T00:00:00.000Z", records: planningRecords }),
      }),
      env,
    );
    const dryRunBody = (await dryRunResponse.json()) as { planningPreviewId: string };
    expect(dryRunResponse.status).toBe(200);
    fakeAuth.planningRows.set("media_items:restore_media_new", {
      table: "media_items",
      id: "restore_media_new",
      workspace_id: "workspace_acme",
      project_id: null,
      title: "Press coverage",
      notes_json: null,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
      fields: { media_type: "Press" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/planning-commit", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-07T00:00:00.000Z",
          preRestoreBackupId: "restore_current",
          approvalId: "restore_approval_planning",
          commitAttemptId: "restore_commit_attempt_planning",
          applicationPreflightId: "restore_application_preflight_planning",
          planningPreviewId: dryRunBody.planningPreviewId,
          confirmation: "RESTORE workspace_acme",
          preview,
          applicationTablePlan: [
            {
              tableName: "media_items",
              source: "d1_planning_export",
              entityType: "planning",
              operationCount: 1,
              createCount: 0,
              updateCount: 0,
              skipCount: 0,
              previewOnlyCount: 1,
              fieldConflictCount: 0,
              restoreSupport: "preview_only",
              blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
            },
          ],
          records: planningRecords,
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; destructiveWrite: boolean };

    expect(response.status).toBe(422);
    expect(body.error).toBe("restore_planning_preview_mismatch");
    expect(body.destructiveWrite).toBe(false);
    expect(fakeAuth.restorePlanningCommits.size).toBe(0);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.planning_dry_run_created",
    ]);
  });

  it("records restore attachment package preflight dry-runs without byte writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          attachmentPackagePlan: {
            policy: "metadata_only",
            packageRequired: true,
            byteRestoreSupport: "blocked",
            metadataRecordCount: 2,
            stagedLocalRecordCount: 1,
            r2DryRunRecordCount: 0,
            storedR2RecordCount: 1,
            totalSourceBytes: 4096,
            blockers: [
              "Attachment metadata can be previewed, but byte restore requires a verified attachment package.",
            ],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      ok: boolean;
      dryRun: boolean;
      restoreMode: string;
      commitPolicy: string;
      destructiveWrite: boolean;
      canRestoreBytes: boolean;
      attachmentPackagePreflightId: string | null;
      attachmentPackagePreflightStatus: string;
      attachmentPackagePreflightPersistence: string;
      auditPersistence: string;
      attachmentPackagePlan: { metadataRecordCount: number; totalSourceBytes: number };
      blockers: string[];
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.restoreMode).toBe("attachment_restore_package_preflight_only");
    expect(body.commitPolicy).toBe("attachment_bytes_blocked_until_package_verification");
    expect(body.destructiveWrite).toBe(false);
    expect(body.canRestoreBytes).toBe(false);
    expect(body.attachmentPackagePreflightId).toMatch(/^restore_attachment_package_preflight_/);
    expect(body.attachmentPackagePreflightStatus).toBe("blocked_until_attachment_package_verification");
    expect(body.attachmentPackagePreflightPersistence).toBe("d1_restore_attachment_package_preflights");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.attachmentPackagePlan).toMatchObject({
      metadataRecordCount: 2,
      totalSourceBytes: 4096,
    });
    expect(body.blockers).toContain(
      "Attachment metadata can be previewed, but byte restore requires a verified attachment package.",
    );

    const preflight = Array.from(fakeAuth.restoreAttachmentPackagePreflights.values())[0];
    expect(preflight).toEqual(expect.objectContaining({
      id: body.attachmentPackagePreflightId,
      workspace_id: "workspace_acme",
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-08T00:00:00.000Z",
      metadata_record_count: 2,
      staged_local_count: 1,
      r2_dry_run_count: 0,
      stored_r2_count: 1,
      total_source_bytes: 4096,
      status: "blocked_until_attachment_package_verification",
      destructive_write: 0,
    }));
    expect(JSON.parse(preflight!.package_plan_json)).toMatchObject({
      policy: "metadata_only",
      packageRequired: true,
      byteRestoreSupport: "blocked",
    });
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        action: "restore.attachment_package_dry_run_created",
        actor_member_id: "member_producer",
      }),
    );
  });

  it("records restore attachment package verification dry-runs without byte writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const attachmentPackagePlan = {
      policy: "metadata_only",
      packageRequired: true,
      byteRestoreSupport: "blocked",
      metadataRecordCount: 2,
      stagedLocalRecordCount: 1,
      r2DryRunRecordCount: 0,
      storedR2RecordCount: 1,
      totalSourceBytes: 4096,
      blockers: [
        "Attachment metadata can be previewed, but byte restore requires a verified attachment package.",
      ],
    };
    const preflightResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          attachmentPackagePlan,
        }),
      }),
      env,
    );
    const preflightBody = (await preflightResponse.json()) as {
      attachmentPackagePreflightId: string;
    };
    const packageManifest = {
      format: "film.attachment-package",
      version: 1,
      workspaceId: "workspace_acme",
      createdAt: "2026-07-08T00:01:00.000Z",
      objectCount: 2,
      totalSourceBytes: 4096,
      objects: [
        {
          path: "attachments/001-doc_pkg_a-call-sheet.pdf",
          docId: "doc_pkg_a",
          objectKey: "workspaces/workspace_acme/attachments/doc_pkg_a/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-call-sheet.pdf",
          name: "call-sheet.pdf",
          sourcePath: "Files/call-sheet.pdf",
          sizeBytes: 1024,
          contentType: "application/pdf",
          sha256: "a".repeat(64),
          committedAt: "2026-07-08T00:01:00.000Z",
        },
        {
          path: "attachments/002-doc_pkg_b-release.pdf",
          docId: "doc_pkg_b",
          objectKey: "workspaces/workspace_acme/attachments/doc_pkg_b/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-release.pdf",
          name: "release.pdf",
          sourcePath: "Files/release.pdf",
          sizeBytes: 3072,
          contentType: "application/pdf",
          sha256: "b".repeat(64),
          committedAt: "2026-07-08T00:01:00.000Z",
        },
      ],
    };
    const expectedManifestSha256 = await sha256HexForTest(JSON.stringify(packageManifest));
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-verify-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          attachmentPackagePreflightId: preflightBody.attachmentPackagePreflightId,
          attachmentPackagePlan,
          packageSha256: "c".repeat(64),
          manifestSha256: expectedManifestSha256,
          packageManifest,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      ok: boolean;
      dryRun: boolean;
      restoreMode: string;
      commitPolicy: string;
      destructiveWrite: boolean;
      canRestoreBytes: boolean;
      attachmentPackagePreflightId: string;
      attachmentPackageVerificationId: string | null;
      attachmentPackageVerificationStatus: string;
      attachmentPackageVerificationPersistence: string;
      auditPersistence: string;
      packageSha256: string;
      manifestSha256: string;
      packageManifest: { objectCount: number; totalSourceBytes: number };
      blockers: string[];
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.restoreMode).toBe("attachment_restore_package_verification_only");
    expect(body.commitPolicy).toBe("attachment_bytes_blocked_until_destination_write_rules");
    expect(body.destructiveWrite).toBe(false);
    expect(body.canRestoreBytes).toBe(false);
    expect(body.attachmentPackagePreflightId).toBe(preflightBody.attachmentPackagePreflightId);
    expect(body.attachmentPackageVerificationId).toMatch(/^restore_attachment_package_verification_/);
    expect(body.attachmentPackageVerificationStatus).toBe("verified_until_destination_rules");
    expect(body.attachmentPackageVerificationPersistence).toBe("d1_restore_attachment_package_verifications");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.packageSha256).toBe("c".repeat(64));
    expect(body.manifestSha256).toBe(expectedManifestSha256);
    expect(body.packageManifest).toMatchObject({ objectCount: 2, totalSourceBytes: 4096 });
    expect(body.blockers).toContain(
      "Attachment package metadata is verified, but byte restore still requires destination write rules.",
    );

    const verification = Array.from(fakeAuth.restoreAttachmentPackageVerifications.values())[0];
    expect(verification).toEqual(expect.objectContaining({
      id: body.attachmentPackageVerificationId,
      workspace_id: "workspace_acme",
      attachment_package_preflight_id: preflightBody.attachmentPackagePreflightId,
      actor_member_id: "member_producer",
      snapshot_workspace_id: "workspace_acme",
      backup_created_at: "2026-07-08T00:00:00.000Z",
      metadata_record_count: 2,
      total_source_bytes: 4096,
      package_object_count: 2,
      package_total_source_bytes: 4096,
      package_sha256: "c".repeat(64),
      manifest_sha256: expectedManifestSha256,
      status: "verified_until_destination_rules",
      destructive_write: 0,
    }));
    expect(JSON.parse(verification!.package_manifest_json)).toMatchObject({
      format: "film.attachment-package",
      objectCount: 2,
      totalSourceBytes: 4096,
    });
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        action: "restore.attachment_package_verification_created",
        actor_member_id: "member_producer",
      }),
    );
  });

  it("records restore attachment object plans and commit preflights without byte writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const fakeR2 = createR2Bucket();
    const envWithR2 = { ...env, ATTACHMENTS: fakeR2.bucket };
    const attachmentText = "restored-attachment-byte".repeat(186).slice(0, 4096).padEnd(4096, "x");
    const attachmentBytes = new TextEncoder().encode(attachmentText);
    const attachmentSha256 = await sha256HexForTest(attachmentText);
    const destinationObjectKey = `workspaces/workspace_acme/attachments/doc_pkg_a/${attachmentSha256}-call-sheet.pdf`;
    fakeAuth.documents.set("doc_pkg_a", {
      id: "doc_pkg_a",
      workspace_id: "workspace_acme",
      project_id: null,
      title: "Call sheet package attachment",
      document_type: "uploaded_file",
      sensitive: 0,
    });
    const attachmentPackagePlan = {
      policy: "metadata_only",
      packageRequired: true,
      byteRestoreSupport: "blocked",
      metadataRecordCount: 1,
      stagedLocalRecordCount: 0,
      r2DryRunRecordCount: 0,
      storedR2RecordCount: 1,
      totalSourceBytes: 4096,
      blockers: [
        "Attachment metadata can be previewed, but byte restore requires a verified attachment package.",
      ],
    };
    const packageManifest = {
      format: "film.attachment-package",
      version: 1,
      workspaceId: "workspace_acme",
      createdAt: "2026-07-08T00:01:00.000Z",
      objectCount: 1,
      totalSourceBytes: 4096,
      objects: [
        {
          path: "attachments/001-doc_pkg_a-call-sheet.pdf",
          docId: "doc_pkg_a",
          objectKey: destinationObjectKey,
          name: "call-sheet.pdf",
          sourcePath: "Files/call-sheet.pdf",
          sizeBytes: 4096,
          contentType: "application/pdf",
          sha256: attachmentSha256,
          committedAt: "2026-07-08T00:01:00.000Z",
        },
      ],
    };
    const manifestSha256 = await sha256HexForTest(JSON.stringify(packageManifest));
    const preflightResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          attachmentPackagePlan,
        }),
      }),
      envWithR2,
    );
    const preflightBody = (await preflightResponse.json()) as { attachmentPackagePreflightId: string };
    const verificationResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-verify-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          attachmentPackagePreflightId: preflightBody.attachmentPackagePreflightId,
          attachmentPackagePlan,
          packageSha256: "c".repeat(64),
          manifestSha256,
          packageManifest,
        }),
      }),
      envWithR2,
    );
    const verificationBody = (await verificationResponse.json()) as { attachmentPackageVerificationId: string };
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-objects-plan-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachmentPackageVerificationId: verificationBody.attachmentPackageVerificationId,
          packageSha256: "c".repeat(64),
          manifestSha256,
          packageManifest,
        }),
      }),
      envWithR2,
    );
    const body = (await response.json()) as {
      ok: boolean;
      dryRun: boolean;
      restoreMode: string;
      commitPolicy: string;
      destructiveWrite: boolean;
      canRestoreBytes: boolean;
      attachmentObjectPlanId: string | null;
      attachmentObjectPlanStatus: string;
      attachmentObjectPlanPersistence: string;
      result: {
        objectCount: number;
        totalSourceBytes: number;
        blockedDestinationCount: number;
        destinationPolicy: string;
        overwritePolicy: string;
        byteSourcePolicy: string;
        sourceVerificationStatus: string;
        objects: Array<{
          action: string;
          destinationObjectKey: string;
          destinationStatus: string;
          overwriteStatus: string;
          byteSourceStatus: string;
          sourceVerificationStatus: string;
        }>;
      };
      blockers: string[];
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.restoreMode).toBe("attachment_restore_object_plan_only");
    expect(body.commitPolicy).toBe("attachment_bytes_blocked_until_destination_write_rules");
    expect(body.destructiveWrite).toBe(false);
    expect(body.canRestoreBytes).toBe(false);
    expect(body.attachmentObjectPlanId).toMatch(/^restore_attachment_object_plan_/);
    expect(body.attachmentObjectPlanStatus).toBe("blocked_until_attachment_destination_write_rules");
    expect(body.attachmentObjectPlanPersistence).toBe("d1_restore_attachment_object_plans");
    expect(body.result.objectCount).toBe(1);
    expect(body.result.totalSourceBytes).toBe(4096);
    expect(body.result.blockedDestinationCount).toBe(1);
    expect(body.result).toMatchObject({
      destinationPolicy: "workspace_scoped_deterministic_object_keys",
      overwritePolicy: "blocked_until_explicit_overwrite_rules",
      byteSourcePolicy: "verified_package_manifest_only",
      sourceVerificationStatus: "metadata_hash_verified_without_bytes",
    });
    expect(body.result.objects[0]).toMatchObject({
      action: "blocked_destination_write_rules",
      destinationObjectKey,
      destinationStatus: "candidate_workspace_key",
      overwriteStatus: "blocked_until_overwrite_policy",
      byteSourceStatus: "requires_package_object_bytes_at_commit",
      sourceVerificationStatus: "sha256_declared_in_verified_manifest",
    });
    expect(body.blockers).toContain(
      "Attachment object destinations are planned, but byte restore still requires explicit destination write rules.",
    );

    const objectPlan = Array.from(fakeAuth.restoreAttachmentObjectPlans.values())[0];
    expect(objectPlan).toEqual(expect.objectContaining({
      id: body.attachmentObjectPlanId,
      workspace_id: "workspace_acme",
      attachment_package_verification_id: verificationBody.attachmentPackageVerificationId,
      actor_member_id: "member_producer",
      object_count: 1,
      total_source_bytes: 4096,
      blocked_destination_count: 1,
      status: "blocked_until_attachment_destination_write_rules",
      destructive_write: 0,
    }));
    expect(JSON.parse(objectPlan!.plan_json).objects[0]).toMatchObject({
      action: "blocked_destination_write_rules",
      docId: "doc_pkg_a",
      destinationStatus: "candidate_workspace_key",
      overwriteStatus: "blocked_until_overwrite_policy",
      byteSourceStatus: "requires_package_object_bytes_at_commit",
      sourceVerificationStatus: "sha256_declared_in_verified_manifest",
    });
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        action: "restore.attachment_object_plan_created",
        actor_member_id: "member_producer",
      }),
    );

    const commitPreflightResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-objects-commit-preflight", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachmentPackageVerificationId: verificationBody.attachmentPackageVerificationId,
          attachmentObjectPlanId: body.attachmentObjectPlanId,
          packageSha256: "c".repeat(64),
          manifestSha256,
          packageManifest,
          confirmation: "RESTORE workspace_acme",
        }),
      }),
      envWithR2,
    );
    const commitPreflightBody = (await commitPreflightResponse.json()) as {
      ok: boolean;
      dryRun: boolean;
      confirmationAccepted: boolean;
      restoreMode: string;
      commitPolicy: string;
      destructiveWrite: boolean;
      canRestoreBytes: boolean;
      readyForByteCommit: boolean;
      attachmentObjectCommitPreflightId: string | null;
      attachmentObjectCommitPreflightStatus: string;
      attachmentObjectCommitPreflightPersistence: string;
      result: {
        objectCount: number;
        readyDestinationCount: number;
        blockedDestinationCount: number;
        destinationPolicy: string;
        overwritePolicy: string;
        byteSourcePolicy: string;
        objects: Array<{
          action: string;
          destinationStatus: string;
          overwriteStatus: string;
          byteSourceStatus: string;
          existingR2Object: boolean | null;
          existingStoredRecord: boolean;
        }>;
      };
      blockers: string[];
    };

    expect(commitPreflightResponse.status).toBe(200);
    expect(commitPreflightBody.ok).toBe(true);
    expect(commitPreflightBody.dryRun).toBe(true);
    expect(commitPreflightBody.confirmationAccepted).toBe(true);
    expect(commitPreflightBody.restoreMode).toBe("attachment_restore_object_commit_preflight_only");
    expect(commitPreflightBody.commitPolicy).toBe("attachment_bytes_ready_for_explicit_commit_endpoint");
    expect(commitPreflightBody.destructiveWrite).toBe(false);
    expect(commitPreflightBody.canRestoreBytes).toBe(false);
    expect(commitPreflightBody.readyForByteCommit).toBe(true);
    expect(commitPreflightBody.attachmentObjectCommitPreflightId).toMatch(/^restore_attachment_object_commit_preflight_/);
    expect(commitPreflightBody.attachmentObjectCommitPreflightStatus).toBe("ready_for_attachment_byte_commit");
    expect(commitPreflightBody.attachmentObjectCommitPreflightPersistence).toBe("d1_restore_attachment_object_commit_preflights");
    expect(commitPreflightBody.result).toMatchObject({
      objectCount: 1,
      readyDestinationCount: 1,
      blockedDestinationCount: 0,
      destinationPolicy: "workspace_scoped_new_object_keys_only",
      overwritePolicy: "overwrite_blocked_existing_destinations",
      byteSourcePolicy: "package_object_bytes_required_at_commit",
    });
    expect(commitPreflightBody.result.objects[0]).toMatchObject({
      action: "ready_for_explicit_byte_commit",
      destinationStatus: "destination_absent",
      overwriteStatus: "new_object_allowed",
      byteSourceStatus: "requires_package_object_bytes_at_commit",
      existingR2Object: false,
      existingStoredRecord: false,
    });
    expect(commitPreflightBody.blockers).toEqual([]);
    expect(fakeR2.putCount).toBe(0);

    const commitPreflight = Array.from(fakeAuth.restoreAttachmentObjectCommitPreflights.values())[0];
    expect(commitPreflight).toEqual(expect.objectContaining({
      id: commitPreflightBody.attachmentObjectCommitPreflightId,
      workspace_id: "workspace_acme",
      attachment_package_verification_id: verificationBody.attachmentPackageVerificationId,
      attachment_object_plan_id: body.attachmentObjectPlanId,
      actor_member_id: "member_producer",
      object_count: 1,
      total_source_bytes: 4096,
      ready_destination_count: 1,
      blocked_destination_count: 0,
      status: "ready_for_attachment_byte_commit",
      destructive_write: 0,
    }));
    expect(JSON.parse(commitPreflight!.preflight_json).objects[0]).toMatchObject({
      action: "ready_for_explicit_byte_commit",
      destinationStatus: "destination_absent",
      overwriteStatus: "new_object_allowed",
    });
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        action: "restore.attachment_object_commit_preflight_created",
        actor_member_id: "member_producer",
      }),
    );

    const commitHeaders = {
      "content-type": "application/pdf",
      "x-film-csrf": csrfToken,
      cookie,
      "x-film-workspace-id": "workspace_acme",
      "x-film-attachment-package-verification-id": verificationBody.attachmentPackageVerificationId,
      "x-film-attachment-object-plan-id": body.attachmentObjectPlanId ?? "",
      "x-film-attachment-object-commit-preflight-id": commitPreflightBody.attachmentObjectCommitPreflightId ?? "",
      "x-film-doc-id": "doc_pkg_a",
      "x-film-destination-object-key": destinationObjectKey,
      "x-film-size-bytes": String(attachmentBytes.byteLength),
      "x-film-sha256": attachmentSha256,
      "x-film-package-sha256": "c".repeat(64),
      "x-film-manifest-sha256": manifestSha256,
      "x-film-storage-confirmation": "RESTORE workspace_acme",
    };
    const corruptedBytes = attachmentBytes.slice();
    corruptedBytes[0] ^= 0xff;
    const corruptedResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-object-commit", {
        method: "PUT",
        headers: commitHeaders,
        body: corruptedBytes,
      }),
      envWithR2,
    );
    expect(corruptedResponse.status).toBe(422);
    expect(await corruptedResponse.json()).toMatchObject({ error: "sha256_mismatch" });
    expect(fakeR2.putCount).toBe(0);

    const failingBatchDb = {
      ...env.DB,
      async batch() {
        throw new Error("D1 attachment restore finalize batch unavailable");
      },
    } as unknown as D1Database;
    const auditCountBeforeCommit = fakeAuth.auditEvents.size;
    const compensatedR2 = createR2Bucket();
    const compensatedFailureResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-object-commit", {
        method: "PUT",
        headers: commitHeaders,
        body: attachmentBytes,
      }),
      { ...envWithR2, DB: failingBatchDb, ATTACHMENTS: compensatedR2.bucket },
    );
    expect(compensatedFailureResponse.status).toBe(503);
    expect(await compensatedFailureResponse.json()).toMatchObject({
      error: "restore_attachment_finalize_failed_compensated",
      persistence: "d1_unavailable_restore_blocked",
    });
    expect(compensatedR2.putCount).toBe(1);
    expect(compensatedR2.objects.has(destinationObjectKey)).toBe(false);
    expect(fakeAuth.attachmentIntents.size).toBe(0);
    expect(fakeAuth.restoreAttachmentObjectCommits.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBeforeCommit);

    const compensationPendingBucket = {
      ...fakeR2.bucket,
      async delete() {
        throw new Error("R2 compensation delete unavailable");
      },
    } as unknown as R2Bucket;
    const pendingFailureResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-object-commit", {
        method: "PUT",
        headers: commitHeaders,
        body: attachmentBytes,
      }),
      { ...envWithR2, DB: failingBatchDb, ATTACHMENTS: compensationPendingBucket },
    );
    expect(pendingFailureResponse.status).toBe(503);
    expect(await pendingFailureResponse.json()).toMatchObject({
      error: "restore_attachment_compensation_required",
      persistence: "r2_restore_compensation_pending",
    });
    expect(fakeR2.putCount).toBe(1);
    expect(fakeR2.objects.has(destinationObjectKey)).toBe(true);
    expect([...fakeAuth.attachmentIntents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        doc_id: "doc_pkg_a",
        object_key: destinationObjectKey,
        sha256: attachmentSha256,
        status: "prepared",
        storage_key: `restore:${commitPreflightBody.attachmentObjectCommitPreflightId}`,
      }),
    ]);
    expect(fakeAuth.restoreAttachmentObjectCommits.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBeforeCommit);

    const commitResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-object-commit", {
        method: "PUT",
        headers: commitHeaders,
        body: attachmentBytes,
      }),
      envWithR2,
    );
    const commitBody = (await commitResponse.json()) as {
      ok: boolean;
      dryRun: boolean;
      destructiveWrite: boolean;
      idempotent: boolean;
      persistence: string;
      commit: { id: string; docId: string; destinationObjectKey: string; sha256: string; status: string };
    };

    expect(commitResponse.status).toBe(200);
    expect(commitBody).toMatchObject({
      ok: true,
      dryRun: false,
      destructiveWrite: true,
      idempotent: false,
      persistence: "r2_restore_attachment_object",
      commit: {
        docId: "doc_pkg_a",
        destinationObjectKey,
        sha256: attachmentSha256,
        status: "stored_r2",
      },
    });
    expect(fakeR2.putCount).toBe(1);
    expect(new Uint8Array(fakeR2.objects.get(destinationObjectKey)!.body)).toEqual(attachmentBytes);
    expect(fakeAuth.attachmentIntents.size).toBe(1);
    expect(fakeAuth.restoreAttachmentObjectCommits.size).toBe(1);
    expect([...fakeAuth.auditEvents.values()]).toContainEqual(
      expect.objectContaining({
        action: "restore.attachment_object_committed",
        actor_member_id: "member_producer",
      }),
    );

    const retryResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-object-commit", {
        method: "PUT",
        headers: commitHeaders,
        body: attachmentBytes,
      }),
      envWithR2,
    );
    const retryBody = (await retryResponse.json()) as { ok: boolean; idempotent: boolean };
    expect(retryResponse.status).toBe(200);
    expect(retryBody).toMatchObject({ ok: true, idempotent: true });
    expect(fakeR2.putCount).toBe(1);

    const storedObject = fakeR2.objects.get(destinationObjectKey)!;
    fakeR2.objects.set(destinationObjectKey, {
      body: storedObject.body,
      options: {
        ...storedObject.options,
        customMetadata: {
          ...storedObject.options?.customMetadata,
          restorePreflightId: "tampered_preflight",
        },
      },
    });
    const tamperedRetryResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-object-commit", {
        method: "PUT",
        headers: commitHeaders,
        body: attachmentBytes,
      }),
      envWithR2,
    );
    expect(tamperedRetryResponse.status).toBe(409);
    expect(await tamperedRetryResponse.json()).toMatchObject({ error: "restore_attachment_object_commit_state_mismatch" });
    expect(fakeR2.putCount).toBe(1);
  });

  it("keeps the attachment restore proof chain atomic with audit evidence", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const attachmentPackagePlan = {
      policy: "metadata_only",
      packageRequired: true,
      byteRestoreSupport: "blocked",
      metadataRecordCount: 1,
      stagedLocalRecordCount: 0,
      r2DryRunRecordCount: 0,
      storedR2RecordCount: 1,
      totalSourceBytes: 1024,
      blockers: ["Attachment byte restore requires a verified package."],
    };
    const packageManifest = {
      format: "film.attachment-package",
      version: 1,
      workspaceId: "workspace_acme",
      createdAt: "2026-07-09T02:00:00.000Z",
      objectCount: 1,
      totalSourceBytes: 1024,
      objects: [{
        path: "attachments/001-doc_atomic-atomic.pdf",
        docId: "doc_atomic",
        objectKey: `workspaces/workspace_acme/attachments/doc_atomic/${"a".repeat(64)}-atomic.pdf`,
        name: "atomic.pdf",
        sourcePath: "Files/atomic.pdf",
        sizeBytes: 1024,
        contentType: "application/pdf",
        sha256: "a".repeat(64),
        committedAt: "2026-07-09T02:00:00.000Z",
      }],
    };
    const manifestSha256 = await sha256HexForTest(JSON.stringify(packageManifest));
    const packageSha256 = "c".repeat(64);
    const headers = {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
      cookie,
    };
    const baseDb = env.DB;
    let failBatch = true;
    const db = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected attachment proof-chain batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const atomicEnv = { ...env, DB: db };
    const packagePreflightRequest = () => new Request("https://worker.test/api/restores/attachment-package-dry-run", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        backupCreatedAt: "2026-07-08T00:00:00.000Z",
        attachmentPackagePlan,
      }),
    });

    const failedPackagePreflight = await worker.fetch(packagePreflightRequest(), atomicEnv);
    expect(failedPackagePreflight.status).toBe(503);
    expect(await failedPackagePreflight.json()).toMatchObject({
      error: "restore_attachment_package_preflight_storage_unavailable",
      attachmentPackagePreflightPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restoreAttachmentPackagePreflights.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);

    failBatch = false;
    const packagePreflightResponse = await worker.fetch(packagePreflightRequest(), atomicEnv);
    const packagePreflightBody = (await packagePreflightResponse.json()) as { attachmentPackagePreflightId: string };
    expect(packagePreflightResponse.status).toBe(200);
    expect(fakeAuth.restoreAttachmentPackagePreflights.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(1);

    const verificationRequest = () => new Request("https://worker.test/api/restores/attachment-package-verify-dry-run", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        backupCreatedAt: "2026-07-08T00:00:00.000Z",
        attachmentPackagePreflightId: packagePreflightBody.attachmentPackagePreflightId,
        attachmentPackagePlan,
        packageSha256,
        manifestSha256,
        packageManifest,
      }),
    });

    failBatch = true;
    const failedVerification = await worker.fetch(verificationRequest(), atomicEnv);
    expect(failedVerification.status).toBe(503);
    expect(await failedVerification.json()).toMatchObject({
      error: "restore_attachment_package_verification_storage_unavailable",
      attachmentPackageVerificationPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restoreAttachmentPackageVerifications.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(1);

    failBatch = false;
    const verificationResponse = await worker.fetch(verificationRequest(), atomicEnv);
    const verificationBody = (await verificationResponse.json()) as { attachmentPackageVerificationId: string };
    expect(verificationResponse.status).toBe(200);
    expect(fakeAuth.restoreAttachmentPackageVerifications.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(2);

    const objectPlanRequest = () => new Request("https://worker.test/api/restores/attachment-objects-plan-dry-run", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        attachmentPackageVerificationId: verificationBody.attachmentPackageVerificationId,
        packageSha256,
        manifestSha256,
        packageManifest,
      }),
    });

    failBatch = true;
    const failedObjectPlan = await worker.fetch(objectPlanRequest(), atomicEnv);
    expect(failedObjectPlan.status).toBe(503);
    expect(await failedObjectPlan.json()).toMatchObject({
      error: "restore_attachment_object_plan_storage_unavailable",
      attachmentObjectPlanPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restoreAttachmentObjectPlans.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(2);

    failBatch = false;
    const objectPlanResponse = await worker.fetch(objectPlanRequest(), atomicEnv);
    const objectPlanBody = (await objectPlanResponse.json()) as { attachmentObjectPlanId: string };
    expect(objectPlanResponse.status).toBe(200);
    expect(fakeAuth.restoreAttachmentObjectPlans.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(3);

    const commitPreflightRequest = () => new Request("https://worker.test/api/restores/attachment-objects-commit-preflight", {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        attachmentPackageVerificationId: verificationBody.attachmentPackageVerificationId,
        attachmentObjectPlanId: objectPlanBody.attachmentObjectPlanId,
        packageSha256,
        manifestSha256,
        packageManifest,
        confirmation: "RESTORE workspace_acme",
      }),
    });

    failBatch = true;
    const failedCommitPreflight = await worker.fetch(commitPreflightRequest(), atomicEnv);
    expect(failedCommitPreflight.status).toBe(503);
    expect(await failedCommitPreflight.json()).toMatchObject({
      error: "restore_attachment_object_commit_preflight_storage_unavailable",
      attachmentObjectCommitPreflightPersistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.restoreAttachmentObjectCommitPreflights.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(3);

    failBatch = false;
    const commitPreflightResponse = await worker.fetch(commitPreflightRequest(), atomicEnv);
    expect(commitPreflightResponse.status).toBe(200);
    expect(fakeAuth.restoreAttachmentObjectCommitPreflights.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(4);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "restore.attachment_package_dry_run_created",
      "restore.attachment_package_verification_created",
      "restore.attachment_object_plan_created",
      "restore.attachment_object_commit_preflight_created",
    ]);
  });

  it("rejects restore attachment package verification mismatches", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const attachmentPackagePlan = {
      policy: "metadata_only",
      packageRequired: true,
      byteRestoreSupport: "blocked",
      metadataRecordCount: 1,
      stagedLocalRecordCount: 0,
      r2DryRunRecordCount: 0,
      storedR2RecordCount: 1,
      totalSourceBytes: 4096,
      blockers: [
        "Attachment metadata can be previewed, but byte restore requires a verified attachment package.",
      ],
    };
    const preflightResponse = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          attachmentPackagePlan,
        }),
      }),
      env,
    );
    const preflightBody = (await preflightResponse.json()) as {
      attachmentPackagePreflightId: string;
    };
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-verify-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          attachmentPackagePreflightId: preflightBody.attachmentPackagePreflightId,
          attachmentPackagePlan,
          packageSha256: "c".repeat(64),
          packageManifest: {
            format: "film.attachment-package",
            version: 1,
            workspaceId: "workspace_acme",
            createdAt: "2026-07-08T00:01:00.000Z",
            objectCount: 1,
            totalSourceBytes: 1024,
            objects: [
              {
                path: "attachments/001-doc_pkg_a-call-sheet.pdf",
                docId: "doc_pkg_a",
                objectKey: "workspaces/workspace_acme/attachments/doc_pkg_a/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-call-sheet.pdf",
                name: "call-sheet.pdf",
                sourcePath: "Files/call-sheet.pdf",
                sizeBytes: 1024,
                contentType: "application/pdf",
                sha256: "a".repeat(64),
                committedAt: "2026-07-08T00:01:00.000Z",
              },
            ],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; destructiveWrite: boolean };

    expect(response.status).toBe(422);
    expect(body.error).toBe("restore_attachment_package_manifest_plan_mismatch");
    expect(body.destructiveWrite).toBe(false);
    expect(fakeAuth.restoreAttachmentPackageVerifications.size).toBe(0);
  });

  it("rejects invalid restore attachment package preflight metadata", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/restores/attachment-package-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          attachmentPackagePlan: {
            policy: "metadata_only",
            packageRequired: false,
            byteRestoreSupport: "not_included",
            metadataRecordCount: 1,
            stagedLocalRecordCount: 0,
            r2DryRunRecordCount: 0,
            storedR2RecordCount: 0,
            totalSourceBytes: 0,
            blockers: [],
          },
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_restore_attachment_package_plan");
    expect(fakeAuth.restoreAttachmentPackagePreflights.size).toBe(0);
  });

  it("preflights attachment metadata for future R2 storage", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachments: [
            {
              docId: "doc_poster",
              name: "Poster.png",
              sourcePath: "Imported Feature/Poster.png",
              sizeBytes: 4096,
              contentType: "image/png",
              sha256: "a".repeat(64),
              storageKey: "attachment_workspace_doc_hash",
            },
          ],
        }),
      }),
      {},
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      accepted: Array<{ docId: string; objectKey: string }>;
      rejected: unknown[];
      bytePolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.bytePolicy).toBe("metadata_only_request");
    expect(body.rejected).toEqual([]);
    expect(body.accepted[0]?.docId).toBe("doc_poster");
    expect(body.accepted[0]?.objectKey).toContain("workspaces/workspace_acme/attachments/doc_poster/");
  });

  it("rejects raw attachment bytes in R2 dry-run metadata", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/dry-run", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachments: [
            {
              docId: "doc_poster",
              name: "Poster.png",
              sizeBytes: 4096,
              contentType: "image/png",
              sha256: "a".repeat(64),
              payload: "AQIDBA==",
            },
          ],
        }),
      }),
      {},
    );
    const body = (await response.json()) as { rejected: Array<{ reason: string }> };

    expect(response.status).toBe(422);
    expect(body.rejected).toEqual([{ docId: "doc_poster", reason: "raw_bytes_not_allowed" }]);
  });

  it("prepares and commits attachment upload intents in dry-run mode", async () => {
    const prepareResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/prepare-upload", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachments: [
            {
              docId: "doc_poster",
              name: "Poster.png",
              sourcePath: "Imported Feature/Poster.png",
              sizeBytes: 4096,
              contentType: "image/png",
              sha256: "b".repeat(64),
              storageKey: "attachment_workspace_doc_hash",
            },
          ],
        }),
      }),
      {},
    );
    const prepareBody = (await prepareResponse.json()) as {
      uploadMode: string;
      persistence: string;
      accepted: Array<{
        docId: string;
        objectKey: string;
        sizeBytes: number;
        commitToken: string;
        uploadUrl: null;
        idempotencyKey: string;
      }>;
    };

    expect(prepareResponse.status).toBe(200);
    expect(prepareBody.uploadMode).toBe("r2_binding_missing_dry_run");
    expect(prepareBody.persistence).toBe("dry_run_memoryless");
    expect(prepareBody.accepted[0]?.uploadUrl).toBeNull();
    expect(prepareBody.accepted[0]?.commitToken).toMatch(/^dry_commit_/);
    expect(prepareBody.accepted[0]?.idempotencyKey).toMatch(/^dry_intent_/);

    const commit = prepareBody.accepted[0];
    const commitResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/commit", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          commits: [
            {
              docId: commit?.docId,
              objectKey: commit?.objectKey,
              sizeBytes: commit?.sizeBytes,
              sha256: "b".repeat(64),
              commitToken: commit?.commitToken,
            },
          ],
        }),
      }),
      {},
    );
    const commitBody = (await commitResponse.json()) as {
      accepted: Array<{
        docId: string;
        objectKey: string;
        status: string;
        committedAt: string;
        idempotencyKey: string;
        idempotent: boolean;
      }>;
      commitPolicy: string;
      persistence: string;
    };

    expect(commitResponse.status).toBe(200);
    expect(commitBody.commitPolicy).toBe("metadata_only_commit");
    expect(commitBody.persistence).toBe("dry_run_memoryless");
    expect(commitBody.accepted).toEqual([
      {
        docId: "doc_poster",
        objectKey: commit?.objectKey,
        status: "r2_dry_run",
        committedAt: expect.any(String),
        idempotencyKey: expect.any(String),
        idempotent: false,
      },
    ]);
  });

  it("records D1 attachment intents and makes repeated commits idempotent", async () => {
    const fakeD1 = createAttachmentIntentD1();
    const csrfValue = "local-test-csrf-value";
    const sessionId = "sess_attachment_test";
    fakeD1.sessions.set(sessionId, {
      id: sessionId,
      workspace_id: null,
      member_id: null,
      csrf_hash: await sha256HexForTest(csrfValue),
      user_agent_hash: null,
      ip_hash: null,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    });
    const env = { DB: fakeD1.db };
    const authHeaders = {
      "x-film-csrf": csrfValue,
      cookie: `film_session=${sessionId}`,
    };
    const attachment = {
      docId: "doc_poster",
      name: "Poster.png",
      sourcePath: "Imported Feature/Poster.png",
      sizeBytes: 4096,
      contentType: "image/png",
      sha256: "c".repeat(64),
      storageKey: "attachment_workspace_doc_hash",
    };
    const prepareResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/prepare-upload", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachments: [attachment],
        }),
      }),
      env,
    );
    const prepareBody = (await prepareResponse.json()) as {
      persistence: string;
      accepted: Array<{
        docId: string;
        objectKey: string;
        sizeBytes: number;
        commitToken: string;
        idempotencyKey: string;
      }>;
    };

    expect(prepareResponse.status).toBe(200);
    expect(prepareBody.persistence).toBe("d1_attachment_intents");
    expect(fakeD1.rows.size).toBe(1);

    const intent = prepareBody.accepted[0];
    const commitRequest = {
      docId: intent?.docId,
      objectKey: intent?.objectKey,
      sizeBytes: intent?.sizeBytes,
      sha256: attachment.sha256,
      commitToken: intent?.commitToken,
    };
    const commitResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/commit", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          commits: [commitRequest],
        }),
      }),
      env,
    );
    const commitBody = (await commitResponse.json()) as {
      persistence: string;
      accepted: Array<{ committedAt: string; idempotencyKey: string; idempotent: boolean }>;
    };

    expect(commitResponse.status).toBe(200);
    expect(commitBody.persistence).toBe("d1_attachment_intents");
    expect(commitBody.accepted[0]).toMatchObject({
      idempotencyKey: intent?.idempotencyKey,
      idempotent: false,
    });

    const repeatedCommitResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/commit", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          commits: [commitRequest],
        }),
      }),
      env,
    );
    const repeatedCommitBody = (await repeatedCommitResponse.json()) as {
      accepted: Array<{ committedAt: string; idempotent: boolean }>;
    };

    expect(repeatedCommitResponse.status).toBe(200);
    expect(repeatedCommitBody.accepted[0]).toEqual({
      committedAt: commitBody.accepted[0]?.committedAt,
      idempotent: true,
      docId: "doc_poster",
      objectKey: intent?.objectKey,
      status: "r2_dry_run",
      idempotencyKey: intent?.idempotencyKey,
    });
  });

  it("stores prepared attachment bytes in R2 and marks the intent stored", async () => {
    const fakeD1 = createAttachmentIntentD1();
    const fakeR2 = createR2Bucket();
    const csrfValue = "local-test-csrf-value";
    const sessionId = "sess_attachment_store";
    fakeD1.sessions.set(sessionId, {
      id: sessionId,
      workspace_id: null,
      member_id: null,
      csrf_hash: await sha256HexForTest(csrfValue),
      user_agent_hash: null,
      ip_hash: null,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    });
    const authHeaders = {
      "x-film-csrf": csrfValue,
      cookie: `film_session=${sessionId}`,
    };
    const bytes = new TextEncoder().encode("poster bytes");
    const attachment = {
      docId: "doc_poster",
      name: "Poster.png",
      sourcePath: "Imported Feature/Poster.png",
      sizeBytes: bytes.byteLength,
      contentType: "image/png",
      sha256: await sha256HexForTest("poster bytes"),
      storageKey: "attachment_workspace_doc_hash",
    };
    const env = { DB: fakeD1.db, ATTACHMENTS: fakeR2.bucket };
    const prepareResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/prepare-upload", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachments: [attachment],
        }),
      }),
      env,
    );
    const prepareBody = (await prepareResponse.json()) as {
      accepted: Array<{
        docId: string;
        objectKey: string;
        sizeBytes: number;
        commitToken: string;
        idempotencyKey: string;
      }>;
    };
    const intent = prepareBody.accepted[0];
    const uploadRequest = () => new Request("https://worker.test/api/attachments/r2/upload-object", {
      method: "PUT",
      headers: {
        ...authHeaders,
        "content-type": "image/png",
        "x-film-workspace-id": "workspace_acme",
        "x-film-doc-id": attachment.docId,
        "x-film-object-key": intent?.objectKey ?? "",
        "x-film-size-bytes": String(attachment.sizeBytes),
        "x-film-sha256": attachment.sha256,
        "x-film-commit-token": intent?.commitToken ?? "",
        "x-film-storage-confirmation": "STORE workspace_acme",
      },
      body: bytes,
    });
    const failedResponse = await worker.fetch(uploadRequest(), {
      ...env,
      DB: {
        ...fakeD1.db,
        async batch() {
          throw new Error("D1 attachment finalize batch unavailable");
        },
      } as unknown as D1Database,
    });
    expect(failedResponse.status).toBe(503);
    expect(await failedResponse.json()).toMatchObject({
      error: "attachment_metadata_finalize_required",
      persistence: "r2_attachment_metadata_pending",
    });
    expect(fakeD1.rows.get(intent?.idempotencyKey ?? "")?.status).toBe("prepared");
    expect(fakeR2.putCount).toBe(1);
    expect(fakeR2.objects.has(intent?.objectKey ?? "")).toBe(true);

    const uploadResponse = await worker.fetch(uploadRequest(), env);
    const uploadBody = (await uploadResponse.json()) as {
      dryRun: boolean;
      uploadMode: string;
      persistence: string;
      attachment: {
        docId: string;
        objectKey: string;
        status: string;
        sizeBytes: number;
        idempotent: boolean;
      };
    };

    expect(uploadResponse.status).toBe(200);
    expect(uploadBody.dryRun).toBe(false);
    expect(uploadBody.uploadMode).toBe("worker_r2_put");
    expect(uploadBody.persistence).toBe("r2_attachment_object");
    expect(uploadBody.attachment).toMatchObject({
      docId: "doc_poster",
      objectKey: intent?.objectKey,
      status: "stored_r2",
      sizeBytes: bytes.byteLength,
      idempotent: false,
    });
    expect(fakeD1.rows.get(intent?.idempotencyKey ?? "")?.status).toBe("stored_r2");
    expect(fakeR2.objects.get(intent?.objectKey ?? "")?.body.byteLength).toBe(bytes.byteLength);
    expect(fakeR2.putCount).toBe(1);

    const repeatResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/upload-object", {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-film-workspace-id": "workspace_acme",
          "x-film-doc-id": attachment.docId,
          "x-film-object-key": intent?.objectKey ?? "",
          "x-film-size-bytes": String(attachment.sizeBytes),
          "x-film-sha256": attachment.sha256,
          "x-film-commit-token": intent?.commitToken ?? "",
          "x-film-storage-confirmation": "STORE workspace_acme",
        },
        body: bytes,
      }),
      env,
    );
    const repeatBody = (await repeatResponse.json()) as {
      attachment: { idempotent: boolean };
    };

    expect(repeatResponse.status).toBe(200);
    expect(repeatBody.attachment.idempotent).toBe(true);
    expect(fakeR2.putCount).toBe(1);
  });

  it("exports stored R2 attachment manifests and downloads owned objects", async () => {
    const fakeD1 = createAttachmentIntentD1();
    const fakeR2 = createR2Bucket();
    const csrfValue = "local-test-csrf-value";
    const sessionId = "sess_attachment_export";
    fakeD1.sessions.set(sessionId, {
      id: sessionId,
      workspace_id: null,
      member_id: null,
      csrf_hash: await sha256HexForTest(csrfValue),
      user_agent_hash: null,
      ip_hash: null,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    });
    const authHeaders = {
      "x-film-csrf": csrfValue,
      cookie: `film_session=${sessionId}`,
    };
    const bytes = new TextEncoder().encode("poster bytes");
    const attachment = {
      docId: "doc_poster",
      name: "Poster.png",
      sizeBytes: bytes.byteLength,
      contentType: "image/png",
      sha256: await sha256HexForTest("poster bytes"),
      storageKey: "attachment_workspace_doc_hash",
    };
    const env = { DB: fakeD1.db, ATTACHMENTS: fakeR2.bucket };
    const prepareResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/prepare-upload", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ workspaceId: "workspace_acme", attachments: [attachment] }),
      }),
      env,
    );
    const prepareBody = (await prepareResponse.json()) as {
      accepted: Array<{ objectKey: string; commitToken: string }>;
    };
    const intent = prepareBody.accepted[0];
    await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/upload-object", {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-film-workspace-id": "workspace_acme",
          "x-film-doc-id": attachment.docId,
          "x-film-object-key": intent?.objectKey ?? "",
          "x-film-size-bytes": String(attachment.sizeBytes),
          "x-film-sha256": attachment.sha256,
          "x-film-commit-token": intent?.commitToken ?? "",
          "x-film-storage-confirmation": "STORE workspace_acme",
        },
        body: bytes,
      }),
      env,
    );

    const manifestResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/export-manifest", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ workspaceId: "workspace_acme", limit: 10 }),
      }),
      env,
    );
    const manifestBody = (await manifestResponse.json()) as {
      persistence: string;
      exportPolicy: string;
      objects: Array<{ docId: string; objectKey: string; name: string; sha256: string }>;
    };

    expect(manifestResponse.status).toBe(200);
    expect(manifestBody.persistence).toBe("d1_attachment_intents");
    expect(manifestBody.exportPolicy).toBe("stored_r2_manifest_only");
    expect(manifestBody.objects).toEqual([
      expect.objectContaining({
        docId: "doc_poster",
        objectKey: intent?.objectKey,
        name: "Poster.png",
        sha256: attachment.sha256,
      }),
    ]);

    const packageRequest = () => new Request("https://worker.test/api/attachments/r2/export-package-dry-run", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ workspaceId: "workspace_acme", limit: 10 }),
      });
    const auditCountBeforePackagePlan = fakeD1.auditEvents.size;
    const failedPackageResponse = await worker.fetch(
      packageRequest(),
      {
        ...env,
        DB: {
          prepare: fakeD1.db.prepare.bind(fakeD1.db),
          async batch() {
            throw new Error("injected attachment package plan batch failure");
          },
        } as unknown as D1Database,
      },
    );
    const failedPackageBody = (await failedPackageResponse.json()) as {
      packageMode: string;
      packagePlanId: string | null;
      packageToken: string | null;
      canPackage: boolean;
      blockers: string[];
    };
    expect(failedPackageResponse.status).toBe(200);
    expect(failedPackageBody.packageMode).toBe("blocked_dry_run");
    expect(failedPackageBody.packagePlanId).toBeNull();
    expect(failedPackageBody.packageToken).toBeNull();
    expect(failedPackageBody.canPackage).toBe(false);
    expect(failedPackageBody.blockers).toContain(
      "D1 package plan storage is required before attachment package bytes can be downloaded.",
    );
    expect(fakeD1.packagePlans.size).toBe(0);
    expect(fakeD1.auditEvents.size).toBe(auditCountBeforePackagePlan + 1);

    const packageResponse = await worker.fetch(
      packageRequest(),
      env,
    );
    const packageBody = (await packageResponse.json()) as {
      packagePolicy: string;
      packageMode: string;
      packagePlanId: string | null;
      packageToken: string | null;
      packageTokenExpiresAt: string | null;
      packagePlanPersistence: string;
      objectCount: number;
      totalSizeBytes: number;
      canPackage: boolean;
      blockers: string[];
    };

    expect(packageResponse.status).toBe(200);
    expect(packageBody.packagePolicy).toBe("stored_r2_attachment_package_plan");
    expect(packageBody.packageMode).toBe("zip_download_ready");
    expect(packageBody.objectCount).toBe(1);
    expect(packageBody.totalSizeBytes).toBe(bytes.byteLength);
    expect(packageBody.canPackage).toBe(true);
    expect(packageBody.blockers).toEqual([]);
    expect(packageBody.packagePlanId).toMatch(/^attachment_package_/);
    expect(packageBody.packageToken).toMatch(/^pkg_/);
    expect(packageBody.packageTokenExpiresAt).toBeTruthy();
    expect(packageBody.packagePlanPersistence).toBe("d1_attachment_package_plans");
    expect(fakeD1.packagePlans.size).toBe(1);
    expect(fakeD1.auditEvents.size).toBe(auditCountBeforePackagePlan + 2);
    expect([...fakeD1.auditEvents.values()].at(-1)?.action).toBe("attachment.export_package_dry_run_created");

    const missingPlanResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/package", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 10,
          objectKeys: [intent?.objectKey ?? ""],
        }),
      }),
      env,
    );
    const missingPlanBody = (await missingPlanResponse.json()) as { error: string };

    expect(missingPlanResponse.status).toBe(400);
    expect(missingPlanBody.error).toBe("invalid_attachment_package_request");

    const packageDownloadResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/package", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 10,
          objectKeys: [intent?.objectKey ?? ""],
          packagePlanId: packageBody.packagePlanId,
          packageToken: packageBody.packageToken,
        }),
      }),
      env,
    );
    const packageBytes = new Uint8Array(await packageDownloadResponse.arrayBuffer());
    const packageText = new TextDecoder().decode(packageBytes);

    expect(packageDownloadResponse.status).toBe(200);
    expect(packageDownloadResponse.headers.get("content-type")).toBe("application/zip");
    expect(packageDownloadResponse.headers.get("content-disposition")).toBe("attachment; filename=\"film-attachments-workspace_acme.zip\"");
    expect(packageDownloadResponse.headers.get("x-film-package-object-count")).toBe("1");
    expect(packageDownloadResponse.headers.get("x-film-package-total-source-bytes")).toBe(String(bytes.byteLength));
    expect(packageDownloadResponse.headers.get("x-film-package-sha256")).toMatch(/^[a-f0-9]{64}$/);
    expect(packageText).toContain("manifest.json");
    expect(packageText).toContain("film.attachment-package");
    expect(packageText).toContain("Poster.png");
    expect(packageText).toContain("poster bytes");

    const packageRangeResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/package", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          range: "bytes=0-24",
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 10,
          objectKeys: [intent?.objectKey ?? ""],
          packagePlanId: packageBody.packagePlanId,
          packageToken: packageBody.packageToken,
        }),
      }),
      env,
    );
    const packageRangeBytes = await packageRangeResponse.arrayBuffer();

    expect(packageRangeResponse.status).toBe(206);
    expect(packageRangeResponse.headers.get("accept-ranges")).toBe("bytes");
    expect(packageRangeResponse.headers.get("content-range")).toMatch(/^bytes 0-24\/\d+$/);
    expect(packageRangeResponse.headers.get("content-length")).toBe("25");
    expect(packageRangeBytes.byteLength).toBe(25);

    const invalidPackageRangeResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/package", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          range: "bytes=0-1,3-4",
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 10,
          objectKeys: [intent?.objectKey ?? ""],
          packagePlanId: packageBody.packagePlanId,
          packageToken: packageBody.packageToken,
        }),
      }),
      env,
    );
    const invalidPackageRangeBody = (await invalidPackageRangeResponse.json()) as { error: string };

    expect(invalidPackageRangeResponse.status).toBe(416);
    expect(invalidPackageRangeResponse.headers.get("content-range")).toMatch(/^bytes \*\/\d+$/);
    expect(invalidPackageRangeBody.error).toBe("invalid_attachment_range");

    const downloadResponse = await worker.fetch(
      new Request(`https://worker.test/api/attachments/r2/object?workspaceId=workspace_acme&objectKey=${encodeURIComponent(intent?.objectKey ?? "")}`, {
        method: "GET",
        headers: authHeaders,
      }),
      env,
    );

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("content-type")).toBe("image/png");
    expect(downloadResponse.headers.get("content-disposition")).toContain("Poster.png");
    expect(downloadResponse.headers.get("x-film-sha256")).toBe(attachment.sha256);
    expect(await downloadResponse.text()).toBe("poster bytes");

    const rangeResponse = await worker.fetch(
      new Request(`https://worker.test/api/attachments/r2/object?workspaceId=workspace_acme&objectKey=${encodeURIComponent(intent?.objectKey ?? "")}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          range: "bytes=0-5",
        },
      }),
      env,
    );

    expect(rangeResponse.status).toBe(206);
    expect(rangeResponse.headers.get("accept-ranges")).toBe("bytes");
    expect(rangeResponse.headers.get("content-range")).toBe(`bytes 0-5/${bytes.byteLength}`);
    expect(rangeResponse.headers.get("content-length")).toBe("6");
    expect(await rangeResponse.text()).toBe("poster");

    const invalidRangeResponse = await worker.fetch(
      new Request(`https://worker.test/api/attachments/r2/object?workspaceId=workspace_acme&objectKey=${encodeURIComponent(intent?.objectKey ?? "")}`, {
        method: "GET",
        headers: {
          ...authHeaders,
          range: "bytes=0-1,3-4",
        },
      }),
      env,
    );
    const invalidRangeBody = (await invalidRangeResponse.json()) as { error: string };

    expect(invalidRangeResponse.status).toBe(416);
    expect(invalidRangeResponse.headers.get("content-range")).toBe(`bytes */${bytes.byteLength}`);
    expect(invalidRangeBody.error).toBe("invalid_attachment_range");
  });

  it("paginates stored R2 attachment manifests and package plans", async () => {
    const fakeD1 = createAttachmentIntentD1();
    const fakeR2 = createR2Bucket();
    const csrfValue = "local-test-csrf-value";
    const sessionId = "sess_attachment_pagination";
    fakeD1.sessions.set(sessionId, {
      id: sessionId,
      workspace_id: null,
      member_id: null,
      csrf_hash: await sha256HexForTest(csrfValue),
      user_agent_hash: null,
      ip_hash: null,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    });
    const authHeaders = {
      "x-film-csrf": csrfValue,
      cookie: `film_session=${sessionId}`,
    };
    fakeD1.rows.set("intent_first", fakeStoredAttachmentIntent({
      id: "intent_first",
      docId: "doc_first",
      objectKey: "workspaces/workspace_acme/attachments/doc_first/first.png",
      name: "First.png",
      committedAt: "2026-07-08T00:02:00.000Z",
    }));
    fakeD1.rows.set("intent_second", fakeStoredAttachmentIntent({
      id: "intent_second",
      docId: "doc_second",
      objectKey: "workspaces/workspace_acme/attachments/doc_second/second.png",
      name: "Second.png",
      committedAt: "2026-07-08T00:01:00.000Z",
    }));
    const env = { DB: fakeD1.db, ATTACHMENTS: fakeR2.bucket };

    const firstManifestResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/export-manifest", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ workspaceId: "workspace_acme", limit: 1, offset: 0 }),
      }),
      env,
    );
    const firstManifest = (await firstManifestResponse.json()) as {
      rowCount: number;
      offset: number;
      nextOffset: number | null;
      truncated: boolean;
      objects: Array<{ objectKey: string }>;
    };

    expect(firstManifestResponse.status).toBe(200);
    expect(firstManifest.rowCount).toBe(1);
    expect(firstManifest.offset).toBe(0);
    expect(firstManifest.nextOffset).toBe(1);
    expect(firstManifest.truncated).toBe(true);
    expect(firstManifest.objects[0]?.objectKey).toBe("workspaces/workspace_acme/attachments/doc_first/first.png");

    const secondManifestResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/export-manifest", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ workspaceId: "workspace_acme", limit: 1, offset: 1 }),
      }),
      env,
    );
    const secondManifest = (await secondManifestResponse.json()) as {
      rowCount: number;
      offset: number;
      nextOffset: number | null;
      truncated: boolean;
      objects: Array<{ objectKey: string }>;
    };

    expect(secondManifestResponse.status).toBe(200);
    expect(secondManifest.rowCount).toBe(1);
    expect(secondManifest.offset).toBe(1);
    expect(secondManifest.nextOffset).toBeNull();
    expect(secondManifest.truncated).toBe(false);
    expect(secondManifest.objects[0]?.objectKey).toBe("workspaces/workspace_acme/attachments/doc_second/second.png");

    const packagePageResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/export-package-dry-run", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ workspaceId: "workspace_acme", limit: 1, offset: 1 }),
      }),
      env,
    );
    const packagePage = (await packagePageResponse.json()) as {
      objectCount: number;
      offset: number;
      nextOffset: number | null;
      truncated: boolean;
      packagePlanId: string | null;
      packageToken: string | null;
      objects: Array<{ objectKey: string }>;
    };

    expect(packagePageResponse.status).toBe(200);
    expect(packagePage.objectCount).toBe(1);
    expect(packagePage.offset).toBe(1);
    expect(packagePage.nextOffset).toBeNull();
    expect(packagePage.truncated).toBe(false);
    expect(packagePage.packagePlanId).toMatch(/^attachment_package_/);
    expect(packagePage.packageToken).toMatch(/^pkg_/);
    expect(packagePage.objects[0]?.objectKey).toBe("workspaces/workspace_acme/attachments/doc_second/second.png");
  });

  it("rejects attachment object uploads when bytes do not match the prepared hash", async () => {
    const fakeD1 = createAttachmentIntentD1();
    const fakeR2 = createR2Bucket();
    const csrfValue = "local-test-csrf-value";
    const sessionId = "sess_attachment_mismatch";
    fakeD1.sessions.set(sessionId, {
      id: sessionId,
      workspace_id: null,
      member_id: null,
      csrf_hash: await sha256HexForTest(csrfValue),
      user_agent_hash: null,
      ip_hash: null,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    });
    const authHeaders = {
      "x-film-csrf": csrfValue,
      cookie: `film_session=${sessionId}`,
    };
    const expectedBytes = new TextEncoder().encode("same-length-a");
    const wrongBytes = new TextEncoder().encode("same-length-b");
    const attachment = {
      docId: "doc_poster",
      name: "Poster.png",
      sizeBytes: wrongBytes.byteLength,
      contentType: "image/png",
      sha256: await sha256HexForTest("same-length-a"),
      storageKey: "attachment_workspace_doc_hash",
    };
    const env = { DB: fakeD1.db, ATTACHMENTS: fakeR2.bucket };
    const prepareResponse = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/prepare-upload", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          attachments: [{ ...attachment, sizeBytes: expectedBytes.byteLength }],
        }),
      }),
      env,
    );
    const prepareBody = (await prepareResponse.json()) as {
      accepted: Array<{ objectKey: string; commitToken: string }>;
    };
    const intent = prepareBody.accepted[0];

    const response = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/upload-object", {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-film-workspace-id": "workspace_acme",
          "x-film-doc-id": attachment.docId,
          "x-film-object-key": intent?.objectKey ?? "",
          "x-film-size-bytes": String(wrongBytes.byteLength),
          "x-film-sha256": attachment.sha256,
          "x-film-commit-token": intent?.commitToken ?? "",
          "x-film-storage-confirmation": "STORE workspace_acme",
        },
        body: wrongBytes,
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(422);
    expect(body.error).toBe("sha256_mismatch");
    expect(fakeR2.putCount).toBe(0);
  });

  it("rejects raw bytes and invalid tokens on attachment commit", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/attachments/r2/commit", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          commits: [
            {
              docId: "doc_poster",
              objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
              sizeBytes: 4096,
              sha256: "b".repeat(64),
              commitToken: "wrong",
              bytes: "AQIDBA==",
            },
          ],
        }),
      }),
      {},
    );
    const body = (await response.json()) as { rejected: Array<{ reason: string }> };

    expect(response.status).toBe(422);
    expect(body.rejected).toEqual([{ docId: "doc_poster", reason: "raw_bytes_not_allowed" }]);
  });

  it("rejects invalid magic-link email requests", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      }),
      {},
    );

    expect(response.status).toBe(400);
  });

  it("creates a dry-run magic-link token without sending email", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "alonso@example.com" }),
      }),
      {},
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      delivery: string;
      persistence: string;
      devOnlyToken: string;
      emailHash: string;
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.delivery).toBe("not_sent");
    expect(body.persistence).toBe("dry_run_memoryless");
    expect(body.devOnlyToken).toMatch(/^dry_/);
    expect(body.emailHash).toHaveLength(64);
  });

  it("keeps live magic-link requests generic for unknown members", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const resendFetch = vi.fn();
    vi.stubGlobal("fetch", resendFetch);

    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@example.com" }),
      }),
      {
        DB: fakeAuth.db,
        SESSIONS: fakeSessions.kv,
        AUTH_MAGIC_LINK_MODE: "live",
        RESEND_API_KEY: "test_resend_key",
        INVITE_FROM_EMAIL: "Film <invites@example.com>",
        INVITE_APP_ORIGIN: "https://film.example.com",
      },
    );
    const body = (await response.json()) as {
      delivery: string;
      emailHash: string | null;
      devOnlyToken: string | null;
    };

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      delivery: "email_if_eligible",
      emailHash: null,
      devOnlyToken: null,
    });
    expect(fakeAuth.magicLinks.size).toBe(0);
    expect(resendFetch).not.toHaveBeenCalled();
  });

  it("delivers live magic links only for active D1 members and binds the session", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const email = "active@example.com";
    const emailHash = await sha256HexForTest(email);
    fakeAuth.workspaceMembers.set("member_active", {
      id: "member_active",
      workspace_id: "workspace_acme",
      email_hash: emailHash,
      role: "producer",
      status: "active",
    });
    let deliveredToken = "";
    let deliveredIdempotencyKey = "";
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as { text?: string };
      const match = payload.text?.match(/[#&]magicLinkToken=([^\s]+)/);
      deliveredToken = match ? decodeURIComponent(match[1]) : "";
      expect(payload.text).not.toContain("?magicLinkToken=");
      deliveredIdempotencyKey = new Headers(init?.headers).get("idempotency-key") ?? "";
      return new Response(JSON.stringify({ id: "email_test" }), { status: 200 });
    }));
    const env = {
      DB: fakeAuth.db,
      SESSIONS: fakeSessions.kv,
      AUTH_MAGIC_LINK_MODE: "live",
      RESEND_API_KEY: "test_resend_key",
      INVITE_FROM_EMAIL: "Film <invites@example.com>",
      INVITE_APP_ORIGIN: "https://film.example.com",
    };

    const requestResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
      env,
    );
    const requestBody = (await requestResponse.json()) as { devOnlyToken: null; delivery: string };

    expect(requestResponse.status).toBe(202);
    expect(requestBody).toMatchObject({ devOnlyToken: null, delivery: "email_if_eligible" });
    expect(deliveredToken).toMatch(/^magic_/);
    expect(deliveredIdempotencyKey).toMatch(/^film-magic-link\/magic_/);
    expect(deliveredIdempotencyKey).not.toContain(emailHash);
    expect(deliveredIdempotencyKey).not.toContain(deliveredToken);
    expect(Array.from(fakeAuth.magicLinks.values())[0]).toMatchObject({
      workspace_id: "workspace_acme",
      email_hash: emailHash,
    });

    const verifyResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: deliveredToken }),
      }),
      env,
    );
    const verifyBody = (await verifyResponse.json()) as {
      dryRun: boolean;
      session: { id: string; role: string; csrfToken: string };
    };

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.dryRun).toBe(false);
    expect(verifyBody.session.role).toBe("producer");
    expect(fakeAuth.sessions.get(verifyBody.session.id)).toMatchObject({
      workspace_id: "workspace_acme",
      member_id: "member_active",
    });

    const sessionResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/session", {
        headers: { cookie: `film_session=${verifyBody.session.id}` },
      }),
      env,
    );
    const sessionBody = (await sessionResponse.json()) as { dryRun: boolean; session: { role: string } };
    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.dryRun).toBe(false);
    expect(sessionBody.session.role).toBe("producer");

    const logoutResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/logout", {
        method: "POST",
        headers: {
          "x-film-csrf": verifyBody.session.csrfToken,
          cookie: `film_session=${verifyBody.session.id}`,
        },
      }),
      env,
    );
    const logoutBody = (await logoutResponse.json()) as { dryRun: boolean; session: null };
    expect(logoutResponse.status).toBe(200);
    expect(logoutBody.dryRun).toBe(false);
    expect(logoutBody.session).toBeNull();
  });

  it("rate limits magic-link requests when KV is available", async () => {
    const fakeSessions = createSessionKV();
    const env = { SESSIONS: fakeSessions.kv };
    const headers = {
      "cf-connecting-ip": "203.0.113.10",
      "user-agent": "vitest-rate-limit",
    };

    for (let index = 0; index < 5; index += 1) {
      const response = await worker.fetch(
        new Request("https://worker.test/api/auth/magic-link/request", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: "alonso@example.com" }),
        }),
        env,
      );
      expect(response.status).toBe(200);
    }

    const blockedResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "alonso@example.com" }),
      }),
      env,
    );
    const blockedBody = (await blockedResponse.json()) as {
      error: string;
      persistence: string;
      limit: number;
      retryAfterSeconds: number;
    };

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.headers.get("retry-after")).toEqual(expect.any(String));
    expect(blockedBody).toMatchObject({
      error: "rate_limited",
      persistence: "kv_rate_limit",
      limit: 5,
    });
    expect(blockedBody.retryAfterSeconds).toBeGreaterThan(0);
    expect([...fakeSessions.values.keys()].some((key) => key.startsWith("rl:auth_magic_link_request:"))).toBe(true);
  });

  it("keeps rate-limit KV expirations within Cloudflare's supported TTL range", async () => {
    const ip = "203.0.113.12";
    const userAgent = "vitest-rate-limit-ttl";
    const bucket = "auth_magic_link_request";
    const key = `rl:${bucket}:${await sha256HexForTest(`${bucket}|${ip}|${userAgent}`)}`;
    const values = new Map([
      [key, JSON.stringify({ count: 1, resetAt: Math.floor(Date.now() / 1_000) + 30 })],
    ]);
    const expirationTtls: number[] = [];
    const kv = {
      async put(putKey: string, value: string, options?: { expirationTtl?: number }) {
        const expirationTtl = options?.expirationTtl ?? 0;
        if (expirationTtl < 60) throw new Error("expiration_ttl must be at least 60");
        expirationTtls.push(expirationTtl);
        values.set(putKey, value);
      },
      async get(getKey: string) {
        return values.get(getKey) ?? null;
      },
      async delete(deleteKey: string) {
        values.delete(deleteKey);
      },
    } as unknown as KVNamespace;

    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        headers: { "cf-connecting-ip": ip, "user-agent": userAgent },
        body: JSON.stringify({ email: "alonso@example.com" }),
      }),
      { AUTH_MAGIC_LINK_MODE: "live", SESSIONS: kv },
    );

    expect(response.status).toBe(202);
    expect(expirationTtls).toEqual([60]);
  });

  it("fails live rate-limited mutations closed when KV is missing or unavailable", async () => {
    const missingResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "member@example.com" }),
      }),
      { AUTH_MAGIC_LINK_MODE: "live" },
    );
    const unavailableKv = {
      get: async () => {
        throw new Error("KV unavailable");
      },
      put: async () => {
        throw new Error("KV unavailable");
      },
    } as unknown as KVNamespace;
    const unavailableResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "member@example.com" }),
      }),
      { AUTH_MAGIC_LINK_MODE: "live", SESSIONS: unavailableKv },
    );

    for (const response of [missingResponse, unavailableResponse]) {
      const body = (await response.json()) as { error: string; persistence: string };
      expect(response.status).toBe(503);
      expect(body).toEqual({
        error: "rate_limit_unavailable",
        persistence: "kv_unavailable_dry_run",
      });
    }
  });

  it("applies bounded rate limit overrides by bucket", async () => {
    const fakeSessions = createSessionKV();
    const env = {
      SESSIONS: fakeSessions.kv,
      RATE_LIMIT_OVERRIDES: JSON.stringify({
        auth_magic_link_request: { limit: 1, windowSeconds: 30 },
      }),
    };
    const headers = {
      "cf-connecting-ip": "203.0.113.11",
      "user-agent": "vitest-rate-limit-override",
    };

    const firstResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "alonso@example.com" }),
      }),
      env,
    );
    const blockedResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "alonso@example.com" }),
      }),
      env,
    );
    const blockedBody = (await blockedResponse.json()) as {
      error: string;
      persistence: string;
      limit: number;
      windowSeconds: number;
    };

    expect(firstResponse.status).toBe(200);
    expect(blockedResponse.status).toBe(429);
    expect(blockedBody).toMatchObject({
      error: "rate_limited",
      persistence: "kv_rate_limit",
      limit: 1,
      windowSeconds: 30,
    });
  });

  it("verifies a dry-run token and returns session csrf metadata", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: "dry_12345678901234567890" }),
      }),
      {},
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      persistence: string;
      session: { role: string; csrfToken: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(body.dryRun).toBe(true);
    expect(body.persistence).toBe("dry_run_memoryless");
    expect(body.session.role).toBe("owner");
    expect(body.session.csrfToken).toMatch(/^csrf_/);
  });

  it("returns null session metadata without auth storage", async () => {
    const response = await worker.fetch(new Request("https://worker.test/api/auth/session"), {});
    const body = (await response.json()) as { persistence: string; session: null };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("dry_run_memoryless");
    expect(body.session).toBeNull();
  });

  it("fails closed when live session storage is missing or unavailable", async () => {
    const missingResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/session"),
      { AUTH_MAGIC_LINK_MODE: "live" },
    );
    const unavailableDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => {
            throw new Error("D1 unavailable");
          },
        }),
      }),
    } as unknown as D1Database;
    const unavailableResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/session"),
      { AUTH_MAGIC_LINK_MODE: "live", DB: unavailableDb },
    );

    for (const response of [missingResponse, unavailableResponse]) {
      const body = (await response.json()) as { error: string; persistence: string; session: null };
      expect(response.status).toBe(503);
      expect(body).toEqual({
        error: "auth_storage_unavailable",
        persistence: "d1_kv_auth_records",
        session: null,
      });
    }
  });

  it("rejects workspace-less session metadata in live auth mode", async () => {
    const { env, cookie, sessionId, fakeAuth } = await createAuthorizedTestSession();
    const session = fakeAuth.sessions.get(sessionId);
    if (!session) throw new Error("Expected test session");
    session.workspace_id = null;
    session.member_id = null;

    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/session", { headers: { cookie } }),
      { ...env, AUTH_MAGIC_LINK_MODE: "live" },
    );
    const body = (await response.json()) as { error: string; session: null };

    expect(response.status).toBe(401);
    expect(body.error).toBe("invalid_session");
    expect(body.session).toBeNull();
  });

  it("uses the current D1 member role instead of a stale elevated KV role", async () => {
    const { env, cookie, csrfToken, fakeAuth, fakeSessions, sessionId } = await createAuthorizedTestSession("producer");
    const member = fakeAuth.workspaceMembers.get("member_producer");
    if (!member) throw new Error("Expected producer member");
    member.role = "contributor";

    expect(JSON.parse(fakeSessions.values.get(sessionId) ?? "{}")).toMatchObject({ role: "producer" });

    const sessionResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/session", { headers: { cookie } }),
      env,
    );
    const sessionBody = (await sessionResponse.json()) as { session: { role: string } };
    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.session.role).toBe("contributor");

    const protectedResponse = await worker.fetch(
      new Request("https://worker.test/api/providers/runtime-readiness", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      }),
      env,
    );
    const protectedBody = (await protectedResponse.json()) as { error: string };
    expect(protectedResponse.status).toBe(403);
    expect(protectedBody.error).toBe("insufficient_role");
  });

  it("rejects a session whose D1 member moved outside the session workspace", async () => {
    const { env, cookie, fakeAuth } = await createAuthorizedTestSession("producer");
    const member = fakeAuth.workspaceMembers.get("member_producer");
    if (!member) throw new Error("Expected producer member");
    member.workspace_id = "workspace_other";

    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/session", { headers: { cookie } }),
      { ...env, AUTH_MAGIC_LINK_MODE: "live" },
    );
    const body = (await response.json()) as { error: string; session: null };

    expect(response.status).toBe(403);
    expect(body.error).toBe("member_not_active");
    expect(body.session).toBeNull();
  });

  it("does not treat members as active when the D1 status lookup fails", async () => {
    const { env, cookie } = await createAuthorizedTestSession("producer");
    const baseDb = env.DB;
    const statusLookupUnavailableDb = {
      prepare(query: string) {
        if (query.includes("LEFT JOIN workspace_member_statuses")) {
          throw new Error("member status lookup unavailable");
        }
        return baseDb.prepare(query);
      },
    } as unknown as D1Database;

    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/session", { headers: { cookie } }),
      { ...env, DB: statusLookupUnavailableDb, AUTH_MAGIC_LINK_MODE: "live" },
    );
    const body = (await response.json()) as { error: string; session: null };

    expect(response.status).toBe(403);
    expect(body.error).toBe("member_not_active");
    expect(body.session).toBeNull();
  });

  it("returns current D1/KV session metadata without exposing csrf", async () => {
    const { env, cookie, sessionId } = await createAuthorizedTestSession("director");
    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/session", {
        headers: { cookie },
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      session: { id: string; role: string; csrfToken?: string; expiresAt: string };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_kv_auth_records");
    expect(body.session).toEqual({
      id: sessionId,
      role: "director",
      expiresAt: expect.any(String),
    });
    expect(body.session.csrfToken).toBeUndefined();
  });

  it("rejects invalid session metadata cookies", async () => {
    const { env } = await createAuthorizedTestSession();
    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/session", {
        headers: { cookie: "film_session=sess_missing" },
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string; session: null };

    expect(response.status).toBe(401);
    expect(body.error).toBe("invalid_session");
    expect(body.persistence).toBe("d1_kv_auth_records");
    expect(body.session).toBeNull();
  });

  it("records and consumes magic-link auth state with D1 and KV bindings", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const env = { DB: fakeAuth.db, SESSIONS: fakeSessions.kv };

    const requestResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "alonso@example.com" }),
      }),
      env,
    );
    const requestBody = (await requestResponse.json()) as {
      persistence: string;
      devOnlyToken: string;
      emailHash: string;
    };

    expect(requestResponse.status).toBe(200);
    expect(requestBody.persistence).toBe("d1_kv_auth_records");
    expect(fakeAuth.magicLinks.size).toBe(1);
    expect(Array.from(fakeAuth.magicLinks.values())[0]?.token_hash).toHaveLength(64);

    const verifyResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        headers: { "user-agent": "vitest" },
        body: JSON.stringify({ token: requestBody.devOnlyToken }),
      }),
      env,
    );
    const verifyBody = (await verifyResponse.json()) as {
      persistence: string;
      session: { id: string; role: string; csrfToken: string };
    };

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.persistence).toBe("d1_kv_auth_records");
    expect(verifyBody.session.role).toBe("owner");
    expect(Array.from(fakeAuth.magicLinks.values())[0]?.consumed_at).toEqual(expect.any(String));
    expect(fakeAuth.sessions.get(verifyBody.session.id)?.csrf_hash).toHaveLength(64);
    expect(fakeSessions.values.has(verifyBody.session.id)).toBe(true);

    const repeatedVerifyResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: requestBody.devOnlyToken }),
      }),
      env,
    );
    const repeatedVerifyBody = (await repeatedVerifyResponse.json()) as { error: string };

    expect(repeatedVerifyResponse.status).toBe(401);
    expect(repeatedVerifyBody.error).toBe("invalid_or_expired_token");

    const logoutResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/logout", {
        method: "POST",
        headers: {
          "x-film-csrf": verifyBody.session.csrfToken,
          cookie: `film_session=${verifyBody.session.id}`,
        },
      }),
      env,
    );
    const logoutBody = (await logoutResponse.json()) as { persistence: string; session: null };

    expect(logoutResponse.status).toBe(200);
    expect(logoutBody.persistence).toBe("d1_kv_auth_records");
    expect(logoutBody.session).toBeNull();
    expect(fakeAuth.sessions.get(verifyBody.session.id)?.revoked_at).toEqual(expect.any(String));
    expect(fakeSessions.values.has(verifyBody.session.id)).toBe(false);
  });

  it("keeps magic-link consumption and D1 session creation atomic", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const requestResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "atomic-auth@example.com" }),
      }),
      { DB: fakeAuth.db, SESSIONS: fakeSessions.kv },
    );
    const requestBody = (await requestResponse.json()) as { devOnlyToken: string };
    const baseDb = fakeAuth.db;
    let failBatch = true;
    const db = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected verification batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const verifyRequest = () => new Request("https://worker.test/api/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token: requestBody.devOnlyToken }),
    });

    const failed = await worker.fetch(verifyRequest(), { DB: db, SESSIONS: fakeSessions.kv });
    expect(failed.status).toBe(401);
    expect(Array.from(fakeAuth.magicLinks.values())[0]?.consumed_at).toBeNull();
    expect(fakeAuth.sessions.size).toBe(0);
    expect(Array.from(fakeSessions.values.keys()).some((key) => key.startsWith("sess_"))).toBe(false);

    failBatch = false;
    const retried = await worker.fetch(verifyRequest(), { DB: db, SESSIONS: fakeSessions.kv });
    const retriedBody = (await retried.json()) as { session: { id: string } };
    expect(retried.status).toBe(200);
    expect(Array.from(fakeAuth.magicLinks.values())[0]?.consumed_at).toEqual(expect.any(String));
    expect(fakeAuth.sessions.has(retriedBody.session.id)).toBe(true);
  });

  it("keeps a valid D1 session when the post-commit KV role cache write fails", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const requestResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "kv-cache-failure@example.com" }),
      }),
      { DB: fakeAuth.db, SESSIONS: fakeSessions.kv },
    );
    const requestBody = (await requestResponse.json()) as { devOnlyToken: string; emailHash: string };
    fakeAuth.workspaceMembers.set("member_kv_cache_failure", {
      id: "member_kv_cache_failure",
      workspace_id: "workspace_acme",
      email_hash: requestBody.emailHash,
      role: "producer",
      status: "active",
    });
    const baseKv = fakeSessions.kv;
    const cacheWriteUnavailable = {
      get: baseKv.get.bind(baseKv),
      delete: baseKv.delete.bind(baseKv),
      async put(key: string, value: string, options?: KVNamespacePutOptions) {
        if (key.startsWith("sess_")) throw new Error("session role cache unavailable");
        return baseKv.put(key, value, options);
      },
    } as unknown as KVNamespace;

    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: requestBody.devOnlyToken }),
      }),
      { DB: fakeAuth.db, SESSIONS: cacheWriteUnavailable, AUTH_MAGIC_LINK_MODE: "live" },
    );
    const body = (await response.json()) as { persistence: string; session: { id: string; role: string } };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_kv_auth_records");
    expect(body.session.role).toBe("producer");
    expect(fakeAuth.sessions.get(body.session.id)).toMatchObject({
      workspace_id: "workspace_acme",
      member_id: "member_kv_cache_failure",
    });
    expect(fakeSessions.values.has(body.session.id)).toBe(false);
  });

  it("binds dry-run sessions to matching D1 workspace members", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const env = { DB: fakeAuth.db, SESSIONS: fakeSessions.kv };

    const requestResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "crew@example.com" }),
      }),
      env,
    );
    const requestBody = (await requestResponse.json()) as {
      devOnlyToken: string;
      emailHash: string;
    };
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: requestBody.emailHash,
      role: "contributor",
      status: "active",
    });

    const verifyResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: requestBody.devOnlyToken }),
      }),
      env,
    );
    const verifyBody = (await verifyResponse.json()) as {
      session: { id: string; role: string; csrfToken: string };
    };

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.session.role).toBe("contributor");
    expect(fakeAuth.sessions.get(verifyBody.session.id)).toMatchObject({
      workspace_id: "workspace_acme",
      member_id: "member_crew",
    });
    expect(JSON.parse(fakeSessions.values.get(verifyBody.session.id) ?? "{}")).toMatchObject({
      role: "contributor",
    });

    const sessionResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/session", {
        headers: { cookie: `film_session=${verifyBody.session.id}` },
      }),
      { DB: fakeAuth.db },
    );
    const sessionBody = (await sessionResponse.json()) as {
      session: { role: string };
    };

    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.session.role).toBe("contributor");

    const providerResponse = await worker.fetch(
      new Request("https://worker.test/api/providers/pool/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": verifyBody.session.csrfToken,
          cookie: `film_session=${verifyBody.session.id}`,
        },
      }),
      { DB: fakeAuth.db },
    );
    const providerBody = (await providerResponse.json()) as { error: string };

    expect(providerResponse.status).toBe(403);
    expect(providerBody.error).toBe("insufficient_role");
  });

  it("rejects magic-link verification for invited workspace members", async () => {
    const fakeAuth = createAuthD1();
    const fakeSessions = createSessionKV();
    const env = { DB: fakeAuth.db, SESSIONS: fakeSessions.kv };

    const requestResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email: "invited@example.com" }),
      }),
      env,
    );
    const requestBody = (await requestResponse.json()) as {
      devOnlyToken: string;
      emailHash: string;
    };
    fakeAuth.workspaceMembers.set("member_invited", {
      id: "member_invited",
      workspace_id: "workspace_acme",
      email_hash: requestBody.emailHash,
      role: "director",
      status: "invited",
    });

    const verifyResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/magic-link/verify", {
        method: "POST",
        body: JSON.stringify({ token: requestBody.devOnlyToken }),
      }),
      env,
    );
    const verifyBody = (await verifyResponse.json()) as { error: string };

    expect(verifyResponse.status).toBe(401);
    expect(verifyBody.error).toBe("member_not_active");
    expect(Array.from(fakeAuth.magicLinks.values())[0]?.consumed_at).toBeNull();
  });

  it("rejects protected mutations and session metadata for disabled members", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const member = fakeAuth.workspaceMembers.get("member_producer");
    if (!member) throw new Error("Expected producer member");
    member.status = "disabled";

    const providerResponse = await worker.fetch(
      new Request("https://worker.test/api/providers/pool/dry-run", {
        method: "POST",
        headers: {
          "x-film-csrf": csrfToken,
          cookie,
        },
      }),
      env,
    );
    const providerBody = (await providerResponse.json()) as { error: string; persistence: string };

    expect(providerResponse.status).toBe(403);
    expect(providerBody).toEqual({
      error: "member_not_active",
      persistence: "d1_kv_auth_records",
    });

    const sessionResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/session", {
        headers: { cookie },
      }),
      env,
    );
    const sessionBody = (await sessionResponse.json()) as { error: string };

    expect(sessionResponse.status).toBe(403);
    expect(sessionBody.error).toBe("member_not_active");
  });

  it("requires csrf for workspace invite creation", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/create-dry-run", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          email: "crew@example.com",
          role: "contributor",
        }),
      }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("creates and accepts D1 workspace invites without raw email storage", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const createResponse = await worker.fetch(
      new Request("https://worker.test/api/invites/create-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          email: "crew@example.com",
          role: "contributor",
          expiresInDays: 7,
        }),
      }),
      env,
    );
	    const createBody = (await createResponse.json()) as {
	      delivery: string;
	      persistence: string;
	      deliveryPersistence: string;
	      deliveryAttempt: {
	        id: string;
	        provider: string;
	        channel: string;
	        targetHash: string;
	        deliveryMode: string;
	        status: string;
	      };
	      invite: {
	        id: string;
        emailHash: string;
        role: string;
        devOnlyInviteToken: string;
      };
    };

	    expect(createResponse.status).toBe(200);
	    expect(createBody.delivery).toBe("queued_dry_run");
	    expect(createBody.persistence).toBe("d1_invite_records");
	    expect(createBody.deliveryPersistence).toBe("d1_invite_delivery_attempts");
	    expect(createBody.deliveryAttempt).toMatchObject({
	      provider: "resend",
	      channel: "email",
	      deliveryMode: "dry_run_outbox",
	      status: "queued_dry_run",
	    });
	    expect(createBody.invite.emailHash).toHaveLength(64);
	    expect(createBody.deliveryAttempt.targetHash).toBe(createBody.invite.emailHash);
	    expect(createBody.invite.role).toBe("contributor");
	    expect(createBody.invite.devOnlyInviteToken).toMatch(/^dry_invite_/);
	    expect(fakeAuth.workspaceInvites.size).toBe(1);
	    expect(fakeAuth.inviteDeliveryAttempts.size).toBe(1);
	    const inviteRow = Array.from(fakeAuth.workspaceInvites.values())[0];
	    const deliveryRow = Array.from(fakeAuth.inviteDeliveryAttempts.values())[0];
	    expect(inviteRow?.token_hash).toHaveLength(64);
	    expect(deliveryRow).toMatchObject({
	      invite_id: createBody.invite.id,
	      actor_member_id: "member_producer",
	      provider: "resend",
	      channel: "email",
	      target_hash: createBody.invite.emailHash,
	      status: "queued_dry_run",
	    });
	    expect(JSON.stringify(Array.from(fakeAuth.workspaceInvites.values()))).not.toContain("crew@example.com");
	    expect(JSON.stringify(Array.from(fakeAuth.inviteDeliveryAttempts.values()))).not.toContain("crew@example.com");

    const acceptResponse = await worker.fetch(
      new Request("https://worker.test/api/invites/accept-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: createBody.invite.devOnlyInviteToken,
          displayName: "Crew Member",
        }),
      }),
      env,
    );
    const acceptBody = (await acceptResponse.json()) as {
      persistence: string;
      member: {
        id: string;
        workspaceId: string;
        emailHash: string;
        role: string;
        status: string;
      };
    };

    expect(acceptResponse.status).toBe(200);
    expect(acceptBody.persistence).toBe("d1_invite_records");
    expect(acceptBody.member).toMatchObject({
      workspaceId: "workspace_acme",
      emailHash: createBody.invite.emailHash,
      role: "contributor",
      status: "active",
    });
    expect(fakeAuth.workspaceMembers.get(acceptBody.member.id)).toMatchObject({
      workspace_id: "workspace_acme",
      email_hash: createBody.invite.emailHash,
      role: "contributor",
      status: "active",
    });
    expect(fakeAuth.workspaceInvites.get(createBody.invite.id)).toMatchObject({
      status: "accepted",
      accepted_at: expect.any(String),
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "invite.accepted_dry_run")).toBe(true);
    expect(JSON.stringify(Array.from(fakeAuth.workspaceMembers.values()))).not.toContain("crew@example.com");
  });

  it("keeps invite acceptance atomic when a membership write cannot be prepared", async () => {
    const fakeAuth = createAuthD1();
    const token = `dry_invite_${crypto.randomUUID()}`;
    fakeAuth.workspaceInvites.set("invite_atomic_accept", {
      id: "invite_atomic_accept",
      workspace_id: "workspace_acme",
      email_hash: "a".repeat(64),
      invited_role: "contributor",
      invited_by_member_id: "member_owner",
      token_hash: await sha256HexForTest(token),
      status: "pending",
      expires_at: "2099-07-16T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-09T00:00:00.000Z",
    });
    const baseDb = fakeAuth.db;
    const membershipWriteUnavailableDb = {
      batch: baseDb.batch.bind(baseDb),
      prepare(query: string) {
        if (query.includes("INSERT INTO workspace_member_statuses")) {
          throw new Error("membership status write unavailable");
        }
        return baseDb.prepare(query);
      },
    } as unknown as D1Database;

    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/accept-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, displayName: "Crew Member" }),
      }),
      { DB: membershipWriteUnavailableDb },
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "invite_storage_unavailable",
      persistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.workspaceInvites.get("invite_atomic_accept")).toMatchObject({
      status: "pending",
      accepted_at: null,
    });
    expect(fakeAuth.workspaceMembers.size).toBe(0);
  });

  it("keeps invite acceptance membership, token consumption, and audit evidence atomic", async () => {
    const fakeAuth = createAuthD1();
    const token = `dry_invite_${crypto.randomUUID()}`;
    fakeAuth.workspaceInvites.set("invite_atomic_accept_batch", {
      id: "invite_atomic_accept_batch",
      workspace_id: "workspace_acme",
      email_hash: "c".repeat(64),
      invited_role: "contributor",
      invited_by_member_id: "member_owner",
      token_hash: await sha256HexForTest(token),
      status: "pending",
      expires_at: "2099-07-16T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-09T00:00:00.000Z",
    });
    const baseDb = fakeAuth.db;
    let failBatch = true;
    const db = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected invite acceptance batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const request = () => new Request("https://worker.test/api/invites/accept-dry-run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, displayName: "Atomic Crew" }),
    });

    const failed = await worker.fetch(request(), { DB: db });
    expect(failed.status).toBe(503);
    expect(fakeAuth.workspaceInvites.get("invite_atomic_accept_batch")).toMatchObject({
      status: "pending",
      accepted_at: null,
    });
    expect(fakeAuth.workspaceMembers.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);

    failBatch = false;
    const retried = await worker.fetch(request(), { DB: db });
    expect(retried.status).toBe(200);
    expect(fakeAuth.workspaceInvites.get("invite_atomic_accept_batch")?.status).toBe("accepted");
    expect(fakeAuth.workspaceMembers.size).toBe(1);
    expect(Array.from(fakeAuth.auditEvents.values()).map((event) => event.action)).toEqual(["invite.accepted_dry_run"]);
  });

  it("sends live workspace invites through Resend only when explicitly enabled", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_live_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const configuredEnv = {
      ...env,
      RESEND_API_KEY: "test_resend_key",
      INVITE_FROM_EMAIL: "Film <invites@example.com>",
      INVITE_APP_ORIGIN: "https://film.example.com",
      INVITE_DELIVERY_WEBHOOK_SECRET: "test_webhook_secret",
      INVITE_DELIVERY_MODE: "live",
      ALLOWED_ORIGINS: "https://film.example.com",
    };

    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/create-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          email: "crew@example.com",
          role: "contributor",
          expiresInDays: 7,
        }),
      }),
      configuredEnv,
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      delivery: string;
      deliveryAttempt: {
        id: string;
        deliveryMode: string;
        status: string;
        targetHash: string;
        providerMessageId: string | null;
        errorCode: string | null;
      };
      invite: {
        id: string;
        emailHash: string;
        devOnlyInviteToken: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(false);
    expect(body.delivery).toBe("sent_live");
    expect(body.invite.devOnlyInviteToken).toBeNull();
    expect(body.deliveryAttempt).toMatchObject({
      deliveryMode: "live_resend",
      status: "sent_live",
      targetHash: body.invite.emailHash,
      providerMessageId: "email_live_123",
      errorCode: null,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("idempotency-key")).toBe(`film-invite/${body.invite.id}`);
    const resendPayload = JSON.parse(String(init?.body)) as {
      to: string;
      text: string;
      tags: Array<{ name: string; value: string }>;
    };
    expect(resendPayload.to).toBe("crew@example.com");
    expect(resendPayload.text).toContain("dry_invite_");
    expect(resendPayload.text).toContain("https://film.example.com");
    expect(resendPayload.text).toContain("#inviteToken=");
    expect(resendPayload.text).not.toContain("?inviteToken=");
    expect(resendPayload.tags).toEqual([
      { name: "film_delivery_attempt", value: body.deliveryAttempt.id },
    ]);

    const deliveryRow = Array.from(fakeAuth.inviteDeliveryAttempts.values())[0];
    expect(deliveryRow).toMatchObject({
      invite_id: body.invite.id,
      actor_member_id: "member_producer",
      delivery_mode: "live_resend",
      status: "sent_live",
      target_hash: body.invite.emailHash,
      provider_message_id: "email_live_123",
      error_code: null,
    });
    expect(JSON.stringify(Array.from(fakeAuth.workspaceInvites.values()))).not.toContain("crew@example.com");
    expect(JSON.stringify(Array.from(fakeAuth.inviteDeliveryAttempts.values()))).not.toContain("crew@example.com");
    expect(JSON.stringify(Array.from(fakeAuth.auditEvents.values()))).not.toContain("test_resend_key");
  });

  it("blocks workspace invite creation for hash-only suppressed recipients", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const targetHash = await sha256HexForTest("crew@example.com");
    fakeAuth.inviteDeliverySuppressions.set(`resend:${targetHash}:complained`, {
      id: "invite_delivery_suppression_complaint",
      provider: "resend",
      target_hash: targetHash,
      suppression_reason: "complained",
      workspace_id: "workspace_acme",
      invite_id: "invite_old",
      delivery_attempt_id: "invite_delivery_old",
      provider_message_id: "email_old",
      source_webhook_event_id: "webhook_old",
      first_seen_at: "2026-07-09T00:00:00.000Z",
      last_seen_at: "2026-07-09T00:01:00.000Z",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_should_not_send" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const configuredEnv = {
      ...env,
      RESEND_API_KEY: "test_resend_key",
      INVITE_FROM_EMAIL: "Film <invites@example.com>",
      INVITE_APP_ORIGIN: "https://film.example.com",
      INVITE_DELIVERY_WEBHOOK_SECRET: "test_webhook_secret",
      INVITE_DELIVERY_MODE: "live",
      ALLOWED_ORIGINS: "https://film.example.com",
    };

    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/create-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          email: "crew@example.com",
          role: "contributor",
          expiresInDays: 7,
        }),
      }),
      configuredEnv,
    );
    const body = (await response.json()) as {
      error: string;
      delivery: string;
      persistence: string;
      suppressionPolicy: string;
      suppression: {
        targetHash: string;
        reason: string;
        lastSeenAt: string;
      };
    };

    expect(response.status).toBe(409);
    expect(body.error).toBe("invite_delivery_suppressed");
    expect(body.delivery).toBe("blocked_suppressed");
    expect(body.persistence).toBe("d1_invite_delivery_suppressions");
    expect(body.suppressionPolicy).toBe("invite_delivery_suppression_blocks_invite_creation");
    expect(body.suppression).toMatchObject({
      targetHash,
      reason: "complained",
      lastSeenAt: "2026-07-09T00:01:00.000Z",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fakeAuth.workspaceInvites.size).toBe(0);
    expect(fakeAuth.inviteDeliveryAttempts.size).toBe(0);
    expect(JSON.stringify(Array.from(fakeAuth.inviteDeliverySuppressions.values()))).not.toContain("crew@example.com");
    expect(JSON.stringify(Array.from(fakeAuth.auditEvents.values()))).not.toContain("crew@example.com");
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "invite.delivery_suppressed_blocked")).toBe(true);
  });

  it("fails invite creation closed when suppression checks or invite storage error", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_should_not_send" }), { status: 200 }),
    );
    const baseDb = env.DB;
    const configuredEnv = {
      ...env,
      AUTH_MAGIC_LINK_MODE: "live",
      RESEND_API_KEY: "test_resend_key",
      INVITE_FROM_EMAIL: "Film <invites@example.com>",
      INVITE_APP_ORIGIN: "https://film.example.com",
      INVITE_DELIVERY_WEBHOOK_SECRET: "test_webhook_secret",
      INVITE_DELIVERY_MODE: "live",
      ALLOWED_ORIGINS: "https://film.example.com",
    };
    const request = () => new Request("https://worker.test/api/invites/create-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        email: "crew@example.com",
        role: "contributor",
        expiresInDays: 7,
      }),
    });

    const suppressionUnavailableDb = {
      prepare(query: string) {
        if (query.includes("invite_delivery_suppressions")) {
          throw new Error("suppression storage unavailable");
        }
        return baseDb.prepare(query);
      },
    } as unknown as D1Database;
    const suppressionResponse = await worker.fetch(request(), { ...configuredEnv, DB: suppressionUnavailableDb });
    const suppressionBody = (await suppressionResponse.json()) as { error: string; persistence: string };
    expect(suppressionResponse.status).toBe(503);
    expect(suppressionBody).toEqual({
      error: "invite_delivery_suppression_check_unavailable",
      persistence: "d1_unavailable_dry_run",
    });

    const targetHash = await sha256HexForTest("crew@example.com");
    fakeAuth.workspaceInvites.set("invite_previous", {
      id: "invite_previous",
      workspace_id: "workspace_acme",
      email_hash: targetHash,
      invited_role: "contributor",
      invited_by_member_id: "member_producer",
      token_hash: "a".repeat(64),
      status: "pending",
      expires_at: "2099-07-16T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-09T00:00:00.000Z",
    });
    const inviteUnavailableDb = {
      prepare(query: string) {
        if (query.includes("INSERT INTO workspace_invites")) {
          throw new Error("invite storage unavailable");
        }
        return baseDb.prepare(query);
      },
    } as unknown as D1Database;
    const inviteResponse = await worker.fetch(request(), { ...configuredEnv, DB: inviteUnavailableDb });
    const inviteBody = (await inviteResponse.json()) as { error: string; persistence: string };
    expect(inviteResponse.status).toBe(503);
    expect(inviteBody).toEqual({
      error: "invite_creation_unavailable",
      persistence: "d1_unavailable_dry_run",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fakeAuth.workspaceInvites.size).toBe(1);
    expect(fakeAuth.workspaceInvites.get("invite_previous")?.status).toBe("pending");
    expect(fakeAuth.inviteDeliveryAttempts.size).toBe(0);
  });

  it("records verified Resend invite-delivery webhooks and links live attempts", async () => {
    const fakeAuth = createAuthD1();
    fakeAuth.workspaceInvites.set("invite_live_1", {
      id: "invite_live_1",
      workspace_id: "workspace_acme",
      email_hash: "a".repeat(64),
      invited_role: "contributor",
      invited_by_member_id: "member_producer",
      token_hash: "b".repeat(64),
      status: "pending",
      expires_at: "2026-07-16T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.inviteDeliveryAttempts.set("invite_delivery_live_1", {
      id: "invite_delivery_live_1",
      workspace_id: "workspace_acme",
      invite_id: "invite_live_1",
      actor_member_id: "member_producer",
      provider: "resend",
      channel: "email",
      target_hash: "a".repeat(64),
      template_key: "workspace_invite",
      delivery_mode: "live_resend",
      status: "sent_live",
      provider_message_id: "email_live_123",
      error_code: null,
      created_at: "2026-07-08T00:00:00.000Z",
    });

    const payload = JSON.stringify({
      type: "email.delivered",
      created_at: "2026-07-08T00:00:30.000Z",
      data: {
        email_id: "email_live_123",
        to: ["crew@example.com"],
        tags: { template: "workspace_invite" },
      },
    });
    const signed = await svixHeadersForTest(payload);
    const env = { DB: fakeAuth.db, INVITE_DELIVERY_WEBHOOK_SECRET: signed.secret };
    const makeRequest = () => worker.fetch(
      new Request("https://worker.test/api/webhooks/resend/invite-delivery", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...signed.headers,
        },
        body: payload,
      }),
      env,
    );

    const response = await makeRequest();
    const body = (await response.json()) as {
      ok: boolean;
      persistence: string;
      duplicate: boolean;
      deliveryAttemptId: string | null;
      workspaceId: string | null;
      inviteId: string | null;
      providerMessageId: string | null;
      deliveryStatus: string;
      attemptEventStatusUpdated: boolean;
      suppressionRecorded: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      persistence: "d1_invite_delivery_webhook_events",
      duplicate: false,
      deliveryAttemptId: "invite_delivery_live_1",
      workspaceId: "workspace_acme",
      inviteId: "invite_live_1",
      providerMessageId: "email_live_123",
      deliveryStatus: "delivered",
      attemptEventStatusUpdated: true,
      suppressionRecorded: false,
    });
    expect(fakeAuth.inviteDeliveryAttempts.get("invite_delivery_live_1")).toMatchObject({
      last_event_status: "delivered",
      last_event_at: "2026-07-08T00:00:30.000Z",
    });
    expect(fakeAuth.inviteDeliveryWebhookEvents.size).toBe(1);
    const stored = Array.from(fakeAuth.inviteDeliveryWebhookEvents.values())[0];
    expect(stored).toMatchObject({
      svix_id: signed.headers["svix-id"],
      event_type: "email.delivered",
      provider_message_id: "email_live_123",
      delivery_attempt_id: "invite_delivery_live_1",
      workspace_id: "workspace_acme",
      invite_id: "invite_live_1",
      delivery_status: "delivered",
      event_created_at: "2026-07-08T00:00:30.000Z",
    });
    expect(JSON.parse(stored?.metadata_keys_json ?? "[]")).toEqual(["email_id", "tags", "to", "tags.template"]);
    expect(JSON.stringify(Array.from(fakeAuth.inviteDeliveryWebhookEvents.values()))).not.toContain("crew@example.com");

    const replayResponse = await makeRequest();
    const replayBody = (await replayResponse.json()) as { duplicate: boolean; persistence: string };

    expect(replayResponse.status).toBe(200);
    expect(replayBody).toMatchObject({
      duplicate: true,
      persistence: "d1_invite_delivery_webhook_events",
    });
    expect(fakeAuth.inviteDeliveryWebhookEvents.size).toBe(1);
  });

  it("records hash-only suppressions for bounced Resend invite-delivery webhooks", async () => {
    const fakeAuth = createAuthD1();
    fakeAuth.workspaceInvites.set("invite_live_bounced", {
      id: "invite_live_bounced",
      workspace_id: "workspace_acme",
      email_hash: "c".repeat(64),
      invited_role: "reviewer",
      invited_by_member_id: "member_producer",
      token_hash: "d".repeat(64),
      status: "pending",
      expires_at: "2026-07-16T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.inviteDeliveryAttempts.set("invite_delivery_bounced", {
      id: "invite_delivery_bounced",
      workspace_id: "workspace_acme",
      invite_id: "invite_live_bounced",
      actor_member_id: "member_producer",
      provider: "resend",
      channel: "email",
      target_hash: "c".repeat(64),
      template_key: "workspace_invite",
      delivery_mode: "live_resend",
      status: "sent_live",
      provider_message_id: "email_bounced_123",
      error_code: null,
      created_at: "2026-07-08T00:00:00.000Z",
      last_event_status: null,
      last_event_at: null,
    });

    const payload = JSON.stringify({
      type: "email.bounced",
      created_at: "2026-07-08T00:01:30.000Z",
      data: {
        email_id: "email_bounced_123",
        to: ["bounce@example.com"],
        tags: { template: "workspace_invite" },
      },
    });
    const signed = await svixHeadersForTest(payload, { svixId: "msg_test_resend_webhook_bounce1" });
    const env = { DB: fakeAuth.db, INVITE_DELIVERY_WEBHOOK_SECRET: signed.secret };
    const makeRequest = () => worker.fetch(
      new Request("https://worker.test/api/webhooks/resend/invite-delivery", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...signed.headers,
        },
        body: payload,
      }),
      env,
    );

    const response = await makeRequest();
    const body = (await response.json()) as {
      duplicate: boolean;
      deliveryStatus: string;
      attemptEventStatusUpdated: boolean;
      suppressionRecorded: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      duplicate: false,
      deliveryStatus: "bounced",
      attemptEventStatusUpdated: true,
      suppressionRecorded: true,
    });
    expect(fakeAuth.inviteDeliveryAttempts.get("invite_delivery_bounced")).toMatchObject({
      last_event_status: "bounced",
      last_event_at: "2026-07-08T00:01:30.000Z",
    });
    expect(fakeAuth.inviteDeliverySuppressions.size).toBe(1);
    const storedEvent = Array.from(fakeAuth.inviteDeliveryWebhookEvents.values())[0];
    const suppression = Array.from(fakeAuth.inviteDeliverySuppressions.values())[0];
    expect(suppression).toMatchObject({
      provider: "resend",
      target_hash: "c".repeat(64),
      suppression_reason: "bounced",
      workspace_id: "workspace_acme",
      invite_id: "invite_live_bounced",
      delivery_attempt_id: "invite_delivery_bounced",
      provider_message_id: "email_bounced_123",
      source_webhook_event_id: storedEvent?.id,
      first_seen_at: "2026-07-08T00:01:30.000Z",
      last_seen_at: "2026-07-08T00:01:30.000Z",
    });
    expect(JSON.stringify(Array.from(fakeAuth.inviteDeliverySuppressions.values()))).not.toContain("bounce@example.com");

    const replayResponse = await makeRequest();
    const replayBody = (await replayResponse.json()) as {
      duplicate: boolean;
      suppressionRecorded: boolean;
    };

    expect(replayResponse.status).toBe(200);
    expect(replayBody).toMatchObject({
      duplicate: true,
      suppressionRecorded: false,
    });
    expect(fakeAuth.inviteDeliverySuppressions.size).toBe(1);
  });

  it("recovers a missing outbound provider id from the signed delivery-attempt tag", async () => {
    const fakeAuth = createAuthD1();
    fakeAuth.workspaceInvites.set("invite_tag_recovery", {
      id: "invite_tag_recovery",
      workspace_id: "workspace_acme",
      email_hash: "1".repeat(64),
      invited_role: "reviewer",
      invited_by_member_id: "member_producer",
      token_hash: "2".repeat(64),
      status: "pending",
      expires_at: "2099-07-16T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const deliveryAttemptId = "invite_delivery_tag_recovery";
    fakeAuth.inviteDeliveryAttempts.set(deliveryAttemptId, {
      id: deliveryAttemptId,
      workspace_id: "workspace_acme",
      invite_id: "invite_tag_recovery",
      actor_member_id: "member_producer",
      provider: "resend",
      channel: "email",
      target_hash: "1".repeat(64),
      template_key: "workspace_invite",
      delivery_mode: "live_resend",
      status: "queued_live",
      provider_message_id: null,
      error_code: null,
      created_at: "2026-07-08T00:00:00.000Z",
      last_event_status: null,
      last_event_at: null,
    });
    const payload = JSON.stringify({
      type: "email.complained",
      created_at: "2026-07-08T00:02:00.000Z",
      data: {
        email_id: "email_recovered_from_tag",
        tags: { film_delivery_attempt: deliveryAttemptId },
      },
    });
    const signed = await svixHeadersForTest(payload, { svixId: "msg_test_resend_webhook_tag001" });

    const response = await worker.fetch(
      new Request("https://worker.test/api/webhooks/resend/invite-delivery", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...signed.headers,
        },
        body: payload,
      }),
      { DB: fakeAuth.db, INVITE_DELIVERY_WEBHOOK_SECRET: signed.secret },
    );
    const body = (await response.json()) as {
      deliveryAttemptId: string | null;
      attemptEventStatusUpdated: boolean;
      suppressionRecorded: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      deliveryAttemptId,
      attemptEventStatusUpdated: true,
      suppressionRecorded: true,
    });
    expect(fakeAuth.inviteDeliveryAttempts.get(deliveryAttemptId)).toMatchObject({
      provider_message_id: "email_recovered_from_tag",
      last_event_status: "complained",
    });
    expect(Array.from(fakeAuth.inviteDeliverySuppressions.values())[0]).toMatchObject({
      target_hash: "1".repeat(64),
      suppression_reason: "complained",
      delivery_attempt_id: deliveryAttemptId,
      provider_message_id: "email_recovered_from_tag",
    });
  });

  it("returns 503 without materialized webhook state when the D1 batch fails", async () => {
    const fakeAuth = createAuthD1();
    fakeAuth.workspaceInvites.set("invite_webhook_batch", {
      id: "invite_webhook_batch",
      workspace_id: "workspace_acme",
      email_hash: "e".repeat(64),
      invited_role: "reviewer",
      invited_by_member_id: "member_producer",
      token_hash: "f".repeat(64),
      status: "pending",
      expires_at: "2099-07-16T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.inviteDeliveryAttempts.set("invite_delivery_webhook_batch", {
      id: "invite_delivery_webhook_batch",
      workspace_id: "workspace_acme",
      invite_id: "invite_webhook_batch",
      actor_member_id: "member_producer",
      provider: "resend",
      channel: "email",
      target_hash: "e".repeat(64),
      template_key: "workspace_invite",
      delivery_mode: "live_resend",
      status: "sent_live",
      provider_message_id: "email_webhook_batch",
      error_code: null,
      created_at: "2026-07-08T00:00:00.000Z",
      last_event_status: null,
      last_event_at: null,
    });
    const payload = JSON.stringify({
      type: "email.bounced",
      created_at: "2026-07-08T00:02:30.000Z",
      data: { email_id: "email_webhook_batch" },
    });
    const signed = await svixHeadersForTest(payload, { svixId: "msg_test_resend_webhook_batch01" });
    const baseDb = fakeAuth.db;
    const batchUnavailableDb = {
      prepare: baseDb.prepare.bind(baseDb),
      batch: async () => {
        throw new Error("D1 batch unavailable");
      },
    } as unknown as D1Database;

    const response = await worker.fetch(
      new Request("https://worker.test/api/webhooks/resend/invite-delivery", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...signed.headers,
        },
        body: payload,
      }),
      {
        DB: batchUnavailableDb,
        INVITE_DELIVERY_WEBHOOK_SECRET: signed.secret,
        INVITE_DELIVERY_MODE: "live",
      },
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "resend_webhook_persistence_unavailable",
      persistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.inviteDeliveryWebhookEvents.size).toBe(0);
    expect(fakeAuth.inviteDeliverySuppressions.size).toBe(0);
    expect(fakeAuth.inviteDeliveryAttempts.get("invite_delivery_webhook_batch")).toMatchObject({
      last_event_status: null,
      last_event_at: null,
    });
  });

  it("rejects Resend invite-delivery webhooks with invalid signatures", async () => {
    const fakeAuth = createAuthD1();
    const payload = JSON.stringify({
      type: "email.delivered",
      data: { email_id: "email_live_123" },
    });
    const signed = await svixHeadersForTest(payload);
    const response = await worker.fetch(
      new Request("https://worker.test/api/webhooks/resend/invite-delivery", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...signed.headers,
          "svix-signature": "v1,invalid_signature",
        },
        body: payload,
      }),
      { DB: fakeAuth.db, INVITE_DELIVERY_WEBHOOK_SECRET: signed.secret },
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("resend_webhook_signature_invalid");
    expect(fakeAuth.inviteDeliveryWebhookEvents.size).toBe(0);
  });

  it("rejects producer-created owner invites", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/create-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          email: "owner-candidate@example.com",
          role: "owner",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("insufficient_invite_role");
  });

  it("revokes previous pending invites for the same workspace email hash", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    const makeRequest = () => worker.fetch(
      new Request("https://worker.test/api/invites/create-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          email: "repeat@example.com",
          role: "reviewer",
        }),
      }),
      env,
    );

    const firstResponse = await makeRequest();
    const firstBody = (await firstResponse.json()) as { invite: { id: string; emailHash: string } };
    const secondResponse = await makeRequest();
    const secondBody = (await secondResponse.json()) as { invite: { id: string; emailHash: string } };
    const invites = Array.from(fakeAuth.workspaceInvites.values());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstBody.invite.emailHash).toBe(secondBody.invite.emailHash);
    expect(fakeAuth.workspaceInvites.get(firstBody.invite.id)?.status).toBe("revoked");
    expect(fakeAuth.workspaceInvites.get(secondBody.invite.id)?.status).toBe("pending");
    expect(invites.filter((invite) => invite.status === "pending")).toHaveLength(1);
  });

  it("exports pending invite manifests without raw emails or token hashes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceInvites.set("invite_pending", {
      id: "invite_pending",
      workspace_id: "workspace_acme",
      email_hash: "a".repeat(64),
      invited_role: "reviewer",
      invited_by_member_id: "member_producer",
      token_hash: "b".repeat(64),
      status: "pending",
      expires_at: "2026-08-01T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T01:00:00.000Z",
    });
    fakeAuth.workspaceInvites.set("invite_accepted", {
      id: "invite_accepted",
      workspace_id: "workspace_acme",
      email_hash: "c".repeat(64),
      invited_role: "contributor",
      invited_by_member_id: "member_producer",
      token_hash: "d".repeat(64),
      status: "accepted",
      expires_at: "2026-08-01T00:00:00.000Z",
      accepted_at: "2026-07-08T02:00:00.000Z",
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.workspaceInvites.set("invite_other_workspace", {
      id: "invite_other_workspace",
      workspace_id: "workspace_other",
      email_hash: "e".repeat(64),
      invited_role: "reviewer",
      invited_by_member_id: "member_producer",
      token_hash: "f".repeat(64),
      status: "pending",
      expires_at: "2026-08-01T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T03:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 10,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      manifestPolicy: string;
      rowCount: number;
      invites: Array<{ id: string; emailHash: string; role: string; status: string }>;
    };
    const serializedBody = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_invite_records");
    expect(body.manifestPolicy).toBe("pending_invites_hash_only");
    expect(body.rowCount).toBe(1);
    expect(body.invites).toEqual([
      expect.objectContaining({
        id: "invite_pending",
        emailHash: "a".repeat(64),
        role: "reviewer",
        status: "pending",
      }),
    ]);
    expect(serializedBody).not.toContain("crew@example.com");
    expect(serializedBody).not.toContain("b".repeat(64));
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "invite.manifest_created")).toBe(true);
  });

  it("exports invite delivery suppression manifests without raw recipients", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.inviteDeliverySuppressions.set("resend:aaaaaaaa:bounced", {
      id: "suppression_bounced",
      provider: "resend",
      target_hash: "a".repeat(64),
      suppression_reason: "bounced",
      workspace_id: "workspace_acme",
      invite_id: "invite_bounced",
      delivery_attempt_id: "invite_delivery_bounced",
      provider_message_id: "email_bounced_123",
      source_webhook_event_id: "invite_delivery_webhook_bounced",
      first_seen_at: "2026-07-08T00:01:30.000Z",
      last_seen_at: "2026-07-08T00:02:30.000Z",
    });
    fakeAuth.inviteDeliverySuppressions.set("resend:bbbbbbbb:complained", {
      id: "suppression_other_workspace",
      provider: "resend",
      target_hash: "b".repeat(64),
      suppression_reason: "complained",
      workspace_id: "workspace_other",
      invite_id: "invite_other",
      delivery_attempt_id: "invite_delivery_other",
      provider_message_id: "email_other_123",
      source_webhook_event_id: "invite_delivery_webhook_other",
      first_seen_at: "2026-07-08T00:01:30.000Z",
      last_seen_at: "2026-07-08T00:03:30.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/delivery-suppressions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          limit: 10,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      manifestPolicy: string;
      rowCount: number;
      suppressions: Array<{
        id: string;
        targetHash: string;
        reason: string;
        providerMessageId: string | null;
      }>;
    };
    const serializedBody = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_invite_delivery_suppressions");
    expect(body.manifestPolicy).toBe("invite_delivery_suppressions_hash_only");
    expect(body.rowCount).toBe(1);
    expect(body.suppressions).toEqual([
      expect.objectContaining({
        id: "suppression_bounced",
        targetHash: "a".repeat(64),
        reason: "bounced",
        providerMessageId: "email_bounced_123",
      }),
    ]);
    expect(serializedBody).not.toContain("bounce@example.com");
    expect(serializedBody).not.toContain("b".repeat(64));
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "invite.delivery_suppression_manifest_created")).toBe(true);
  });

  it("revokes exact pending invites from a manifest row", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceInvites.set("invite_pending", {
      id: "invite_pending",
      workspace_id: "workspace_acme",
      email_hash: "a".repeat(64),
      invited_role: "contributor",
      invited_by_member_id: "member_producer",
      token_hash: "b".repeat(64),
      status: "pending",
      expires_at: "2026-08-01T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T01:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/revoke-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          inviteId: "invite_pending",
          emailHash: "a".repeat(64),
          role: "contributor",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      revokePolicy: string;
      invite: { id: string; emailHash: string; role: string };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_invite_records");
    expect(body.revokePolicy).toBe("pending_invite_exact_match_only");
    expect(body.invite).toMatchObject({
      id: "invite_pending",
      emailHash: "a".repeat(64),
      role: "contributor",
    });
    expect(fakeAuth.workspaceInvites.get("invite_pending")?.status).toBe("revoked");
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "invite.revoked")).toBe(true);
  });

  it("keeps invite revocation and audit evidence atomic", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceInvites.set("invite_atomic_revoke", {
      id: "invite_atomic_revoke",
      workspace_id: "workspace_acme",
      email_hash: "d".repeat(64),
      invited_role: "contributor",
      invited_by_member_id: "member_producer",
      token_hash: "e".repeat(64),
      status: "pending",
      expires_at: "2099-08-01T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T01:00:00.000Z",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected invite revoke batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = () => new Request("https://worker.test/api/invites/revoke-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        inviteId: "invite_atomic_revoke",
        emailHash: "d".repeat(64),
        role: "contributor",
      }),
    });

    const failed = await worker.fetch(request(), env);
    expect(failed.status).toBe(503);
    expect(fakeAuth.workspaceInvites.get("invite_atomic_revoke")?.status).toBe("pending");
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const retried = await worker.fetch(request(), env);
    expect(retried.status).toBe(200);
    expect(fakeAuth.workspaceInvites.get("invite_atomic_revoke")?.status).toBe("revoked");
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);
  });

  it("rejects stale pending invite revocations", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceInvites.set("invite_pending", {
      id: "invite_pending",
      workspace_id: "workspace_acme",
      email_hash: "a".repeat(64),
      invited_role: "contributor",
      invited_by_member_id: "member_producer",
      token_hash: "b".repeat(64),
      status: "pending",
      expires_at: "2026-08-01T00:00:00.000Z",
      accepted_at: null,
      created_at: "2026-07-08T01:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/invites/revoke-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          inviteId: "invite_pending",
          emailHash: "c".repeat(64),
          role: "contributor",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: "invite_not_found",
      persistence: "d1_invite_records",
    });
    expect(fakeAuth.workspaceInvites.get("invite_pending")?.status).toBe("pending");
  });

  it("rejects expired workspace invite tokens", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const createResponse = await worker.fetch(
      new Request("https://worker.test/api/invites/create-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          email: "expired@example.com",
          role: "contributor",
        }),
      }),
      env,
    );
    const createBody = (await createResponse.json()) as {
      invite: { id: string; devOnlyInviteToken: string };
    };
    const invite = fakeAuth.workspaceInvites.get(createBody.invite.id);
    if (!invite) throw new Error("Expected invite row");
    invite.expires_at = "2026-01-01T00:00:00.000Z";

    const acceptResponse = await worker.fetch(
      new Request("https://worker.test/api/invites/accept-dry-run", {
        method: "POST",
        body: JSON.stringify({ token: createBody.invite.devOnlyInviteToken }),
      }),
      env,
    );
    const acceptBody = (await acceptResponse.json()) as { error: string; persistence: string };

    expect(acceptResponse.status).toBe(401);
    expect(acceptBody).toEqual({
      error: "invalid_or_expired_invite",
      persistence: "d1_invite_records",
    });
  });

  it("requires csrf for project membership assignment", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/assign-dry-run", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          memberId: "member_crew",
          role: "contributor",
        }),
      }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("assigns active workspace members to D1 project memberships", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_crew",
      role: "contributor",
      status: "active",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/assign-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          projectTitle: "Echoes in the Static",
          memberId: "member_crew",
          role: "department_lead",
          department: "Camera",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      membership: {
        workspaceId: string;
        projectId: string;
        memberId: string;
        role: string;
        department: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_project_membership");
    expect(body.membership).toEqual({
      workspaceId: "workspace_acme",
      projectId: "proj_echoes",
      memberId: "member_crew",
      role: "department_lead",
      department: "Camera",
    });
    expect(fakeAuth.projects.get("proj_echoes")).toMatchObject({
      workspace_id: "workspace_acme",
      title: "Echoes in the Static",
    });
    expect(fakeAuth.projectMemberships.get("proj_echoes:member_crew")).toMatchObject({
      project_role: "department_lead",
      department: "Camera",
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "project_membership.assigned")).toBe(true);
  });

  it("atomically creates a project membership and its audit evidence", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceMembers.set("member_atomic_membership", {
      id: "member_atomic_membership",
      workspace_id: "workspace_acme",
      email_hash: "hash_atomic_membership",
      role: "contributor",
      status: "active",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected membership assignment failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = () => new Request("https://worker.test/api/projects/memberships/assign-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        projectId: "proj_atomic_membership",
        projectTitle: "Atomic Membership",
        memberId: "member_atomic_membership",
        role: "contributor",
        department: "Camera",
      }),
    });

    const failed = await worker.fetch(request(), env);
    expect(failed.status).toBe(503);
    expect(fakeAuth.projects.has("proj_atomic_membership")).toBe(false);
    expect(fakeAuth.projectMemberships.has("proj_atomic_membership:member_atomic_membership")).toBe(false);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const retried = await worker.fetch(request(), env);
    expect(retried.status).toBe(200);
    expect(fakeAuth.projects.has("proj_atomic_membership")).toBe(true);
    expect(fakeAuth.projectMemberships.has("proj_atomic_membership:member_atomic_membership")).toBe(true);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);
  });

  it("rejects project membership assignment when the project ID belongs to another workspace", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.workspaceMembers.set("member_cross_workspace_membership", {
      id: "member_cross_workspace_membership",
      workspace_id: "workspace_acme",
      email_hash: "hash_cross_workspace_membership",
      role: "contributor",
      status: "active",
    });
    fakeAuth.projects.set("proj_cross_workspace_membership", {
      id: "proj_cross_workspace_membership",
      workspace_id: "workspace_other",
      title: "Other workspace project",
      phase: "production",
    });
    const auditCountBefore = fakeAuth.auditEvents.size;

    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/assign-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_cross_workspace_membership",
          memberId: "member_cross_workspace_membership",
          role: "contributor",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "project_workspace_conflict",
      persistence: "d1_project_membership",
    });
    expect(fakeAuth.projectMemberships.has("proj_cross_workspace_membership:member_cross_workspace_membership")).toBe(false);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);
  });

  it("rejects producer-assigned owner project memberships", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_crew",
      role: "contributor",
      status: "active",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/assign-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          memberId: "member_crew",
          role: "owner",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("insufficient_assignment_role");
  });

  it("rejects project membership assignment for disabled members", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.workspaceMembers.set("member_disabled", {
      id: "member_disabled",
      workspace_id: "workspace_acme",
      email_hash: "hash_disabled",
      role: "contributor",
      status: "disabled",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/assign-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          memberId: "member_disabled",
          role: "contributor",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "member_not_active",
      persistence: "d1_project_membership",
    });
  });

  it("exports D1 project membership manifests for a selected project", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_echoes", {
      id: "proj_echoes",
      workspace_id: "workspace_acme",
      title: "Echoes in the Static",
      phase: "production",
    });
    fakeAuth.projectMemberships.set("proj_echoes:member_camera", {
      project_id: "proj_echoes",
      member_id: "member_camera",
      project_role: "department_lead",
      department: "Camera",
    });
    fakeAuth.projectMemberships.set("proj_echoes:member_review", {
      project_id: "proj_echoes",
      member_id: "member_review",
      project_role: "reviewer",
      department: null,
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          limit: 10,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      manifestPolicy: string;
      rowCount: number;
      memberships: Array<{ memberId: string; role: string; department: string | null }>;
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_project_membership");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.manifestPolicy).toBe("active_project_memberships_only");
    expect(body.rowCount).toBe(2);
    expect(body.memberships).toEqual([
      {
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        memberId: "member_camera",
        role: "department_lead",
        department: "Camera",
      },
      {
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        memberId: "member_review",
        role: "reviewer",
        department: null,
      },
    ]);
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "project_membership.manifest_created")).toBe(true);
  });

  it("revokes exact D1 project memberships from a manifest row", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_echoes", {
      id: "proj_echoes",
      workspace_id: "workspace_acme",
      title: "Echoes in the Static",
      phase: "production",
    });
    fakeAuth.projectMemberships.set("proj_echoes:member_camera", {
      project_id: "proj_echoes",
      member_id: "member_camera",
      project_role: "department_lead",
      department: "Camera",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/revoke-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          memberId: "member_camera",
          role: "department_lead",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      revokePolicy: string;
      membership: { memberId: string; role: string; department: string | null };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_project_membership");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.revokePolicy).toBe("exact_project_membership_match_only");
    expect(body.membership).toMatchObject({
      memberId: "member_camera",
      role: "department_lead",
      department: "Camera",
    });
	  expect(fakeAuth.projectMemberships.has("proj_echoes:member_camera")).toBe(false);
	  expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "project_membership.revoked")).toBe(true);
	});

  it("keeps project membership revocation and audit evidence atomic", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_atomic_membership_revoke", {
      id: "proj_atomic_membership_revoke",
      workspace_id: "workspace_acme",
      title: "Atomic Membership Revoke",
      phase: "production",
    });
    fakeAuth.projectMemberships.set("proj_atomic_membership_revoke:member_camera", {
      project_id: "proj_atomic_membership_revoke",
      member_id: "member_camera",
      project_role: "department_lead",
      department: "Camera",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected membership revoke failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = () => new Request("https://worker.test/api/projects/memberships/revoke-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        projectId: "proj_atomic_membership_revoke",
        memberId: "member_camera",
        role: "department_lead",
      }),
    });

    const failed = await worker.fetch(request(), env);
    expect(failed.status).toBe(503);
    expect(fakeAuth.projectMemberships.has("proj_atomic_membership_revoke:member_camera")).toBe(true);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const retried = await worker.fetch(request(), env);
    expect(retried.status).toBe(200);
    expect(fakeAuth.projectMemberships.has("proj_atomic_membership_revoke:member_camera")).toBe(false);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);
  });

	it("exports D1 project membership history for a selected project", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.projects.set("proj_echoes", {
	    id: "proj_echoes",
	    workspace_id: "workspace_acme",
	    title: "Echoes in the Static",
	    phase: "production",
	    owner_member_id: "member_owner",
	  });
	  fakeAuth.auditEvents.set("audit_membership_assigned", {
	    id: "audit_membership_assigned",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    actor_member_id: "member_producer",
	    action: "project_membership.assigned",
	    metadata_json: JSON.stringify({
	      memberId: "member_camera",
	      role: "department_lead",
	      department: "Camera",
	      persistence: "d1_project_membership",
	    }),
	    created_at: "2026-07-08T00:00:00.000Z",
	  });
	  fakeAuth.auditEvents.set("audit_membership_revoked", {
	    id: "audit_membership_revoked",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    actor_member_id: "member_producer",
	    action: "project_membership.revoked",
	    metadata_json: JSON.stringify({
	      memberId: "member_camera",
	      role: "department_lead",
	      department: "Camera",
	      persistence: "d1_project_membership",
	    }),
	    created_at: "2026-07-08T01:00:00.000Z",
	  });

	  const response = await worker.fetch(
	    new Request("https://worker.test/api/projects/memberships/history", {
	      method: "POST",
	      headers: {
	        "content-type": "application/json",
	        "x-film-csrf": csrfToken,
	        cookie,
	      },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        projectId: "proj_echoes",
	        limit: 20,
	      }),
	    }),
	    env,
	  );
	  const body = (await response.json()) as {
	    persistence: string;
	    auditPersistence: string;
	    historyPolicy: string;
	    rowCount: number;
	    entries: Array<{
	      id: string;
	      action: string;
	      memberId: string;
	      role: string;
	      department: string | null;
	    }>;
	  };

	  expect(response.status).toBe(200);
	  expect(body.persistence).toBe("d1_audit_events");
	  expect(body.auditPersistence).toBe("d1_audit_events");
	  expect(body.historyPolicy).toBe("project_membership_audit_history");
	  expect(body.rowCount).toBe(2);
	  expect(body.entries.map((entry) => entry.id)).toEqual(["audit_membership_revoked", "audit_membership_assigned"]);
	  expect(body.entries[0]).toMatchObject({
	    action: "project_membership.revoked",
	    memberId: "member_camera",
	    role: "department_lead",
	    department: "Camera",
	  });
	  expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "project_membership.history_manifest_created")).toBe(true);
	});

	it("blocks producer revocation of owner project memberships", async () => {
	  const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");

    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/memberships/revoke-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          memberId: "member_owner",
          role: "owner",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("insufficient_membership_revoke_role");
  });

  it("disables active workspace members and revokes their D1 sessions", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_crew",
      role: "contributor",
      status: "active",
    });
    fakeAuth.sessions.set("sess_crew", {
      id: "sess_crew",
      workspace_id: "workspace_acme",
      member_id: "member_crew",
      csrf_hash: "hash",
      user_agent_hash: null,
      ip_hash: null,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      revoked_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/members/status/dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          memberId: "member_crew",
          status: "disabled",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      sessionPolicy: string;
      member: { memberId: string; status: string; role: string };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_workspace_member_status");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.sessionPolicy).toBe("target_sessions_revoked");
    expect(body.member).toMatchObject({
      memberId: "member_crew",
      role: "contributor",
      status: "disabled",
    });
    expect(fakeAuth.workspaceMembers.get("member_crew")?.status).toBe("disabled");
    expect(fakeAuth.sessions.get("sess_crew")?.revoked_at).toEqual(expect.any(String));
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "workspace_member.status_updated")).toBe(true);
  });

  it("keeps member disable, session revocation, and audit evidence atomic", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.workspaceMembers.set("member_atomic_crew", {
      id: "member_atomic_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_atomic_crew",
      role: "contributor",
      status: "active",
    });
    fakeAuth.sessions.set("sess_atomic_crew", {
      id: "sess_atomic_crew",
      workspace_id: "workspace_acme",
      member_id: "member_atomic_crew",
      csrf_hash: "hash",
      user_agent_hash: null,
      ip_hash: null,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      revoked_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected member status batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = () => new Request("https://worker.test/api/members/status/dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        memberId: "member_atomic_crew",
        status: "disabled",
      }),
    });

    const failedResponse = await worker.fetch(request(), env);
    const failedBody = (await failedResponse.json()) as { error: string; persistence: string };

    expect(failedResponse.status).toBe(503);
    expect(failedBody).toEqual({
      error: "member_status_update_unavailable",
      persistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.workspaceMembers.get("member_atomic_crew")?.status).toBe("active");
    expect(fakeAuth.sessions.get("sess_atomic_crew")?.revoked_at).toBeNull();
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const retryResponse = await worker.fetch(request(), env);
    const retryBody = (await retryResponse.json()) as { auditPersistence: string; sessionPolicy: string };

    expect(retryResponse.status).toBe(200);
    expect(retryBody.auditPersistence).toBe("d1_audit_events");
    expect(retryBody.sessionPolicy).toBe("target_sessions_revoked");
    expect(fakeAuth.workspaceMembers.get("member_atomic_crew")?.status).toBe("disabled");
    expect(fakeAuth.sessions.get("sess_atomic_crew")?.revoked_at).toEqual(expect.any(String));
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);
  });

  it("blocks self-disable from member status management", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");

    const response = await worker.fetch(
      new Request("https://worker.test/api/members/status/dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          memberId: "member_producer",
          status: "disabled",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "self_disable_not_allowed",
      persistence: "d1_workspace_member_status",
    });
    expect(fakeAuth.workspaceMembers.get("member_producer")?.status).toBe("active");
  });

  it("reactivates disabled workspace members", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_crew",
      role: "reviewer",
      status: "disabled",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/members/status/dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          memberId: "member_crew",
          status: "active",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      sessionPolicy: string;
      member: { memberId: string; status: string; role: string };
    };

    expect(response.status).toBe(200);
    expect(body.sessionPolicy).toBe("no_session_revocation_required");
    expect(body.member).toMatchObject({
      memberId: "member_crew",
      role: "reviewer",
      status: "active",
    });
    expect(fakeAuth.workspaceMembers.get("member_crew")?.status).toBe("active");
  });

  it("assigns D1 record permissions for active members", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_crew",
      role: "contributor",
      status: "active",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/permissions/assign-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "project",
          entityId: "proj_echoes",
          memberId: "member_crew",
          permission: "write",
          department: "Camera",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      permission: {
        workspaceId: string;
        entityType: string;
        entityId: string;
        memberId: string;
        permission: string;
        department: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_permissions");
    expect(body.permission).toMatchObject({
      workspaceId: "workspace_acme",
      entityType: "project",
      entityId: "proj_echoes",
      memberId: "member_crew",
      permission: "write",
      department: "Camera",
    });
    expect(fakeAuth.recordPermissions.get("workspace_acme:project:proj_echoes:member_crew:write")).toMatchObject({
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_crew",
      permission: "write",
      department: "Camera",
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_permission.assigned")).toBe(true);
  });

  it("atomically assigns record permissions and preserves an existing grant ID", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.workspaceMembers.set("member_atomic_permission", {
      id: "member_atomic_permission",
      workspace_id: "workspace_acme",
      email_hash: "hash_atomic_permission",
      role: "contributor",
      status: "active",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected permission assignment failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const permissionKey = "workspace_acme:project:proj_atomic_permission:member_atomic_permission:write";
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = (department: string) => new Request("https://worker.test/api/records/permissions/assign-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_atomic_permission",
        memberId: "member_atomic_permission",
        permission: "write",
        department,
      }),
    });

    const failed = await worker.fetch(request("Camera"), env);
    expect(failed.status).toBe(503);
    expect(fakeAuth.recordPermissions.has(permissionKey)).toBe(false);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const created = await worker.fetch(request("Camera"), env);
    const createdBody = (await created.json()) as { permission: { id: string } };
    expect(created.status).toBe(200);
    expect(fakeAuth.recordPermissions.get(permissionKey)?.id).toBe(createdBody.permission.id);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);

    const updated = await worker.fetch(request("Lighting"), env);
    const updatedBody = (await updated.json()) as { permission: { id: string; department: string } };
    expect(updated.status).toBe(200);
    expect(updatedBody.permission.id).toBe(createdBody.permission.id);
    expect(updatedBody.permission.department).toBe("Lighting");
    expect(fakeAuth.recordPermissions.get(permissionKey)).toMatchObject({
      id: createdBody.permission.id,
      department: "Lighting",
    });
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 2);
  });

  it("transfers D1 core record owners for active members", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_crew",
      role: "contributor",
      status: "active",
    });
    fakeAuth.documents.set("doc_owner_transfer", {
      id: "doc_owner_transfer",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Ownership Notes.md",
      document_type: "markdown",
      sensitive: 0,
      owner_member_id: "member_producer",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/owners/transfer-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "document",
          entityId: "doc_owner_transfer",
          memberId: "member_crew",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      transferPolicy: string;
      owner: {
        workspaceId: string;
        entityType: string;
        entityId: string;
        ownerMemberId: string;
        previousOwnerMemberId: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_owner");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.transferPolicy).toBe("core_record_owner_update");
    expect(body.owner).toEqual({
      workspaceId: "workspace_acme",
      entityType: "document",
      entityId: "doc_owner_transfer",
      ownerMemberId: "member_crew",
      previousOwnerMemberId: "member_producer",
    });
    expect(fakeAuth.documents.get("doc_owner_transfer")?.owner_member_id).toBe("member_crew");
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_owner.transferred")).toBe(true);
  });

  it("keeps owner transfer and audit evidence atomic", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceMembers.set("member_atomic_owner", {
      id: "member_atomic_owner",
      workspace_id: "workspace_acme",
      email_hash: "hash_atomic_owner",
      role: "contributor",
      status: "active",
    });
    fakeAuth.documents.set("doc_atomic_owner", {
      id: "doc_atomic_owner",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Atomic owner",
      document_type: "markdown",
      sensitive: 0,
      owner_member_id: "member_producer",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected owner transfer failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = () => new Request("https://worker.test/api/records/owners/transfer-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_atomic_owner",
        memberId: "member_atomic_owner",
      }),
    });

    const failed = await worker.fetch(request(), env);
    expect(failed.status).toBe(503);
    expect(fakeAuth.documents.get("doc_atomic_owner")?.owner_member_id).toBe("member_producer");
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const retried = await worker.fetch(request(), env);
    expect(retried.status).toBe(200);
    expect(fakeAuth.documents.get("doc_atomic_owner")?.owner_member_id).toBe("member_atomic_owner");
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);
  });

  it("exports D1 core record owner manifests", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_owner_manifest", {
      id: "proj_owner_manifest",
      workspace_id: "workspace_acme",
      title: "Owner Manifest Project",
      phase: "production",
      owner_member_id: "member_producer",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/owners/manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "project",
          entityId: "proj_owner_manifest",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      manifestPolicy: string;
      owner: {
        workspaceId: string;
        entityType: string;
        entityId: string;
        ownerMemberId: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_owner");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.manifestPolicy).toBe("core_record_owner_metadata_only");
    expect(body.owner).toEqual({
      workspaceId: "workspace_acme",
      entityType: "project",
      entityId: "proj_owner_manifest",
      ownerMemberId: "member_producer",
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_owner.manifest_created")).toBe(true);
  });

  it("exports D1 core record owner transfer history", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.equipment.set("equipment_owner_history", {
      id: "equipment_owner_history",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      name: "Owner History Camera",
      equipment_type: "camera",
      status: "prepped",
      notes: null,
      owner_member_id: "member_producer",
    });
    fakeAuth.auditEvents.set("audit_owner_old", {
      id: "audit_owner_old",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_owner",
      action: "record_owner.transferred",
      metadata_json: JSON.stringify({
        entityType: "equipment",
        entityId: "equipment_owner_history",
        memberId: "member_camera",
        previousOwnerMemberId: "member_owner",
        persistence: "d1_record_owner",
      }),
      created_at: "2026-07-08T10:00:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_owner_new", {
      id: "audit_owner_new",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "record_owner.transferred",
      metadata_json: JSON.stringify({
        entityType: "equipment",
        entityId: "equipment_owner_history",
        memberId: "member_producer",
        previousOwnerMemberId: "member_camera",
        persistence: "d1_record_owner",
      }),
      created_at: "2026-07-08T11:00:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_owner_other", {
      id: "audit_owner_other",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_owner",
      action: "record_owner.transferred",
      metadata_json: JSON.stringify({
        entityType: "equipment",
        entityId: "equipment_other",
        memberId: "member_other",
      }),
      created_at: "2026-07-08T12:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/owners/history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "equipment",
          entityId: "equipment_owner_history",
          limit: 10,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      historyPolicy: string;
      rowCount: number;
      truncated: boolean;
      entries: Array<{
        id: string;
        actorMemberId: string | null;
        ownerMemberId: string;
        previousOwnerMemberId: string | null;
        createdAt: string;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_audit_events");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.historyPolicy).toBe("record_owner_transfer_audit_only");
    expect(body.rowCount).toBe(2);
    expect(body.truncated).toBe(false);
    expect(body.entries.map((entry) => entry.id)).toEqual(["audit_owner_new", "audit_owner_old"]);
    expect(body.entries[0]).toMatchObject({
      actorMemberId: "member_producer",
      ownerMemberId: "member_producer",
      previousOwnerMemberId: "member_camera",
      createdAt: "2026-07-08T11:00:00.000Z",
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_owner.history_manifest_created")).toBe(true);
  });

  it("rejects owner transfer to disabled members", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.workspaceMembers.set("member_disabled", {
      id: "member_disabled",
      workspace_id: "workspace_acme",
      email_hash: "hash_disabled",
      role: "contributor",
      status: "disabled",
    });
    fakeAuth.projects.set("proj_owner_transfer", {
      id: "proj_owner_transfer",
      workspace_id: "workspace_acme",
      title: "Transfer Project",
      phase: "production",
      owner_member_id: "member_owner",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/owners/transfer-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "project",
          entityId: "proj_owner_transfer",
          memberId: "member_disabled",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "member_not_active",
      persistence: "d1_record_owner",
    });
    expect(fakeAuth.projects.get("proj_owner_transfer")?.owner_member_id).toBe("member_owner");
  });

  it("rejects owner transfer for missing core records", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.workspaceMembers.set("member_crew", {
      id: "member_crew",
      workspace_id: "workspace_acme",
      email_hash: "hash_crew",
      role: "contributor",
      status: "active",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/owners/transfer-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_missing_owner",
          memberId: "member_crew",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: "record_not_found",
      persistence: "d1_record_owner",
    });
  });

  it("exports D1 record permission manifests for a scoped entity", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_echoes:member_camera:write", {
      id: "perm_camera",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_camera",
      permission: "write",
      department: "Camera",
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_echoes:member_sound:read", {
      id: "perm_sound",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_sound",
      permission: "read",
      department: "Sound",
      expires_at: "2099-08-01T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_echoes:member_art:write", {
      id: "perm_expired",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_art",
      permission: "write",
      department: "Art",
      expires_at: "2000-01-01T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.recordPermissions.set("workspace_acme:document:doc_echoes:member_camera:write", {
      id: "perm_doc",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_echoes",
      member_id: "member_camera",
      permission: "write",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/permissions/manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "project",
          entityId: "proj_echoes",
          limit: 10,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      manifestPolicy: string;
      rowCount: number;
      permissions: Array<{ id: string; entityType: string; entityId: string; memberId: string; permission: string; department: string | null; expiresAt: string | null }>;
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_permissions");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.manifestPolicy).toBe("active_record_permissions_only");
    expect(body.rowCount).toBe(2);
    expect(body.permissions).toEqual([
      {
        id: "perm_camera",
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
        memberId: "member_camera",
        permission: "write",
        department: "Camera",
        expiresAt: null,
      },
      {
        id: "perm_sound",
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
        memberId: "member_sound",
        permission: "read",
        department: "Sound",
        expiresAt: "2099-08-01T00:00:00.000Z",
      },
    ]);
    expect(body.permissions.some((permission) => permission.id === "perm_expired")).toBe(false);
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_permission.manifest_created")).toBe(true);
  });

  it("creates metadata-only comment intents with explicit comment permission", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("reviewer");
    fakeAuth.documents.set("doc_comment_target", {
      id: "doc_comment_target",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Comment Target",
      document_type: "markdown",
      sensitive: 0,
      owner_member_id: "member_owner",
    });
    fakeAuth.recordPermissions.set("workspace_acme:document:doc_comment_target:member_reviewer:comment", {
      id: "perm_comment",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_comment_target",
      member_id: "member_reviewer",
      permission: "comment",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/comments/dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "document",
          entityId: "doc_comment_target",
          body: "Please tighten the second act transition.",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      commentPolicy: string;
      comment: {
        entityType: string;
        entityId: string;
        authorMemberId: string | null;
        bodyPreview: string;
        bodySha256: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_comment_intents");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.commentPolicy).toBe("metadata_only_comment_intent");
    expect(body.comment).toMatchObject({
      entityType: "document",
      entityId: "doc_comment_target",
      authorMemberId: "member_reviewer",
      bodyPreview: "Please tighten the second act transition.",
    });
    expect(body.comment.bodySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fakeAuth.recordCommentIntents.size).toBe(1);
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_comment.intent_created")).toBe(true);
  });

  it("keeps comment intent persistence and audit evidence atomic", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("reviewer");
    fakeAuth.documents.set("doc_atomic_comment", {
      id: "doc_atomic_comment",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Atomic comment target",
      document_type: "markdown",
      sensitive: 0,
      owner_member_id: "member_owner",
    });
    fakeAuth.recordPermissions.set("workspace_acme:document:doc_atomic_comment:member_reviewer:comment", {
      id: "perm_atomic_comment",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_atomic_comment",
      member_id: "member_reviewer",
      permission: "comment",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected comment intent batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = () => new Request("https://worker.test/api/records/comments/dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_atomic_comment",
        body: "Keep this note and its audit evidence together.",
      }),
    });

    const failed = await worker.fetch(request(), env);
    const failedBody = (await failed.json()) as { error: string; persistence: string };
    expect(failed.status).toBe(503);
    expect(failedBody).toEqual({
      error: "record_comment_intent_unavailable",
      persistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.recordCommentIntents.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const retried = await worker.fetch(request(), env);
    expect(retried.status).toBe(200);
    expect(fakeAuth.recordCommentIntents.size).toBe(1);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);
  });

  it("exports metadata-only comment intent manifests with comment permission", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("reviewer");
    fakeAuth.documents.set("doc_comment_target", {
      id: "doc_comment_target",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Comment Target",
      document_type: "markdown",
      sensitive: 0,
      owner_member_id: "member_owner",
    });
    fakeAuth.recordPermissions.set("workspace_acme:document:doc_comment_target:member_reviewer:comment", {
      id: "perm_comment",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_comment_target",
      member_id: "member_reviewer",
      permission: "comment",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.recordCommentIntents.set("comment_old", {
      id: "comment_old",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_comment_target",
      author_member_id: "member_reviewer",
      body_preview: "Older bounded preview.",
      body_sha256: "a".repeat(64),
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.recordCommentIntents.set("comment_new", {
      id: "comment_new",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_comment_target",
      author_member_id: "member_reviewer",
      body_preview: "Newer bounded preview.",
      body_sha256: "b".repeat(64),
      created_at: "2026-07-08T01:00:00.000Z",
    });
    fakeAuth.recordCommentIntents.set("comment_other", {
      id: "comment_other",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      author_member_id: "member_reviewer",
      body_preview: "Different row.",
      body_sha256: "c".repeat(64),
      created_at: "2026-07-08T02:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/comments/manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "document",
          entityId: "doc_comment_target",
          limit: 20,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      manifestPolicy: string;
      rowCount: number;
      truncated: boolean;
      comments: Array<{
        id: string;
        entityType: string;
        entityId: string;
        authorMemberId: string | null;
        bodyPreview: string;
        bodySha256: string;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_comment_intents");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.manifestPolicy).toBe("metadata_only_comment_intent_manifest");
    expect(body.rowCount).toBe(2);
    expect(body.truncated).toBe(false);
    expect(body.comments.map((comment) => comment.id)).toEqual(["comment_new", "comment_old"]);
    expect(body.comments[0]).toMatchObject({
      entityType: "document",
      entityId: "doc_comment_target",
      authorMemberId: "member_reviewer",
      bodyPreview: "Newer bounded preview.",
      bodySha256: "b".repeat(64),
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_comment.manifest_created")).toBe(true);
  });

  it("preflights film profile mutation fields without destructive writes", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutation-preflight", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": "local-test-csrf-token",
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          fieldKeys: ["runtimeMinutes", "bad", "budgetCents", "runtimeMinutes"],
        }),
      }),
      {},
    );
    const body = (await response.json()) as {
      dryRun: boolean;
      destructiveWrite: boolean;
      persistence: string;
      auditPersistence: string;
      profileMutationPolicy: string;
      fieldKeys: string[];
      fieldDefinitions: Array<{ key: string; input: string }>;
      profile: {
        projectId: string;
        projectTitle: string;
        runtimeMinutes: number | null;
        format: string | null;
        shootStart: string | null;
        shootEnd: string | null;
        budgetCents: number;
        spentCents: number;
        expectedUpdatedAt: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.destructiveWrite).toBe(false);
    expect(body.persistence).toBe("dry_run_memoryless");
    expect(body.auditPersistence).toBe("dry_run_memoryless");
    expect(body.profileMutationPolicy).toBe("film_profile_stale_check_preflight");
    expect(body.fieldKeys).toEqual(["runtimeMinutes", "budgetCents"]);
    expect(body.fieldDefinitions.map((field) => field.key)).toEqual(["runtimeMinutes", "budgetCents"]);
    expect(body.profile).toMatchObject({
      projectId: "proj_echoes",
      projectTitle: "Echoes in the Static",
      runtimeMinutes: 90,
      format: "Color",
      shootStart: null,
      shootEnd: null,
      budgetCents: 12_000_000,
      spentCents: 8_241_000,
      expectedUpdatedAt: null,
    });
  });

  it("reviews, previews, and applies film profile mutations with stale checks", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_profile_mutation", {
      id: "proj_profile_mutation",
      workspace_id: "workspace_acme",
      title: "Profile Mutation",
      phase: "production",
    });
    fakeAuth.filmProfiles.set("proj_profile_mutation", {
      project_id: "proj_profile_mutation",
      runtime_minutes: 91,
      format: "Color",
      shoot_start: "2026-07-01",
      shoot_end: "2026-07-20",
      budget_cents: 2_000_000,
      spent_cents: 1_000_000,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const createResponse = await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutations/request-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_profile_mutation",
          summary: "Update profile metadata",
          fieldKeys: ["format", "budgetCents"],
        }),
      }),
      env,
    );
    const createBody = (await createResponse.json()) as {
      persistence: string;
      destructiveWrite: boolean;
      request: { id: string; status: string; fieldKeys: string[]; expectedUpdatedAt: string | null };
    };

    expect(createResponse.status).toBe(200);
    expect(createBody.persistence).toBe("d1_film_profile_mutation_requests");
    expect(createBody.destructiveWrite).toBe(false);
    expect(createBody.request.status).toBe("pending_owner_producer_review");
    expect(createBody.request.fieldKeys).toEqual(["format", "budgetCents"]);
    expect(createBody.request.expectedUpdatedAt).toBe("2026-07-08T00:00:00.000Z");

    const manifestResponse = await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutations/requests/manifest", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({ workspaceId: "workspace_acme", projectId: "proj_profile_mutation" }),
      }),
      env,
    );
    const manifestBody = (await manifestResponse.json()) as { requests: Array<{ id: string }> };
    expect(manifestResponse.status).toBe(200);
    expect(manifestBody.requests.map((request) => request.id)).toContain(createBody.request.id);

    const resolveResponse = await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutations/requests/resolve-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({ workspaceId: "workspace_acme", requestId: createBody.request.id, decision: "approve" }),
      }),
      env,
    );
    expect(resolveResponse.status).toBe(200);

    const updates = { format: "B&W", budgetCents: 2_500_000 };
    const diffResponse = await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutations/diff-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({ workspaceId: "workspace_acme", requestId: createBody.request.id, updates }),
      }),
      env,
    );
    const diffBody = (await diffResponse.json()) as {
      stale: boolean;
      destructiveWrite: boolean;
      fieldDiffs: Array<{ key: string; before: string | number | null; after: string | number | null; changed: boolean }>;
    };

    expect(diffResponse.status).toBe(200);
    expect(diffBody.destructiveWrite).toBe(false);
    expect(diffBody.stale).toBe(false);
    expect(diffBody.fieldDiffs).toEqual([
      { key: "format", before: "Color", after: "B&W", changed: true },
      { key: "budgetCents", before: 2_000_000, after: 2_500_000, changed: true },
    ]);

    const applyRequest = () => new Request("https://worker.test/api/projects/film-profile/mutations/apply", {
      method: "POST",
      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
      body: JSON.stringify({
          workspaceId: "workspace_acme",
          requestId: createBody.request.id,
          confirmation: `APPLY FILM PROFILE MUTATION ${createBody.request.id}`,
          updates,
      }),
    });
    const failedApplyResponse = await worker.fetch(applyRequest(), {
      ...env,
      DB: {
        ...env.DB,
        async batch() {
          throw new Error("D1 film profile mutation apply batch unavailable");
        },
      } as unknown as D1Database,
    });
    expect(failedApplyResponse.status).toBe(503);
    expect(await failedApplyResponse.json()).toMatchObject({
      error: "film_profile_mutation_application_unavailable",
      destructiveWrite: false,
      request: { status: "approved_pending_apply" },
    });
    expect(fakeAuth.filmProfiles.get("proj_profile_mutation")).toMatchObject({
      format: "Color",
      budget_cents: 2_000_000,
    });
    expect(fakeAuth.filmProfileMutationRequests.get(createBody.request.id)?.status).toBe("approved_pending_apply");
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "film_profile_mutation.applied")).toBe(false);

    const applyResponse = await worker.fetch(applyRequest(), env);
    const applyBody = (await applyResponse.json()) as {
      destructiveWrite: boolean;
      request: { status: string };
      application: { applied: boolean; fieldKeys: string[]; previousUpdatedAt: string | null; updatedAt: string | null };
    };

    expect(applyResponse.status).toBe(200);
    expect(applyBody.destructiveWrite).toBe(true);
    expect(applyBody.request.status).toBe("applied");
    expect(applyBody.application).toMatchObject({
      applied: true,
      fieldKeys: ["format", "budgetCents"],
      previousUpdatedAt: "2026-07-08T00:00:00.000Z",
    });
    expect(applyBody.application.updatedAt).not.toBeNull();
    expect(fakeAuth.filmProfiles.get("proj_profile_mutation")).toMatchObject({
      format: "B&W",
      budget_cents: 2_500_000,
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "film_profile_mutation.applied")).toBe(true);
  });

  it("keeps film profile mutation request creation and resolution atomic", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_atomic_profile_review", {
      id: "proj_atomic_profile_review",
      workspace_id: "workspace_acme",
      title: "Atomic Profile Review",
      phase: "production",
    });
    fakeAuth.filmProfiles.set("proj_atomic_profile_review", {
      project_id: "proj_atomic_profile_review",
      runtime_minutes: 90,
      format: "Color",
      shoot_start: null,
      shoot_end: null,
      budget_cents: 1_000_000,
      spent_cents: 500_000,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected profile review batch failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const createRequest = () => new Request("https://worker.test/api/projects/film-profile/mutations/request-dry-run", {
      method: "POST",
      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        projectId: "proj_atomic_profile_review",
        summary: "Update profile runtime after review.",
        fieldKeys: ["runtimeMinutes"],
      }),
    });

    const failedCreate = await worker.fetch(createRequest(), env);
    expect(failedCreate.status).toBe(503);
    expect(fakeAuth.filmProfileMutationRequests.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const created = await worker.fetch(createRequest(), env);
    const createdBody = (await created.json()) as { request: { id: string } };
    expect(created.status).toBe(200);
    expect(fakeAuth.filmProfileMutationRequests.get(createdBody.request.id)?.status).toBe("pending_owner_producer_review");
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);

    const resolveRequest = () => new Request("https://worker.test/api/projects/film-profile/mutations/requests/resolve-dry-run", {
      method: "POST",
      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        requestId: createdBody.request.id,
        decision: "approve",
      }),
    });
    failBatch = true;
    const failedResolve = await worker.fetch(resolveRequest(), env);
    expect(failedResolve.status).toBe(503);
    expect(fakeAuth.filmProfileMutationRequests.get(createdBody.request.id)?.status).toBe("pending_owner_producer_review");
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);

    failBatch = false;
    const resolved = await worker.fetch(resolveRequest(), env);
    expect(resolved.status).toBe(200);
    expect(fakeAuth.filmProfileMutationRequests.get(createdBody.request.id)?.status).toBe("approved_pending_apply");
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 2);
  });

  it("blocks stale film profile mutation applies", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.projects.set("proj_profile_stale", {
      id: "proj_profile_stale",
      workspace_id: "workspace_acme",
      title: "Profile Stale",
      phase: "production",
    });
    fakeAuth.filmProfiles.set("proj_profile_stale", {
      project_id: "proj_profile_stale",
      runtime_minutes: 80,
      format: "Color",
      shoot_start: null,
      shoot_end: null,
      budget_cents: 1_000_000,
      spent_cents: 500_000,
      created_at: "2026-07-08T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const createResponse = await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutations/request-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          projectId: "proj_profile_stale",
          summary: "Update stale profile",
          fieldKeys: ["runtimeMinutes"],
        }),
      }),
      env,
    );
    const createBody = (await createResponse.json()) as { request: { id: string } };
    await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutations/requests/resolve-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({ workspaceId: "workspace_acme", requestId: createBody.request.id, decision: "approve" }),
      }),
      env,
    );

    const profile = fakeAuth.filmProfiles.get("proj_profile_stale");
    if (profile) profile.updated_at = "2026-07-08T01:00:00.000Z";
    const applyResponse = await worker.fetch(
      new Request("https://worker.test/api/projects/film-profile/mutations/apply", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          requestId: createBody.request.id,
          confirmation: `APPLY FILM PROFILE MUTATION ${createBody.request.id}`,
          updates: { runtimeMinutes: 85 },
        }),
      }),
      env,
    );
    const applyBody = (await applyResponse.json()) as { error: string; request: { status: string } };

    expect(applyResponse.status).toBe(409);
    expect(applyBody.error).toBe("film_profile_mutation_stale");
    expect(applyBody.request.status).toBe("stale_record_blocked");
    expect(fakeAuth.filmProfiles.get("proj_profile_stale")?.runtime_minutes).toBe(80);
  });

  it("preflights core record update authorization with exact write permission", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("reviewer");
    fakeAuth.tasks.set("task_mutation_target", {
      id: "task_mutation_target",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Mutation Target",
      owner_member_id: "member_owner",
    });
    fakeAuth.recordPermissions.set("workspace_acme:task:task_mutation_target:member_reviewer:write", {
      id: "perm_write",
      workspace_id: "workspace_acme",
      entity_type: "task",
      entity_id: "task_mutation_target",
      member_id: "member_reviewer",
      permission: "write",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/mutations/preflight", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_mutation_target",
          mutation: "update",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      mutationPolicy: string;
      preflight: {
        entityType: string;
        entityId: string;
        mutation: string;
        allowedBy: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_mutation_authorization");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.mutationPolicy).toBe("core_record_mutation_authorization_preflight");
	  expect(body.preflight).toMatchObject({
	    entityType: "task",
	    entityId: "task_mutation_target",
	    mutation: "update",
	    allowedBy: "write_permission",
	  });
	  expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_mutation.preflight_checked")).toBe(true);
	});

	it("records metadata-only core record mutation requests and manifests them for review", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.tasks.set("task_mutation_request", {
	    id: "task_mutation_request",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    title: "Mutation Request",
	    owner_member_id: "member_owner",
	    updated_at: "2026-07-08T00:00:00.000Z",
	  });

	  const createResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/request-dry-run", {
	      method: "POST",
	      headers: {
	        "content-type": "application/json",
	        "x-film-csrf": csrfToken,
	        cookie,
	      },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_mutation_request",
	        mutation: "update",
	        summary: "Update status after producer review.",
	        fieldKeys: ["status", "title"],
	      }),
	    }),
	    env,
	  );
	  const createBody = (await createResponse.json()) as {
	    persistence: string;
	    auditPersistence: string;
	    requestPolicy: string;
	    destructiveWrite: boolean;
	    request: {
	      id: string;
	      entityType: string;
	      entityId: string;
	      mutation: string;
	      allowedBy: string;
	      summaryPreview: string;
	      summarySha256: string;
	      fieldKeys: string[];
	      expectedUpdatedAt: string | null;
	      destructiveWrite: boolean;
	    };
	  };

	  expect(createResponse.status).toBe(200);
	  expect(createBody.persistence).toBe("d1_record_mutation_requests");
	  expect(createBody.auditPersistence).toBe("d1_audit_events");
	  expect(createBody.requestPolicy).toBe("record_mutation_request_metadata_only");
	  expect(createBody.destructiveWrite).toBe(false);
	  expect(createBody.request).toMatchObject({
	    entityType: "task",
	    entityId: "task_mutation_request",
	    mutation: "update",
	    allowedBy: "owner_producer",
	    summaryPreview: "Update status after producer review.",
	    fieldKeys: ["status", "title"],
	    expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	    destructiveWrite: false,
	  });
	  expect(createBody.request.summarySha256).toMatch(/^[a-f0-9]{64}$/);
	  expect(fakeAuth.recordMutationRequests.get(createBody.request.id)).toMatchObject({
	    workspace_id: "workspace_acme",
	    entity_type: "task",
	    entity_id: "task_mutation_request",
	    status: "pending_owner_producer_review",
	    expected_updated_at: "2026-07-08T00:00:00.000Z",
	  });

	  const manifestResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/manifest", {
	      method: "POST",
	      headers: {
	        "content-type": "application/json",
	        "x-film-csrf": csrfToken,
	        cookie,
	      },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_mutation_request",
	        limit: 20,
	      }),
	    }),
	    env,
	  );
	  const manifestBody = (await manifestResponse.json()) as {
	    persistence: string;
	    auditPersistence: string;
	    manifestPolicy: string;
	    destructiveWrite: boolean;
	    rowCount: number;
	    requests: Array<{ id: string; mutation: string; status: string; fieldKeys: string[]; expectedUpdatedAt: string | null; destructiveWrite: boolean }>;
	  };

	  expect(manifestResponse.status).toBe(200);
	  expect(manifestBody.persistence).toBe("d1_record_mutation_requests");
	  expect(manifestBody.auditPersistence).toBe("d1_audit_events");
	  expect(manifestBody.manifestPolicy).toBe("record_mutation_request_manifest");
	  expect(manifestBody.destructiveWrite).toBe(false);
	  expect(manifestBody.rowCount).toBe(1);
	  expect(manifestBody.requests[0]).toMatchObject({
	    id: createBody.request.id,
	    mutation: "update",
	    status: "pending_owner_producer_review",
	    fieldKeys: ["status", "title"],
	    expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	    destructiveWrite: false,
	  });
	  expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_mutation.request_manifest_created")).toBe(true);
	});

	it("keeps core mutation request creation and resolution atomic", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.tasks.set("task_atomic_mutation_review", {
	    id: "task_atomic_mutation_review",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    title: "Atomic mutation review",
	    status: "todo",
	    owner_member_id: "member_owner",
	    updated_at: "2026-07-08T00:00:00.000Z",
	  });
	  const baseDb = env.DB;
	  let failBatch = true;
	  env.DB = {
	    prepare: baseDb.prepare.bind(baseDb),
	    async batch(statements: D1PreparedStatement[]) {
	      if (failBatch) throw new Error("injected mutation review batch failure");
	      return baseDb.batch(statements);
	    },
	  } as D1Database;
	  const auditCountBefore = fakeAuth.auditEvents.size;
	  const createRequest = () => new Request("https://worker.test/api/records/mutations/request-dry-run", {
	    method: "POST",
	    headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	    body: JSON.stringify({
	      workspaceId: "workspace_acme",
	      entityType: "task",
	      entityId: "task_atomic_mutation_review",
	      mutation: "update",
	      summary: "Move task to ready after review.",
	      fieldKeys: ["status"],
	    }),
	  });

	  const failedCreate = await worker.fetch(createRequest(), env);
	  expect(failedCreate.status).toBe(503);
	  expect(fakeAuth.recordMutationRequests.size).toBe(0);
	  expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

	  failBatch = false;
	  const created = await worker.fetch(createRequest(), env);
	  const createdBody = (await created.json()) as { request: { id: string } };
	  expect(created.status).toBe(200);
	  expect(fakeAuth.recordMutationRequests.get(createdBody.request.id)?.status).toBe("pending_owner_producer_review");
	  expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);

	  const resolveRequest = () => new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
	    method: "POST",
	    headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	    body: JSON.stringify({
	      workspaceId: "workspace_acme",
	      requestId: createdBody.request.id,
	      decision: "approve",
	      note: "Approved atomically.",
	    }),
	  });
	  failBatch = true;
	  const failedResolve = await worker.fetch(resolveRequest(), env);
	  expect(failedResolve.status).toBe(503);
	  expect(fakeAuth.recordMutationRequests.get(createdBody.request.id)?.status).toBe("pending_owner_producer_review");
	  expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);

	  failBatch = false;
	  const resolved = await worker.fetch(resolveRequest(), env);
	  expect(resolved.status).toBe(200);
	  expect(fakeAuth.recordMutationRequests.get(createdBody.request.id)?.status).toBe("approved_pending_apply");
	  expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 2);
	});

	it("rejects unsupported core record mutation field keys at request creation", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.tasks.set("task_mutation_bad_field", {
	    id: "task_mutation_bad_field",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    title: "Mutation Request",
	    owner_member_id: "member_owner",
	    updated_at: "2026-07-08T00:00:00.000Z",
	  });

	  const response = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/request-dry-run", {
	      method: "POST",
	      headers: {
	        "content-type": "application/json",
	        "x-film-csrf": csrfToken,
	        cookie,
	      },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_mutation_bad_field",
	        mutation: "update",
	        summary: "Request unsupported task mutation.",
	        fieldKeys: ["status", "amountCents"],
	      }),
	    }),
	    env,
	  );
	  const body = (await response.json()) as { error: string };

	  expect(response.status).toBe(400);
	  expect(body.error).toBe("record_mutation_unsupported_field_key");
	  expect(fakeAuth.recordMutationRequests.size).toBe(0);
		});

		it("applies expanded metadata fields through approved record mutations", async () => {
		  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
		  fakeAuth.documents.set("doc_mutation_metadata", {
		    id: "doc_mutation_metadata",
		    workspace_id: "workspace_acme",
		    project_id: "proj_echoes",
		    title: "Distribution deck",
		    document_type: "uploaded_file",
		    markdown_snapshot: null,
		    external_url: null,
		    sensitive: 0,
		    owner_member_id: "member_owner",
		    updated_at: "2026-07-08T00:00:00.000Z",
		  });

		  const createResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/request-dry-run", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        entityType: "document",
		        entityId: "doc_mutation_metadata",
		        mutation: "update",
		        summary: "Attach an external deck URL and mark it sensitive.",
		        fieldKeys: ["externalUrl", "sensitive"],
		      }),
		    }),
		    env,
		  );
		  const createBody = (await createResponse.json()) as { request: { id: string; fieldKeys: string[] } };
		  expect(createResponse.status).toBe(200);
		  expect(createBody.request.fieldKeys).toEqual(["externalUrl", "sensitive"]);

		  const resolveResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        decision: "approve",
		        note: "Producer approved document metadata.",
		      }),
		    }),
		    env,
		  );
		  expect(resolveResponse.status).toBe(200);

		  const updates = {
		    externalUrl: "https://docs.example.com/distribution-deck",
		    sensitive: true,
		  };
		  const diffResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/diff-dry-run", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        updates,
		      }),
		    }),
		    env,
		  );
		  const diffBody = (await diffResponse.json()) as {
		    fieldDiffs: Array<{ key: string; before: string | number | boolean | null; after: string | number | boolean | null; changed: boolean }>;
		  };
		  expect(diffResponse.status).toBe(200);
		  expect(diffBody.fieldDiffs).toEqual([
		    { key: "externalUrl", before: null, after: "https://docs.example.com/distribution-deck", changed: true },
		    { key: "sensitive", before: false, after: true, changed: true },
		  ]);

		  const applyResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/apply", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        confirmation: `APPLY MUTATION ${createBody.request.id}`,
		        updates,
		      }),
		    }),
		    env,
		  );
		  const applyBody = (await applyResponse.json()) as {
		    destructiveWrite: boolean;
		    application: {
		      fieldKeys: string[];
		      fieldDiffs: Array<{ key: string; before: string | number | boolean | null; after: string | number | boolean | null; changed: boolean }>;
		    };
		  };

		  expect(applyResponse.status).toBe(200);
		  expect(applyBody.destructiveWrite).toBe(true);
		  expect(applyBody.application.fieldKeys).toEqual(["externalUrl", "sensitive"]);
		  expect(applyBody.application.fieldDiffs).toEqual(diffBody.fieldDiffs);
		  expect(fakeAuth.documents.get("doc_mutation_metadata")).toMatchObject({
		    external_url: "https://docs.example.com/distribution-deck",
		    sensitive: 1,
		  });
		});

			it("rejects core record mutation project moves outside the workspace", async () => {
			  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
		  fakeAuth.tasks.set("task_mutation_project_move", {
		    id: "task_mutation_project_move",
		    workspace_id: "workspace_acme",
		    project_id: "proj_echoes",
		    title: "Needs project move",
		    status: "todo",
		    priority: "normal",
		    due_at: null,
		    assignee_member_id: null,
		    owner_member_id: "member_owner",
		    updated_at: "2026-07-08T00:00:00.000Z",
		  });
		  fakeAuth.projects.set("proj_other_workspace", {
		    id: "proj_other_workspace",
		    workspace_id: "workspace_other",
		    title: "Other Workspace",
		    phase: "development",
		    updated_at: "2026-07-08T00:00:00.000Z",
		  });

		  const createResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/request-dry-run", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        entityType: "task",
		        entityId: "task_mutation_project_move",
		        mutation: "update",
		        summary: "Move task to a different project.",
		        fieldKeys: ["projectId"],
		      }),
		    }),
		    env,
		  );
		  const createBody = (await createResponse.json()) as { request: { id: string } };
		  expect(createResponse.status).toBe(200);

		  const resolveResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        decision: "approve",
		        note: "Producer approved project reassignment.",
		      }),
		    }),
		    env,
		  );
		  expect(resolveResponse.status).toBe(200);

		  const applyResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/apply", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        confirmation: `APPLY MUTATION ${createBody.request.id}`,
		        updates: {
		          projectId: "proj_other_workspace",
		        },
		      }),
		    }),
		    env,
		  );
		  const applyBody = (await applyResponse.json()) as { error: string };

		  expect(applyResponse.status).toBe(422);
		  expect(applyBody.error).toBe("record_mutation_project_not_found");
		  expect(fakeAuth.tasks.get("task_mutation_project_move")?.project_id).toBe("proj_echoes");
		  expect(fakeAuth.recordMutationRequests.get(createBody.request.id)?.status).toBe("approved_pending_apply");
		});

		it("requires active project access before assigning a task through record mutation", async () => {
		  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
		  fakeAuth.projects.set("proj_echoes", {
		    id: "proj_echoes",
		    workspace_id: "workspace_acme",
		    title: "Echoes in the Static",
		    phase: "production",
		    updated_at: "2026-07-08T00:00:00.000Z",
		  });
		  fakeAuth.workspaceMembers.set("member_unassigned", {
		    id: "member_unassigned",
		    workspace_id: "workspace_acme",
		    email_hash: "hash_unassigned",
		    role: "contributor",
		    status: "active",
		  });
		  fakeAuth.tasks.set("task_mutation_assignee", {
		    id: "task_mutation_assignee",
		    workspace_id: "workspace_acme",
		    project_id: "proj_echoes",
		    title: "Needs assignee",
		    status: "todo",
		    priority: "normal",
		    due_at: null,
		    assignee_member_id: null,
		    owner_member_id: "member_owner",
		    updated_at: "2026-07-08T00:00:00.000Z",
		  });

		  const createResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/request-dry-run", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        entityType: "task",
		        entityId: "task_mutation_assignee",
		        mutation: "update",
		        summary: "Assign task to active crew.",
		        fieldKeys: ["assigneeMemberId"],
		      }),
		    }),
		    env,
		  );
		  const createBody = (await createResponse.json()) as { request: { id: string } };
		  expect(createResponse.status).toBe(200);

		  const resolveResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        decision: "approve",
		        note: "Producer approved task assignment.",
		      }),
		    }),
		    env,
		  );
		  expect(resolveResponse.status).toBe(200);

		  const blockedResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/apply", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        confirmation: `APPLY MUTATION ${createBody.request.id}`,
		        updates: {
		          assigneeMemberId: "member_unassigned",
		        },
		      }),
		    }),
		    env,
		  );
		  const blockedBody = (await blockedResponse.json()) as { error: string };

		  expect(blockedResponse.status).toBe(422);
		  expect(blockedBody.error).toBe("record_mutation_assignee_project_access_required");
		  expect(fakeAuth.tasks.get("task_mutation_assignee")?.assignee_member_id).toBeNull();

		  fakeAuth.projectMemberships.set("proj_echoes:member_unassigned", {
		    project_id: "proj_echoes",
		    member_id: "member_unassigned",
		    project_role: "contributor",
		    department: null,
		  });
		  const appliedResponse = await worker.fetch(
		    new Request("https://worker.test/api/records/mutations/apply", {
		      method: "POST",
		      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
		      body: JSON.stringify({
		        workspaceId: "workspace_acme",
		        requestId: createBody.request.id,
		        confirmation: `APPLY MUTATION ${createBody.request.id}`,
		        updates: {
		          assigneeMemberId: "member_unassigned",
		        },
		      }),
		    }),
		    env,
		  );
		  const appliedBody = (await appliedResponse.json()) as {
		    application: { fieldKeys: string[]; fieldDiffs: Array<{ key: string; before: string | null; after: string | null; changed: boolean }> };
		  };

		  expect(appliedResponse.status).toBe(200);
		  expect(appliedBody.application.fieldKeys).toEqual(["assigneeMemberId"]);
		  expect(appliedBody.application.fieldDiffs).toEqual([
		    { key: "assigneeMemberId", before: null, after: "member_unassigned", changed: true },
		  ]);
		  expect(fakeAuth.tasks.get("task_mutation_assignee")?.assignee_member_id).toBe("member_unassigned");
		});

		it("approves and applies stale-checked core record mutation updates", async () => {
		  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.tasks.set("task_mutation_apply", {
	    id: "task_mutation_apply",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    title: "Needs update",
	    status: "todo",
	    priority: "normal",
	    due_at: null,
	    owner_member_id: "member_owner",
	    updated_at: "2026-07-08T00:00:00.000Z",
	  });

	  const createResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/request-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_mutation_apply",
	        mutation: "update",
	        summary: "Update task status and title.",
	        fieldKeys: ["status", "title"],
	      }),
	    }),
	    env,
	  );
	  const createBody = (await createResponse.json()) as { request: { id: string } };
	  expect(createResponse.status).toBe(200);

	  const resolveResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        decision: "approve",
	        note: "Producer approved metadata update.",
	      }),
	    }),
	    env,
	  );
	  const resolveBody = (await resolveResponse.json()) as {
	    destructiveWrite: boolean;
	    resolutionPolicy: string;
	    request: { status: string; resolutionNoteSha256: string };
	  };

	  expect(resolveResponse.status).toBe(200);
	  expect(resolveBody.destructiveWrite).toBe(false);
	  expect(resolveBody.resolutionPolicy).toBe("record_mutation_owner_producer_resolution");
	  expect(resolveBody.request.status).toBe("approved_pending_apply");
	  expect(resolveBody.request.resolutionNoteSha256).toMatch(/^[a-f0-9]{64}$/);

	  const diffResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/diff-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        updates: {
	          status: "ready",
	          title: "Ready for producer review",
	        },
	      }),
	    }),
	    env,
	  );
	  const diffBody = (await diffResponse.json()) as {
	    destructiveWrite: boolean;
	    diffPolicy: string;
	    stale: boolean;
	    fieldDiffs: Array<{ key: string; before: string | number | boolean | null; after: string | number | boolean | null; changed: boolean }>;
	    rollbackGuidance: { strategy: string; requiresApproval: boolean; requiresFreshRecord: boolean; fieldKeys: string[] };
	  };

	  expect(diffResponse.status).toBe(200);
	  expect(diffBody.destructiveWrite).toBe(false);
	  expect(diffBody.diffPolicy).toBe("approved_record_mutation_diff_preview");
	  expect(diffBody.stale).toBe(false);
	  expect(diffBody.fieldDiffs).toEqual([
	    { key: "status", before: "todo", after: "ready", changed: true },
	    { key: "title", before: "Needs update", after: "Ready for producer review", changed: true },
	  ]);
	  expect(diffBody.rollbackGuidance).toMatchObject({
	    strategy: "apply_inverse_update_request",
	    requiresApproval: true,
	    requiresFreshRecord: true,
	    fieldKeys: ["status", "title"],
	  });

	  const applyRequest = () => new Request("https://worker.test/api/records/mutations/apply", {
	    method: "POST",
	    headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	    body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        confirmation: `APPLY MUTATION ${createBody.request.id}`,
	        updates: {
	          status: "ready",
	          title: "Ready for producer review",
	        },
	    }),
	  });
	  const failedApplyResponse = await worker.fetch(applyRequest(), {
	    ...env,
	    DB: {
	      ...env.DB,
	      async batch() {
	        throw new Error("D1 record mutation apply batch unavailable");
	      },
	    } as unknown as D1Database,
	  });
	  expect(failedApplyResponse.status).toBe(503);
	  expect(await failedApplyResponse.json()).toMatchObject({
	    error: "record_mutation_application_unavailable",
	    destructiveWrite: false,
	    request: { status: "approved_pending_apply" },
	  });
	  expect(fakeAuth.tasks.get("task_mutation_apply")).toMatchObject({ title: "Needs update", status: "todo" });
	  expect(fakeAuth.recordMutationRequests.get(createBody.request.id)?.status).toBe("approved_pending_apply");
	  expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_mutation.applied")).toBe(false);

	  const applyResponse = await worker.fetch(applyRequest(), env);
	  const applyBody = (await applyResponse.json()) as {
	    dryRun: boolean;
	    destructiveWrite: boolean;
	    applicationPolicy: string;
	    request: { status: string; destructiveWrite: boolean; appliedAt: string };
	    application: {
	      action: string;
	      applied: boolean;
	      idempotent: boolean;
	      fieldKeys: string[];
	      previousUpdatedAt: string;
	      fieldDiffs: Array<{ key: string; before: string | number | boolean | null; after: string | number | boolean | null; changed: boolean }>;
	      rollbackGuidance: { strategy: string; fieldKeys: string[] };
	    };
	  };

	  expect(applyResponse.status).toBe(200);
	  expect(applyBody.dryRun).toBe(false);
	  expect(applyBody.destructiveWrite).toBe(true);
	  expect(applyBody.applicationPolicy).toBe("approved_record_mutation_stale_checked");
	  expect(applyBody.request.status).toBe("applied");
	  expect(applyBody.request.destructiveWrite).toBe(true);
	  expect(applyBody.application).toMatchObject({
	    action: "update",
	    applied: true,
	    idempotent: false,
	    fieldKeys: ["status", "title"],
	    previousUpdatedAt: "2026-07-08T00:00:00.000Z",
	  });
	  expect(applyBody.application.fieldDiffs).toEqual([
	    { key: "status", before: "todo", after: "ready", changed: true },
	    { key: "title", before: "Needs update", after: "Ready for producer review", changed: true },
	  ]);
	  expect(applyBody.application.rollbackGuidance).toMatchObject({
	    strategy: "apply_inverse_update_request",
	    fieldKeys: ["status", "title"],
	  });
	  expect(fakeAuth.tasks.get("task_mutation_apply")).toMatchObject({
	    title: "Ready for producer review",
	    status: "ready",
	  });
	  expect(fakeAuth.tasks.get("task_mutation_apply")?.updated_at).not.toBe("2026-07-08T00:00:00.000Z");
	  expect(fakeAuth.recordMutationRequests.get(createBody.request.id)).toMatchObject({
	    status: "applied",
	    destructive_write: 1,
	  });

	  const auditManifestResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/audit-manifest", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        limit: 20,
	      }),
	    }),
	    env,
	  );
	  const auditManifestBody = (await auditManifestResponse.json()) as {
	    destructiveWrite: boolean;
	    manifestPolicy: string;
	    metadataPolicy: string;
	    rowCount: number;
	    request: { id: string; status: string; application: { fieldDiffs: unknown[] } };
	    rollbackGuidance: { strategy: string; fieldKeys: string[] };
	    events: Array<{ action: string; metadataKeys: string[] }>;
	  };

	  expect(auditManifestResponse.status).toBe(200);
	  expect(auditManifestBody.destructiveWrite).toBe(false);
	  expect(auditManifestBody.manifestPolicy).toBe("record_mutation_request_audit_manifest");
	  expect(auditManifestBody.metadataPolicy).toBe("keys_only");
	  expect(auditManifestBody.rowCount).toBe(4);
	  expect(auditManifestBody.request).toMatchObject({
	    id: createBody.request.id,
	    status: "applied",
	  });
	  expect(auditManifestBody.request.application.fieldDiffs).toHaveLength(2);
	  expect(auditManifestBody.rollbackGuidance).toMatchObject({
	    strategy: "apply_inverse_update_request",
	    fieldKeys: ["status", "title"],
	  });
	  expect(auditManifestBody.events.map((event) => event.action).sort()).toEqual([
	    "record_mutation.applied",
	    "record_mutation.diff_previewed",
	    "record_mutation.request_approved",
	    "record_mutation.request_created",
	  ]);
	  expect(auditManifestBody.events.every((event) => event.metadataKeys.includes("requestId"))).toBe(true);

	  const rollbackResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/rollback-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        summary: "Rollback producer task update.",
	      }),
	    }),
	    env,
	  );
	  const rollbackBody = (await rollbackResponse.json()) as {
	    destructiveWrite: boolean;
	    rollbackPolicy: string;
	    sourceRequest: { id: string; status: string };
	    request: { id: string; status: string; mutation: string; fieldKeys: string[]; expectedUpdatedAt: string | null };
	    suggestedUpdates: Record<string, string | number | boolean | null>;
	  };

	  expect(rollbackResponse.status).toBe(200);
	  expect(rollbackBody.destructiveWrite).toBe(false);
	  expect(rollbackBody.rollbackPolicy).toBe("applied_update_inverse_mutation_request");
	  expect(rollbackBody.sourceRequest).toMatchObject({
	    id: createBody.request.id,
	    status: "applied",
	  });
	  expect(rollbackBody.request).toMatchObject({
	    status: "pending_owner_producer_review",
	    mutation: "update",
	    fieldKeys: ["status", "title"],
	  });
	  expect(rollbackBody.request.expectedUpdatedAt).toBe(fakeAuth.tasks.get("task_mutation_apply")?.updated_at ?? null);
	  expect(rollbackBody.suggestedUpdates).toEqual({
	    status: "todo",
	    title: "Needs update",
	  });
	  expect(fakeAuth.recordMutationRequests.get(rollbackBody.request.id)).toMatchObject({
	    status: "pending_owner_producer_review",
	    summary_preview: "Rollback producer task update.",
	  });
	  expect(Array.from(fakeAuth.auditEvents.values()).map((event) => event.action)).toEqual([
	    "record_mutation.request_created",
	    "record_mutation.request_approved",
	    "record_mutation.diff_previewed",
	    "record_mutation.applied",
	    "record_mutation.audit_manifest_created",
	    "record_mutation.rollback_requested",
	  ]);
	});

	it("blocks stale core record mutation applies before writing", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.tasks.set("task_mutation_stale", {
	    id: "task_mutation_stale",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    title: "Stale target",
	    status: "todo",
	    owner_member_id: "member_owner",
	    updated_at: "2026-07-08T00:00:00.000Z",
	  });

	  const createResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/request-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_mutation_stale",
	        mutation: "update",
	        summary: "Update stale task.",
	        fieldKeys: ["status"],
	      }),
	    }),
	    env,
	  );
	  const createBody = (await createResponse.json()) as { request: { id: string } };
	  await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({ workspaceId: "workspace_acme", requestId: createBody.request.id, decision: "approve" }),
	    }),
	    env,
	  );
	  const staleTask = fakeAuth.tasks.get("task_mutation_stale");
	  if (staleTask) staleTask.updated_at = "2026-07-08T00:02:00.000Z";

	  const applyResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/apply", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        confirmation: `APPLY MUTATION ${createBody.request.id}`,
	        updates: { status: "ready" },
	      }),
	    }),
	    env,
	  );
	  const applyBody = (await applyResponse.json()) as {
	    error: string;
	    destructiveWrite: boolean;
	    request: { status: string };
	  };

	  expect(applyResponse.status).toBe(409);
	  expect(applyBody.error).toBe("record_mutation_stale");
	  expect(applyBody.destructiveWrite).toBe(false);
	  expect(applyBody.request.status).toBe("stale_record_blocked");
	  expect(fakeAuth.tasks.get("task_mutation_stale")?.status).toBe("todo");
	  expect(fakeAuth.recordMutationRequests.get(createBody.request.id)?.status).toBe("stale_record_blocked");
	});

	it("blocks core record mutation applies when the guarded D1 write changes zero rows", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.tasks.set("task_mutation_race", {
	    id: "task_mutation_race",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    title: "Race target",
	    status: "todo",
	    owner_member_id: "member_owner",
	    updated_at: "2026-07-08T00:00:00.000Z",
	  });

	  const createResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/request-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_mutation_race",
	        mutation: "update",
	        summary: "Update racing task.",
	        fieldKeys: ["status"],
	      }),
	    }),
	    env,
	  );
	  const createBody = (await createResponse.json()) as { request: { id: string } };
	  await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({ workspaceId: "workspace_acme", requestId: createBody.request.id, decision: "approve" }),
	    }),
	    env,
	  );

	  const originalPrepare = fakeAuth.db.prepare.bind(fakeAuth.db);
	  fakeAuth.db.prepare = ((sql: string) => {
	    const statement = originalPrepare(sql);
	    if (sql.includes("AS mutation_assertion") && sql.includes("FROM tasks")) {
	      return {
	        bind(...values: unknown[]) {
	          const bound = statement.bind(...values);
	          return {
	            async run() {
	              const row = fakeAuth.tasks.get("task_mutation_race");
	              if (row) row.updated_at = "2026-07-08T00:03:00.000Z";
	              await bound.run();
	              throw new Error("stale mutation assertion");
	            },
	          };
	        },
	      } as unknown as ReturnType<D1Database["prepare"]>;
	    }
	    return statement;
	  }) as D1Database["prepare"];

	  const applyResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/apply", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        confirmation: `APPLY MUTATION ${createBody.request.id}`,
	        updates: { status: "ready" },
	      }),
	    }),
	    env,
	  );
	  const applyBody = (await applyResponse.json()) as {
	    error: string;
	    destructiveWrite: boolean;
	    request: { status: string; application: { applied: boolean; previousUpdatedAt: string | null } };
	  };

	  expect(applyResponse.status).toBe(409);
	  expect(applyBody.error).toBe("record_mutation_stale");
	  expect(applyBody.destructiveWrite).toBe(false);
	  expect(applyBody.request.status).toBe("stale_record_blocked");
	  expect(applyBody.request.application).toMatchObject({
	    applied: false,
	    previousUpdatedAt: "2026-07-08T00:03:00.000Z",
	  });
	  expect(fakeAuth.tasks.get("task_mutation_race")?.status).toBe("todo");
	});

	it("applies approved core record delete mutations with explicit confirmation", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
	  fakeAuth.tasks.set("task_mutation_delete", {
	    id: "task_mutation_delete",
	    workspace_id: "workspace_acme",
	    project_id: "proj_echoes",
	    title: "Delete target",
	    status: "todo",
	    owner_member_id: "member_owner",
	    updated_at: "2026-07-08T00:00:00.000Z",
	  });

	  const createResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/request-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_mutation_delete",
	        mutation: "delete",
	        summary: "Delete duplicate task.",
	        fieldKeys: [],
	      }),
	    }),
	    env,
	  );
	  const createBody = (await createResponse.json()) as { request: { id: string } };
	  await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/resolve-dry-run", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({ workspaceId: "workspace_acme", requestId: createBody.request.id, decision: "approve" }),
	    }),
	    env,
	  );

	  const applyResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/apply", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	        confirmation: `APPLY MUTATION ${createBody.request.id}`,
	      }),
	    }),
	    env,
	  );
	  const applyBody = (await applyResponse.json()) as {
	    destructiveWrite: boolean;
	    application: { action: string; deletedAt: string | null };
	    request: { status: string };
	  };

	  expect(applyResponse.status).toBe(200);
	  expect(applyBody.destructiveWrite).toBe(true);
	  expect(applyBody.application.action).toBe("delete");
	  expect(applyBody.application.deletedAt).toEqual(expect.any(String));
	  expect(applyBody.request.status).toBe("applied");
	  expect(fakeAuth.tasks.has("task_mutation_delete")).toBe(false);

	  const recoveryResponse = await worker.fetch(
	    new Request("https://worker.test/api/records/mutations/requests/delete-recovery-plan", {
	      method: "POST",
	      headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
	      body: JSON.stringify({
	        workspaceId: "workspace_acme",
	        requestId: createBody.request.id,
	      }),
	    }),
	    env,
	  );
	  const recoveryBody = (await recoveryResponse.json()) as {
	    destructiveWrite: boolean;
	    recoveryPolicy: string;
	    sourceRequest: { id: string; mutation: string; status: string };
	    recoveryPlan: {
	      strategy: string;
	      entityType: string;
	      entityId: string;
	      requiresBackupRestore: boolean;
	      requiresNewRecordApproval: boolean;
	      blockers: string[];
	      suggestedSteps: string[];
	    };
	  };

	  expect(recoveryResponse.status).toBe(200);
	  expect(recoveryBody.destructiveWrite).toBe(false);
	  expect(recoveryBody.recoveryPolicy).toBe("deleted_record_backup_or_recreate_plan");
	  expect(recoveryBody.sourceRequest).toMatchObject({
	    id: createBody.request.id,
	    mutation: "delete",
	    status: "applied",
	  });
	  expect(recoveryBody.recoveryPlan).toMatchObject({
	    strategy: "restore_from_backup_or_recreate",
	    entityType: "task",
	    entityId: "task_mutation_delete",
	    requiresBackupRestore: true,
	    requiresNewRecordApproval: true,
	  });
	  expect(recoveryBody.recoveryPlan.blockers.join(" ")).toContain("do not store raw deleted row contents");
	});

	it("keeps core record delete preflight owner-producer only", async () => {
	  const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("reviewer");
    fakeAuth.tasks.set("task_mutation_target", {
      id: "task_mutation_target",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Mutation Target",
      owner_member_id: "member_reviewer",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/mutations/preflight", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_mutation_target",
          mutation: "delete",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "record_delete_operator_required",
      persistence: "d1_record_mutation_authorization",
    });
  });

  it("exports D1 record permission audit history", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.tasks.set("task_permission_history", {
      id: "task_permission_history",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Permission History",
      owner_member_id: "member_owner",
    });
    fakeAuth.auditEvents.set("audit_perm_assigned", {
      id: "audit_perm_assigned",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "record_permission.assigned",
      metadata_json: JSON.stringify({
        entityType: "task",
        entityId: "task_permission_history",
        memberId: "member_camera",
        permission: "write",
        department: "Camera",
        expiresAt: null,
        persistence: "d1_record_permissions",
      }),
      created_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.auditEvents.set("audit_perm_revoked", {
      id: "audit_perm_revoked",
      workspace_id: "workspace_acme",
      project_id: null,
      actor_member_id: "member_producer",
      action: "record_permission.revoked",
      metadata_json: JSON.stringify({
        entityType: "task",
        entityId: "task_permission_history",
        memberId: "member_camera",
        permission: "write",
        persistence: "d1_record_permissions",
      }),
      created_at: "2026-07-08T01:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/permissions/history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_permission_history",
          limit: 20,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      historyPolicy: string;
      rowCount: number;
      entries: Array<{
        id: string;
        action: string;
        memberId: string;
        permission: string;
        department: string | null;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_audit_events");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.historyPolicy).toBe("record_permission_audit_history");
    expect(body.rowCount).toBe(2);
    expect(body.entries.map((entry) => entry.id)).toEqual(["audit_perm_revoked", "audit_perm_assigned"]);
    expect(body.entries[1]).toMatchObject({
      action: "record_permission.assigned",
      memberId: "member_camera",
      permission: "write",
      department: "Camera",
    });
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_permission.history_manifest_created")).toBe(true);
  });

  it("rejects comment intents without owner or comment permission", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("reviewer");
    fakeAuth.tasks.set("task_comment_target", {
      id: "task_comment_target",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Comment Target",
      owner_member_id: "member_owner",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/comments/dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_comment_target",
          body: "Can review this when ready.",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "record_comment_permission_required",
      persistence: "d1_record_permissions",
    });
    expect(fakeAuth.recordCommentIntents.size).toBe(0);
  });

  it("fails record comment and mutation authorization closed when permission storage errors", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.tasks.set("task_permission_error", {
      id: "task_permission_error",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Permission Error Target",
      owner_member_id: "member_owner",
    });
    const baseDb = env.DB;
    const permissionUnavailableDb = {
      prepare(query: string) {
        if (query.includes("record_permissions")) {
          throw new Error("record permission storage unavailable");
        }
        return baseDb.prepare(query);
      },
    } as unknown as D1Database;
    const protectedEnv = { ...env, DB: permissionUnavailableDb, AUTH_MAGIC_LINK_MODE: "live" };
    const headers = {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
      cookie,
    };

    const commentResponse = await worker.fetch(
      new Request("https://worker.test/api/records/comments/dry-run", {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_permission_error",
          body: "This must not pass when permission storage fails.",
        }),
      }),
      protectedEnv,
    );
    const commentBody = (await commentResponse.json()) as { error: string; persistence: string };
    expect({ status: commentResponse.status, body: commentBody }).toEqual({
      status: 503,
      body: {
        error: "record_comment_authorization_unavailable",
        persistence: "d1_unavailable_dry_run",
      },
    });

    const mutationResponse = await worker.fetch(
      new Request("https://worker.test/api/records/mutations/preflight", {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_permission_error",
          mutation: "update",
        }),
      }),
      protectedEnv,
    );
    const mutationBody = (await mutationResponse.json()) as { error: string; persistence: string };
    expect(mutationResponse.status).toBe(503);
    expect(mutationBody).toEqual({
      error: "record_mutation_authorization_unavailable",
      persistence: "d1_unavailable_dry_run",
    });
    expect(fakeAuth.recordCommentIntents.size).toBe(0);
    expect(fakeAuth.recordMutationRequests.size).toBe(0);
  });

  it("exports expired D1 record permission manifests for cleanup", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_echoes:member_camera:write", {
      id: "perm_camera",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_camera",
      permission: "write",
      department: "Camera",
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_echoes:member_art:comment", {
      id: "perm_expired_art",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_art",
      permission: "comment",
      department: "Art",
      expires_at: "2000-01-01T00:00:00.000Z",
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/permissions/expired-manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          entityType: "project",
          entityId: "proj_echoes",
          limit: 10,
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      manifestPolicy: string;
      rowCount: number;
      permissions: Array<{ id: string; expiresAt: string | null }>;
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_permissions");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.manifestPolicy).toBe("expired_record_permissions_only");
    expect(body.rowCount).toBe(1);
    expect(body.permissions).toEqual([
      {
        id: "perm_expired_art",
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
        memberId: "member_art",
        permission: "comment",
        department: "Art",
        expiresAt: "2000-01-01T00:00:00.000Z",
      },
    ]);
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_permission.expired_manifest_created")).toBe(true);
  });

  it("revokes exact D1 record permission grants from a manifest row", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_echoes:member_camera:write", {
      id: "perm_camera",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_camera",
      permission: "write",
      department: "Camera",
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/permissions/revoke-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          permissionId: "perm_camera",
          entityType: "project",
          entityId: "proj_echoes",
          memberId: "member_camera",
          permission: "write",
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      revokePolicy: string;
      permission: { id: string; department: string | null };
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_record_permissions");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.revokePolicy).toBe("exact_permission_match_only");
    expect(body.permission).toMatchObject({
      id: "perm_camera",
      department: "Camera",
    });
    expect(fakeAuth.recordPermissions.has("workspace_acme:project:proj_echoes:member_camera:write")).toBe(false);
    expect(Array.from(fakeAuth.auditEvents.values()).some((event) => event.action === "record_permission.revoked")).toBe(true);
  });

  it("keeps record permission revocation and audit evidence atomic", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const permissionKey = "workspace_acme:project:proj_atomic_permission_revoke:member_camera:write";
    fakeAuth.recordPermissions.set(permissionKey, {
      id: "perm_atomic_revoke",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_atomic_permission_revoke",
      member_id: "member_camera",
      permission: "write",
      department: "Camera",
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    const baseDb = env.DB;
    let failBatch = true;
    env.DB = {
      prepare: baseDb.prepare.bind(baseDb),
      async batch(statements: D1PreparedStatement[]) {
        if (failBatch) throw new Error("injected permission revoke failure");
        return baseDb.batch(statements);
      },
    } as D1Database;
    const auditCountBefore = fakeAuth.auditEvents.size;
    const request = () => new Request("https://worker.test/api/records/permissions/revoke-dry-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({
        workspaceId: "workspace_acme",
        permissionId: "perm_atomic_revoke",
        entityType: "project",
        entityId: "proj_atomic_permission_revoke",
        memberId: "member_camera",
        permission: "write",
      }),
    });

    const failed = await worker.fetch(request(), env);
    expect(failed.status).toBe(503);
    expect(fakeAuth.recordPermissions.has(permissionKey)).toBe(true);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore);

    failBatch = false;
    const retried = await worker.fetch(request(), env);
    expect(retried.status).toBe(200);
    expect(fakeAuth.recordPermissions.has(permissionKey)).toBe(false);
    expect(fakeAuth.auditEvents.size).toBe(auditCountBefore + 1);
  });

  it("rejects stale record permission revokes that do not match the current grant", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_echoes:member_camera:write", {
      id: "perm_camera",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_echoes",
      member_id: "member_camera",
      permission: "write",
      department: "Camera",
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/records/permissions/revoke-dry-run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          workspaceId: "workspace_acme",
          permissionId: "perm_camera",
          entityType: "project",
          entityId: "proj_echoes",
          memberId: "member_camera",
          permission: "admin",
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: "record_permission_not_found",
      persistence: "d1_record_permissions",
    });
    expect(fakeAuth.recordPermissions.has("workspace_acme:project:proj_echoes:member_camera:write")).toBe(true);
  });

  it("requires csrf for dry-run logout", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/logout", { method: "POST" }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("fails live logout closed when D1 revocation is unavailable", async () => {
    const rateLimitSessions = createSessionKV();
    const missingResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: "film_session=sess_live_missing_storage",
          "x-film-csrf": "csrf_live_missing_storage",
        },
      }),
      { AUTH_MAGIC_LINK_MODE: "live", SESSIONS: rateLimitSessions.kv },
    );
    const unavailableDb = {
      prepare: () => {
        throw new Error("D1 unavailable");
      },
    } as unknown as D1Database;
    const unavailableResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: "film_session=sess_live_unavailable_storage",
          "x-film-csrf": "csrf_live_unavailable_storage",
        },
      }),
      { AUTH_MAGIC_LINK_MODE: "live", DB: unavailableDb, SESSIONS: rateLimitSessions.kv },
    );

    for (const response of [missingResponse, unavailableResponse]) {
      const body = (await response.json()) as { error: string; persistence: string };
      expect(response.status).toBe(503);
      expect(body).toEqual({
        error: "auth_storage_unavailable",
        persistence: "d1_kv_auth_records",
      });
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  it("completes D1 logout when post-revocation KV cache deletion fails", async () => {
    const { env, cookie, csrfToken, fakeAuth, fakeSessions, sessionId } = await createAuthorizedTestSession("producer");
    const baseKv = fakeSessions.kv;
    const cacheDeleteUnavailable = {
      get: baseKv.get.bind(baseKv),
      put: baseKv.put.bind(baseKv),
      async delete() {
        throw new Error("session cache delete unavailable");
      },
    } as unknown as KVNamespace;

    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/logout", {
        method: "POST",
        headers: {
          cookie,
          "x-film-csrf": csrfToken,
        },
      }),
      { ...env, SESSIONS: cacheDeleteUnavailable, AUTH_MAGIC_LINK_MODE: "live" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(fakeAuth.sessions.get(sessionId)?.revoked_at).toEqual(expect.any(String));
    expect(fakeSessions.values.has(sessionId)).toBe(true);

    const sessionResponse = await worker.fetch(
      new Request("https://worker.test/api/auth/session", { headers: { cookie } }),
      { ...env, SESSIONS: cacheDeleteUnavailable, AUTH_MAGIC_LINK_MODE: "live" },
    );
    expect(sessionResponse.status).toBe(401);
  });

  it("expires the dry-run auth cookie on logout", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/auth/logout", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
      }),
      {},
    );
    const body = (await response.json()) as { ok: boolean; dryRun: boolean; session: null };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.session).toBeNull();
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("requires csrf for operation sync dry runs", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        body: JSON.stringify({ operations: [] }),
      }),
      {},
    );

    expect(response.status).toBe(403);
  });

  it("accepts a valid queued operation batch in dry-run mode", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          operations: [
            {
              id: "op_12345678",
              workspaceId: "workspace_acme",
              kind: "task.created",
              entityType: "task",
              entityId: "task_1",
              summary: "Task created",
              payload: {},
              createdAt: "2026-07-07T00:00:00.000Z",
              status: "queued",
            },
          ],
        }),
      }),
      {},
    );
    const body = (await response.json()) as { dryRun: boolean; persistence: string; auditPersistence: string; accepted: string[] };

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.persistence).toBe("dry_run_memoryless");
    expect(body.auditPersistence).toBe("dry_run_memoryless");
    expect(body.accepted).toEqual(["op_12345678"]);
  });

  it("rejects operation sync batches outside the session workspace", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession("producer");
    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          operations: [
            {
              ...testOperation({
                id: "op_workspace_mismatch",
                entityId: "task_workspace_mismatch",
              }),
              workspaceId: "workspace_other",
            },
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as { error: string; persistence: string };

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "workspace_mismatch",
      persistence: "d1_kv_auth_records",
    });
  });

  it("does not acknowledge queued operations when D1 replay fails", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession();
    const baseDb = env.DB;
    const replayUnavailableDb = {
      prepare(query: string) {
        if (query.includes("operation_log")) {
          throw new Error("operation replay unavailable");
        }
        return baseDb.prepare(query);
      },
    } as unknown as D1Database;
    const operation = testOperation({
      id: "op_replay_unavailable",
      entityId: "task_replay_unavailable",
      payload: { title: "Keep this operation queued" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      { ...env, DB: replayUnavailableDb },
    );
    const body = (await response.json()) as {
      error: string;
      persistence: string;
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      error: "operation_replay_unavailable",
      persistence: "d1_unavailable_dry_run",
      accepted: [],
      rejected: [{ id: operation.id, reason: "operation_replay_unavailable" }],
    });
    expect(fakeAuth.operationLogs.size).toBe(0);
    expect(fakeAuth.tasks.has(operation.entityId)).toBe(false);
  });

  it("replays valid operations into D1 idempotently", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession();
    const operation = testOperation({
      id: "op_replay_1",
      entityId: "task_replay_1",
      payload: { title: "Book locations" },
    });
    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      persistence: string;
      auditPersistence: string;
      accepted: string[];
      replayed: string[];
      idempotent: string[];
    };

    expect(response.status).toBe(200);
    expect(body.persistence).toBe("d1_operation_log");
    expect(body.auditPersistence).toBe("d1_audit_events");
    expect(body.accepted).toEqual(["op_replay_1"]);
    expect(body.replayed).toEqual(["op_replay_1"]);
    expect(body.idempotent).toEqual([]);
    expect(fakeAuth.operationLogs.size).toBe(1);
    expect([...fakeAuth.auditEvents.values()]).toEqual([
      expect.objectContaining({
        workspace_id: "workspace_acme",
        actor_member_id: "member_owner",
        action: "operation.sync_replay_checked",
      }),
    ]);

    const repeatResponse = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const repeatBody = (await repeatResponse.json()) as {
      auditPersistence: string;
      accepted: string[];
      replayed: string[];
      idempotent: string[];
    };

    expect(repeatResponse.status).toBe(200);
    expect(repeatBody.auditPersistence).toBe("d1_audit_events");
    expect(repeatBody.accepted).toEqual(["op_replay_1"]);
    expect(repeatBody.replayed).toEqual([]);
    expect(repeatBody.idempotent).toEqual(["op_replay_1"]);
    expect(fakeAuth.operationLogs.size).toBe(1);
    expect([...fakeAuth.auditEvents.values()].map((event) => event.action)).toEqual([
      "operation.sync_replay_checked",
      "operation.sync_replay_checked",
    ]);
  });

  it("applies replayed create operations to D1 canonical tables", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession();
    const projectId = "proj_canonical";
    const operations = [
      testOperation({
        id: "op_canonical_project",
        kind: "project.created",
        entityType: "project",
        entityId: projectId,
        summary: "Project created: Canonical Film",
        payload: { title: "Canonical Film", projectType: "Documentary", template: "film" },
      }),
      testOperation({
        id: "op_canonical_task",
        entityId: "task_canonical",
        summary: "Task created: Canonical task",
        payload: { projectId, title: "Canonical task", dueAt: "2026-07-30" },
      }),
      testOperation({
        id: "op_canonical_doc",
        kind: "document.created",
        entityType: "document",
        entityId: "doc_canonical",
        summary: "Document created: Canonical.md",
        payload: { projectId, name: "Canonical.md", type: "MD" },
      }),
      testOperation({
        id: "op_canonical_person",
        kind: "person.created",
        entityType: "person",
        entityId: "person_canonical",
        summary: "Person created: Jordan Pace",
        payload: { projectId, name: "Jordan Pace", role: "Gaffer", initials: "JP", sensitive: true },
      }),
      testOperation({
        id: "op_canonical_equipment",
        kind: "equipment.created",
        entityType: "equipment",
        entityId: "equipment_canonical",
        summary: "Equipment created: LED wall",
        payload: { projectId, name: "LED wall", status: "Reserved", statusTone: "gray" },
      }),
      testOperation({
        id: "op_canonical_expense",
        kind: "expense.created",
        entityType: "expense",
        entityId: "expense_canonical",
        summary: "Expense created: Set build",
        payload: { projectId, category: "Set build", spent: 1200, budget: 5000, percent: 24, sensitive: true },
      }),
    ];

    const syncRequest = () => new Request("https://worker.test/api/operations/dry-run-sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
        cookie,
      },
      body: JSON.stringify({ operations }),
    });
    const failedResponse = await worker.fetch(syncRequest(), {
      ...env,
      DB: {
        ...env.DB,
        async batch() {
          throw new Error("D1 operation replay batch unavailable");
        },
      } as unknown as D1Database,
    });
    expect(failedResponse.status).toBe(503);
    expect(await failedResponse.json()).toMatchObject({
      error: "operation_replay_unavailable",
      accepted: [],
      replayed: [],
      canonicalApplied: [],
    });
    expect(fakeAuth.projects.has(projectId)).toBe(false);
    expect(fakeAuth.tasks.has("task_canonical")).toBe(false);
    expect(fakeAuth.documents.has("doc_canonical")).toBe(false);
    expect(fakeAuth.people.has("person_canonical")).toBe(false);
    expect(fakeAuth.equipment.has("equipment_canonical")).toBe(false);
    expect(fakeAuth.expenses.has("expense_canonical")).toBe(false);
    expect(fakeAuth.operationLogs.size).toBe(0);
    expect(fakeAuth.auditEvents.size).toBe(0);

    const response = await worker.fetch(syncRequest(), env);
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      metadataOnly: string[];
    };

    expect(response.status).toBe(200);
    expect(body.accepted).toEqual([
      "op_canonical_project",
      "op_canonical_task",
      "op_canonical_doc",
      "op_canonical_person",
      "op_canonical_equipment",
      "op_canonical_expense",
    ]);
    expect(body.canonicalApplied).toEqual([
      "op_canonical_project",
      "op_canonical_task",
      "op_canonical_doc",
      "op_canonical_person",
      "op_canonical_equipment",
      "op_canonical_expense",
    ]);
    expect(body.metadataOnly).toEqual([]);
    expect(fakeAuth.workspaces.get("workspace_acme")?.name).toBe("Acme Films");
    expect(fakeAuth.projects.get(projectId)).toMatchObject({
      title: "Canonical Film",
      project_type: "Documentary",
      phase: "development",
      owner_member_id: "member_owner",
    });
    expect(fakeAuth.tasks.get("task_canonical")).toMatchObject({
      project_id: projectId,
      title: "Canonical task",
      due_at: "2026-07-30",
      owner_member_id: "member_owner",
    });
    expect(fakeAuth.documents.get("doc_canonical")).toMatchObject({
      project_id: projectId,
      title: "Canonical.md",
      document_type: "markdown",
      owner_member_id: "member_owner",
    });
    expect(fakeAuth.people.get("person_canonical")).toMatchObject({
      workspace_id: "workspace_acme",
      display_name: "Jordan Pace",
      role_tags: "[\"Gaffer\"]",
      notes: "Initials: JP",
      sensitive: 1,
      owner_member_id: "member_owner",
    });
    expect(fakeAuth.projectPeople.get(`${projectId}:person_canonical`)).toMatchObject({
      project_id: projectId,
      person_id: "person_canonical",
      project_role: "Gaffer",
    });
    expect(fakeAuth.equipment.get("equipment_canonical")).toMatchObject({
      project_id: projectId,
      name: "LED wall",
      equipment_type: "gray",
      status: "Reserved",
      owner_member_id: "member_owner",
    });
    expect(fakeAuth.expenses.get("expense_canonical")).toMatchObject({
      project_id: projectId,
      category: "Set build",
      amount_cents: 120000,
      comment: "{\"budget\":5000,\"percent\":24}",
      owner_member_id: "member_owner",
    });
  });

  it("rejects cross-workspace canonical replay relationships and target IDs", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.projects.set("proj_other_workspace", {
      id: "proj_other_workspace",
      workspace_id: "workspace_other",
      title: "Private project",
      phase: "production",
    });
    fakeAuth.tasks.set("task_other_workspace", {
      id: "task_other_workspace",
      workspace_id: "workspace_other",
      project_id: "proj_other_workspace",
      title: "Private task",
    });
    const operations = [
      testOperation({
        id: "op_cross_workspace_project",
        entityId: "task_new_workspace_acme",
        payload: { projectId: "proj_other_workspace", title: "Invalid project relation" },
      }),
      testOperation({
        id: "op_cross_workspace_target",
        entityId: "task_other_workspace",
        payload: { title: "Conflicting target" },
      }),
    ];

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
      replayed: string[];
    };

    expect(response.status).toBe(422);
    expect(body.accepted).toEqual([]);
    expect(body.replayed).toEqual([]);
    expect(body.rejected).toEqual([
      { id: "op_cross_workspace_project", reason: "project_scope_mismatch" },
      { id: "op_cross_workspace_target", reason: "entity_conflict" },
    ]);
    expect(fakeAuth.tasks.get("task_other_workspace")?.title).toBe("Private task");
    expect(fakeAuth.tasks.has("task_new_workspace_acme")).toBe(false);
    expect(fakeAuth.operationLogs.size).toBe(0);
  });

  it("rejects D1 operation replay conflicts", async () => {
    const { env, cookie, csrfToken } = await createAuthorizedTestSession();
    const headers = {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
      cookie,
    };
    const operation = testOperation({
      id: "op_replay_conflict",
      entityId: "task_replay_conflict",
      payload: { title: "Original task" },
    });
    const firstResponse = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers,
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    expect(firstResponse.status).toBe(200);

    const idConflictResponse = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [
            {
              ...operation,
              payload: { title: "Changed task" },
            },
          ],
        }),
      }),
      env,
    );
    const idConflictBody = (await idConflictResponse.json()) as {
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(idConflictResponse.status).toBe(422);
    expect(idConflictBody.rejected).toEqual([{ id: "op_replay_conflict", reason: "operation_conflict" }]);

    const entityConflictResponse = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [
            testOperation({
              id: "op_replay_entity_conflict",
              entityId: "task_replay_conflict",
              payload: { title: "Second create" },
            }),
          ],
        }),
      }),
      env,
    );
    const entityConflictBody = (await entityConflictResponse.json()) as {
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(entityConflictResponse.status).toBe(422);
    expect(entityConflictBody.rejected).toEqual([{ id: "op_replay_entity_conflict", reason: "entity_conflict" }]);
  });

  it("replays repeated document update metadata without entity conflicts", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    const operations = [
      testOperation({
        id: "op_doc_update_1",
        kind: "document.updated",
        entityType: "document",
        entityId: "doc_script",
        summary: "Document updated: Script.md",
        payload: { projectId: "proj_echoes", name: "Script.md", markdownLength: 128 },
      }),
      testOperation({
        id: "op_doc_update_2",
        kind: "document.updated",
        entityType: "document",
        entityId: "doc_script",
        summary: "Document updated: Script.md",
        payload: { projectId: "proj_echoes", name: "Script.md", markdownLength: 256 },
      }),
    ];

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
      replayed: string[];
      canonicalApplied: string[];
      metadataOnly: string[];
    };

    expect(response.status).toBe(200);
    expect(body.accepted).toEqual(["op_doc_update_1", "op_doc_update_2"]);
    expect(body.rejected).toEqual([]);
    expect(body.replayed).toEqual(["op_doc_update_1", "op_doc_update_2"]);
    expect(body.canonicalApplied).toEqual([]);
    expect(body.metadataOnly).toEqual(["op_doc_update_1", "op_doc_update_2"]);
    expect(fakeAuth.operationLogs.size).toBe(2);
  });

  it("atomically applies replayed task status updates to canonical tasks", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.tasks.set("task_status_local", {
      id: "task_status_local",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Local status task",
      status: "pending",
      owner_member_id: "member_producer",
      assignee_member_id: null,
      due_at: null,
      updated_at: "2026-07-07T00:00:00.000Z",
    });
    const operation = testOperation({
      id: "op_task_status_update",
      kind: "task.updated",
      entityId: "task_status_local",
      summary: "Task status updated: Local status task",
      payload: { projectId: "proj_echoes", title: "Local status task", status: "ready", previousStatus: "pending" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      metadataOnly: string[];
    };

    expect(response.status).toBe(200);
    expect(body.accepted).toEqual(["op_task_status_update"]);
    expect(body.canonicalApplied).toEqual(["op_task_status_update"]);
    expect(body.metadataOnly).toEqual([]);
    expect(fakeAuth.tasks.get("task_status_local")?.status).toBe("ready");
    expect(fakeAuth.operationLogs.get("op_task_status_update")?.kind).toBe("task.updated");
  });

  it("rejects stale replayed task status updates before canonical writes", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.tasks.set("task_status_stale", {
      id: "task_status_stale",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Already updated task",
      status: "ready",
      owner_member_id: "member_producer",
      assignee_member_id: null,
      due_at: null,
      updated_at: "2026-07-07T00:00:00.000Z",
    });
    const operation = testOperation({
      id: "op_task_status_stale",
      kind: "task.updated",
      entityId: "task_status_stale",
      payload: {
        projectId: "proj_echoes",
        title: "Already updated task",
        previousStatus: "pending",
        newStatus: "overdue",
      },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: { "content-type": "application/json", "x-film-csrf": csrfToken, cookie },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as { rejected: Array<{ id: string; reason: string }> };

    expect(response.status).toBe(422);
    expect(body.rejected).toEqual([{ id: "op_task_status_stale", reason: "stale_task_status" }]);
    expect(fakeAuth.tasks.get("task_status_stale")?.status).toBe("ready");
    expect(fakeAuth.operationLogs.has("op_task_status_stale")).toBe(false);
  });

  it("atomically applies replayed task completions to canonical tasks", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("producer");
    fakeAuth.tasks.set("task_complete_local", {
      id: "task_complete_local",
      workspace_id: "workspace_acme",
      project_id: "proj_echoes",
      title: "Local complete task",
      status: "ready",
      owner_member_id: "member_producer",
      assignee_member_id: null,
      due_at: null,
      updated_at: "2026-07-07T00:00:00.000Z",
    });
    const operation = testOperation({
      id: "op_task_completed",
      kind: "task.completed",
      entityId: "task_complete_local",
      summary: "Task completed: Local complete task",
      payload: { projectId: "proj_echoes", title: "Local complete task", previousStatus: "ready" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      metadataOnly: string[];
    };

    expect(response.status).toBe(200);
    expect(body.accepted).toEqual(["op_task_completed"]);
    expect(body.canonicalApplied).toEqual(["op_task_completed"]);
    expect(body.metadataOnly).toEqual([]);
    expect(fakeAuth.tasks.get("task_complete_local")?.status).toBe("completed");
    expect(fakeAuth.operationLogs.get("op_task_completed")?.kind).toBe("task.completed");
  });

  it("enforces per-operation replay roles", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    const taskOperation = testOperation({
      id: "op_contributor_task",
      entityId: "task_contributor",
      payload: { title: "Contributor task" },
    });
    const backupOperation = testOperation({
      id: "op_contributor_backup",
      kind: "backup.exported",
      entityType: "backup",
      entityId: "backup_contributor",
      summary: "Backup exported",
      payload: { encrypted: true },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [taskOperation, backupOperation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      replayed: string[];
      rejected: Array<{ id: string; reason: string }>;
      authorizationPolicy: string;
    };

    expect(response.status).toBe(422);
    expect(body.authorizationPolicy).toBe("operation_kind_role");
    expect(body.accepted).toEqual(["op_contributor_task"]);
    expect(body.replayed).toEqual(["op_contributor_task"]);
    expect(body.rejected).toEqual([{ id: "op_contributor_backup", reason: "insufficient_operation_role" }]);
    expect(fakeAuth.operationLogs.has("op_contributor_task")).toBe(true);
    expect(fakeAuth.operationLogs.has("op_contributor_backup")).toBe(false);
  });

  it("allows contributor canonical creates within an existing project scope", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_scoped", {
      id: "proj_scoped",
      workspace_id: "workspace_acme",
      title: "Scoped Project",
      phase: "production",
    });
    fakeAuth.projectMemberships.set("proj_scoped:member_contributor", {
      project_id: "proj_scoped",
      member_id: "member_contributor",
      project_role: "contributor",
      department: "production",
    });
    const operation = testOperation({
      id: "op_contributor_scoped_task",
      entityId: "task_contributor_scoped",
      payload: { projectId: "proj_scoped", title: "Scoped contributor task" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual(["op_contributor_scoped_task"]);
    expect(body.canonicalApplied).toEqual(["op_contributor_scoped_task"]);
    expect(fakeAuth.operationLogs.has("op_contributor_scoped_task")).toBe(true);
    expect(fakeAuth.operationLogs.get("op_contributor_scoped_task")?.actor_member_id).toBe("member_contributor");
    expect(fakeAuth.tasks.get("task_contributor_scoped")).toMatchObject({
      project_id: "proj_scoped",
      title: "Scoped contributor task",
    });
  });

  it("allows contributor canonical creates with explicit project record permission", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_record_permission", {
      id: "proj_record_permission",
      workspace_id: "workspace_acme",
      title: "Record Permission Project",
      phase: "production",
    });
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_record_permission:member_contributor:write", {
      id: "record_permission_test",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_record_permission",
      member_id: "member_contributor",
      permission: "write",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    const operation = testOperation({
      id: "op_contributor_record_permission_task",
      entityId: "task_record_permission",
      payload: { projectId: "proj_record_permission", title: "Record permission task" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual(["op_contributor_record_permission_task"]);
    expect(body.canonicalApplied).toEqual(["op_contributor_record_permission_task"]);
    expect(fakeAuth.tasks.get("task_record_permission")).toMatchObject({
      project_id: "proj_record_permission",
      title: "Record permission task",
    });
  });

  it("allows contributor canonical creates within an owned project scope", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_owned", {
      id: "proj_owned",
      workspace_id: "workspace_acme",
      title: "Owned Project",
      phase: "production",
      owner_member_id: "member_contributor",
    });
    const operation = testOperation({
      id: "op_contributor_project_owner_task",
      entityId: "task_project_owner",
      payload: { projectId: "proj_owned", title: "Owner scoped task" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual(["op_contributor_project_owner_task"]);
    expect(body.canonicalApplied).toEqual(["op_contributor_project_owner_task"]);
    expect(fakeAuth.tasks.get("task_project_owner")).toMatchObject({
      project_id: "proj_owned",
      title: "Owner scoped task",
      owner_member_id: "member_contributor",
    });
  });

  it("allows contributor canonical creates with explicit task and document record permissions", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_direct_record_permission", {
      id: "proj_direct_record_permission",
      workspace_id: "workspace_acme",
      title: "Direct Record Permission Project",
      phase: "production",
    });
    fakeAuth.recordPermissions.set("workspace_acme:task:task_direct_record_permission:member_contributor:write", {
      id: "record_permission_task_test",
      workspace_id: "workspace_acme",
      entity_type: "task",
      entity_id: "task_direct_record_permission",
      member_id: "member_contributor",
      permission: "write",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    fakeAuth.recordPermissions.set("workspace_acme:document:doc_direct_record_permission:member_contributor:write", {
      id: "record_permission_doc_create_test",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_direct_record_permission",
      member_id: "member_contributor",
      permission: "write",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    const taskOperation = testOperation({
      id: "op_contributor_task_direct_permission",
      entityId: "task_direct_record_permission",
      payload: { projectId: "proj_direct_record_permission", title: "Direct permission task" },
    });
    const documentOperation = testOperation({
      id: "op_contributor_doc_direct_permission",
      kind: "document.created",
      entityType: "document",
      entityId: "doc_direct_record_permission",
      summary: "Document created: Direct Permission Notes.md",
      payload: { projectId: "proj_direct_record_permission", name: "Direct Permission Notes.md", type: "MD" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [taskOperation, documentOperation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual(["op_contributor_task_direct_permission", "op_contributor_doc_direct_permission"]);
    expect(body.canonicalApplied).toEqual(["op_contributor_task_direct_permission", "op_contributor_doc_direct_permission"]);
    expect(fakeAuth.tasks.get("task_direct_record_permission")).toMatchObject({
      project_id: "proj_direct_record_permission",
      title: "Direct permission task",
    });
    expect(fakeAuth.documents.get("doc_direct_record_permission")).toMatchObject({
      project_id: "proj_direct_record_permission",
      title: "Direct Permission Notes.md",
      document_type: "markdown",
    });
  });

  it("allows contributor document update metadata with explicit document record permission", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_doc_permission", {
      id: "proj_doc_permission",
      workspace_id: "workspace_acme",
      title: "Document Permission",
      phase: "production",
    });
    fakeAuth.recordPermissions.set("workspace_acme:document:doc_permission_update:member_contributor:write", {
      id: "record_permission_document_test",
      workspace_id: "workspace_acme",
      entity_type: "document",
      entity_id: "doc_permission_update",
      member_id: "member_contributor",
      permission: "write",
      department: null,
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    const operation = testOperation({
      id: "op_contributor_doc_update_permission",
      kind: "document.updated",
      entityType: "document",
      entityId: "doc_permission_update",
      summary: "Document updated: Notes.md",
      payload: { projectId: "proj_doc_permission", name: "Notes.md", markdownLength: 80 },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      metadataOnly: string[];
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual(["op_contributor_doc_update_permission"]);
    expect(body.canonicalApplied).toEqual([]);
    expect(body.metadataOnly).toEqual(["op_contributor_doc_update_permission"]);
    expect(fakeAuth.operationLogs.get("op_contributor_doc_update_permission")?.actor_member_id).toBe("member_contributor");
  });

  it("allows contributor document update metadata on an owned document", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_doc_owned", {
      id: "proj_doc_owned",
      workspace_id: "workspace_acme",
      title: "Document Owner Project",
      phase: "production",
      owner_member_id: "member_owner",
    });
    fakeAuth.documents.set("doc_owned", {
      id: "doc_owned",
      workspace_id: "workspace_acme",
      project_id: "proj_doc_owned",
      title: "Owned.md",
      document_type: "markdown",
      sensitive: 0,
      owner_member_id: "member_contributor",
    });
    const operation = testOperation({
      id: "op_contributor_doc_update_owner",
      kind: "document.updated",
      entityType: "document",
      entityId: "doc_owned",
      summary: "Document updated: Owned.md",
      payload: { projectId: "proj_doc_owned", name: "Owned.md", markdownLength: 120 },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      metadataOnly: string[];
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual(["op_contributor_doc_update_owner"]);
    expect(body.canonicalApplied).toEqual([]);
    expect(body.metadataOnly).toEqual(["op_contributor_doc_update_owner"]);
    expect(fakeAuth.operationLogs.get("op_contributor_doc_update_owner")?.actor_member_id).toBe("member_contributor");
  });

  it("requires scoped contributors to have project membership or record permission for document update metadata", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_doc_scope", {
      id: "proj_doc_scope",
      workspace_id: "workspace_acme",
      title: "Document Scope",
      phase: "production",
    });
    const operation = testOperation({
      id: "op_contributor_doc_update_denied",
      kind: "document.updated",
      entityType: "document",
      entityId: "doc_scope_denied",
      summary: "Document updated: Notes.md",
      payload: { projectId: "proj_doc_scope", name: "Notes.md", markdownLength: 80 },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(response.status).toBe(422);
    expect(body.accepted).toEqual([]);
    expect(body.rejected).toEqual([
      { id: "op_contributor_doc_update_denied", reason: "project_membership_required" },
    ]);
    expect(fakeAuth.operationLogs.size).toBe(0);
  });

  it("allows department lead canonical creates within a matching department scope", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("department_lead");
    fakeAuth.projects.set("proj_camera", {
      id: "proj_camera",
      workspace_id: "workspace_acme",
      title: "Camera Project",
      phase: "production",
    });
    fakeAuth.projectMemberships.set("proj_camera:member_department_lead", {
      project_id: "proj_camera",
      member_id: "member_department_lead",
      project_role: "department_lead",
      department: "camera",
    });
    const operation = testOperation({
      id: "op_department_scoped_task",
      entityId: "task_department_scoped",
      payload: { projectId: "proj_camera", title: "Lens prep", department: "Camera" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(200);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual(["op_department_scoped_task"]);
    expect(body.canonicalApplied).toEqual(["op_department_scoped_task"]);
    expect(fakeAuth.tasks.get("task_department_scoped")).toMatchObject({
      project_id: "proj_camera",
      title: "Lens prep",
    });
  });

  it("enforces department scope on explicit project record permissions", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("department_lead");
    fakeAuth.projects.set("proj_permission_camera", {
      id: "proj_permission_camera",
      workspace_id: "workspace_acme",
      title: "Permission Camera Project",
      phase: "production",
    });
    fakeAuth.recordPermissions.set("workspace_acme:project:proj_permission_camera:member_department_lead:write", {
      id: "record_permission_department",
      workspace_id: "workspace_acme",
      entity_type: "project",
      entity_id: "proj_permission_camera",
      member_id: "member_department_lead",
      permission: "write",
      department: "camera",
      expires_at: null,
      updated_at: "2026-07-08T00:00:00.000Z",
    });
    const acceptedOperation = testOperation({
      id: "op_record_permission_department_ok",
      entityId: "task_record_permission_department_ok",
      payload: { projectId: "proj_permission_camera", title: "Camera prep", department: "Camera" },
    });
    const rejectedOperation = testOperation({
      id: "op_record_permission_department_mismatch",
      entityId: "task_record_permission_department_mismatch",
      payload: { projectId: "proj_permission_camera", title: "Art prep", department: "Art" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [acceptedOperation, rejectedOperation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(response.status).toBe(422);
    expect(body.accepted).toEqual(["op_record_permission_department_ok"]);
    expect(body.canonicalApplied).toEqual(["op_record_permission_department_ok"]);
    expect(body.rejected).toEqual([
      { id: "op_record_permission_department_mismatch", reason: "department_scope_mismatch" },
    ]);
    expect(fakeAuth.tasks.get("task_record_permission_department_ok")).toMatchObject({
      project_id: "proj_permission_camera",
      title: "Camera prep",
    });
  });

  it("rejects department lead canonical creates outside department scope", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("department_lead");
    fakeAuth.projects.set("proj_camera", {
      id: "proj_camera",
      workspace_id: "workspace_acme",
      title: "Camera Project",
      phase: "production",
    });
    fakeAuth.projectMemberships.set("proj_camera:member_department_lead", {
      project_id: "proj_camera",
      member_id: "member_department_lead",
      project_role: "department_lead",
      department: "camera",
    });
    const operations = [
      testOperation({
        id: "op_department_missing",
        entityId: "task_department_missing",
        payload: { projectId: "proj_camera", title: "Missing department" },
      }),
      testOperation({
        id: "op_department_mismatch",
        entityId: "task_department_mismatch",
        payload: { projectId: "proj_camera", title: "Art task", department: "Art" },
      }),
    ];

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(422);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual([]);
    expect(body.rejected).toEqual([
      { id: "op_department_missing", reason: "department_scope_required" },
      { id: "op_department_mismatch", reason: "department_scope_mismatch" },
    ]);
    expect(fakeAuth.operationLogs.size).toBe(0);
    expect(fakeAuth.tasks.size).toBe(0);
  });

  it("rejects sensitive canonical records from scoped non-operator members", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_sensitive", {
      id: "proj_sensitive",
      workspace_id: "workspace_acme",
      title: "Sensitive Project",
      phase: "production",
    });
    fakeAuth.projectMemberships.set("proj_sensitive:member_contributor", {
      project_id: "proj_sensitive",
      member_id: "member_contributor",
      project_role: "contributor",
      department: null,
    });
    const operation = testOperation({
      id: "op_sensitive_contributor_doc",
      kind: "document.created",
      entityType: "document",
      entityId: "doc_sensitive_contributor",
      summary: "Document created: Private release.md",
      payload: { projectId: "proj_sensitive", name: "Private release.md", type: "markdown", sensitive: true },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(response.status).toBe(422);
    expect(body.accepted).toEqual([]);
    expect(body.rejected).toEqual([
      { id: "op_sensitive_contributor_doc", reason: "sensitive_record_requires_operator" },
    ]);
    expect(fakeAuth.documents.size).toBe(0);
  });

  it("applies sensitive canonical documents for operator roles", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("owner");
    fakeAuth.projects.set("proj_sensitive", {
      id: "proj_sensitive",
      workspace_id: "workspace_acme",
      title: "Sensitive Project",
      phase: "production",
    });
    const operation = testOperation({
      id: "op_sensitive_owner_doc",
      kind: "document.created",
      entityType: "document",
      entityId: "doc_sensitive_owner",
      summary: "Document created: Private release.md",
      payload: { projectId: "proj_sensitive", name: "Private release.md", type: "markdown", sensitive: true },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      canonicalApplied: string[];
    };

    expect(response.status).toBe(200);
    expect(body.accepted).toEqual(["op_sensitive_owner_doc"]);
    expect(body.canonicalApplied).toEqual(["op_sensitive_owner_doc"]);
    expect(fakeAuth.documents.get("doc_sensitive_owner")).toMatchObject({
      project_id: "proj_sensitive",
      title: "Private release.md",
      document_type: "markdown",
      sensitive: 1,
    });
  });

  it("rejects contributor canonical creates without project membership", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    fakeAuth.projects.set("proj_unassigned", {
      id: "proj_unassigned",
      workspace_id: "workspace_acme",
      title: "Unassigned Project",
      phase: "production",
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({
          operations: [
            testOperation({
              id: "op_contributor_unassigned_task",
              entityId: "task_contributor_unassigned",
              payload: { projectId: "proj_unassigned", title: "Unassigned contributor task" },
            }),
          ],
        }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(422);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual([]);
    expect(body.rejected).toEqual([
      { id: "op_contributor_unassigned_task", reason: "project_membership_required" },
    ]);
    expect(fakeAuth.operationLogs.size).toBe(0);
    expect(fakeAuth.tasks.size).toBe(0);
  });

  it("rejects contributor canonical creates outside a known project scope", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("contributor");
    const operations = [
      testOperation({
        id: "op_contributor_unscoped_task",
        entityId: "task_contributor_unscoped",
        payload: { projectId: "proj_missing", title: "Unscoped contributor task" },
      }),
      testOperation({
        id: "op_contributor_unscoped_doc",
        kind: "document.created",
        entityType: "document",
        entityId: "doc_contributor_unscoped",
        summary: "Document created: Unscoped.md",
        payload: { projectId: "proj_missing", name: "Unscoped.md", type: "markdown" },
      }),
    ];

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
      recordAuthorizationPolicy: string;
    };

    expect(response.status).toBe(422);
    expect(body.recordAuthorizationPolicy).toBe("canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available");
    expect(body.accepted).toEqual([]);
    expect(body.rejected).toEqual([
      { id: "op_contributor_unscoped_task", reason: "project_scope_not_found" },
      { id: "op_contributor_unscoped_doc", reason: "project_scope_not_found" },
    ]);
    expect(fakeAuth.operationLogs.size).toBe(0);
    expect(fakeAuth.tasks.size).toBe(0);
    expect(fakeAuth.documents.size).toBe(0);
  });

  it("rejects reviewer operation replay metadata", async () => {
    const { env, cookie, csrfToken, fakeAuth } = await createAuthorizedTestSession("reviewer");
    const operation = testOperation({
      id: "op_reviewer_task",
      entityId: "task_reviewer",
      payload: { title: "Reviewer task" },
    });

    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": csrfToken,
          cookie,
        },
        body: JSON.stringify({ operations: [operation] }),
      }),
      env,
    );
    const body = (await response.json()) as {
      accepted: string[];
      rejected: Array<{ id: string; reason: string }>;
    };

    expect(response.status).toBe(422);
    expect(body.accepted).toEqual([]);
    expect(body.rejected).toEqual([{ id: "op_reviewer_task", reason: "insufficient_operation_role" }]);
    expect(fakeAuth.operationLogs.size).toBe(0);
  });

  it("rejects invalid operation kind and entity pairs", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/operations/dry-run-sync", {
        method: "POST",
        headers: { "x-film-csrf": "local-test-csrf-token" },
        body: JSON.stringify({
          operations: [
            {
              id: "op_87654321",
              workspaceId: "workspace_acme",
              kind: "task.created",
              entityType: "project",
              entityId: "proj_1",
              summary: "Task created",
              payload: {},
              createdAt: "2026-07-07T00:00:00.000Z",
              status: "queued",
            },
          ],
        }),
      }),
      {},
    );
    const body = (await response.json()) as { rejected: Array<{ id: string; reason: string }> };

    expect(response.status).toBe(422);
    expect(body.rejected).toEqual([{ id: "op_87654321", reason: "invalid_kind_entity" }]);
  });
});

async function createAuthorizedTestSession(role = "owner"): Promise<{
  env: { DB: D1Database; SESSIONS: KVNamespace };
  fakeAuth: ReturnType<typeof createAuthD1>;
  fakeSessions: ReturnType<typeof createSessionKV>;
  sessionId: string;
  csrfToken: string;
  cookie: string;
}> {
  const fakeAuth = createAuthD1();
  const fakeSessions = createSessionKV();
  const env = { DB: fakeAuth.db, SESSIONS: fakeSessions.kv };

  const requestResponse = await worker.fetch(
    new Request("https://worker.test/api/auth/magic-link/request", {
      method: "POST",
      body: JSON.stringify({ email: "alonso@example.com" }),
    }),
    env,
  );
  const requestBody = (await requestResponse.json()) as { devOnlyToken: string };
  const verifyResponse = await worker.fetch(
    new Request("https://worker.test/api/auth/magic-link/verify", {
      method: "POST",
      headers: { "user-agent": "vitest" },
      body: JSON.stringify({ token: requestBody.devOnlyToken }),
    }),
    env,
  );
  const verifyBody = (await verifyResponse.json()) as {
    session: { id: string; csrfToken: string };
  };
  fakeSessions.values.set(
    verifyBody.session.id,
    JSON.stringify({
      id: verifyBody.session.id,
      role,
      csrfHash: "redacted",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    }),
  );
  const memberId = `member_${role}`;
  fakeAuth.workspaceMembers.set(memberId, {
    id: memberId,
    workspace_id: "workspace_acme",
    email_hash: `hash_${role}`,
    role,
    status: "active",
  });
  const sessionRow = fakeAuth.sessions.get(verifyBody.session.id);
  if (sessionRow) {
    sessionRow.workspace_id = "workspace_acme";
    sessionRow.member_id = memberId;
  }

  return {
    env,
    fakeAuth,
    fakeSessions,
    sessionId: verifyBody.session.id,
    csrfToken: verifyBody.session.csrfToken,
    cookie: `film_session=${verifyBody.session.id}`,
  };
}

function testOperation(options: {
  id: string;
  entityId: string;
  kind?: string;
  entityType?: string;
  summary?: string;
  payload?: Record<string, unknown>;
}) {
  return {
    id: options.id,
    workspaceId: "workspace_acme",
    kind: options.kind ?? "task.created",
    entityType: options.entityType ?? "task",
    entityId: options.entityId,
    summary: options.summary ?? "Task created",
    payload: options.payload ?? {},
    createdAt: "2026-07-07T00:00:00.000Z",
    status: "queued",
  };
}

type FakeMagicLinkRow = {
  id: string;
  workspace_id: string | null;
  email_hash: string;
  token_hash: string;
  consumed_at: string | null;
  expires_at: string;
  created_at: string;
};

type FakeSessionRow = {
  id: string;
  workspace_id: string | null;
  member_id: string | null;
  csrf_hash: string;
  user_agent_hash: string | null;
  ip_hash: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

type FakeWorkspaceInviteRow = {
  id: string;
  workspace_id: string;
  email_hash: string;
  invited_role: string;
  invited_by_member_id: string | null;
  token_hash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

type FakeInviteDeliveryAttemptRow = {
  id: string;
  workspace_id: string;
  invite_id: string;
  actor_member_id: string | null;
  provider: string;
  channel: string;
  target_hash: string;
  template_key: string;
  delivery_mode: string;
  status: string;
  provider_message_id: string | null;
  error_code: string | null;
  created_at: string;
  last_event_status?: string | null;
  last_event_at?: string | null;
};

type FakeInviteDeliveryWebhookEventRow = {
  id: string;
  svix_id: string;
  provider: string;
  event_type: string;
  provider_message_id: string | null;
  delivery_attempt_id: string | null;
  workspace_id: string | null;
  invite_id: string | null;
  delivery_status: string;
  received_at: string;
  event_created_at: string | null;
  metadata_keys_json: string;
};

type FakeInviteDeliverySuppressionRow = {
  id: string;
  provider: string;
  target_hash: string;
  suppression_reason: string;
  workspace_id: string | null;
  invite_id: string | null;
  delivery_attempt_id: string | null;
  provider_message_id: string | null;
  source_webhook_event_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

type FakeWorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  email_hash: string;
  role: string;
  status: string;
  display_name?: string | null;
  last_seen_at?: string | null;
};

type FakeOperationLogRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  kind: string;
  entity_type: string;
  entity_id: string;
  payload_json: string;
  status: "queued" | "applied" | "rejected";
  created_at: string;
  applied_at: string | null;
};

type FakeWorkspaceRow = {
  id: string;
  name: string;
  archived_project_count?: number;
  backup_policy?: string | null;
  next_backup?: string | null;
};

type FakeProjectRow = {
  id: string;
  workspace_id: string;
  title: string;
  project_type?: string;
  status?: string;
  phase: string;
  logline?: string | null;
  owner_member_id?: string | null;
  updated_at?: string | null;
};

type FakeFilmProfileRow = {
  project_id: string;
  runtime_minutes: number | null;
  format: string | null;
  shoot_start: string | null;
  shoot_end: string | null;
  budget_cents: number;
  spent_cents: number;
  created_at: string;
  updated_at: string;
};

type FakeTaskRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  status?: string;
  priority?: string;
  due_at?: string | null;
  assignee_member_id?: string | null;
  owner_member_id?: string | null;
  updated_at?: string | null;
};

type FakeDocumentRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  document_type: string;
  markdown_snapshot?: string | null;
  external_url?: string | null;
  sensitive: number;
  owner_member_id?: string | null;
  updated_at?: string | null;
};

type FakePersonRow = {
  id: string;
  workspace_id: string;
  display_name: string;
  role_tags: string;
  notes: string | null;
  sensitive: number;
  owner_member_id?: string | null;
  updated_at?: string | null;
};

type FakeProjectPersonRow = {
  project_id: string;
  person_id: string;
  project_role: string | null;
};

type FakeEquipmentRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  name: string;
  equipment_type: string | null;
  status: string;
  notes: string | null;
  owner_member_id?: string | null;
  updated_at?: string | null;
};

type FakeExpenseRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  category: string;
  amount_cents: number;
  purchased_at?: string | null;
  comment: string | null;
  owner_member_id?: string | null;
  updated_at?: string | null;
};

type FakeRestorePointRow = {
  id: string;
  workspace_id: string;
  label: string;
  snapshot_ref: string;
  created_at: string;
};

type FakeBackupObjectDownloadPlanRow = {
  id: string;
  workspace_id: string;
  restore_point_id: string;
  actor_member_id: string | null;
  object_key: string;
  download_token_hash: string;
  expires_at: string;
  created_at: string;
};

type FakeRestoreApprovalRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  pre_restore_backup_id: string | null;
  preview_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreCommitAttemptRow = {
  id: string;
  workspace_id: string;
  approval_id: string;
  actor_member_id: string | null;
  pre_restore_backup_id: string | null;
  preview_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreApplicationPreflightRow = {
  id: string;
  workspace_id: string;
  approval_id: string;
  commit_attempt_id: string;
  actor_member_id: string | null;
  pre_restore_backup_id: string | null;
  preview_json: string;
  rollback_guidance_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreApplicationCommitRow = {
  id: string;
  workspace_id: string;
  approval_id: string;
  commit_attempt_id: string;
  application_preflight_id: string;
  actor_member_id: string | null;
  pre_restore_backup_id: string | null;
  preview_json: string;
  request_summary_json: string;
  result_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestorePlanningPreviewRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  persistence: string;
  accepted_count: number;
  create_preview_count: number;
  idempotent_count: number;
  update_preview_count: number;
  rejected_count: number;
  table_summary_json: string;
  update_preview_json: string;
  rejected_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestorePlanningCommitRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  approval_id: string;
  commit_attempt_id: string;
  application_preflight_id: string;
  planning_preview_id: string;
  pre_restore_backup_id: string;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  request_summary_json: string;
  table_summary_json: string;
  result_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreAttachmentPackagePreflightRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  metadata_record_count: number;
  staged_local_count: number;
  r2_dry_run_count: number;
  stored_r2_count: number;
  total_source_bytes: number;
  package_plan_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreAttachmentPackageVerificationRow = {
  id: string;
  workspace_id: string;
  attachment_package_preflight_id: string;
  actor_member_id: string | null;
  snapshot_workspace_id: string;
  backup_created_at: string | null;
  metadata_record_count: number;
  total_source_bytes: number;
  package_object_count: number;
  package_total_source_bytes: number;
  package_sha256: string;
  manifest_sha256: string;
  package_manifest_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreAttachmentObjectPlanRow = {
  id: string;
  workspace_id: string;
  attachment_package_verification_id: string;
  actor_member_id: string | null;
  object_count: number;
  total_source_bytes: number;
  blocked_destination_count: number;
  plan_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreAttachmentObjectCommitPreflightRow = {
  id: string;
  workspace_id: string;
  attachment_package_verification_id: string;
  attachment_object_plan_id: string;
  actor_member_id: string | null;
  object_count: number;
  total_source_bytes: number;
  ready_destination_count: number;
  blocked_destination_count: number;
  package_sha256: string;
  manifest_sha256: string;
  preflight_json: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeRestoreAttachmentObjectCommitRow = {
  id: string;
  workspace_id: string;
  attachment_package_verification_id: string;
  attachment_object_plan_id: string;
  attachment_object_commit_preflight_id: string;
  actor_member_id: string | null;
  doc_id: string;
  source_object_key: string;
  destination_object_key: string;
  size_bytes: number;
  content_type: string;
  sha256: string;
  package_sha256: string;
  manifest_sha256: string;
  status: string;
  destructive_write: number;
  created_at: string;
};

type FakeAuditEventRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  actor_member_id: string | null;
  action: string;
  metadata_json: string;
  created_at: string;
};

type FakeGoogleProviderConnectionRow = {
  id: string;
  workspace_id: string;
  provider: "google";
  status: "active" | "disconnected" | "error";
  scopes_json: string;
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
  token_type: string | null;
  token_key_version: string;
  root_folder_id: string | null;
  last_error_code: string | null;
  connected_at: string;
  disconnected_at: string | null;
  updated_at: string;
};

type FakeMetaProviderConnectionRow = {
  id: string;
  workspace_id: string;
  connected_by_member_id: string | null;
  status: "pending_page_selection" | "active" | "disconnected" | "error";
  scopes_json: string;
  user_access_token_ciphertext: string | null;
  page_access_token_ciphertext: string | null;
  token_expires_at: string | null;
  token_key_version: string;
  meta_user_id: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_account_id: string | null;
  instagram_username: string | null;
  last_error_code: string | null;
  connected_at: string;
  disconnected_at: string | null;
  updated_at: string;
};

type FakeMetaDataDeletionRequestRow = {
  id: string;
  confirmation_code: string;
  request_fingerprint: string;
  meta_user_id_sha256: string;
  status: "completed" | "failed";
  deleted_connection_count: number;
  requested_at: string;
  completed_at: string | null;
  updated_at: string;
};

type FakeProjectMembershipRow = {
  project_id: string;
  member_id: string;
  project_role: string;
  department: string | null;
};

type FakeRecordPermissionRow = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  member_id: string;
  permission: string;
  department: string | null;
  expires_at: string | null;
  updated_at: string;
};

type FakeRecordCommentIntentRow = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  author_member_id: string | null;
  body_preview: string;
  body_sha256: string;
  created_at: string;
};

type FakeRecordMutationRequestRow = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  mutation: string;
  actor_member_id: string | null;
  allowed_by: string;
  status: string;
  summary_preview: string;
  summary_sha256: string;
  field_keys_json: string;
  expected_updated_at: string | null;
  resolved_by_member_id: string | null;
  resolved_at: string | null;
  resolution_note_preview: string | null;
  resolution_note_sha256: string | null;
  applied_by_member_id: string | null;
  applied_at: string | null;
  application_json: string | null;
  destructive_write: number;
  created_at: string;
  updated_at: string;
};

type FakeFilmProfileMutationRequestRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  actor_member_id: string | null;
  status: string;
  summary_preview: string;
  summary_sha256: string;
  field_keys_json: string;
  expected_updated_at: string | null;
  resolved_by_member_id: string | null;
  resolved_at: string | null;
  resolution_note_preview: string | null;
  resolution_note_sha256: string | null;
  applied_by_member_id: string | null;
  applied_at: string | null;
  application_json: string | null;
  destructive_write: number;
  created_at: string;
  updated_at: string;
};

type FakePlanningRow = {
  table: string;
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  notes_json: string | null;
  created_at: string;
  updated_at: string;
  fields: Record<string, unknown>;
};

function createAuthD1(): {
  db: D1Database;
  magicLinks: Map<string, FakeMagicLinkRow>;
  sessions: Map<string, FakeSessionRow>;
  workspaceInvites: Map<string, FakeWorkspaceInviteRow>;
  inviteDeliveryAttempts: Map<string, FakeInviteDeliveryAttemptRow>;
  inviteDeliveryWebhookEvents: Map<string, FakeInviteDeliveryWebhookEventRow>;
  inviteDeliverySuppressions: Map<string, FakeInviteDeliverySuppressionRow>;
  workspaceMembers: Map<string, FakeWorkspaceMemberRow>;
  projectMemberships: Map<string, FakeProjectMembershipRow>;
  recordPermissions: Map<string, FakeRecordPermissionRow>;
  recordCommentIntents: Map<string, FakeRecordCommentIntentRow>;
  recordMutationRequests: Map<string, FakeRecordMutationRequestRow>;
  filmProfileMutationRequests: Map<string, FakeFilmProfileMutationRequestRow>;
  operationLogs: Map<string, FakeOperationLogRow>;
  workspaces: Map<string, FakeWorkspaceRow>;
  projects: Map<string, FakeProjectRow>;
  filmProfiles: Map<string, FakeFilmProfileRow>;
  tasks: Map<string, FakeTaskRow>;
  documents: Map<string, FakeDocumentRow>;
  people: Map<string, FakePersonRow>;
  projectPeople: Map<string, FakeProjectPersonRow>;
  equipment: Map<string, FakeEquipmentRow>;
  expenses: Map<string, FakeExpenseRow>;
  planningRows: Map<string, FakePlanningRow>;
  restorePoints: Map<string, FakeRestorePointRow>;
  backupObjectDownloadPlans: Map<string, FakeBackupObjectDownloadPlanRow>;
  restoreApprovals: Map<string, FakeRestoreApprovalRow>;
  restoreCommitAttempts: Map<string, FakeRestoreCommitAttemptRow>;
  restoreApplicationPreflights: Map<string, FakeRestoreApplicationPreflightRow>;
  restoreApplicationCommits: Map<string, FakeRestoreApplicationCommitRow>;
  restorePlanningPreviews: Map<string, FakeRestorePlanningPreviewRow>;
  restorePlanningCommits: Map<string, FakeRestorePlanningCommitRow>;
  restoreAttachmentPackagePreflights: Map<string, FakeRestoreAttachmentPackagePreflightRow>;
  restoreAttachmentPackageVerifications: Map<string, FakeRestoreAttachmentPackageVerificationRow>;
  restoreAttachmentObjectPlans: Map<string, FakeRestoreAttachmentObjectPlanRow>;
  restoreAttachmentObjectCommitPreflights: Map<string, FakeRestoreAttachmentObjectCommitPreflightRow>;
  restoreAttachmentObjectCommits: Map<string, FakeRestoreAttachmentObjectCommitRow>;
  attachmentIntents: Map<string, FakeAttachmentIntentRow>;
  auditEvents: Map<string, FakeAuditEventRow>;
  providerConnections: Map<string, FakeGoogleProviderConnectionRow>;
  metaProviderConnections: Map<string, FakeMetaProviderConnectionRow>;
  metaDataDeletionRequests: Map<string, FakeMetaDataDeletionRequestRow>;
} {
  const magicLinks = new Map<string, FakeMagicLinkRow>();
  const sessions = new Map<string, FakeSessionRow>();
  const workspaceInvites = new Map<string, FakeWorkspaceInviteRow>();
  const inviteDeliveryAttempts = new Map<string, FakeInviteDeliveryAttemptRow>();
  const inviteDeliveryWebhookEvents = new Map<string, FakeInviteDeliveryWebhookEventRow>();
  const inviteDeliverySuppressions = new Map<string, FakeInviteDeliverySuppressionRow>();
  const workspaceMembers = new Map<string, FakeWorkspaceMemberRow>();
  const projectMemberships = new Map<string, FakeProjectMembershipRow>();
  const recordPermissions = new Map<string, FakeRecordPermissionRow>();
  const recordCommentIntents = new Map<string, FakeRecordCommentIntentRow>();
  const recordMutationRequests = new Map<string, FakeRecordMutationRequestRow>();
  const filmProfileMutationRequests = new Map<string, FakeFilmProfileMutationRequestRow>();
  const operationLogs = new Map<string, FakeOperationLogRow>();
  const workspaces = new Map<string, FakeWorkspaceRow>();
  const projects = new Map<string, FakeProjectRow>();
  const filmProfiles = new Map<string, FakeFilmProfileRow>();
  const tasks = new Map<string, FakeTaskRow>();
  const documents = new Map<string, FakeDocumentRow>();
  const people = new Map<string, FakePersonRow>();
  const projectPeople = new Map<string, FakeProjectPersonRow>();
  const equipment = new Map<string, FakeEquipmentRow>();
  const expenses = new Map<string, FakeExpenseRow>();
  const planningRows = new Map<string, FakePlanningRow>();
  const restorePoints = new Map<string, FakeRestorePointRow>();
  const backupObjectDownloadPlans = new Map<string, FakeBackupObjectDownloadPlanRow>();
  const restoreApprovals = new Map<string, FakeRestoreApprovalRow>();
  const restoreCommitAttempts = new Map<string, FakeRestoreCommitAttemptRow>();
  const restoreApplicationPreflights = new Map<string, FakeRestoreApplicationPreflightRow>();
  const restoreApplicationCommits = new Map<string, FakeRestoreApplicationCommitRow>();
  const restorePlanningPreviews = new Map<string, FakeRestorePlanningPreviewRow>();
  const restorePlanningCommits = new Map<string, FakeRestorePlanningCommitRow>();
  const restoreAttachmentPackagePreflights = new Map<string, FakeRestoreAttachmentPackagePreflightRow>();
  const restoreAttachmentPackageVerifications = new Map<string, FakeRestoreAttachmentPackageVerificationRow>();
  const restoreAttachmentObjectPlans = new Map<string, FakeRestoreAttachmentObjectPlanRow>();
  const restoreAttachmentObjectCommitPreflights = new Map<string, FakeRestoreAttachmentObjectCommitPreflightRow>();
  const restoreAttachmentObjectCommits = new Map<string, FakeRestoreAttachmentObjectCommitRow>();
  const attachmentIntents = new Map<string, FakeAttachmentIntentRow>();
  const auditEvents = new Map<string, FakeAuditEventRow>();
  const providerConnections = new Map<string, FakeGoogleProviderConnectionRow>();
  const metaProviderConnections = new Map<string, FakeMetaProviderConnectionRow>();
  const metaDataDeletionRequests = new Map<string, FakeMetaDataDeletionRequestRow>();
  const setPlanningRow = (
    table: string,
    id: unknown,
    workspaceId: unknown,
    projectId: unknown,
    title: unknown,
    notes: unknown = null,
    fields: Record<string, unknown> = {},
    createdAt: unknown = "2026-07-08T00:00:00.000Z",
    updatedAt: unknown = createdAt,
    overwrite = false,
  ) => {
    const key = `${table}:${String(id)}`;
    if (!planningRows.has(key) || overwrite) {
      planningRows.set(key, {
        table,
        id: String(id),
        workspace_id: String(workspaceId),
        project_id: projectId === null ? null : String(projectId),
        title: String(title),
        notes_json: notes === null ? null : String(notes),
        created_at: String(createdAt),
        updated_at: String(updatedAt),
        fields,
      });
    }
  };

  return {
    magicLinks,
    sessions,
    workspaceInvites,
    inviteDeliveryAttempts,
    inviteDeliveryWebhookEvents,
    inviteDeliverySuppressions,
    workspaceMembers,
    projectMemberships,
    recordPermissions,
    recordCommentIntents,
    recordMutationRequests,
    filmProfileMutationRequests,
    operationLogs,
    workspaces,
    projects,
    filmProfiles,
    tasks,
    documents,
    people,
    projectPeople,
    equipment,
    expenses,
    planningRows,
    restorePoints,
    backupObjectDownloadPlans,
    restoreApprovals,
    restoreCommitAttempts,
    restoreApplicationPreflights,
    restoreApplicationCommits,
    restorePlanningPreviews,
    restorePlanningCommits,
    restoreAttachmentPackagePreflights,
    restoreAttachmentPackageVerifications,
    restoreAttachmentObjectPlans,
    restoreAttachmentObjectCommitPreflights,
    restoreAttachmentObjectCommits,
    attachmentIntents,
    auditEvents,
    providerConnections,
    metaProviderConnections,
    metaDataDeletionRequests,
    db: {
      async batch(statements: D1PreparedStatement[]) {
        const results: D1Result[] = [];
        for (const statement of statements) {
          results.push(await statement.run());
        }
        return results;
      },
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            return {
              async run() {
                let mutationChanges: number | null = null;
                if (sql.includes("INSERT INTO magic_links")) {
                  const [id, workspaceId, emailHash, tokenHash, expiresAt] = values;
                  magicLinks.set(String(id), {
                    id: String(id),
                    workspace_id: workspaceId === null ? null : String(workspaceId),
                    email_hash: String(emailHash),
                    token_hash: String(tokenHash),
                    consumed_at: null,
                    expires_at: String(expiresAt),
                    created_at: new Date().toISOString(),
                  });
                }

                if (sql.includes("UPDATE magic_links")) {
                  const [consumedAt, identity] = values;
                  const row = sql.includes("token_hash = ?")
                    ? Array.from(magicLinks.values()).find((candidate) => candidate.token_hash === String(identity))
                    : magicLinks.get(String(identity));
                  if (row && !row.consumed_at) {
                    row.consumed_at = String(consumedAt);
                  }
                }

                if (sql.includes("INSERT INTO sessions")) {
                  const [id, workspaceId, memberId, csrfHash, userAgentHash, ipHash, expiresAt] = values;
                  sessions.set(String(id), {
                    id: String(id),
                    workspace_id: workspaceId === null ? null : String(workspaceId),
                    member_id: memberId === null ? null : String(memberId),
                    csrf_hash: String(csrfHash),
                    user_agent_hash: userAgentHash === null ? null : String(userAgentHash),
                    ip_hash: ipHash === null ? null : String(ipHash),
                    expires_at: String(expiresAt),
                    revoked_at: null,
                    created_at: new Date().toISOString(),
                  });
                }

                if (sql.includes("UPDATE sessions") && sql.includes("member_id = ?")) {
                  const [revokedAt, memberId] = values;
                  for (const row of sessions.values()) {
                    if (row.member_id === String(memberId) && !row.revoked_at) {
                      row.revoked_at = String(revokedAt);
                    }
                  }
                } else if (sql.includes("UPDATE sessions")) {
                  const [revokedAt, id, csrfHash] = values;
                  const row = sessions.get(String(id));
                  if (row && row.csrf_hash === csrfHash && !row.revoked_at) {
                    row.revoked_at = String(revokedAt);
                  }
                }

                if (sql.includes("UPDATE workspace_invites") && sql.includes("status = 'revoked'") && sql.includes("AND id = ?")) {
                  const [workspaceId, id, emailHash, invitedRole] = values;
                  const invite = workspaceInvites.get(String(id));
                  if (
                    invite
                    && invite.workspace_id === String(workspaceId)
                    && invite.email_hash === String(emailHash)
                    && invite.invited_role === String(invitedRole)
                    && invite.status === "pending"
                  ) {
                    invite.status = "revoked";
                  }
                } else if (sql.includes("UPDATE workspace_invites") && sql.includes("status = 'revoked'")) {
                  const [workspaceId, emailHash] = values;
                  for (const invite of workspaceInvites.values()) {
                    if (invite.workspace_id === String(workspaceId) && invite.email_hash === String(emailHash) && invite.status === "pending") {
                      invite.status = "revoked";
                    }
                  }
                }

                if (sql.includes("INSERT INTO workspace_invites")) {
                  const [id, workspaceId, emailHash, invitedRole, invitedByMemberId, tokenHash, expiresAt] = values;
                  workspaceInvites.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    email_hash: String(emailHash),
                    invited_role: String(invitedRole),
                    invited_by_member_id: invitedByMemberId === null ? null : String(invitedByMemberId),
                    token_hash: String(tokenHash),
                    status: "pending",
                    expires_at: String(expiresAt),
                    accepted_at: null,
                    created_at: new Date().toISOString(),
                  });
                }

                if (sql.includes("INSERT INTO invite_delivery_attempts")) {
                  const [id, workspaceId, inviteId, actorMemberId, targetHash, deliveryMode, status, createdAt] = values;
                  inviteDeliveryAttempts.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    invite_id: String(inviteId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    provider: "resend",
                    channel: "email",
                    target_hash: String(targetHash),
                    template_key: "workspace_invite",
                    delivery_mode: String(deliveryMode),
                    status: String(status),
                    provider_message_id: null,
                    error_code: null,
                    created_at: String(createdAt),
                    last_event_status: null,
                    last_event_at: null,
                  });
                }

                if (sql.includes("INSERT OR IGNORE INTO invite_delivery_webhook_events")) {
                  const [
                    id,
                    svixId,
                    eventType,
                    providerMessageId,
                    deliveryAttemptId,
                    workspaceId,
                    inviteId,
                    deliveryStatus,
                    receivedAt,
                    eventCreatedAt,
                    metadataKeysJson,
                  ] = values;
                  const duplicate = Array.from(inviteDeliveryWebhookEvents.values()).some((row) => row.svix_id === String(svixId));
                  mutationChanges = duplicate ? 0 : 1;
                  if (!duplicate) {
                    inviteDeliveryWebhookEvents.set(String(id), {
                      id: String(id),
                      svix_id: String(svixId),
                      provider: "resend",
                      event_type: String(eventType),
                      provider_message_id: providerMessageId === null ? null : String(providerMessageId),
                      delivery_attempt_id: deliveryAttemptId === null ? null : String(deliveryAttemptId),
                      workspace_id: workspaceId === null ? null : String(workspaceId),
                      invite_id: inviteId === null ? null : String(inviteId),
                      delivery_status: String(deliveryStatus),
                      received_at: String(receivedAt),
                      event_created_at: eventCreatedAt === null ? null : String(eventCreatedAt),
                      metadata_keys_json: String(metadataKeysJson),
                    });
                  }
                }

                if (sql.includes("UPDATE invite_delivery_attempts") && sql.includes("last_event_status")) {
                  const [lastEventStatus, lastEventAt, providerMessageId, id] = values;
                  const deliveryAttempt = inviteDeliveryAttempts.get(String(id));
                  if (deliveryAttempt && deliveryAttempt.delivery_mode === "live_resend") {
                    deliveryAttempt.last_event_status = String(lastEventStatus);
                    deliveryAttempt.last_event_at = String(lastEventAt);
                    if (!deliveryAttempt.provider_message_id && providerMessageId !== null) {
                      deliveryAttempt.provider_message_id = String(providerMessageId);
                    }
                    mutationChanges = 1;
                  } else {
                    mutationChanges = 0;
                  }
                }

                if (sql.includes("INSERT INTO invite_delivery_suppressions")) {
                  const [
                    id,
                    targetHash,
                    suppressionReason,
                    workspaceId,
                    inviteId,
                    deliveryAttemptId,
                    providerMessageId,
                    sourceWebhookEventId,
                    firstSeenAt,
                    lastSeenAt,
                  ] = values;
                  const key = `resend:${String(targetHash)}:${String(suppressionReason)}`;
                  const existing = inviteDeliverySuppressions.get(key);
                  if (existing) {
                    existing.workspace_id = workspaceId === null ? null : String(workspaceId);
                    existing.invite_id = inviteId === null ? null : String(inviteId);
                    existing.delivery_attempt_id = deliveryAttemptId === null ? null : String(deliveryAttemptId);
                    existing.provider_message_id = providerMessageId === null ? null : String(providerMessageId);
                    existing.source_webhook_event_id = sourceWebhookEventId === null ? null : String(sourceWebhookEventId);
                    existing.last_seen_at = String(lastSeenAt);
                  } else {
                    inviteDeliverySuppressions.set(key, {
                      id: String(id),
                      provider: "resend",
                      target_hash: String(targetHash),
                      suppression_reason: String(suppressionReason),
                      workspace_id: workspaceId === null ? null : String(workspaceId),
                      invite_id: inviteId === null ? null : String(inviteId),
                      delivery_attempt_id: deliveryAttemptId === null ? null : String(deliveryAttemptId),
                      provider_message_id: providerMessageId === null ? null : String(providerMessageId),
                      source_webhook_event_id: sourceWebhookEventId === null ? null : String(sourceWebhookEventId),
                      first_seen_at: String(firstSeenAt),
                      last_seen_at: String(lastSeenAt),
                    });
                  }
                  mutationChanges = 1;
                }

                if (sql.includes("UPDATE invite_delivery_attempts") && !sql.includes("last_event_status")) {
                  const [status, providerMessageId, errorCode, id] = values;
                  const deliveryAttempt = inviteDeliveryAttempts.get(String(id));
                  if (deliveryAttempt && deliveryAttempt.delivery_mode === "live_resend") {
                    deliveryAttempt.status = String(status);
                    deliveryAttempt.provider_message_id = providerMessageId === null ? null : String(providerMessageId);
                    deliveryAttempt.error_code = errorCode === null ? null : String(errorCode);
                  }
                }

                if (sql.includes("UPDATE workspace_invites") && sql.includes("status = 'accepted'")) {
                  const [acceptedAt, id] = values;
                  const invite = workspaceInvites.get(String(id));
                  if (invite && invite.status === "pending") {
                    invite.status = "accepted";
                    invite.accepted_at = String(acceptedAt);
                    mutationChanges = 1;
                  } else {
                    mutationChanges = 0;
                  }
                }

                if (sql.includes("INSERT OR IGNORE INTO workspaces")) {
                  const [id, name] = values;
                  if (!workspaces.has(String(id))) {
                    workspaces.set(String(id), {
                      id: String(id),
                      name: String(name),
                    });
                  }
                }

                if (sql.includes("UPDATE workspaces")) {
                  const [name, , id] = values;
                  const row = workspaces.get(String(id));
                  if (row) {
                    row.name = String(name);
                  }
                }

                if (sql.includes("INSERT INTO workspace_restore_metadata")) {
                  const [workspaceId, archivedProjectCount, backupPolicy, nextBackup] = values;
                  const row = workspaces.get(String(workspaceId));
                  if (row) {
                    row.archived_project_count = Number(archivedProjectCount);
                    row.backup_policy = backupPolicy === null ? null : String(backupPolicy);
                    row.next_backup = nextBackup === null ? null : String(nextBackup);
                  }
                }

                if (sql.includes("INSERT INTO workspace_members")) {
                  const [id, workspaceId, emailHash, role, displayName] = values;
                  workspaceMembers.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    email_hash: String(emailHash),
                    role: String(role),
                    status: "active",
                    display_name: displayName === undefined || displayName === null ? null : String(displayName),
                    last_seen_at: null,
                  });
                }

                if (sql.includes("UPDATE workspace_members")) {
                  if (sql.includes("last_seen_at")) {
                    const [lastSeenAt, id, workspaceId, emailHash] = values;
                    const member = workspaceMembers.get(String(id));
                    if (
                      member
                      && member.workspace_id === String(workspaceId)
                      && member.email_hash === String(emailHash)
                    ) {
                      member.last_seen_at = String(lastSeenAt);
                    }
                  } else if (sql.includes("display_name")) {
                    const [role, displayName, id] = values;
                    const member = workspaceMembers.get(String(id));
                    if (member) {
                      member.role = String(role);
                      member.display_name = String(displayName);
                    }
                  } else {
                    const [role, id] = values;
                    const member = workspaceMembers.get(String(id));
                    if (member) {
                      member.role = String(role);
                    }
                  }
                }

                if (sql.includes("INSERT INTO workspace_member_statuses")) {
                  const [memberId, workspaceId, status] = values;
                  const member = workspaceMembers.get(String(memberId));
                  if (member) {
                    member.workspace_id = String(workspaceId);
                    member.status = values.length >= 4 ? String(status) : "active";
                  }
                }

                if (sql.includes("SET owner_member_id = ?")) {
                  const [ownerMemberId, workspaceId, id] = values;
                  const applyOwner = <T extends { workspace_id: string; owner_member_id?: string | null }>(rows: Map<string, T>): void => {
                    const row = rows.get(String(id));
                    if (row && row.workspace_id === String(workspaceId)) {
                      row.owner_member_id = ownerMemberId === null ? null : String(ownerMemberId);
                    }
                  };
                  if (sql.includes("UPDATE projects")) applyOwner(projects);
                  if (sql.includes("UPDATE documents")) applyOwner(documents);
                  if (sql.includes("UPDATE tasks")) applyOwner(tasks);
                  if (sql.includes("UPDATE people")) applyOwner(people);
                  if (sql.includes("UPDATE equipment")) applyOwner(equipment);
                  if (sql.includes("UPDATE expenses")) applyOwner(expenses);
                }

                if (sql.includes("canonical_task_operation_replay")) {
                  const [status, updatedAt, id, workspaceId, projectId, ...expectedStatuses] = values;
                  const row = tasks.get(String(id));
                  mutationChanges = 0;
                  if (
                    row
                    && row.workspace_id === String(workspaceId)
                    && row.project_id === String(projectId)
                    && expectedStatuses.map(String).includes(row.status ?? "todo")
                  ) {
                    row.status = String(status);
                    row.updated_at = String(updatedAt);
                    mutationChanges = 1;
                  }
                }

                if (sql.includes("canonical_document_markdown_update")) {
                  const [markdownSnapshot, updatedAt, id, workspaceId, projectId, expectedUpdatedAt] = values;
                  const row = documents.get(String(id));
                  mutationChanges = 0;
                  if (
                    row
                    && row.workspace_id === String(workspaceId)
                    && row.project_id === String(projectId)
                    && row.updated_at === String(expectedUpdatedAt)
                    && (row.document_type === "markdown" || row.document_type === "native")
                  ) {
                    row.markdown_snapshot = String(markdownSnapshot);
                    row.updated_at = String(updatedAt);
                    mutationChanges = 1;
                  }
                }

                const applyMutationUpdate = <T extends Record<string, unknown> & { workspace_id: string; updated_at?: string | null }>(
                  tableSql: string,
                  rows: Map<string, T>,
                  fieldMap: Record<string, keyof T>,
                ): void => {
                  if (
                    !sql.includes(`UPDATE ${tableSql}`)
                    || !sql.includes("updated_at = ?")
                    || sql.includes("owner_member_id = ?")
                    || sql.includes("canonical_task_operation_replay")
                    || sql.includes("canonical_document_markdown_update")
                  ) return;
                  mutationChanges = 0;
                  const setClause = sql.slice(sql.indexOf("SET") + 3, sql.indexOf("WHERE")).trim();
                  const assignments = setClause.split(",").map((assignment) => assignment.trim()).filter(Boolean);
                  const columns = assignments
                    .map((assignment) => assignment.split("=")[0]?.trim())
                    .filter((column): column is string => Boolean(column) && column !== "updated_at");
                  const fieldValues = values.slice(0, columns.length);
                  const updatedAt = String(values[columns.length]);
                  const workspaceId = String(values[columns.length + 1]);
                  const id = String(values[columns.length + 2]);
                  const expectedUpdatedAt = values.length > columns.length + 3 ? String(values[columns.length + 3]) : null;
                  const row = rows.get(id);
                  if (!row || row.workspace_id !== workspaceId) return;
                  if ((row.updated_at ?? null) !== expectedUpdatedAt) return;
                  columns.forEach((column, index) => {
                    const targetKey = fieldMap[column];
                    if (targetKey) {
                      row[targetKey] = fieldValues[index] as T[keyof T];
                    }
                  });
                  row.updated_at = updatedAt;
                  mutationChanges = 1;
                };

                applyMutationUpdate("projects", projects, {
                  title: "title",
                  project_type: "project_type",
                  status: "status",
                  phase: "phase",
                  logline: "logline",
                });
                applyMutationUpdate("tasks", tasks, {
                  project_id: "project_id",
                  title: "title",
                  status: "status",
                  priority: "priority",
                  due_at: "due_at",
                  assignee_member_id: "assignee_member_id",
                });
                applyMutationUpdate("documents", documents, {
                  project_id: "project_id",
                  title: "title",
                  document_type: "document_type",
                  external_url: "external_url",
                  sensitive: "sensitive",
                });
                applyMutationUpdate("people", people, {
                  display_name: "display_name",
                  role_tags: "role_tags",
                  sensitive: "sensitive",
                });
                applyMutationUpdate("equipment", equipment, {
                  project_id: "project_id",
                  name: "name",
                  equipment_type: "equipment_type",
                  status: "status",
                  notes: "notes",
                });
                applyMutationUpdate("expenses", expenses, {
                  project_id: "project_id",
                  category: "category",
                  amount_cents: "amount_cents",
                  purchased_at: "purchased_at",
                  comment: "comment",
                });

                const applyMutationDelete = <T extends { workspace_id: string; updated_at?: string | null }>(tableSql: string, rows: Map<string, T>): void => {
                  if (!sql.includes(`DELETE FROM ${tableSql}`)) return;
                  mutationChanges = 0;
                  const [workspaceId, id, expectedUpdatedAt] = values;
                  const row = rows.get(String(id));
                  const expected = values.length >= 3 ? String(expectedUpdatedAt) : null;
                  if (row && row.workspace_id === String(workspaceId) && (row.updated_at ?? null) === expected) {
                    rows.delete(String(id));
                    mutationChanges = 1;
                  }
                };

                applyMutationDelete("projects", projects);
                applyMutationDelete("tasks", tasks);
                applyMutationDelete("documents", documents);
                applyMutationDelete("people", people);
                applyMutationDelete("equipment", equipment);
                applyMutationDelete("expenses", expenses);

                if (sql.includes("INSERT INTO projects") && sql.includes("ON CONFLICT")) {
                  const [id, workspaceId, title, phase] = values;
                  const existing = projects.get(String(id));
                  if (existing) {
                    if (existing.workspace_id === String(workspaceId)) {
                      existing.title = String(title);
                      existing.phase = String(phase);
                    }
                  } else {
                    projects.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      title: String(title),
                      phase: String(phase),
                    });
                  }
                }

                if (
                  sql.includes("INSERT OR IGNORE INTO projects")
                  || (sql.includes("INSERT INTO projects") && !sql.includes("ON CONFLICT"))
                ) {
                  const [id, workspaceId, title, projectType] = values;
                  const ownerMemberId = sql.includes("owner_member_id") ? values[4] : null;
                  if (!projects.has(String(id))) {
                    projects.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      title: String(title),
                      project_type: String(projectType),
                      phase: "development",
                      owner_member_id: ownerMemberId === null ? null : String(ownerMemberId),
                    });
                  }
                }

                if (sql.includes("INSERT INTO project_memberships")) {
                  const [projectId, memberId, projectRole, department] = values;
                  projectMemberships.set(`${String(projectId)}:${String(memberId)}`, {
                    project_id: String(projectId),
                    member_id: String(memberId),
                    project_role: String(projectRole),
                    department: department === null ? null : String(department),
                  });
                }

                if (sql.includes("DELETE FROM project_memberships")) {
                  const [projectId, memberId, projectRole] = values;
                  const key = `${String(projectId)}:${String(memberId)}`;
                  const row = projectMemberships.get(key);
                  if (row?.project_role === String(projectRole)) {
                    projectMemberships.delete(key);
                  }
                }

                if (sql.includes("INSERT INTO record_permissions")) {
                  const [id, workspaceId, entityType, entityId, memberId, permission, department, expiresAt, , updatedAt] = values;
                  recordPermissions.set(`${String(workspaceId)}:${String(entityType)}:${String(entityId)}:${String(memberId)}:${String(permission)}`, {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    entity_type: String(entityType),
                    entity_id: String(entityId),
                    member_id: String(memberId),
                    permission: String(permission),
                    department: department === null ? null : String(department),
                    expires_at: expiresAt === null ? null : String(expiresAt),
                    updated_at: String(updatedAt),
                  });
                }

                if (sql.includes("INSERT INTO record_comment_intents")) {
                  const [id, workspaceId, entityType, entityId, authorMemberId, bodyPreview, bodySha256, createdAt] = values;
                  recordCommentIntents.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    entity_type: String(entityType),
                    entity_id: String(entityId),
                    author_member_id: authorMemberId === null ? null : String(authorMemberId),
                    body_preview: String(bodyPreview),
                    body_sha256: String(bodySha256),
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO record_mutation_requests")) {
                  const [
                    id,
                    workspaceId,
                    entityType,
                    entityId,
                    mutation,
                    actorMemberId,
                    allowedBy,
                    summaryPreview,
                    summarySha256,
                    fieldKeysJson,
                    expectedUpdatedAt,
                    createdAt,
                    updatedAt,
                  ] = values;
                  recordMutationRequests.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    entity_type: String(entityType),
                    entity_id: String(entityId),
                    mutation: String(mutation),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    allowed_by: String(allowedBy),
                    status: "pending_owner_producer_review",
                    summary_preview: String(summaryPreview),
                    summary_sha256: String(summarySha256),
                    field_keys_json: String(fieldKeysJson),
                    expected_updated_at: expectedUpdatedAt === null ? null : String(expectedUpdatedAt),
                    resolved_by_member_id: null,
                    resolved_at: null,
                    resolution_note_preview: null,
                    resolution_note_sha256: null,
                    applied_by_member_id: null,
                    applied_at: null,
                    application_json: null,
                    destructive_write: 0,
                    created_at: String(createdAt),
                    updated_at: String(updatedAt),
                  });
                }

                if (sql.includes("INSERT INTO film_profile_mutation_requests")) {
                  const [
                    id,
                    workspaceId,
                    projectId,
                    actorMemberId,
                    summaryPreview,
                    summarySha256,
                    fieldKeysJson,
                    expectedUpdatedAt,
                    createdAt,
                    updatedAt,
                  ] = values;
                  filmProfileMutationRequests.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    project_id: String(projectId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    status: "pending_owner_producer_review",
                    summary_preview: String(summaryPreview),
                    summary_sha256: String(summarySha256),
                    field_keys_json: String(fieldKeysJson),
                    expected_updated_at: expectedUpdatedAt === null ? null : String(expectedUpdatedAt),
                    resolved_by_member_id: null,
                    resolved_at: null,
                    resolution_note_preview: null,
                    resolution_note_sha256: null,
                    applied_by_member_id: null,
                    applied_at: null,
                    application_json: null,
                    destructive_write: 0,
                    created_at: String(createdAt),
                    updated_at: String(updatedAt),
                  });
                }

                if (sql.includes("UPDATE record_mutation_requests") && sql.includes("status = 'applied'")) {
                  const [appliedByMemberId, appliedAt, applicationJson, updatedAt, workspaceId, id] = values;
                  const row = recordMutationRequests.get(String(id));
                  if (row && row.workspace_id === String(workspaceId) && row.status === "approved_pending_apply") {
                    row.status = "applied";
                    row.applied_by_member_id = appliedByMemberId === null ? null : String(appliedByMemberId);
                    row.applied_at = String(appliedAt);
                    row.application_json = String(applicationJson);
                    row.destructive_write = 1;
                    row.updated_at = String(updatedAt);
                  }
                } else if (sql.includes("UPDATE record_mutation_requests") && sql.includes("stale_record_blocked")) {
                  const [actorMemberId, applicationJson, updatedAt, workspaceId, id] = values;
                  const row = recordMutationRequests.get(String(id));
                  if (row && row.workspace_id === String(workspaceId) && row.status === "approved_pending_apply") {
                    row.status = "stale_record_blocked";
                    row.resolved_by_member_id = row.resolved_by_member_id ?? (actorMemberId === null ? null : String(actorMemberId));
                    row.application_json = String(applicationJson);
                    row.destructive_write = 0;
                    row.updated_at = String(updatedAt);
                  }
                } else if (sql.includes("UPDATE record_mutation_requests")) {
                  const [status, resolvedByMemberId, resolvedAt, notePreview, noteSha256, updatedAt, workspaceId, id] = values;
                  const row = recordMutationRequests.get(String(id));
                  if (row && row.workspace_id === String(workspaceId) && row.status === "pending_owner_producer_review") {
                    row.status = String(status);
                    row.resolved_by_member_id = resolvedByMemberId === null ? null : String(resolvedByMemberId);
                    row.resolved_at = String(resolvedAt);
                    row.resolution_note_preview = notePreview === null ? null : String(notePreview);
                    row.resolution_note_sha256 = noteSha256 === null ? null : String(noteSha256);
                    row.updated_at = String(updatedAt);
                  }
                }

                if (sql.includes("UPDATE film_profile_mutation_requests") && sql.includes("status = 'applied'")) {
                  const [appliedByMemberId, appliedAt, applicationJson, updatedAt, workspaceId, id] = values;
                  const row = filmProfileMutationRequests.get(String(id));
                  if (row && row.workspace_id === String(workspaceId) && row.status === "approved_pending_apply") {
                    row.status = "applied";
                    row.applied_by_member_id = appliedByMemberId === null ? null : String(appliedByMemberId);
                    row.applied_at = String(appliedAt);
                    row.application_json = String(applicationJson);
                    row.destructive_write = 1;
                    row.updated_at = String(updatedAt);
                  }
                } else if (sql.includes("UPDATE film_profile_mutation_requests") && sql.includes("stale_record_blocked")) {
                  const [actorMemberId, applicationJson, updatedAt, workspaceId, id] = values;
                  const row = filmProfileMutationRequests.get(String(id));
                  if (row && row.workspace_id === String(workspaceId) && row.status === "approved_pending_apply") {
                    row.status = "stale_record_blocked";
                    row.resolved_by_member_id = row.resolved_by_member_id ?? (actorMemberId === null ? null : String(actorMemberId));
                    row.application_json = String(applicationJson);
                    row.destructive_write = 0;
                    row.updated_at = String(updatedAt);
                  }
                } else if (sql.includes("UPDATE film_profile_mutation_requests")) {
                  const [status, resolvedByMemberId, resolvedAt, notePreview, noteSha256, updatedAt, workspaceId, id] = values;
                  const row = filmProfileMutationRequests.get(String(id));
                  if (row && row.workspace_id === String(workspaceId) && row.status === "pending_owner_producer_review") {
                    row.status = String(status);
                    row.resolved_by_member_id = resolvedByMemberId === null ? null : String(resolvedByMemberId);
                    row.resolved_at = String(resolvedAt);
                    row.resolution_note_preview = notePreview === null ? null : String(notePreview);
                    row.resolution_note_sha256 = noteSha256 === null ? null : String(noteSha256);
                    row.updated_at = String(updatedAt);
                  }
                }

                if (sql.includes("UPDATE film_profiles")) {
                  mutationChanges = 0;
                  const setClause = sql.slice(sql.indexOf("SET") + 3, sql.indexOf("WHERE")).trim();
                  const columns = setClause
                    .split(",")
                    .map((assignment) => assignment.trim().split("=")[0]?.trim())
                    .filter((column): column is string => Boolean(column) && column !== "updated_at");
                  const fieldValues = values.slice(0, columns.length);
                  const updatedAt = String(values[columns.length]);
                  const projectId = String(values[columns.length + 1]);
                  const expectedUpdatedAt = String(values[columns.length + 2]);
                  const row = filmProfiles.get(projectId);
                  if (row && row.updated_at === expectedUpdatedAt) {
                    columns.forEach((column, index) => {
                      if (column === "runtime_minutes") row.runtime_minutes = fieldValues[index] === null ? null : Number(fieldValues[index]);
                      if (column === "format") row.format = fieldValues[index] === null ? null : String(fieldValues[index]);
                      if (column === "shoot_start") row.shoot_start = fieldValues[index] === null ? null : String(fieldValues[index]);
                      if (column === "shoot_end") row.shoot_end = fieldValues[index] === null ? null : String(fieldValues[index]);
                      if (column === "budget_cents") row.budget_cents = Number(fieldValues[index]);
                      if (column === "spent_cents") row.spent_cents = Number(fieldValues[index]);
                    });
                    row.updated_at = updatedAt;
                    mutationChanges = 1;
                  }
                }

                if (sql.includes("INSERT INTO film_profiles")) {
                  const [
                    projectId,
                    runtimeMinutes,
                    format,
                    shootStart,
                    shootEnd,
                    budgetCents,
                    spentCents,
                    createdAt,
                    updatedAt,
                  ] = sql.includes("shoot_start")
                    ? values
                    : [values[0], values[1], values[2], null, null, values[3], values[4], values[5], values[6]];
                  if (!filmProfiles.has(String(projectId))) {
                    filmProfiles.set(String(projectId), {
                      project_id: String(projectId),
                      runtime_minutes: runtimeMinutes === null ? null : Number(runtimeMinutes),
                      format: format === null ? null : String(format),
                      shoot_start: shootStart === null ? null : String(shootStart),
                      shoot_end: shootEnd === null ? null : String(shootEnd),
                      budget_cents: Number(budgetCents),
                      spent_cents: Number(spentCents),
                      created_at: String(createdAt),
                      updated_at: String(updatedAt),
                    });
                    mutationChanges = 1;
                  } else {
                    mutationChanges = 0;
                  }
                }

                if (sql.includes("DELETE FROM record_permissions")) {
                  const [workspaceId, permissionId, entityType, entityId, memberId, permission] = values;
                  const key = Array.from(recordPermissions.entries()).find(([, row]) =>
                    row.workspace_id === String(workspaceId)
                    && row.id === String(permissionId)
                    && row.entity_type === String(entityType)
                    && row.entity_id === String(entityId)
                    && row.member_id === String(memberId)
                    && row.permission === String(permission)
                  )?.[0];
                  if (key) {
                    recordPermissions.delete(key);
                  }
                }

                if (sql.includes("INSERT INTO tasks") && sql.includes("ON CONFLICT")) {
                  const [id, workspaceId, projectId, title, status, priority, dueAt] = values;
                  const existing = tasks.get(String(id));
                  if (existing) {
                    if (existing.workspace_id === String(workspaceId)) {
                      existing.project_id = projectId === null ? null : String(projectId);
                      existing.title = String(title);
                      existing.status = String(status);
                      existing.priority = String(priority);
                      existing.due_at = dueAt === null ? null : String(dueAt);
                    }
                  } else {
                    tasks.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      project_id: projectId === null ? null : String(projectId),
                      title: String(title),
                      status: String(status),
                      priority: String(priority),
                      due_at: dueAt === null ? null : String(dueAt),
                    });
                  }
                }

                if (
                  sql.includes("INSERT OR IGNORE INTO tasks")
                  || (sql.includes("INSERT INTO tasks") && !sql.includes("ON CONFLICT"))
                ) {
                  const [id, workspaceId, projectId, title] = values;
                  const dueAt = sql.includes("'todo', 'normal', ?") ? values[4] : null;
                  const ownerMemberId = sql.includes("owner_member_id") ? values[5] ?? values[4] : null;
                  if (!tasks.has(String(id))) {
                    tasks.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      project_id: projectId === null ? null : String(projectId),
                      title: String(title),
                      due_at: dueAt === null ? null : String(dueAt),
                      owner_member_id: ownerMemberId === null ? null : String(ownerMemberId),
                    });
                  }
                }

                if (sql.includes("INSERT INTO documents") && sql.includes("ON CONFLICT")) {
                  const [id, workspaceId, projectId, title, documentType, markdownSnapshot, sensitive] = values;
                  const existing = documents.get(String(id));
                  if (existing) {
                    if (existing.workspace_id === String(workspaceId)) {
                      existing.project_id = projectId === null ? null : String(projectId);
                      existing.title = String(title);
                      existing.document_type = String(documentType);
                      existing.markdown_snapshot = markdownSnapshot === null ? null : String(markdownSnapshot);
                      existing.sensitive = Number(sensitive);
                    }
                  } else {
                    documents.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      project_id: projectId === null ? null : String(projectId),
                      title: String(title),
                      document_type: String(documentType),
                      markdown_snapshot: markdownSnapshot === null ? null : String(markdownSnapshot),
                      sensitive: Number(sensitive),
                    });
                  }
                }

                if (
                  sql.includes("INSERT OR IGNORE INTO documents")
                  || (sql.includes("INSERT INTO documents") && !sql.includes("ON CONFLICT"))
                ) {
                  const [id, workspaceId, projectId, title, documentType, sensitive] = values;
                  const ownerMemberId = sql.includes("owner_member_id") ? values[6] : null;
                  if (!documents.has(String(id))) {
                    documents.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      project_id: projectId === null ? null : String(projectId),
                      title: String(title),
                      document_type: String(documentType),
                      sensitive: Number(sensitive),
                      owner_member_id: ownerMemberId === null ? null : String(ownerMemberId),
                    });
                  }
                }

                if (sql.includes("INSERT OR IGNORE INTO people") || sql.includes("INSERT INTO people")) {
                  const [id, workspaceId, displayName, roleTags, notes] = values;
                  const ownerMemberId = sql.includes("owner_member_id") ? values[5] : null;
                  const existing = people.get(String(id));
                  if (existing) {
                    if (existing.workspace_id === String(workspaceId)) {
                      existing.display_name = String(displayName);
                      existing.role_tags = String(roleTags);
                      existing.notes = notes === null ? null : String(notes);
                      existing.sensitive = 1;
                      existing.owner_member_id = ownerMemberId === null ? null : String(ownerMemberId);
                    }
                  } else {
                    people.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      display_name: String(displayName),
                      role_tags: String(roleTags),
                      notes: notes === null ? null : String(notes),
                      sensitive: 1,
                      owner_member_id: ownerMemberId === null ? null : String(ownerMemberId),
                    });
                  }
                }

                if (sql.includes("INSERT OR IGNORE INTO project_people") || sql.includes("INSERT INTO project_people")) {
                  const [projectId, personId, projectRole] = values;
                  projectPeople.set(`${String(projectId)}:${String(personId)}`, {
                    project_id: String(projectId),
                    person_id: String(personId),
                    project_role: projectRole === null ? null : String(projectRole),
                  });
                }

                if (sql.includes("INSERT OR IGNORE INTO equipment (") || sql.includes("INSERT INTO equipment (")) {
                  const [id, workspaceId, projectId, name, equipmentType, status] = values;
                  const ownerMemberId = sql.includes("owner_member_id") ? values[6] : null;
                  const existing = equipment.get(String(id));
                  if (existing) {
                    if (existing.workspace_id === String(workspaceId)) {
                      existing.project_id = projectId === null ? null : String(projectId);
                      existing.name = String(name);
                      existing.equipment_type = equipmentType === null ? null : String(equipmentType);
                      existing.status = String(status);
                      existing.notes = null;
                      existing.owner_member_id = ownerMemberId === null ? null : String(ownerMemberId);
                    }
                  } else {
                    equipment.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      project_id: projectId === null ? null : String(projectId),
                      name: String(name),
                      equipment_type: equipmentType === null ? null : String(equipmentType),
                      status: String(status),
                      notes: null,
                      owner_member_id: ownerMemberId === null ? null : String(ownerMemberId),
                    });
                  }
                }

                if (sql.includes("INSERT OR IGNORE INTO expenses") || sql.includes("INSERT INTO expenses")) {
                  const [id, workspaceId, projectId, category, amountCents, comment] = values;
                  const ownerMemberId = sql.includes("owner_member_id") ? values[6] : null;
                  const existing = expenses.get(String(id));
                  if (existing) {
                    if (existing.workspace_id === String(workspaceId)) {
                      existing.project_id = projectId === null ? null : String(projectId);
                      existing.category = String(category);
                      existing.amount_cents = Number(amountCents);
                      existing.comment = comment === null ? null : String(comment);
                      existing.owner_member_id = ownerMemberId === null ? null : String(ownerMemberId);
                    }
                  } else {
                    expenses.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      project_id: projectId === null ? null : String(projectId),
                      category: String(category),
                      amount_cents: Number(amountCents),
                      comment: comment === null ? null : String(comment),
                      owner_member_id: ownerMemberId === null ? null : String(ownerMemberId),
                    });
                  }
                }

                if (sql.includes("INSERT OR IGNORE INTO locations") || sql.includes("INSERT INTO locations")) {
                  const [id, workspaceId, projectId, title, locationType, notes, createdAt, updatedAt] = values;
                  setPlanningRow("locations", id, workspaceId, projectId, title, notes, { location_type: locationType }, createdAt, updatedAt, sql.includes("ON CONFLICT"));
                }

                if (sql.includes("INSERT OR IGNORE INTO opportunities") || sql.includes("INSERT INTO opportunities")) {
                  const [id, workspaceId, projectId, title, opportunityType, dueAt, websiteUrl, tagsJson, notes, createdAt, updatedAt] = values;
                  setPlanningRow(
                    "opportunities",
                    id,
                    workspaceId,
                    projectId,
                    title,
                    notes,
                    { opportunity_type: opportunityType, due_at: dueAt, website_url: websiteUrl, tags_json: tagsJson },
                    createdAt,
                    updatedAt,
                    sql.includes("ON CONFLICT"),
                  );
                }

                if (sql.includes("INSERT OR IGNORE INTO meeting_notes") || sql.includes("INSERT INTO meeting_notes")) {
                  const [id, workspaceId, projectId, title, meetingType, meetingAt, participantsJson, notes, createdAt, updatedAt] = values;
                  setPlanningRow(
                    "meeting_notes",
                    id,
                    workspaceId,
                    projectId,
                    title,
                    notes,
                    { meeting_type: meetingType, meeting_at: meetingAt, participants_json: participantsJson },
                    createdAt,
                    updatedAt,
                    sql.includes("ON CONFLICT"),
                  );
                }

                if (sql.includes("INSERT OR IGNORE INTO equipment_requests") || sql.includes("INSERT INTO equipment_requests")) {
                  const [id, workspaceId, projectId, checkoutStart, checkoutEnd, status, notes, createdAt, updatedAt] = values;
                  setPlanningRow(
                    "equipment_requests",
                    id,
                    workspaceId,
                    projectId,
                    id,
                    notes,
                    { checkout_start: checkoutStart, checkout_end: checkoutEnd, status },
                    createdAt,
                    updatedAt,
                    sql.includes("ON CONFLICT"),
                  );
                }

                if (sql.includes("INSERT OR IGNORE INTO shows") || sql.includes("INSERT INTO shows")) {
                  const [id, workspaceId, projectId, title, showType, channelsJson, statusOrCreatedAt, createdAtOrUpdatedAt, updatedAtValue] = values;
                  const hasExplicitStatus = sql.includes("ON CONFLICT");
                  const status = hasExplicitStatus ? statusOrCreatedAt : "active";
                  const createdAt = hasExplicitStatus ? createdAtOrUpdatedAt : statusOrCreatedAt;
                  const updatedAt = hasExplicitStatus ? updatedAtValue : createdAtOrUpdatedAt;
                  setPlanningRow("shows", id, workspaceId, projectId, title, null, { show_type: showType, channels_json: channelsJson, status }, createdAt, updatedAt, hasExplicitStatus);
                }

                if (sql.includes("INSERT OR IGNORE INTO merch_items") || sql.includes("INSERT INTO merch_items")) {
                  const [id, workspaceId, projectId, title, category, quantityOnHand, notes, createdAt, updatedAt] = values;
                  setPlanningRow("merch_items", id, workspaceId, projectId, title, notes, { category, quantity_on_hand: quantityOnHand }, createdAt, updatedAt, sql.includes("ON CONFLICT"));
                }

                if (sql.includes("INSERT OR IGNORE INTO media_items") || sql.includes("INSERT INTO media_items")) {
                  const [id, workspaceId, projectId, title, mediaType, url, tagsJson, notes, createdAt, updatedAt] = values;
                  setPlanningRow(
                    "media_items",
                    id,
                    workspaceId,
                    projectId,
                    title,
                    notes,
                    { media_type: mediaType, url, tags_json: tagsJson },
                    createdAt,
                    updatedAt,
                    sql.includes("ON CONFLICT"),
                  );
                }

                if (sql.includes("INSERT OR IGNORE INTO production_roles") || sql.includes("INSERT INTO production_roles")) {
                  const [id, workspaceId, title, department, notes, createdAt] = values;
                  setPlanningRow("production_roles", id, workspaceId, null, title, notes, { department }, createdAt, createdAt, sql.includes("ON CONFLICT"));
                }

                if (sql.includes("INSERT INTO restore_points")) {
                  const [id, workspaceId, label, snapshotRef, createdAt] = values;
                  restorePoints.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    label: String(label),
                    snapshot_ref: String(snapshotRef),
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO backup_object_download_plans")) {
                  const [id, workspaceId, restorePointId, actorMemberId, objectKey, tokenHash, expiresAt, createdAt] = values;
                  backupObjectDownloadPlans.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    restore_point_id: String(restorePointId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    object_key: String(objectKey),
                    download_token_hash: String(tokenHash),
                    expires_at: String(expiresAt),
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_approvals")) {
                  const [
                    id,
                    workspaceId,
                    actorMemberId,
                    snapshotWorkspaceId,
                    backupCreatedAt,
                    preRestoreBackupId,
                    previewJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreApprovals.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    snapshot_workspace_id: String(snapshotWorkspaceId),
                    backup_created_at: backupCreatedAt === null ? null : String(backupCreatedAt),
                    pre_restore_backup_id: preRestoreBackupId === null ? null : String(preRestoreBackupId),
                    preview_json: String(previewJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_commit_attempts")) {
                  const [
                    id,
                    workspaceId,
                    approvalId,
                    actorMemberId,
                    preRestoreBackupId,
                    previewJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreCommitAttempts.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    approval_id: String(approvalId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    pre_restore_backup_id: preRestoreBackupId === null ? null : String(preRestoreBackupId),
                    preview_json: String(previewJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_application_preflights")) {
                  const [
                    id,
                    workspaceId,
                    approvalId,
                    commitAttemptId,
                    actorMemberId,
                    preRestoreBackupId,
                    previewJson,
                    rollbackGuidanceJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreApplicationPreflights.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    approval_id: String(approvalId),
                    commit_attempt_id: String(commitAttemptId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    pre_restore_backup_id: preRestoreBackupId === null ? null : String(preRestoreBackupId),
                    preview_json: String(previewJson),
                    rollback_guidance_json: String(rollbackGuidanceJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_application_commits")) {
                  const [
                    id,
                    workspaceId,
                    approvalId,
                    commitAttemptId,
                    applicationPreflightId,
                    actorMemberId,
                    preRestoreBackupId,
                    previewJson,
                    requestSummaryJson,
                    resultJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreApplicationCommits.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    approval_id: String(approvalId),
                    commit_attempt_id: String(commitAttemptId),
                    application_preflight_id: String(applicationPreflightId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    pre_restore_backup_id: preRestoreBackupId === null ? null : String(preRestoreBackupId),
                    preview_json: String(previewJson),
                    request_summary_json: String(requestSummaryJson),
                    result_json: String(resultJson),
                    status: String(status),
                    destructive_write: 1,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_planning_previews")) {
                  const [
                    id,
                    workspaceId,
                    actorMemberId,
                    snapshotWorkspaceId,
                    backupCreatedAt,
                    persistence,
                    acceptedCount,
                    createPreviewCount,
                    idempotentCount,
                    updatePreviewCount,
                    rejectedCount,
                    tableSummaryJson,
                    updatePreviewJson,
                    rejectedJson,
                    status,
                    createdAt,
                  ] = values;
                  restorePlanningPreviews.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    snapshot_workspace_id: String(snapshotWorkspaceId),
                    backup_created_at: backupCreatedAt === null ? null : String(backupCreatedAt),
                    persistence: String(persistence),
                    accepted_count: Number(acceptedCount),
                    create_preview_count: Number(createPreviewCount),
                    idempotent_count: Number(idempotentCount),
                    update_preview_count: Number(updatePreviewCount),
                    rejected_count: Number(rejectedCount),
                    table_summary_json: String(tableSummaryJson),
                    update_preview_json: String(updatePreviewJson),
                    rejected_json: String(rejectedJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_planning_commits")) {
                  const [
                    id,
                    workspaceId,
                    actorMemberId,
                    approvalId,
                    commitAttemptId,
                    applicationPreflightId,
                    planningPreviewId,
                    preRestoreBackupId,
                    snapshotWorkspaceId,
                    backupCreatedAt,
                    requestSummaryJson,
                    tableSummaryJson,
                    resultJson,
                    status,
                    createdAt,
                  ] = values;
                  restorePlanningCommits.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    approval_id: String(approvalId),
                    commit_attempt_id: String(commitAttemptId),
                    application_preflight_id: String(applicationPreflightId),
                    planning_preview_id: String(planningPreviewId),
                    pre_restore_backup_id: String(preRestoreBackupId),
                    snapshot_workspace_id: String(snapshotWorkspaceId),
                    backup_created_at: backupCreatedAt === null ? null : String(backupCreatedAt),
                    request_summary_json: String(requestSummaryJson),
                    table_summary_json: String(tableSummaryJson),
                    result_json: String(resultJson),
                    status: String(status),
                    destructive_write: 1,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_attachment_package_preflights")) {
                  const [
                    id,
                    workspaceId,
                    actorMemberId,
                    snapshotWorkspaceId,
                    backupCreatedAt,
                    metadataRecordCount,
                    stagedLocalCount,
                    r2DryRunCount,
                    storedR2Count,
                    totalSourceBytes,
                    packagePlanJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreAttachmentPackagePreflights.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    snapshot_workspace_id: String(snapshotWorkspaceId),
                    backup_created_at: backupCreatedAt === null ? null : String(backupCreatedAt),
                    metadata_record_count: Number(metadataRecordCount),
                    staged_local_count: Number(stagedLocalCount),
                    r2_dry_run_count: Number(r2DryRunCount),
                    stored_r2_count: Number(storedR2Count),
                    total_source_bytes: Number(totalSourceBytes),
                    package_plan_json: String(packagePlanJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_attachment_package_verifications")) {
                  const [
                    id,
                    workspaceId,
                    attachmentPackagePreflightId,
                    actorMemberId,
                    snapshotWorkspaceId,
                    backupCreatedAt,
                    metadataRecordCount,
                    totalSourceBytes,
                    packageObjectCount,
                    packageTotalSourceBytes,
                    packageSha256,
                    manifestSha256,
                    packageManifestJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreAttachmentPackageVerifications.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    attachment_package_preflight_id: String(attachmentPackagePreflightId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    snapshot_workspace_id: String(snapshotWorkspaceId),
                    backup_created_at: backupCreatedAt === null ? null : String(backupCreatedAt),
                    metadata_record_count: Number(metadataRecordCount),
                    total_source_bytes: Number(totalSourceBytes),
                    package_object_count: Number(packageObjectCount),
                    package_total_source_bytes: Number(packageTotalSourceBytes),
                    package_sha256: String(packageSha256),
                    manifest_sha256: String(manifestSha256),
                    package_manifest_json: String(packageManifestJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_attachment_object_plans")) {
                  const [
                    id,
                    workspaceId,
                    attachmentPackageVerificationId,
                    actorMemberId,
                    objectCount,
                    totalSourceBytes,
                    blockedDestinationCount,
                    planJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreAttachmentObjectPlans.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    attachment_package_verification_id: String(attachmentPackageVerificationId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    object_count: Number(objectCount),
                    total_source_bytes: Number(totalSourceBytes),
                    blocked_destination_count: Number(blockedDestinationCount),
                    plan_json: String(planJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO restore_attachment_object_commit_preflights")) {
                  const [
                    id,
                    workspaceId,
                    attachmentPackageVerificationId,
                    attachmentObjectPlanId,
                    actorMemberId,
                    objectCount,
                    totalSourceBytes,
                    readyDestinationCount,
                    blockedDestinationCount,
                    packageSha256,
                    manifestSha256,
                    preflightJson,
                    status,
                    createdAt,
                  ] = values;
                  restoreAttachmentObjectCommitPreflights.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    attachment_package_verification_id: String(attachmentPackageVerificationId),
                    attachment_object_plan_id: String(attachmentObjectPlanId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    object_count: Number(objectCount),
                    total_source_bytes: Number(totalSourceBytes),
                    ready_destination_count: Number(readyDestinationCount),
                    blocked_destination_count: Number(blockedDestinationCount),
                    package_sha256: String(packageSha256),
                    manifest_sha256: String(manifestSha256),
                    preflight_json: String(preflightJson),
                    status: String(status),
                    destructive_write: 0,
                    created_at: String(createdAt),
                  });
                }

                if (
                  sql.includes("INSERT INTO attachment_upload_intents")
                  && sql.includes("'prepared'")
                  && !sql.includes("ON CONFLICT")
                ) {
                  const [
                    id,
                    workspaceId,
                    docId,
                    objectKey,
                    name,
                    sourcePath,
                    sizeBytes,
                    contentType,
                    sha256,
                    storageKey,
                    commitTokenHash,
                    preparedAt,
                    expiresAt,
                    updatedAt,
                  ] = values;
                  attachmentIntents.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    doc_id: String(docId),
                    object_key: String(objectKey),
                    name: String(name),
                    source_path: sourcePath === null ? null : String(sourcePath),
                    size_bytes: Number(sizeBytes),
                    content_type: String(contentType),
                    sha256: String(sha256),
                    storage_key: String(storageKey),
                    commit_token_hash: String(commitTokenHash),
                    status: "prepared",
                    prepared_at: String(preparedAt),
                    expires_at: String(expiresAt),
                    committed_at: null,
                    updated_at: String(updatedAt),
                  });
                }

                if (sql.includes("INSERT INTO attachment_upload_intents") && sql.includes("'stored_r2'")) {
                  const [
                    id,
                    workspaceId,
                    docId,
                    objectKey,
                    name,
                    sourcePath,
                    sizeBytes,
                    contentType,
                    sha256,
                    commitTokenHash,
                    preparedAt,
                    expiresAt,
                    committedAt,
                    updatedAt,
                  ] = values;
                  attachmentIntents.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    doc_id: String(docId),
                    object_key: String(objectKey),
                    name: String(name),
                    source_path: sourcePath === null ? null : String(sourcePath),
                    size_bytes: Number(sizeBytes),
                    content_type: String(contentType),
                    sha256: String(sha256),
                    storage_key: null,
                    commit_token_hash: String(commitTokenHash),
                    status: "stored_r2",
                    prepared_at: String(preparedAt),
                    expires_at: String(expiresAt),
                    committed_at: String(committedAt),
                    updated_at: String(updatedAt),
                  });
                }

                if (
                  sql.includes("UPDATE attachment_upload_intents")
                  && sql.includes("AND storage_key = ?")
                  && sql.includes("status = 'stored_r2'")
                ) {
                  const [
                    committedAt,
                    updatedAt,
                    id,
                    workspaceId,
                    docId,
                    objectKey,
                    sha256,
                    storageKey,
                    commitTokenHash,
                  ] = values;
                  const row = attachmentIntents.get(String(id));
                  if (
                    row
                    && row.workspace_id === String(workspaceId)
                    && row.doc_id === String(docId)
                    && row.object_key === String(objectKey)
                    && row.sha256 === String(sha256)
                    && row.storage_key === String(storageKey)
                    && row.commit_token_hash === String(commitTokenHash)
                    && row.status === "prepared"
                  ) {
                    row.status = "stored_r2";
                    row.committed_at = String(committedAt);
                    row.updated_at = String(updatedAt);
                    mutationChanges = 1;
                  } else {
                    mutationChanges = 0;
                  }
                }

                if (sql.includes("DELETE FROM attachment_upload_intents")) {
                  const [id] = values;
                  attachmentIntents.delete(String(id));
                }

                if (sql.includes("INSERT INTO restore_attachment_object_commits")) {
                  const [
                    id,
                    workspaceId,
                    attachmentPackageVerificationId,
                    attachmentObjectPlanId,
                    attachmentObjectCommitPreflightId,
                    actorMemberId,
                    docId,
                    sourceObjectKey,
                    destinationObjectKey,
                    sizeBytes,
                    contentType,
                    sha256,
                    packageSha256,
                    manifestSha256,
                    createdAt,
                  ] = values;
                  restoreAttachmentObjectCommits.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    attachment_package_verification_id: String(attachmentPackageVerificationId),
                    attachment_object_plan_id: String(attachmentObjectPlanId),
                    attachment_object_commit_preflight_id: String(attachmentObjectCommitPreflightId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    doc_id: String(docId),
                    source_object_key: String(sourceObjectKey),
                    destination_object_key: String(destinationObjectKey),
                    size_bytes: Number(sizeBytes),
                    content_type: String(contentType),
                    sha256: String(sha256),
                    package_sha256: String(packageSha256),
                    manifest_sha256: String(manifestSha256),
                    status: "stored_r2",
                    destructive_write: 1,
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO audit_events")) {
                  const [id, workspaceId, projectId, actorMemberId, action, metadataJson, createdAt] = values;
                  auditEvents.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    project_id: projectId === null ? null : String(projectId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    action: String(action),
                    metadata_json: String(metadataJson),
                    created_at: String(createdAt),
                  });
                }

                if (sql.includes("INSERT INTO provider_connections")) {
                  const [
                    id,
                    workspaceId,
                    connectedByMemberId,
                    scopesJson,
                    accessTokenCiphertext,
                    refreshTokenCiphertext,
                    tokenExpiresAt,
                    tokenType,
                    tokenKeyVersion,
                    connectedAt,
                    updatedAt,
                  ] = values;
                  const key = `${String(workspaceId)}:google`;
                  const existing = providerConnections.get(key);
                  providerConnections.set(key, {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    provider: "google",
                    status: "active",
                    scopes_json: String(scopesJson),
                    access_token_ciphertext: String(accessTokenCiphertext),
                    refresh_token_ciphertext: refreshTokenCiphertext === null
                      ? existing?.refresh_token_ciphertext ?? null
                      : String(refreshTokenCiphertext),
                    token_expires_at: tokenExpiresAt === null ? null : String(tokenExpiresAt),
                    token_type: String(tokenType),
                    token_key_version: String(tokenKeyVersion),
                    root_folder_id: existing?.root_folder_id ?? null,
                    last_error_code: null,
                    connected_at: String(connectedAt),
                    disconnected_at: null,
                    updated_at: String(updatedAt),
                  });
                  void connectedByMemberId;
                }

                if (sql.includes("INSERT INTO meta_provider_connections")) {
                  const [
                    id,
                    workspaceId,
                    connectedByMemberId,
                    scopesJson,
                    userAccessTokenCiphertext,
                    tokenExpiresAt,
                    tokenKeyVersion,
                    metaUserId,
                    connectedAt,
                    updatedAt,
                  ] = values;
                  metaProviderConnections.set(String(workspaceId), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    connected_by_member_id: connectedByMemberId === null ? null : String(connectedByMemberId),
                    status: "pending_page_selection",
                    scopes_json: String(scopesJson),
                    user_access_token_ciphertext: String(userAccessTokenCiphertext),
                    page_access_token_ciphertext: null,
                    token_expires_at: tokenExpiresAt === null ? null : String(tokenExpiresAt),
                    token_key_version: String(tokenKeyVersion),
                    meta_user_id: String(metaUserId),
                    page_id: null,
                    page_name: null,
                    instagram_account_id: null,
                    instagram_username: null,
                    last_error_code: null,
                    connected_at: String(connectedAt),
                    disconnected_at: null,
                    updated_at: String(updatedAt),
                  });
                }

                if (sql.includes("UPDATE meta_provider_connections") && sql.includes("page_access_token_ciphertext = ?")) {
                  const [
                    pageAccessTokenCiphertext,
                    pageId,
                    pageName,
                    instagramAccountId,
                    instagramUsername,
                    updatedAt,
                    workspaceId,
                  ] = values;
                  const row = metaProviderConnections.get(String(workspaceId));
                  if (row) {
                    row.status = "active";
                    row.page_access_token_ciphertext = String(pageAccessTokenCiphertext);
                    row.page_id = String(pageId);
                    row.page_name = String(pageName);
                    row.instagram_account_id = String(instagramAccountId);
                    row.instagram_username = instagramUsername === null ? null : String(instagramUsername);
                    row.last_error_code = null;
                    row.disconnected_at = null;
                    row.updated_at = String(updatedAt);
                  }
                }

                if (sql.includes("UPDATE meta_provider_connections") && sql.includes("status = 'disconnected'")) {
                  const [disconnectedAt, updatedAt, workspaceId] = values;
                  const row = metaProviderConnections.get(String(workspaceId));
                  if (row) {
                    row.status = "disconnected";
                    row.scopes_json = "[]";
                    row.user_access_token_ciphertext = null;
                    row.page_access_token_ciphertext = null;
                    row.token_expires_at = null;
                    row.meta_user_id = null;
                    row.page_id = null;
                    row.page_name = null;
                    row.instagram_account_id = null;
                    row.instagram_username = null;
                    row.last_error_code = null;
                    row.disconnected_at = String(disconnectedAt);
                    row.updated_at = String(updatedAt);
                  }
                }

                if (sql.includes("INSERT INTO meta_data_deletion_requests")) {
                  const [
                    id,
                    confirmationCode,
                    requestFingerprint,
                    metaUserIdSha256,
                    deletedConnectionCount,
                    requestedAt,
                    completedAt,
                    updatedAt,
                  ] = values;
                  metaDataDeletionRequests.set(String(confirmationCode), {
                    id: String(id),
                    confirmation_code: String(confirmationCode),
                    request_fingerprint: String(requestFingerprint),
                    meta_user_id_sha256: String(metaUserIdSha256),
                    status: "completed",
                    deleted_connection_count: Number(deletedConnectionCount),
                    requested_at: String(requestedAt),
                    completed_at: completedAt === null ? null : String(completedAt),
                    updated_at: String(updatedAt),
                  });
                }

                if (sql.includes("DELETE FROM meta_provider_connections WHERE meta_user_id = ?")) {
                  const [metaUserId] = values;
                  for (const [key, row] of metaProviderConnections) {
                    if (row.meta_user_id === String(metaUserId)) metaProviderConnections.delete(key);
                  }
                }

                if (sql.includes("UPDATE provider_connections") && sql.includes("status = 'disconnected'")) {
                  const [disconnectedAt, updatedAt, workspaceId] = values;
                  const row = providerConnections.get(`${String(workspaceId)}:google`);
                  if (row) {
                    row.status = "disconnected";
                    row.access_token_ciphertext = null;
                    row.refresh_token_ciphertext = null;
                    row.token_expires_at = null;
                    row.token_type = null;
                    row.disconnected_at = String(disconnectedAt);
                    row.updated_at = String(updatedAt);
                  }
                }

                if (sql.includes("UPDATE provider_connections") && sql.includes("root_folder_id = ?")) {
                  const [rootFolderId, updatedAt, workspaceId] = values;
                  const row = providerConnections.get(`${String(workspaceId)}:google`);
                  if (row) {
                    row.root_folder_id = String(rootFolderId);
                    row.updated_at = String(updatedAt);
                  }
                }

                if (sql.includes("UPDATE provider_connections") && sql.includes("SET scopes_json = ?")) {
                  const [
                    scopesJson,
                    accessTokenCiphertext,
                    refreshTokenCiphertext,
                    tokenExpiresAt,
                    tokenType,
                    tokenKeyVersion,
                    updatedAt,
                    workspaceId,
                  ] = values;
                  const row = providerConnections.get(`${String(workspaceId)}:google`);
                  if (row) {
                    row.scopes_json = String(scopesJson);
                    row.access_token_ciphertext = String(accessTokenCiphertext);
                    row.refresh_token_ciphertext = String(refreshTokenCiphertext);
                    row.token_expires_at = tokenExpiresAt === null ? null : String(tokenExpiresAt);
                    row.token_type = String(tokenType);
                    row.token_key_version = String(tokenKeyVersion);
                    row.last_error_code = null;
                    row.updated_at = String(updatedAt);
                  }
                }

                if (sql.includes("DELETE FROM restore_points")) {
                  const [workspaceId] = values;
                  const keep = new Set(
                    Array.from(restorePoints.values())
                      .filter((row) => row.workspace_id === workspaceId)
                      .sort((left, right) => right.created_at.localeCompare(left.created_at))
                      .slice(0, 5)
                      .map((row) => row.id),
                  );
                  for (const row of restorePoints.values()) {
                    if (row.workspace_id === workspaceId && !keep.has(row.id)) {
                      restorePoints.delete(row.id);
                    }
                  }
                }

                if (sql.includes("INSERT INTO operation_log")) {
                  const [
                    id,
                    workspaceId,
                    actorMemberId,
                    kind,
                    entityType,
                    entityId,
                    payloadJson,
                    createdAt,
                    appliedAt,
                  ] = values;
                  operationLogs.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    kind: String(kind),
                    entity_type: String(entityType),
                    entity_id: String(entityId),
                    payload_json: String(payloadJson),
                    status: "applied",
                    created_at: String(createdAt),
                    applied_at: String(appliedAt),
                  });
                }

                return { success: true, meta: { changes: mutationChanges ?? 1 }, results: [] };
              },
              async first<T>() {
                if (sql.includes("FROM magic_links")) {
                  const [tokenHash] = values;
                  const row = Array.from(magicLinks.values()).find((candidate) => candidate.token_hash === tokenHash);
                  if (!row) return null;
                  return {
                    id: row.id,
                    email_hash: row.email_hash,
                    consumed_at: row.consumed_at,
                    expires_at: row.expires_at,
                  } as T;
                }

                if (sql.includes("FROM sessions")) {
                  const [id] = values;
                  if (id === undefined) {
                    const row = Array.from(sessions.values())[0];
                    return row ? { id: row.id } as T : null;
                  }
                  const row = sessions.get(String(id));
                  if (!row) return null;
                  return {
                    id: row.id,
                    workspace_id: row.workspace_id,
                    member_id: row.member_id,
                    csrf_hash: row.csrf_hash,
                    revoked_at: row.revoked_at,
                    expires_at: row.expires_at,
                  } as T;
                }

                if (sql.includes("FROM provider_connections")) {
                  const [workspaceId] = values;
                  return (providerConnections.get(`${String(workspaceId)}:google`) ?? null) as T | null;
                }

                if (sql.includes("FROM meta_provider_connections")) {
                  const [workspaceId] = values;
                  return (metaProviderConnections.get(String(workspaceId)) ?? null) as T | null;
                }

                if (sql.includes("FROM meta_data_deletion_requests")) {
                  const [lookup] = values;
                  if (sql.includes("request_fingerprint = ?")) {
                    return (Array.from(metaDataDeletionRequests.values()).find((row) => row.request_fingerprint === String(lookup)) ?? null) as T | null;
                  }
                  return (metaDataDeletionRequests.get(String(lookup)) ?? null) as T | null;
                }

                if (sql.includes("FROM workspace_invites") && sql.includes("AND id = ?")) {
                  const [workspaceId, id, emailHash, invitedRole] = values;
                  const row = workspaceInvites.get(String(id));
                  if (
                    !row
                    || row.workspace_id !== String(workspaceId)
                    || row.email_hash !== String(emailHash)
                    || row.invited_role !== String(invitedRole)
                    || row.status !== "pending"
                  ) {
                    return null;
                  }
                  return {
                    id: row.id,
                    workspace_id: row.workspace_id,
                    email_hash: row.email_hash,
                    invited_role: row.invited_role,
                    status: row.status,
                    expires_at: row.expires_at,
                    created_at: row.created_at,
                  } as T;
                }

                if (sql.includes("FROM workspace_invites")) {
                  const [tokenHash] = values;
                  const row = Array.from(workspaceInvites.values()).find((candidate) => candidate.token_hash === tokenHash);
                  return row ? {
                    id: row.id,
                    workspace_id: row.workspace_id,
                    email_hash: row.email_hash,
                    invited_role: row.invited_role,
                    status: row.status,
                    expires_at: row.expires_at,
                    accepted_at: row.accepted_at,
                  } as T : null;
                }

                if (sql.includes("FROM invite_delivery_suppressions")) {
                  const [targetHash] = values;
                  const rows = Array.from(inviteDeliverySuppressions.values())
                    .filter((row) => row.provider === "resend" && row.target_hash === String(targetHash))
                    .sort((left, right) => {
                      const reasonOrder = (reason: string) => reason === "complained" ? 0 : reason === "bounced" ? 1 : 2;
                      return reasonOrder(left.suppression_reason) - reasonOrder(right.suppression_reason)
                        || right.last_seen_at.localeCompare(left.last_seen_at)
                        || right.id.localeCompare(left.id);
                    });
                  return (rows[0] ?? null) as T | null;
                }

                if (sql.includes("FROM invite_delivery_attempts")) {
                  const row = sql.includes("WHERE id = ?")
                    ? (() => {
                      const [id, providerMessageId] = values;
                      const candidate = inviteDeliveryAttempts.get(String(id));
                      return candidate
                        && candidate.provider === "resend"
                        && candidate.delivery_mode === "live_resend"
                        && (!candidate.provider_message_id || candidate.provider_message_id === String(providerMessageId))
                        ? candidate
                        : undefined;
                    })()
                    : (() => {
                      const [providerMessageId] = values;
                      return Array.from(inviteDeliveryAttempts.values()).find((candidate) =>
                        candidate.provider === "resend"
                        && candidate.delivery_mode === "live_resend"
                        && candidate.provider_message_id === String(providerMessageId)
                      );
                    })();
                  return row
                    ? {
                      id: row.id,
                      workspace_id: row.workspace_id,
                      invite_id: row.invite_id,
                      target_hash: row.target_hash,
                    } as T
                    : null;
                }

                if (sql.includes("FROM workspace_members")) {
                  if (sql.includes("workspace_members.workspace_id = ?") || sql.includes("WHERE workspace_id = ?")) {
                    const [workspaceId, emailHash] = values;
                    const row = Array.from(workspaceMembers.values()).find((candidate) =>
                      candidate.workspace_id === String(workspaceId)
                      && candidate.email_hash === String(emailHash)
                    );
                    return row ? {
                      id: row.id,
                      workspace_id: row.workspace_id,
                      role: row.role,
                      status: row.status,
                    } as T : null;
                  }
                  if (sql.includes("email_hash = ?")) {
                    const [emailHash] = values;
                    const row = Array.from(workspaceMembers.values()).find((candidate) => candidate.email_hash === emailHash);
                    return row ? {
                      id: row.id,
                      workspace_id: row.workspace_id,
                      role: row.role,
                      status: row.status,
                    } as T : null;
                  }
                  if (sql.includes("id = ?")) {
                    const [id] = values;
                    const row = workspaceMembers.get(String(id));
                    return row ? {
                      id: row.id,
                      workspace_id: row.workspace_id,
                      role: row.role,
                      status: row.status,
                    } as T : null;
                  }
                }

                if (sql.includes("FROM project_memberships") && sql.includes("INNER JOIN projects")) {
                  const [workspaceId, projectId, memberId, projectRole] = values;
                  const project = projects.get(String(projectId));
                  if (!project || project.workspace_id !== String(workspaceId)) return null;
                  if (memberId !== undefined && projectRole !== undefined) {
                    const row = projectMemberships.get(`${String(projectId)}:${String(memberId)}`);
                    return row && row.project_role === String(projectRole)
                      ? { ...row, workspace_id: project.workspace_id } as T
                      : null;
                  }
                  const row = Array.from(projectMemberships.values()).find((candidate) => candidate.project_id === String(projectId));
                  return row ? { ...row, workspace_id: project.workspace_id } as T : null;
                }

                if (sql.includes("FROM project_memberships")) {
                  const [projectId, memberId] = values;
                  const row = projectMemberships.get(`${String(projectId)}:${String(memberId)}`);
                  return row ? row as T : null;
                }

                if (sql.includes("FROM record_permissions") && sql.includes("AND id = ?")) {
                  const [workspaceId, permissionId, entityType, entityId, memberId, permission] = values;
                  const row = Array.from(recordPermissions.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.id === String(permissionId)
                    && candidate.entity_type === String(entityType)
                    && candidate.entity_id === String(entityId)
                    && candidate.member_id === String(memberId)
                    && candidate.permission === String(permission)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM record_permissions") && sql.includes("AND permission = ?")) {
                  const [workspaceId, entityType, entityId, memberId, permission] = values;
                  const row = Array.from(recordPermissions.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.entity_type === String(entityType)
                    && candidate.entity_id === String(entityId)
                    && candidate.member_id === String(memberId)
                    && candidate.permission === String(permission)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM record_permissions")) {
                  const [workspaceId, entityType, entityId, memberId, now] = values;
                  const acceptedPermissions = sql.includes("'comment'")
                    ? ["comment", "write", "admin"]
                    : ["write", "admin"];
                  const row = Array.from(recordPermissions.values())
                    .filter((candidate) =>
                      candidate.workspace_id === String(workspaceId)
                      && candidate.entity_type === String(entityType)
                      && candidate.entity_id === String(entityId)
                      && candidate.member_id === String(memberId)
                      && acceptedPermissions.includes(candidate.permission)
                      && (candidate.expires_at === null || candidate.expires_at > String(now))
                    )
                    .sort((left, right) => (left.permission === "admin" ? -1 : 1) - (right.permission === "admin" ? -1 : 1)
                      || right.updated_at.localeCompare(left.updated_at))[0];
                  return row ? row as T : null;
                }

                if (sql.includes("FROM record_mutation_requests")) {
                  const [workspaceId, id] = values;
                  const row = recordMutationRequests.get(String(id));
                  return row && row.workspace_id === String(workspaceId) ? row as T : null;
                }

                if (sql.includes("FROM film_profile_mutation_requests")) {
                  const [workspaceId, id] = values;
                  const row = filmProfileMutationRequests.get(String(id));
                  return row && row.workspace_id === String(workspaceId) ? row as T : null;
                }

                if (sql.includes("FROM film_profiles")) {
                  const [projectId] = values;
                  const row = filmProfiles.get(String(projectId));
                  return row ? { project_id: row.project_id, updated_at: row.updated_at } as T : null;
                }

                if (sql.includes("FROM restore_attachment_package_preflights")) {
                  const [id, workspaceId] = values;
                  const row = restoreAttachmentPackagePreflights.get(String(id));
                  return row && row.workspace_id === String(workspaceId) ? row as T : null;
                }

                if (sql.includes("FROM restore_attachment_package_verifications")) {
                  const [id, workspaceId] = values;
                  const row = restoreAttachmentPackageVerifications.get(String(id));
                  return row && row.workspace_id === String(workspaceId) ? row as T : null;
                }

                if (sql.includes("FROM restore_attachment_object_plans")) {
                  const [id, workspaceId] = values;
                  const row = restoreAttachmentObjectPlans.get(String(id));
                  return row && row.workspace_id === String(workspaceId) ? row as T : null;
                }

                if (sql.includes("FROM restore_attachment_object_commit_preflights")) {
                  const [id, workspaceId] = values;
                  const row = restoreAttachmentObjectCommitPreflights.get(String(id));
                  return row && row.workspace_id === String(workspaceId) ? row as T : null;
                }

                if (sql.includes("FROM restore_attachment_object_commits")) {
                  const [preflightId, docId] = values;
                  const row = Array.from(restoreAttachmentObjectCommits.values()).find((candidate) =>
                    candidate.attachment_object_commit_preflight_id === String(preflightId)
                    && candidate.doc_id === String(docId)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM attachment_upload_intents")) {
                  const [workspaceId, objectKey] = values;
                  const row = Array.from(attachmentIntents.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.object_key === String(objectKey)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM operation_log")) {
                  if (sql.includes("WHERE id = ?")) {
                    const [id] = values;
                    const row = operationLogs.get(String(id));
                    return row ? row as T : null;
                  }
                  if (sql.includes("workspace_id = ?")) {
                    const [workspaceId, entityType, entityId, kind] = values;
                    const row = Array.from(operationLogs.values()).find((candidate) =>
                      candidate.workspace_id === workspaceId
                      && candidate.entity_type === entityType
                      && candidate.entity_id === entityId
                      && candidate.kind === kind
                      && candidate.status === "applied"
                    );
                    return row ? row as T : null;
                  }
                  const row = Array.from(operationLogs.values())[0];
                  return row ? { id: row.id } as T : null;
                }

                if (sql.includes("FROM backup_object_download_plans")) {
                  const [id, workspaceId, restorePointId] = values;
                  const row = backupObjectDownloadPlans.get(String(id));
                  return row
                    && row.workspace_id === String(workspaceId)
                    && row.restore_point_id === String(restorePointId)
                    ? row as T
                    : null;
                }

                if (sql.includes("FROM restore_points")) {
                  const [workspaceId, restorePointId, snapshotRefPrefix] = values;
                  const prefix = String(snapshotRefPrefix ?? "").replace(/%$/, "");
                  const row = Array.from(restorePoints.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.id === String(restorePointId)
                    && candidate.snapshot_ref.startsWith(prefix)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM restore_approvals")) {
                  const [workspaceId, approvalId] = values;
                  const row = Array.from(restoreApprovals.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.id === String(approvalId)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM restore_commit_attempts")) {
                  const [workspaceId, commitAttemptId] = values;
                  const row = Array.from(restoreCommitAttempts.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.id === String(commitAttemptId)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM restore_application_preflights")) {
                  const [workspaceId, applicationPreflightId] = values;
                  const row = Array.from(restoreApplicationPreflights.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.id === String(applicationPreflightId)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM restore_planning_previews")) {
                  const [workspaceId, planningPreviewId] = values;
                  const row = Array.from(restorePlanningPreviews.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.id === String(planningPreviewId)
                  );
                  return row ? row as T : null;
                }

                if (sql.includes("FROM workspaces")) {
                  const [id] = values;
                  const row = workspaces.get(String(id));
                  return row ? {
                    id: row.id,
                    name: row.name,
                    updated_at: "2026-07-09T00:00:00.000Z",
                  } as T : null;
                }

                const planningTable = [
                  "locations",
                  "opportunities",
                  "meeting_notes",
                  "equipment_requests",
                  "shows",
                  "merch_items",
                  "media_items",
                  "production_roles",
                ].find((table) => sql.includes(`FROM ${table}`));
                if (planningTable) {
                  if (sql.includes("WHERE id = ?")) {
                    const [id, workspaceId] = values;
                    const row = planningRows.get(`${planningTable}:${String(id)}`);
                    if (!row) return null;
                    if (sql.includes("workspace_id = ?") && row.workspace_id !== String(workspaceId)) return null;
                    if (sql.includes("SELECT *")) {
                      return {
                        id: row.id,
                        workspace_id: row.workspace_id,
                        project_id: row.project_id,
                        title: row.title,
                        name: row.title,
                        notes: row.notes_json,
                        notes_markdown: row.notes_json,
                        description: row.notes_json,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        ...row.fields,
                      } as T;
                    }
                    return { id: row.id } as T;
                  }
                  const row = Array.from(planningRows.values()).find((candidate) => candidate.table === planningTable);
                  return row ? { id: row.id } as T : null;
                }

                if (sql.includes("FROM projects")) {
                  if (sql.includes("LEFT JOIN film_profiles")) {
                    const [workspaceId, id] = values;
                    const project = projects.get(String(id));
                    if (!project || project.workspace_id !== String(workspaceId)) return null;
                    const profile = filmProfiles.get(String(id));
                    return {
                      project_id: project.id,
                      project_title: project.title,
                      runtime_minutes: profile?.runtime_minutes ?? null,
                      format: profile?.format ?? null,
                      shoot_start: profile?.shoot_start ?? null,
                      shoot_end: profile?.shoot_end ?? null,
                      budget_cents: profile?.budget_cents ?? null,
                      spent_cents: profile?.spent_cents ?? null,
                      profile_updated_at: profile?.updated_at ?? null,
                    } as T;
                  }
                  if (sql.includes("owner_member_id = ?")) {
                    const [workspaceId, id, ownerMemberId] = values;
                    const row = projects.get(String(id));
                    return row && row.workspace_id === String(workspaceId) && row.owner_member_id === String(ownerMemberId)
                      ? { id: row.id } as T
                      : null;
                  }
                  if (sql.includes("owner_member_id")) {
                    const [workspaceId, id] = values;
                    const row = projects.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { id: row.id, workspace_id: row.workspace_id, owner_member_id: row.owner_member_id ?? null } as T
                      : null;
                  }
                  if (sql.includes("updated_at") && sql.includes("AND id = ?")) {
                    const [workspaceId, id] = values;
                    const row = projects.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { ...row, id: row.id, workspace_id: row.workspace_id, updated_at: row.updated_at ?? null } as T
                      : null;
                  }
                  if (sql.includes("workspace_id = ?")) {
                    if (sql.includes("AND id = ?")) {
                      const [workspaceId, id] = values;
                      const row = projects.get(String(id));
                      return row && row.workspace_id === String(workspaceId) ? { id: row.id } as T : null;
                    }
                    const [workspaceId, title] = values;
                    const row = Array.from(projects.values()).find((candidate) =>
                      candidate.workspace_id === workspaceId
                      && candidate.title.toLowerCase() === String(title).toLowerCase()
                    );
                    return row ? { id: row.id } as T : null;
                  }
                  const [id] = values;
                  const row = projects.get(String(id));
                  return row ? { id: row.id, workspace_id: row.workspace_id } as T : null;
                }

                if (sql.includes("FROM tasks")) {
                  if (sql.includes("owner_member_id = ?")) {
                    const [workspaceId, id, ownerMemberId] = values;
                    const row = tasks.get(String(id));
                    return row && row.workspace_id === String(workspaceId) && row.owner_member_id === String(ownerMemberId)
                      ? { id: row.id } as T
                      : null;
                  }
                  if (sql.includes("owner_member_id")) {
                    const [workspaceId, id] = values;
                    const row = tasks.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { id: row.id, workspace_id: row.workspace_id, owner_member_id: row.owner_member_id ?? null } as T
                      : null;
                  }
                  if (sql.includes("updated_at") && sql.includes("AND id = ?")) {
                    const [workspaceId, id] = values;
                    const row = tasks.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { ...row, id: row.id, workspace_id: row.workspace_id, updated_at: row.updated_at ?? null } as T
                      : null;
                  }
                  const [id] = values;
                  const row = tasks.get(String(id));
                  return row ? { ...row, id: row.id, workspace_id: row.workspace_id } as T : null;
                }

                if (sql.includes("FROM documents")) {
                  if (sql.includes("document_type") && sql.includes("updated_at") && !sql.includes("workspace_id = ?")) {
                    const [id] = values;
                    const row = documents.get(String(id));
                    return row ? {
                      ...row,
                      owner_member_id: row.owner_member_id ?? null,
                      updated_at: row.updated_at ?? null,
                    } as T : null;
                  }
                  if (sql.replace(/\s+/g, " ").includes("SELECT id FROM documents WHERE workspace_id = ?") && !sql.includes("owner_member_id")) {
                    const [workspaceId, id] = values;
                    const row = documents.get(String(id));
                    return row && row.workspace_id === String(workspaceId) ? { id: row.id } as T : null;
                  }
                  if (sql.includes("owner_member_id = ?")) {
                    const [workspaceId, id, ownerMemberId] = values;
                    const row = documents.get(String(id));
                    return row && row.workspace_id === String(workspaceId) && row.owner_member_id === String(ownerMemberId)
                      ? { id: row.id } as T
                      : null;
                  }
                  if (sql.includes("owner_member_id")) {
                    const [workspaceId, id] = values;
                    const row = documents.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { id: row.id, workspace_id: row.workspace_id, owner_member_id: row.owner_member_id ?? null } as T
                      : null;
                  }
                  if (sql.includes("updated_at") && sql.includes("AND id = ?")) {
                    const [workspaceId, id] = values;
                    const row = documents.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { ...row, id: row.id, workspace_id: row.workspace_id, updated_at: row.updated_at ?? null } as T
                      : null;
                  }
                  const [id] = values;
                  const row = documents.get(String(id));
                  return row ? { id: row.id, workspace_id: row.workspace_id } as T : null;
                }

                if (sql.includes("FROM people")) {
                  if (sql.includes("owner_member_id")) {
                    const [workspaceId, id] = values;
                    const row = people.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { id: row.id, workspace_id: row.workspace_id, owner_member_id: row.owner_member_id ?? null } as T
                      : null;
                  }
                  if (sql.includes("updated_at") && sql.includes("AND id = ?")) {
                    const [workspaceId, id] = values;
                    const row = people.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { ...row, id: row.id, workspace_id: row.workspace_id, updated_at: row.updated_at ?? null } as T
                      : null;
                  }
                  const [id] = values;
                  const row = people.get(String(id));
                  return row ? { id: row.id, workspace_id: row.workspace_id } as T : null;
                }

                if (sql.includes("FROM equipment")) {
                  if (sql.includes("owner_member_id = ?")) {
                    const [workspaceId, id, ownerMemberId] = values;
                    const row = equipment.get(String(id));
                    return row && row.workspace_id === String(workspaceId) && row.owner_member_id === String(ownerMemberId)
                      ? { id: row.id } as T
                      : null;
                  }
                  if (sql.includes("owner_member_id")) {
                    const [workspaceId, id] = values;
                    const row = equipment.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { id: row.id, workspace_id: row.workspace_id, owner_member_id: row.owner_member_id ?? null } as T
                      : null;
                  }
                  if (sql.includes("updated_at") && sql.includes("AND id = ?")) {
                    const [workspaceId, id] = values;
                    const row = equipment.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { ...row, id: row.id, workspace_id: row.workspace_id, updated_at: row.updated_at ?? null } as T
                      : null;
                  }
                  const [id] = values;
                  const row = equipment.get(String(id));
                  return row ? { id: row.id, workspace_id: row.workspace_id } as T : null;
                }

                if (sql.includes("FROM expenses")) {
                  if (sql.includes("owner_member_id")) {
                    const [workspaceId, id] = values;
                    const row = expenses.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { id: row.id, workspace_id: row.workspace_id, owner_member_id: row.owner_member_id ?? null } as T
                      : null;
                  }
                  if (sql.includes("updated_at") && sql.includes("AND id = ?")) {
                    const [workspaceId, id] = values;
                    const row = expenses.get(String(id));
                    return row && row.workspace_id === String(workspaceId)
                      ? { ...row, id: row.id, workspace_id: row.workspace_id, updated_at: row.updated_at ?? null } as T
                      : null;
                  }
                  const [id] = values;
                  const row = expenses.get(String(id));
                  return row ? { id: row.id, workspace_id: row.workspace_id } as T : null;
                }

                return null;
              },
              async all<T>() {
                if (sql.includes("FROM meta_provider_connections") && sql.includes("meta_user_id = ?")) {
                  const [metaUserId] = values;
                  const rows = Array.from(metaProviderConnections.values())
                    .filter((row) => row.meta_user_id === String(metaUserId))
                    .map((row) => ({ workspace_id: row.workspace_id }));
                  return { results: rows as T[], success: true, meta: {} };
                }
                if (sql.includes("FROM workspace_members wm")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(workspaceMembers.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .slice(0, Number(limit))
                    .map((row) => ({
                      ...row,
                      display_name: row.display_name ?? null,
                      last_seen_at: row.last_seen_at ?? null,
                    }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("SELECT entity_type, entity_id") && sql.includes("FROM record_permissions")) {
                  const [workspaceId, memberId, now] = values;
                  const rows = Array.from(recordPermissions.values())
                    .filter((row) =>
                      row.workspace_id === String(workspaceId)
                      && row.member_id === String(memberId)
                      && (row.expires_at === null || row.expires_at > String(now))
                    )
                    .map((row) => ({ entity_type: row.entity_type, entity_id: row.entity_id }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("SELECT 'project' AS entity_type") && sql.includes("FROM project_memberships")) {
                  const [memberId, limit] = values;
                  const rows = Array.from(projectMemberships.values())
                    .filter((row) => row.member_id === String(memberId))
                    .slice(0, Number(limit))
                    .map((row) => ({ entity_type: "project", entity_id: row.project_id }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM film_profiles fp")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(filmProfiles.values())
                    .filter((row) => projects.get(row.project_id)?.workspace_id === String(workspaceId))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM projects") && sql.includes("WHERE workspace_id = ?") && !sql.includes("project_memberships")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(projects.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .slice(0, Number(limit))
                    .map((row) => ({
                      ...row,
                      project_type: row.project_type ?? "film",
                      status: row.status ?? "active",
                      logline: row.logline ?? null,
                      owner_member_id: row.owner_member_id ?? null,
                      created_at: "2026-07-09T00:00:00.000Z",
                      updated_at: row.updated_at ?? "2026-07-09T00:00:00.000Z",
                    }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM tasks") && sql.includes("WHERE workspace_id = ?")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(tasks.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .slice(0, Number(limit))
                    .map((row) => ({
                      ...row,
                      status: row.status ?? "todo",
                      priority: row.priority ?? "normal",
                      due_at: row.due_at ?? null,
                      assignee_member_id: row.assignee_member_id ?? null,
                      owner_member_id: row.owner_member_id ?? null,
                      created_at: "2026-07-09T00:00:00.000Z",
                      updated_at: row.updated_at ?? "2026-07-09T00:00:00.000Z",
                    }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM documents") && sql.includes("WHERE workspace_id = ?")) {
                  const [, , workspaceId, limit] = values;
                  const rows = Array.from(documents.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .slice(0, Number(limit))
                    .map((row) => ({
                      ...row,
                      markdown_snapshot: row.markdown_snapshot ?? null,
                      markdown_truncated: 0,
                      external_url: row.external_url ?? null,
                      owner_member_id: row.owner_member_id ?? null,
                      created_at: "2026-07-09T00:00:00.000Z",
                      updated_at: row.updated_at ?? "2026-07-09T00:00:00.000Z",
                    }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM people") && sql.includes("WHERE workspace_id = ?")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(people.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .slice(0, Number(limit))
                    .map((row) => ({ ...row, owner_member_id: row.owner_member_id ?? null, updated_at: row.updated_at ?? null }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM project_people pp")) {
                  const [workspaceId, personWorkspaceId, limit] = values;
                  const rows = Array.from(projectPeople.values())
                    .filter((row) =>
                      projects.get(row.project_id)?.workspace_id === String(workspaceId)
                      && people.get(row.person_id)?.workspace_id === String(personWorkspaceId)
                    )
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM equipment") && sql.includes("WHERE workspace_id = ?")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(equipment.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .slice(0, Number(limit))
                    .map((row) => ({ ...row, owner_member_id: row.owner_member_id ?? null, updated_at: row.updated_at ?? null }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM expenses") && sql.includes("WHERE workspace_id = ?")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(expenses.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .slice(0, Number(limit))
                    .map((row) => ({ ...row, owner_member_id: row.owner_member_id ?? null, updated_at: row.updated_at ?? null }));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("SELECT id, label, created_at") && sql.includes("FROM restore_points")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(restorePoints.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .sort((left, right) => right.created_at.localeCompare(left.created_at))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM workspace_invites")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(workspaceInvites.values())
                    .filter((row) => row.workspace_id === String(workspaceId) && row.status === "pending")
                    .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM invite_delivery_suppressions")) {
                  const [workspaceId, limit] = values;
                  const rows = Array.from(inviteDeliverySuppressions.values())
                    .filter((row) => row.workspace_id === String(workspaceId))
                    .sort((left, right) => right.last_seen_at.localeCompare(left.last_seen_at) || right.id.localeCompare(left.id))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM project_memberships")) {
                  const [workspaceId, projectId, limit] = values;
                  const project = projects.get(String(projectId));
                  const rows = project && project.workspace_id === String(workspaceId)
                    ? Array.from(projectMemberships.values())
                      .filter((row) => row.project_id === String(projectId))
                      .sort((left, right) => left.member_id.localeCompare(right.member_id) || left.project_role.localeCompare(right.project_role))
                      .slice(0, Number(limit))
                      .map((row) => ({ ...row, workspace_id: project.workspace_id }))
                    : [];
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM record_permissions")) {
                  const [workspaceId, entityType, entityId, now, limit] = values;
                  const expiredOnly = sql.includes("expires_at IS NOT NULL");
                  const rows = Array.from(recordPermissions.values())
                    .filter((row) =>
                      row.workspace_id === String(workspaceId)
                      && row.entity_type === String(entityType)
                      && row.entity_id === String(entityId)
                      && (expiredOnly
                        ? row.expires_at !== null && row.expires_at <= String(now)
                        : row.expires_at === null || row.expires_at > String(now))
                    )
                    .sort((left, right) => expiredOnly
                      ? (right.expires_at ?? "").localeCompare(left.expires_at ?? "") || left.member_id.localeCompare(right.member_id) || left.permission.localeCompare(right.permission)
                      : left.member_id.localeCompare(right.member_id) || left.permission.localeCompare(right.permission))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM record_comment_intents")) {
                  const [workspaceId, entityType, entityId, limit] = values;
                  const rows = Array.from(recordCommentIntents.values())
                    .filter((row) =>
                      row.workspace_id === String(workspaceId)
                      && row.entity_type === String(entityType)
                      && row.entity_id === String(entityId)
                    )
                    .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM record_mutation_requests")) {
                  const [workspaceId, entityType, entityId, limit] = values;
                  const rows = Array.from(recordMutationRequests.values())
                    .filter((row) =>
                      row.workspace_id === String(workspaceId)
                      && row.entity_type === String(entityType)
                      && row.entity_id === String(entityId)
                    )
                    .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM film_profile_mutation_requests")) {
                  const [workspaceId, projectId, limit] = values;
                  const rows = Array.from(filmProfileMutationRequests.values())
                    .filter((row) =>
                      row.workspace_id === String(workspaceId)
                      && row.project_id === String(projectId)
                    )
                    .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM audit_events")) {
                  if (sql.includes("json_extract(metadata_json, '$.requestId')")) {
                    const [workspaceId, requestId, limit] = values;
                    const rows = Array.from(auditEvents.values())
                      .filter((row) => {
                        if (row.workspace_id !== String(workspaceId) || !row.action.startsWith("record_mutation.")) return false;
                        try {
                          const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
                          return metadata.requestId === String(requestId);
                        } catch {
                          return false;
                        }
                      })
                      .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                      .slice(0, Number(limit));
                    return { results: rows as T[], success: true, meta: {} };
                  }

	                  if (sql.includes("record_mutation.request_created") && sql.includes("json_extract")) {
	                    const [workspaceId, entityType, entityId, limit] = values;
	                    const rows = Array.from(auditEvents.values())
	                      .filter((row) => {
	                        if (row.workspace_id !== String(workspaceId) || row.action !== "record_mutation.request_created") return false;
	                        try {
	                          const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
	                          return metadata.entityType === String(entityType) && metadata.entityId === String(entityId);
	                        } catch {
	                          return false;
	                        }
	                      })
	                      .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
	                      .slice(0, Number(limit));
	                    return { results: rows as T[], success: true, meta: {} };
	                  }

	                  if (sql.includes("record_owner.transferred") && sql.includes("json_extract")) {
	                    const [workspaceId, entityType, entityId, limit] = values;
	                    const rows = Array.from(auditEvents.values())
                      .filter((row) => {
                        if (row.workspace_id !== String(workspaceId) || row.action !== "record_owner.transferred") return false;
                        try {
                          const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
                          return metadata.entityType === String(entityType) && metadata.entityId === String(entityId);
                        } catch {
                          return false;
                        }
                      })
                      .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                      .slice(0, Number(limit));
	                    return { results: rows as T[], success: true, meta: {} };
	                  }

	                  if (sql.includes("project_membership.assigned") && sql.includes("project_membership.revoked")) {
	                    const [workspaceId, projectId, limit] = values;
	                    const rows = Array.from(auditEvents.values())
	                      .filter((row) =>
	                        row.workspace_id === String(workspaceId)
	                        && row.project_id === String(projectId)
	                        && (row.action === "project_membership.assigned" || row.action === "project_membership.revoked")
	                      )
	                      .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
	                      .slice(0, Number(limit));
	                    return { results: rows as T[], success: true, meta: {} };
	                  }

	                  if (sql.includes("record_permission.assigned") && sql.includes("record_permission.revoked") && sql.includes("json_extract")) {
	                    const [workspaceId, entityType, entityId, limit] = values;
	                    const rows = Array.from(auditEvents.values())
                      .filter((row) => {
                        if (
                          row.workspace_id !== String(workspaceId)
                          || (row.action !== "record_permission.assigned" && row.action !== "record_permission.revoked")
                        ) {
                          return false;
                        }
                        try {
                          const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
                          return metadata.entityType === String(entityType) && metadata.entityId === String(entityId);
                        } catch {
                          return false;
                        }
                      })
                      .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                      .slice(0, Number(limit));
                    return { results: rows as T[], success: true, meta: {} };
                  }

                  const hasActionFilter = sql.includes("instr(action, ?) = 1");
                  const [workspaceId, actionPrefixOrLimit, limitOrOffset, offsetValue] = values;
                  const actionPrefix = hasActionFilter ? String(actionPrefixOrLimit) : null;
                  const limit = Number(hasActionFilter ? limitOrOffset : actionPrefixOrLimit);
                  const offset = Number(hasActionFilter ? offsetValue : limitOrOffset ?? 0);
                  const rows = Array.from(auditEvents.values())
                    .filter((row) =>
                      row.workspace_id === String(workspaceId)
                      && (!actionPrefix || row.action.startsWith(actionPrefix))
                    )
                    .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
                    .slice(offset, offset + limit);
                  return { results: rows as T[], success: true, meta: {} };
                }

                if (sql.includes("FROM restore_points")) {
                  const [workspaceId, snapshotRefPrefix, limit] = values;
                  const prefix = String(snapshotRefPrefix ?? "").replace(/%$/, "");
                  const rows = Array.from(restorePoints.values())
                    .filter((row) => row.workspace_id === String(workspaceId) && row.snapshot_ref.startsWith(prefix))
                    .sort((left, right) => right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id))
                    .slice(0, Number(limit));
                  return { results: rows as T[], success: true, meta: {} };
                }

                const planningTable = [
                  "locations",
                  "opportunities",
                  "meeting_notes",
                  "equipment_requests",
                  "shows",
                  "merch_items",
                  "media_items",
                  "production_roles",
                ].find((table) => sql.includes(`FROM ${table}`));
                if (planningTable) {
                  const [workspaceId, limit] = values;
                  const cappedLimit = Number(limit);
                  const rows = Array.from(planningRows.values())
                    .filter((row) => row.table === planningTable && row.workspace_id === workspaceId)
                    .slice(0, Number.isSafeInteger(cappedLimit) ? cappedLimit : 1000)
                    .map((row) => ({
                      id: row.id,
                      workspace_id: row.workspace_id,
                      project_id: row.project_id,
                      title: row.title,
                      name: row.title,
                      notes: row.notes_json,
                      created_at: row.created_at,
                      updated_at: row.updated_at,
                      location_type: row.fields.location_type ?? null,
                      opportunity_type: row.fields.opportunity_type ?? null,
                      due_at: row.fields.due_at ?? null,
                      website_url: row.fields.website_url ?? null,
                      tags_json: row.fields.tags_json ?? null,
                      meeting_type: row.fields.meeting_type ?? null,
                      meeting_at: row.fields.meeting_at ?? null,
                      participants_json: row.fields.participants_json ?? null,
                      status: row.fields.status ?? null,
                      checkout_start: row.fields.checkout_start ?? null,
                      checkout_end: row.fields.checkout_end ?? null,
                      show_type: row.fields.show_type ?? null,
                      channels_json: row.fields.channels_json ?? null,
                      category: row.fields.category ?? null,
                      quantity_on_hand: row.fields.quantity_on_hand ?? null,
                      media_type: row.fields.media_type ?? null,
                      url: row.fields.url ?? null,
                      department: row.fields.department ?? null,
                    }));

                  return { results: rows as T[], success: true, meta: {} };
                }

                return { results: [] as T[], success: true, meta: {} };
              },
            };
          },
        };
      },
    } as unknown as D1Database,
  };
}

function createSessionKV(): { kv: KVNamespace; values: Map<string, string> } {
  const values = new Map<string, string>();

  return {
    values,
    kv: {
      async put(key: string, value: string) {
        values.set(key, value);
      },
      async get(key: string) {
        return values.get(key) ?? null;
      },
      async delete(key: string) {
        values.delete(key);
      },
    } as unknown as KVNamespace,
  };
}

async function sha256HexForTest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function svixHeadersForTest(
  payload: string,
  options: {
    secretBytes?: Uint8Array;
    svixId?: string;
    timestamp?: number;
  } = {},
): Promise<{ secret: string; headers: Record<string, string> }> {
  const secretBytes = options.secretBytes ?? new TextEncoder().encode("test_resend_webhook_secret");
  const svixId = options.svixId ?? "msg_test_resend_webhook_123456";
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = await hmacSha256Base64ForTest(secretBytes, `${svixId}.${timestamp}.${payload}`);
  return {
    secret: `whsec_${base64ForTest(secretBytes)}`,
    headers: {
      "svix-id": svixId,
      "svix-timestamp": String(timestamp),
      "svix-signature": `v1,${signature}`,
    },
  };
}

async function hmacSha256Base64ForTest(secretBytes: Uint8Array, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    copyArrayBufferForTest(secretBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64ForTest(new Uint8Array(signature));
}

function base64ForTest(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function metaSignedRequestForTest(
  appSecret: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encodedPayload = base64ForTest(payloadBytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)));
  const encodedSignature = base64ForTest(signature)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  return `${encodedSignature}.${encodedPayload}`;
}

function copyArrayBufferForTest(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

type FakeAttachmentIntentRow = {
  id: string;
  workspace_id: string;
  doc_id: string;
  object_key: string;
  name: string;
  source_path: string | null;
  size_bytes: number;
  content_type: string;
  sha256: string;
  storage_key: string | null;
  commit_token_hash: string;
  status: "prepared" | "committed_dry_run" | "stored_r2";
  prepared_at: string;
  expires_at: string;
  committed_at: string | null;
  updated_at: string;
};

type FakeAttachmentPackagePlanRow = {
  id: string;
  workspace_id: string;
  actor_member_id: string | null;
  object_keys_json: string;
  object_count: number;
  total_size_bytes: number;
  package_token_hash: string;
  expires_at: string;
  created_at: string;
};

function fakeStoredAttachmentIntent(options: {
  id: string;
  docId: string;
  objectKey: string;
  name: string;
  committedAt: string;
}): FakeAttachmentIntentRow {
  return {
    id: options.id,
    workspace_id: "workspace_acme",
    doc_id: options.docId,
    object_key: options.objectKey,
    name: options.name,
    source_path: null,
    size_bytes: 12,
    content_type: "image/png",
    sha256: "a".repeat(64),
    storage_key: null,
    commit_token_hash: "token_hash",
    status: "stored_r2",
    prepared_at: options.committedAt,
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    committed_at: options.committedAt,
    updated_at: options.committedAt,
  };
}

function createAttachmentIntentD1(): {
  db: D1Database;
  rows: Map<string, FakeAttachmentIntentRow>;
  packagePlans: Map<string, FakeAttachmentPackagePlanRow>;
  auditEvents: Map<string, FakeAuditEventRow>;
  sessions: Map<string, FakeSessionRow>;
} {
  const rows = new Map<string, FakeAttachmentIntentRow>();
  const packagePlans = new Map<string, FakeAttachmentPackagePlanRow>();
  const auditEvents = new Map<string, FakeAuditEventRow>();
  const sessions = new Map<string, FakeSessionRow>();
  const identityIndex = new Map<string, string>();

  return {
    rows,
    packagePlans,
    auditEvents,
    sessions,
    db: {
      async batch(statements: D1PreparedStatement[]) {
        const results: D1Result[] = [];
        for (const statement of statements) results.push(await statement.run());
        return results;
      },
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            return {
              async run() {
                let changes = 0;
                if (sql.includes("INSERT INTO attachment_upload_intents")) {
                  const [
                    id,
                    workspaceId,
                    docId,
                    objectKey,
                    name,
                    sourcePath,
                    sizeBytes,
                    contentType,
                    sha256,
                    storageKey,
                    commitTokenHash,
                    preparedAt,
                    expiresAt,
                    updatedAt,
                  ] = values.map((value) => value ?? null);
                  const identityKey = [workspaceId, docId, sha256].join(":");
                  const existingId = identityIndex.get(identityKey);
                  const existing = existingId ? rows.get(existingId) : undefined;

                  if (existing) {
                    existing.object_key = String(objectKey);
                    existing.name = String(name);
                    existing.source_path = sourcePath === null ? null : String(sourcePath);
                    existing.size_bytes = Number(sizeBytes);
                    existing.content_type = String(contentType);
                    existing.storage_key = storageKey === null ? null : String(storageKey);
                    existing.commit_token_hash = String(commitTokenHash);
                    existing.expires_at = String(expiresAt);
                    existing.updated_at = String(updatedAt);
                    if (existing.status !== "committed_dry_run" && existing.status !== "stored_r2") {
                      existing.status = "prepared";
                    }
                  } else {
                    rows.set(String(id), {
                      id: String(id),
                      workspace_id: String(workspaceId),
                      doc_id: String(docId),
                      object_key: String(objectKey),
                      name: String(name),
                      source_path: sourcePath === null ? null : String(sourcePath),
                      size_bytes: Number(sizeBytes),
                      content_type: String(contentType),
                      sha256: String(sha256),
                      storage_key: storageKey === null ? null : String(storageKey),
                      commit_token_hash: String(commitTokenHash),
                      status: "prepared",
                      prepared_at: String(preparedAt),
                      expires_at: String(expiresAt),
                      committed_at: null,
                      updated_at: String(updatedAt),
                    });
                    identityIndex.set(identityKey, String(id));
                  }
                  changes = 1;
                }

                if (sql.includes("UPDATE attachment_upload_intents")) {
                  const [committedAt, updatedAt, id] = values;
                  const row = rows.get(String(id));
                  if (row) {
                    row.status = sql.includes("status = 'stored_r2'") ? "stored_r2" : "committed_dry_run";
                    row.committed_at = String(committedAt);
                    row.updated_at = String(updatedAt);
                    changes = 1;
                  }
                }

                if (sql.includes("INSERT INTO attachment_package_plans")) {
                  const [
                    id,
                    workspaceId,
                    actorMemberId,
                    objectKeysJson,
                    objectCount,
                    totalSizeBytes,
                    packageTokenHash,
                    expiresAt,
                    createdAt,
                  ] = values;
                  packagePlans.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    object_keys_json: String(objectKeysJson),
                    object_count: Number(objectCount),
                    total_size_bytes: Number(totalSizeBytes),
                    package_token_hash: String(packageTokenHash),
                    expires_at: String(expiresAt),
                    created_at: String(createdAt),
                  });
                  changes = 1;
                }

                if (sql.includes("INSERT INTO audit_events")) {
                  const [id, workspaceId, projectId, actorMemberId, action, metadataJson, createdAt] = values;
                  auditEvents.set(String(id), {
                    id: String(id),
                    workspace_id: String(workspaceId),
                    project_id: projectId === null ? null : String(projectId),
                    actor_member_id: actorMemberId === null ? null : String(actorMemberId),
                    action: String(action),
                    metadata_json: String(metadataJson),
                    created_at: String(createdAt),
                  });
                  changes = 1;
                }

                return { success: true, meta: { changes }, results: [] };
              },
              async first<T>() {
                if (sql.includes("FROM sessions")) {
                  const [id] = values;
                  if (id === undefined) {
                    const row = Array.from(sessions.values())[0];
                    return row ? { id: row.id } as T : null;
                  }
                  const row = sessions.get(String(id));
                  if (!row) return null;
                  return {
                    id: row.id,
                    member_id: row.member_id,
                    csrf_hash: row.csrf_hash,
                    revoked_at: row.revoked_at,
                    expires_at: row.expires_at,
                  } as T;
                }

                if (sql.includes("commit_token_hash = ?") && sql.includes("size_bytes = ?")) {
                  const [workspaceId, docId, objectKey, sizeBytes, sha256, commitTokenHash] = values;
                  const row = Array.from(rows.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.doc_id === String(docId)
                    && candidate.object_key === String(objectKey)
                    && candidate.size_bytes === Number(sizeBytes)
                    && candidate.sha256 === String(sha256)
                    && candidate.commit_token_hash === String(commitTokenHash)
                  );

                  if (!row) return null;
                  return {
                    id: row.id,
                    content_type: row.content_type,
                    status: row.status,
                    expires_at: row.expires_at,
                    committed_at: row.committed_at,
                  } as T;
                }

                if (sql.includes("AND object_key = ?") && sql.includes("status = 'stored_r2'")) {
                  const [workspaceId, objectKey] = values;
                  const row = Array.from(rows.values()).find((candidate) =>
                    candidate.workspace_id === String(workspaceId)
                    && candidate.object_key === String(objectKey)
                    && candidate.status === "stored_r2"
                  );

                  return row ? row as T : null;
                }

                if (sql.includes("FROM attachment_package_plans")) {
                  const [id, workspaceId] = values;
                  const row = packagePlans.get(String(id));
                  return row && row.workspace_id === String(workspaceId) ? row as T : null;
                }

                return null;
              },
              async all<T>() {
                if (sql.includes("FROM attachment_upload_intents") && sql.includes("status = 'stored_r2'")) {
                  const [workspaceId, limit, offset] = values;
                  const rowsForWorkspace = Array.from(rows.values())
                    .filter((row) => row.workspace_id === String(workspaceId) && row.status === "stored_r2")
                    .sort((left, right) => (right.committed_at ?? "").localeCompare(left.committed_at ?? ""))
                    .slice(Number(offset ?? 0), Number(offset ?? 0) + Number(limit));
                  return { results: rowsForWorkspace as T[], success: true, meta: {} };
                }

                return { results: [] as T[], success: true, meta: {} };
              },
            };
          },
        };
      },
    } as unknown as D1Database,
  };
}

function createR2Bucket(): {
  bucket: R2Bucket;
  objects: Map<string, { body: ArrayBuffer; options: R2PutOptions | undefined }>;
  putCount: number;
} {
  const store = {
    objects: new Map<string, { body: ArrayBuffer; options: R2PutOptions | undefined }>(),
    putCount: 0,
  };

  return {
    get objects() {
      return store.objects;
    },
    get putCount() {
      return store.putCount;
    },
    bucket: {
      async put(key: string, value: ArrayBuffer | ArrayBufferView | string | Blob, options?: R2PutOptions) {
        if (options?.onlyIf && store.objects.has(key)) return null;
        let body: ArrayBuffer;
        if (typeof value === "string") {
          body = new TextEncoder().encode(value).buffer;
        } else if (value instanceof ArrayBuffer) {
          body = value;
        } else if (value instanceof Blob) {
          body = await value.arrayBuffer();
        } else {
          const copy = new Uint8Array(value.byteLength);
          copy.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
          body = copy.buffer;
        }
        store.putCount += 1;
        store.objects.set(key, { body, options });
        return {
          key,
          size: body.byteLength,
          customMetadata: options?.customMetadata,
          httpMetadata: options?.httpMetadata,
        } as unknown as R2Object;
      },
      async get(key: string) {
        const row = store.objects.get(key);
        if (!row) return null;
        return {
          body: new Blob([row.body]).stream(),
          size: row.body.byteLength,
          httpMetadata: row.options?.httpMetadata,
          customMetadata: row.options?.customMetadata,
        };
      },
      async head(key: string) {
        const row = store.objects.get(key);
        if (!row) return null;
        return {
          size: row.body.byteLength,
          httpMetadata: row.options?.httpMetadata,
          customMetadata: row.options?.customMetadata,
        };
      },
      async delete(key: string | string[]) {
        for (const item of Array.isArray(key) ? key : [key]) store.objects.delete(item);
      },
    } as unknown as R2Bucket,
  };
}
