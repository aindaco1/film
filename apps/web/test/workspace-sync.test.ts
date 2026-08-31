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
      shootDates: "Jul 10 - Jul 12",
      location: "Canonical location",
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

  it("preserves all queued contextual edits and adopts canonical values after sync", () => {
    const local = cloneWorkspace(seedWorkspace);
    const localProject = local.projects[0]!;
    const localTask = localProject.openTasks[0]!;
    const localPerson = localProject.people[0]!;
    const localEquipment = localProject.equipment[0]!;
    const localExpense = localProject.expenses[0]!;
    Object.assign(localProject, {
      phase: "Post-Production",
      shootDates: "Wrapped locally",
      location: "Local stage",
      description: "Local project edit",
      totalBudget: 12345,
    });
    Object.assign(localTask, { title: "Local task edit", due: "2026-08-31", status: "ready" });
    Object.assign(localPerson, { name: "Local Person", role: "Local Role", initials: "LP" });
    Object.assign(localEquipment, { name: "Local Camera", status: "Checked out", statusTone: "amber" });
    Object.assign(localExpense, { category: "Local rental", spent: 200, budget: 400, percent: 50 });

    const snapshot = emptySnapshot();
    snapshot.projects = [{
      id: localProject.id,
      title: localProject.title,
      projectType: localProject.type,
      status: "active",
      phase: "development",
      logline: "Canonical project edit",
      shootDates: "Canonical dates",
      location: "Canonical stage",
      ownerMemberId: null,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.filmProfiles = [{
      projectId: localProject.id,
      runtimeMinutes: localProject.runtimeMinutes,
      format: localProject.format,
      shootStart: null,
      shootEnd: null,
      budgetCents: 999900,
      spentCents: 10000,
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.tasks = [{
      id: localTask.id,
      projectId: localProject.id,
      title: "Canonical task",
      status: "pending",
      priority: "normal",
      dueAt: null,
      assigneeMemberId: null,
      ownerMemberId: null,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.people = [{
      id: localPerson.id,
      displayName: "Canonical Person",
      roleTags: ["Canonical Role"],
      sensitive: true,
      ownerMemberId: null,
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.projectPeople = [{ projectId: localProject.id, personId: localPerson.id, projectRole: "Canonical Role" }];
    snapshot.equipment = [{
      id: localEquipment.id,
      projectId: localProject.id,
      name: "Canonical Camera",
      equipmentType: "gray",
      status: "Available",
      ownerMemberId: null,
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.expenses = [{
      id: localExpense.id,
      projectId: localProject.id,
      category: "Canonical rental",
      spentCents: 10000,
      budgetCents: 50000,
      purchasedAt: null,
      ownerMemberId: null,
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    const operations = [
      createOperation(local.id, "project.updated", "project", localProject.id, "Project updated", { projectId: localProject.id }),
      createOperation(local.id, "task.updated", "task", localTask.id, "Task updated", { projectId: localProject.id }),
      createOperation(local.id, "person.updated", "person", localPerson.id, "Person updated", { projectId: localProject.id }),
      createOperation(local.id, "equipment.updated", "equipment", localEquipment.id, "Equipment updated", { projectId: localProject.id }),
      createOperation(local.id, "expense.updated", "expense", localExpense.id, "Expense updated", { projectId: localProject.id }),
    ];

    const queued = reconcileCanonicalWorkspace(local, snapshot, operations).projects[0]!;
    expect(queued).toMatchObject({
      phase: "Post-Production",
      shootDates: "Wrapped locally",
      location: "Local stage",
      description: "Local project edit",
      totalBudget: 12345,
    });
    expect(queued.openTasks[0]).toMatchObject({ title: "Local task edit", due: "2026-08-31", status: "ready" });
    expect(queued.people[0]).toMatchObject({ name: "Local Person", role: "Local Role" });
    expect(queued.equipment[0]).toMatchObject({ name: "Local Camera", status: "Checked out" });
    expect(queued.expenses[0]).toMatchObject({ category: "Local rental", spent: 200, budget: 400 });

    const synced = reconcileCanonicalWorkspace(local, snapshot, []).projects[0]!;
    expect(synced).toMatchObject({
      phase: "Development",
      shootDates: "Canonical dates",
      location: "Canonical stage",
      description: "Canonical project edit",
      totalBudget: 9999,
    });
    expect(synced.openTasks[0]).toMatchObject({ title: "Canonical task", due: "Unscheduled", status: "pending" });
    expect(synced.people[0]).toMatchObject({ name: "Canonical Person", role: "Canonical Role" });
    expect(synced.equipment[0]).toMatchObject({ name: "Canonical Camera", status: "Available" });
    expect(synced.expenses[0]).toMatchObject({ category: "Canonical rental", spent: 100, budget: 500 });
  });

  it("does not infer overdue state from an ambiguous production due label", () => {
    const local = cloneWorkspace(seedWorkspace);
    const project = local.projects[0]!;
    const task = project.openTasks[0]!;
    const snapshot = emptySnapshot();
    snapshot.projects = [{
      id: project.id,
      title: project.title,
      projectType: project.type,
      status: "active",
      phase: "development",
      logline: null,
      shootDates: null,
      location: null,
      ownerMemberId: null,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];
    snapshot.tasks = [{
      id: task.id,
      projectId: project.id,
      title: task.title,
      status: "todo",
      priority: "normal",
      dueAt: "Sep 1",
      assigneeMemberId: null,
      ownerMemberId: null,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    }];

    expect(reconcileCanonicalWorkspace(local, snapshot, []).projects[0]?.openTasks[0]?.status).toBe("pending");
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
