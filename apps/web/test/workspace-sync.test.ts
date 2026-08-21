import { describe, expect, it } from "vitest";
import {
  cloneWorkspace,
  createOperation,
  seedWorkspace,
  type CanonicalWorkspaceSnapshot,
} from "@film/schema";
import { readCanonicalWorkspaceSnapshot } from "../src/workspace-client";
import { reconcileCanonicalWorkspace } from "../src/workspace-sync";

describe("canonical workspace sync", () => {
  it("requests the current workspace snapshot with session csrf metadata", async () => {
    const snapshot = emptySnapshot();
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/workspaces/current/snapshot");
      expect(init).toMatchObject({
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": "csrf_workspace_test",
        },
        body: JSON.stringify({ workspaceId: "workspace_acme" }),
      });
      return new Response(JSON.stringify({ ok: true, snapshot }), { status: 200 });
    };

    await expect(readCanonicalWorkspaceSnapshot(
      "https://worker.test",
      "csrf_workspace_test",
      "workspace_acme",
      fetcher,
    )).resolves.toEqual(snapshot);
  });

  it("replaces demo projects with an empty canonical production workspace", () => {
    const local = cloneWorkspace(seedWorkspace);
    const snapshot = emptySnapshot();
    snapshot.workspace.name = "Canonical Films";
    snapshot.members = [{
      id: "member_owner",
      displayName: "Workspace Owner",
      emailHash: "hash_owner",
      role: "owner",
      status: "active",
      lastSeenAt: "2026-07-09T00:00:00.000Z",
    }];

    const reconciled = reconcileCanonicalWorkspace(local, snapshot, []);

    expect(reconciled.name).toBe("Canonical Films");
    expect(reconciled.projects).toEqual([]);
    expect(reconciled.members[0]?.displayName).toBe("Workspace Owner");
  });

  it("hydrates canonical records while preserving queued local task and document edits", () => {
    const local = cloneWorkspace(seedWorkspace);
    const localProject = local.projects[0]!;
    const localTask = localProject.openTasks[0]!;
    const localDocument = localProject.docs.find((document) => document.type === "MD") ?? localProject.docs[0]!;
    localTask.status = "ready";
    localDocument.type = "MD";
    localDocument.markdownSnapshot = "# Local unsynced draft";
    const snapshot = emptySnapshot();
    snapshot.projects = [{
      id: localProject.id,
      title: "Canonical title",
      projectType: "Feature Film",
      status: "active",
      phase: "production",
      logline: "Canonical logline",
      ownerMemberId: "member_owner",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.tasks = [{
      id: localTask.id,
      projectId: localProject.id,
      title: localTask.title,
      status: "pending",
      priority: "normal",
      dueAt: null,
      assigneeMemberId: null,
      ownerMemberId: "member_owner",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.documents = [{
      id: localDocument.id,
      projectId: localProject.id,
      title: localDocument.name,
      documentType: "markdown",
      markdownSnapshot: "# Canonical older draft",
      markdownTruncated: false,
      externalUrl: null,
      sensitive: false,
      ownerMemberId: "member_owner",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    const operations = [
      createOperation(local.id, "task.updated", "task", localTask.id, "Task updated", {
        projectId: localProject.id,
        newStatus: "ready",
      }),
      createOperation(local.id, "document.updated", "document", localDocument.id, "Document updated", {
        projectId: localProject.id,
        markdownLength: localDocument.markdownSnapshot.length,
      }),
    ];

    const reconciled = reconcileCanonicalWorkspace(local, snapshot, operations);
    const project = reconciled.projects[0]!;

    expect(project.title).toBe("Canonical title");
    expect(project.openTasks[0]?.status).toBe("ready");
    expect(project.docs[0]?.markdownSnapshot).toBe("# Local unsynced draft");
  });
});

function emptySnapshot(): CanonicalWorkspaceSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-09T00:00:00.000Z",
    persistence: "d1_canonical_workspace_snapshot",
    readPolicy: "workspace_role_and_record_scope",
    workspace: {
      id: "workspace_acme",
      name: "Acme Films",
      updatedAt: "2026-07-09T00:00:00.000Z",
    },
    currentMember: { id: "member_owner", role: "owner" },
    members: [],
    projects: [],
    filmProfiles: [],
    tasks: [],
    documents: [],
    people: [],
    projectPeople: [],
    equipment: [],
    expenses: [],
    restorePoints: [],
    truncatedCollections: [],
  };
}
