import { describe, expect, it } from "vitest";
import {
  applyFilmProfileMutationRequest,
  applyRecordMutationRequest,
  assignProjectMembership,
  assignRecordPermission,
  createFilmProfileMutationRequest,
  createRecordMutationRequest,
  createRecordCommentIntent,
  createRecordMutationRollbackRequest,
  exportFilmProfileMutationRequestManifest,
  exportExpiredRecordPermissionManifest,
  exportProjectMembershipHistory,
  exportProjectMembershipManifest,
  exportRecordMutationAuditManifest,
  exportRecordMutationRequestManifest,
  exportRecordCommentManifest,
  exportRecordOwnerHistory,
  exportRecordOwnerManifest,
  exportRecordPermissionHistory,
  exportRecordPermissionManifest,
  preflightRecordMutation,
  previewFilmProfileMutationDiff,
  previewRecordMutationDiff,
  previewRecordMutationDeleteRecoveryPlan,
  resolveFilmProfileMutationRequest,
  resolveRecordMutationRequest,
  revokeProjectMembership,
  revokeRecordPermission,
  transferRecordOwner,
  updateWorkspaceMemberStatus,
} from "../src/membership-client";

describe("membership client", () => {
  it("assigns a project membership with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/projects/memberships/assign-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        projectTitle: "Echoes in the Static",
        memberId: "member_crew",
        role: "department_lead",
        department: "Camera",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_project_membership",
          membership: {
            workspaceId: "workspace_acme",
            projectId: "proj_echoes",
            memberId: "member_crew",
            role: "department_lead",
            department: "Camera",
          },
        }),
        { status: 200 },
      );
    };

    const result = await assignProjectMembership(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        projectTitle: "Echoes in the Static",
        memberId: "member_crew",
        role: "department_lead",
        department: "Camera",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.membership.role).toBe("department_lead");
    expect(result.membership.department).toBe("Camera");
  });

  it("throws worker errors for blocked project assignments", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "member_not_active" }), { status: 403 });

    await expect(
      assignProjectMembership(
        "https://worker.test",
        {
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          projectTitle: "Echoes in the Static",
          memberId: "member_disabled",
          role: "contributor",
          department: null,
        },
        "csrf_1234567890",
        fetcher,
      ),
    ).rejects.toThrow("member_not_active");
  });

  it("updates workspace member status with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/members/status/dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        memberId: "member_crew",
        status: "disabled",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_workspace_member_status",
          auditPersistence: "d1_audit_events",
          sessionPolicy: "target_sessions_revoked",
          member: {
            workspaceId: "workspace_acme",
            memberId: "member_crew",
            role: "contributor",
            status: "disabled",
          },
        }),
        { status: 200 },
      );
    };

    const result = await updateWorkspaceMemberStatus(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        memberId: "member_crew",
        status: "disabled",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.persistence).toBe("d1_workspace_member_status");
    expect(result.sessionPolicy).toBe("target_sessions_revoked");
    expect(result.member.status).toBe("disabled");
  });

  it("requests a project membership manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/projects/memberships/manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        limit: 50,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_project_membership",
          auditPersistence: "d1_audit_events",
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          manifestPolicy: "active_project_memberships_only",
          rowCount: 1,
          truncated: false,
          memberships: [
            {
              workspaceId: "workspace_acme",
              projectId: "proj_echoes",
              memberId: "member_crew",
              role: "department_lead",
              department: "Camera",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportProjectMembershipManifest(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        limit: 50,
      },
      "csrf_1234567890",
      fetcher,
    );

	  expect(result.manifestPolicy).toBe("active_project_memberships_only");
	  expect(result.memberships[0]?.role).toBe("department_lead");
	});

	it("requests project membership history with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/projects/memberships/history");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      projectId: "proj_echoes",
	      limit: 20,
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        persistence: "d1_record_mutation_requests",
	        auditPersistence: "d1_audit_events",
	        historyPolicy: "project_membership_audit_history",
	        workspaceId: "workspace_acme",
	        projectId: "proj_echoes",
	        rowCount: 1,
	        truncated: false,
	        entries: [
	          {
	            id: "audit_membership",
	            action: "project_membership.assigned",
	            actorMemberId: "member_producer",
	            memberId: "member_crew",
	            role: "department_lead",
	            department: "Camera",
	            createdAt: "2026-07-08T00:00:00.000Z",
	          },
	        ],
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await exportProjectMembershipHistory(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      projectId: "proj_echoes",
	      limit: 20,
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	  expect(result.historyPolicy).toBe("project_membership_audit_history");
	  expect(result.entries[0]?.role).toBe("department_lead");
	});

	it("revokes a project membership with exact manifest metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/projects/memberships/revoke-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        memberId: "member_crew",
        role: "department_lead",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_project_membership",
          auditPersistence: "d1_audit_events",
          revokePolicy: "exact_project_membership_match_only",
          membership: {
            workspaceId: "workspace_acme",
            projectId: "proj_echoes",
            memberId: "member_crew",
            role: "department_lead",
            department: "Camera",
          },
        }),
        { status: 200 },
      );
    };

    const result = await revokeProjectMembership(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        memberId: "member_crew",
        role: "department_lead",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.revokePolicy).toBe("exact_project_membership_match_only");
    expect(result.membership.department).toBe("Camera");
  });

  it("assigns an explicit project record permission with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/permissions/assign-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
        memberId: "member_crew",
        permission: "write",
        department: "Camera",
        expiresAt: "2026-08-01T00:00:00.000Z",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_permissions",
          permission: {
            id: "record_permission_1",
            workspaceId: "workspace_acme",
            entityType: "project",
            entityId: "proj_echoes",
            memberId: "member_crew",
            permission: "write",
            department: "Camera",
            expiresAt: "2026-08-01T00:00:00.000Z",
          },
        }),
        { status: 200 },
      );
    };

    const result = await assignRecordPermission(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
        memberId: "member_crew",
        permission: "write",
        department: "Camera",
        expiresAt: "2026-08-01T00:00:00.000Z",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.permission.permission).toBe("write");
    expect(result.permission.department).toBe("Camera");
  });

  it("transfers a core record owner with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/owners/transfer-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_notes",
        memberId: "member_crew",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_owner",
          transferPolicy: "core_record_owner_update",
          owner: {
            workspaceId: "workspace_acme",
            entityType: "document",
            entityId: "doc_notes",
            ownerMemberId: "member_crew",
            previousOwnerMemberId: "member_owner",
          },
        }),
        { status: 200 },
      );
    };

    const result = await transferRecordOwner(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_notes",
        memberId: "member_crew",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.transferPolicy).toBe("core_record_owner_update");
    expect(result.owner.previousOwnerMemberId).toBe("member_owner");
  });

  it("requests a core record owner manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/owners/manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_owner",
          manifestPolicy: "core_record_owner_metadata_only",
          owner: {
            workspaceId: "workspace_acme",
            entityType: "project",
            entityId: "proj_echoes",
            ownerMemberId: "member_owner",
          },
        }),
        { status: 200 },
      );
    };

    const result = await exportRecordOwnerManifest(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.manifestPolicy).toBe("core_record_owner_metadata_only");
    expect(result.owner.ownerMemberId).toBe("member_owner");
  });

  it("creates a metadata-only record comment intent with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/comments/dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_script",
        body: "Please check the ending.",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_comment_intents",
          auditPersistence: "d1_audit_events",
          commentPolicy: "metadata_only_comment_intent",
          comment: {
            id: "comment_1",
            workspaceId: "workspace_acme",
            entityType: "document",
            entityId: "doc_script",
            authorMemberId: "member_reviewer",
            bodyPreview: "Please check the ending.",
            bodySha256: "a".repeat(64),
            createdAt: "2026-07-08T00:00:00.000Z",
          },
        }),
        { status: 200 },
      );
    };

    const result = await createRecordCommentIntent(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_script",
        body: "Please check the ending.",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.commentPolicy).toBe("metadata_only_comment_intent");
    expect(result.comment.bodyPreview).toBe("Please check the ending.");
  });

  it("requests a metadata-only record comment intent manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/comments/manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_script",
        limit: 20,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_comment_intents",
          auditPersistence: "d1_audit_events",
          manifestPolicy: "metadata_only_comment_intent_manifest",
          workspaceId: "workspace_acme",
          entityType: "document",
          entityId: "doc_script",
          rowCount: 1,
          truncated: false,
          comments: [
            {
              id: "comment_1",
              workspaceId: "workspace_acme",
              entityType: "document",
              entityId: "doc_script",
              authorMemberId: "member_reviewer",
              bodyPreview: "Please check the ending.",
              bodySha256: "a".repeat(64),
              createdAt: "2026-07-08T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportRecordCommentManifest(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_script",
        limit: 20,
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.manifestPolicy).toBe("metadata_only_comment_intent_manifest");
    expect(result.comments[0]?.bodySha256).toBe("a".repeat(64));
  });

  it("preflights record mutation authorization with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/mutations/preflight");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_final_shot",
        mutation: "update",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_mutation_authorization",
          auditPersistence: "d1_audit_events",
          mutationPolicy: "core_record_mutation_authorization_preflight",
          preflight: {
            workspaceId: "workspace_acme",
            entityType: "task",
            entityId: "task_final_shot",
            mutation: "update",
            allowedBy: "write_permission",
          },
        }),
        { status: 200 },
      );
    };

    const result = await preflightRecordMutation(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_final_shot",
        mutation: "update",
      },
      "csrf_1234567890",
      fetcher,
    );

	  expect(result.mutationPolicy).toBe("core_record_mutation_authorization_preflight");
	  expect(result.preflight.allowedBy).toBe("write_permission");
	});

	it("creates metadata-only record mutation requests with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/request-dry-run");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      entityType: "task",
	      entityId: "task_final_shot",
	      mutation: "update",
	      summary: "Update the task status.",
	      fieldKeys: ["status"],
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        destructiveWrite: false,
	        persistence: "d1_audit_events",
	        auditPersistence: "d1_audit_events",
	        requestPolicy: "record_mutation_request_metadata_only",
	        request: {
	          id: "mutation_request_1",
	          workspaceId: "workspace_acme",
	          entityType: "task",
	          entityId: "task_final_shot",
	          mutation: "update",
	          actorMemberId: "member_producer",
	          allowedBy: "owner_producer",
	          status: "pending_owner_producer_review",
	          summaryPreview: "Update the task status.",
	          summarySha256: "a".repeat(64),
	          fieldKeys: ["status"],
	          expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	          resolvedByMemberId: null,
	          resolvedAt: null,
	          resolutionNotePreview: null,
	          resolutionNoteSha256: null,
	          appliedByMemberId: null,
	          appliedAt: null,
	          application: null,
	          destructiveWrite: false,
	          createdAt: "2026-07-08T00:00:00.000Z",
	          updatedAt: "2026-07-08T00:00:00.000Z",
	        },
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await createRecordMutationRequest(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      entityType: "task",
	      entityId: "task_final_shot",
	      mutation: "update",
	      summary: "Update the task status.",
	      fieldKeys: ["status"],
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	  expect(result.requestPolicy).toBe("record_mutation_request_metadata_only");
	  expect(result.request.destructiveWrite).toBe(false);
	});

	it("requests record mutation request manifests with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/requests/manifest");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      entityType: "task",
	      entityId: "task_final_shot",
	      limit: 20,
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        destructiveWrite: false,
	        persistence: "d1_record_mutation_requests",
	        auditPersistence: "d1_audit_events",
	        manifestPolicy: "record_mutation_request_manifest",
	        workspaceId: "workspace_acme",
	        entityType: "task",
	        entityId: "task_final_shot",
	        rowCount: 1,
	        truncated: false,
	        requests: [
	          {
	            id: "mutation_request_1",
	            workspaceId: "workspace_acme",
	            entityType: "task",
	            entityId: "task_final_shot",
	            mutation: "update",
	            actorMemberId: "member_producer",
	            allowedBy: "owner_producer",
	            status: "pending_owner_producer_review",
	            summaryPreview: "Update the task status.",
	            summarySha256: "a".repeat(64),
	            fieldKeys: ["status"],
	            expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	            resolvedByMemberId: null,
	            resolvedAt: null,
	            resolutionNotePreview: null,
	            resolutionNoteSha256: null,
	            appliedByMemberId: null,
	            appliedAt: null,
	            application: null,
	            destructiveWrite: false,
	            createdAt: "2026-07-08T00:00:00.000Z",
	            updatedAt: "2026-07-08T00:00:00.000Z",
	          },
	        ],
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await exportRecordMutationRequestManifest(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      entityType: "task",
	      entityId: "task_final_shot",
	      limit: 20,
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	  expect(result.manifestPolicy).toBe("record_mutation_request_manifest");
	  expect(result.requests[0]?.summarySha256).toBe("a".repeat(64));
	});

	it("resolves record mutation requests with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/requests/resolve-dry-run");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      decision: "approve",
	      note: "Approved by producer.",
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        destructiveWrite: false,
	        persistence: "d1_record_mutation_requests",
	        auditPersistence: "d1_audit_events",
	        resolutionPolicy: "record_mutation_owner_producer_resolution",
	        request: {
	          id: "mutation_request_1",
	          workspaceId: "workspace_acme",
	          entityType: "task",
	          entityId: "task_final_shot",
	          mutation: "update",
	          actorMemberId: "member_contributor",
	          allowedBy: "write_permission",
	          status: "approved_pending_apply",
	          summaryPreview: "Update the task status.",
	          summarySha256: "a".repeat(64),
	          fieldKeys: ["status"],
	          expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	          resolvedByMemberId: "member_producer",
	          resolvedAt: "2026-07-08T00:01:00.000Z",
	          resolutionNotePreview: "Approved by producer.",
	          resolutionNoteSha256: "b".repeat(64),
	          appliedByMemberId: null,
	          appliedAt: null,
	          application: null,
	          destructiveWrite: false,
	          createdAt: "2026-07-08T00:00:00.000Z",
	          updatedAt: "2026-07-08T00:01:00.000Z",
	        },
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await resolveRecordMutationRequest(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      decision: "approve",
	      note: "Approved by producer.",
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	    expect(result.resolutionPolicy).toBe("record_mutation_owner_producer_resolution");
	  expect(result.request.status).toBe("approved_pending_apply");
	  expect(result.request.destructiveWrite).toBe(false);
	});

	it("previews approved record mutation diffs with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/diff-dry-run");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      updates: { status: "ready" },
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        destructiveWrite: false,
	        persistence: "d1_record_mutation_requests",
	        auditPersistence: "d1_audit_events",
	        diffPolicy: "approved_record_mutation_diff_preview",
	        stale: false,
	        currentUpdatedAt: "2026-07-08T00:00:00.000Z",
	        expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	        fieldDiffs: [
	          { key: "status", before: "todo", after: "ready", changed: true },
	        ],
	        rollbackGuidance: {
	          strategy: "apply_inverse_update_request",
	          fieldKeys: ["status"],
	          requiresApproval: true,
	          requiresFreshRecord: true,
	          notes: ["Create an inverse mutation request."],
	        },
	        request: {
	          id: "mutation_request_1",
	          workspaceId: "workspace_acme",
	          entityType: "task",
	          entityId: "task_final_shot",
	          mutation: "update",
	          actorMemberId: "member_contributor",
	          allowedBy: "write_permission",
	          status: "approved_pending_apply",
	          summaryPreview: "Update the task status.",
	          summarySha256: "a".repeat(64),
	          fieldKeys: ["status"],
	          expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	          resolvedByMemberId: "member_producer",
	          resolvedAt: "2026-07-08T00:01:00.000Z",
	          resolutionNotePreview: null,
	          resolutionNoteSha256: null,
	          appliedByMemberId: null,
	          appliedAt: null,
	          application: null,
	          destructiveWrite: false,
	          createdAt: "2026-07-08T00:00:00.000Z",
	          updatedAt: "2026-07-08T00:01:00.000Z",
	        },
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await previewRecordMutationDiff(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      updates: { status: "ready" },
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	expect(result.diffPolicy).toBe("approved_record_mutation_diff_preview");
	  expect(result.destructiveWrite).toBe(false);
	  expect(result.fieldDiffs[0]).toMatchObject({ key: "status", before: "todo", after: "ready" });
	});

  it("calls film profile mutation request, manifest, resolution, diff, and apply routes with csrf metadata", async () => {
    const baseRequest = {
      id: "profile_mutation_request_1",
      workspaceId: "workspace_acme",
      projectId: "proj_echoes",
      mutation: "update",
      actorMemberId: "member_producer",
      allowedBy: "owner_producer",
      status: "approved_pending_apply",
      summaryPreview: "Update profile.",
      summarySha256: "b".repeat(64),
      fieldKeys: ["format", "budgetCents"],
      expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
      resolvedByMemberId: "member_owner",
      resolvedAt: "2026-07-08T00:01:00.000Z",
      resolutionNotePreview: null,
      resolutionNoteSha256: null,
      appliedByMemberId: null,
      appliedAt: null,
      application: null,
      destructiveWrite: false,
      createdAt: "2026-07-08T00:00:00.000Z",
      updatedAt: "2026-07-08T00:01:00.000Z",
    } as const;
    const expectedBodies = new Map([
      [
        "/api/projects/film-profile/mutations/request-dry-run",
        {
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          summary: "Update profile.",
          fieldKeys: ["format", "budgetCents"],
        },
      ],
      [
        "/api/projects/film-profile/mutations/requests/manifest",
        { workspaceId: "workspace_acme", projectId: "proj_echoes", limit: 20 },
      ],
      [
        "/api/projects/film-profile/mutations/requests/resolve-dry-run",
        { workspaceId: "workspace_acme", requestId: "profile_mutation_request_1", decision: "approve", note: "Looks good." },
      ],
      [
        "/api/projects/film-profile/mutations/diff-dry-run",
        { workspaceId: "workspace_acme", requestId: "profile_mutation_request_1", updates: { format: "B&W", budgetCents: 2500000 } },
      ],
      [
        "/api/projects/film-profile/mutations/apply",
        {
          workspaceId: "workspace_acme",
          requestId: "profile_mutation_request_1",
          confirmation: "APPLY FILM PROFILE MUTATION profile_mutation_request_1",
          updates: { format: "B&W", budgetCents: 2500000 },
        },
      ],
    ]);
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(expectedBodies.get(url.pathname)));

      if (url.pathname.endsWith("/request-dry-run")) {
        return new Response(JSON.stringify({
          dryRun: true,
          destructiveWrite: false,
          persistence: "d1_film_profile_mutation_requests",
          requestPolicy: "film_profile_mutation_request_metadata_only",
          request: { ...baseRequest, status: "pending_owner_producer_review", resolvedByMemberId: null, resolvedAt: null },
        }), { status: 200 });
      }
      if (url.pathname.endsWith("/manifest")) {
        return new Response(JSON.stringify({
          dryRun: true,
          destructiveWrite: false,
          persistence: "d1_film_profile_mutation_requests",
          manifestPolicy: "film_profile_mutation_request_manifest",
          workspaceId: "workspace_acme",
          projectId: "proj_echoes",
          rowCount: 1,
          truncated: false,
          requests: [baseRequest],
        }), { status: 200 });
      }
      if (url.pathname.endsWith("/resolve-dry-run")) {
        return new Response(JSON.stringify({
          dryRun: true,
          destructiveWrite: false,
          persistence: "d1_film_profile_mutation_requests",
          resolutionPolicy: "film_profile_mutation_owner_producer_resolution",
          request: baseRequest,
        }), { status: 200 });
      }
      if (url.pathname.endsWith("/diff-dry-run")) {
        return new Response(JSON.stringify({
          dryRun: true,
          destructiveWrite: false,
          persistence: "d1_film_profile_mutation_requests",
          diffPolicy: "approved_film_profile_mutation_diff_preview",
          request: baseRequest,
          stale: false,
          currentUpdatedAt: "2026-07-08T00:00:00.000Z",
          expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
          fieldDiffs: [
            { key: "format", before: "Color", after: "B&W", changed: true },
          ],
          rollbackGuidance: {
            strategy: "apply_inverse_update_request",
            fieldKeys: ["format"],
            requiresApproval: true,
            requiresFreshRecord: true,
            notes: ["Create an inverse mutation request."],
          },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        dryRun: false,
        destructiveWrite: true,
        persistence: "d1_film_profile_mutation_requests",
        applicationPolicy: "approved_film_profile_mutation_stale_checked",
        request: { ...baseRequest, status: "applied", destructiveWrite: true },
        application: {
          action: "update",
          applied: true,
          idempotent: false,
          fieldKeys: ["format", "budgetCents"],
          previousUpdatedAt: "2026-07-08T00:00:00.000Z",
          updatedAt: "2026-07-08T00:02:00.000Z",
          deletedAt: null,
          fieldDiffs: [],
          rollbackGuidance: {
            strategy: "apply_inverse_update_request",
            fieldKeys: ["format", "budgetCents"],
            requiresApproval: true,
            requiresFreshRecord: true,
            notes: [],
          },
        },
      }), { status: 200 });
    };

    const created = await createFilmProfileMutationRequest(
      "https://worker.test",
      { workspaceId: "workspace_acme", projectId: "proj_echoes", summary: "Update profile.", fieldKeys: ["format", "budgetCents"] },
      "csrf_1234567890",
      fetcher,
    );
    const manifest = await exportFilmProfileMutationRequestManifest(
      "https://worker.test",
      { workspaceId: "workspace_acme", projectId: "proj_echoes", limit: 20 },
      "csrf_1234567890",
      fetcher,
    );
    const resolved = await resolveFilmProfileMutationRequest(
      "https://worker.test",
      { workspaceId: "workspace_acme", requestId: "profile_mutation_request_1", decision: "approve", note: "Looks good." },
      "csrf_1234567890",
      fetcher,
    );
    const diff = await previewFilmProfileMutationDiff(
      "https://worker.test",
      { workspaceId: "workspace_acme", requestId: "profile_mutation_request_1", updates: { format: "B&W", budgetCents: 2500000 } },
      "csrf_1234567890",
      fetcher,
    );
    const applied = await applyFilmProfileMutationRequest(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        requestId: "profile_mutation_request_1",
        confirmation: "APPLY FILM PROFILE MUTATION profile_mutation_request_1",
        updates: { format: "B&W", budgetCents: 2500000 },
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(created.requestPolicy).toBe("film_profile_mutation_request_metadata_only");
    expect(manifest.requests[0]?.projectId).toBe("proj_echoes");
    expect(resolved.resolutionPolicy).toBe("film_profile_mutation_owner_producer_resolution");
    expect(diff.fieldDiffs[0]?.key).toBe("format");
    expect(applied.destructiveWrite).toBe(true);
  });

	it("exports record mutation audit manifests with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/requests/audit-manifest");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      limit: 20,
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        destructiveWrite: false,
	        persistence: "d1_audit_events",
	        auditPersistence: "d1_audit_events",
	        manifestPolicy: "record_mutation_request_audit_manifest",
	        metadataPolicy: "keys_only",
	        workspaceId: "workspace_acme",
	        requestId: "mutation_request_1",
	        rowCount: 1,
	        truncated: false,
	        rollbackGuidance: {
	          strategy: "apply_inverse_update_request",
	          fieldKeys: ["status"],
	          requiresApproval: true,
	          requiresFreshRecord: true,
	          notes: ["Create an inverse mutation request."],
	        },
	        request: null,
	        events: [
	          {
	            id: "audit_1",
	            action: "record_mutation.applied",
	            projectId: null,
	            actorMemberId: "member_producer",
	            createdAt: "2026-07-08T00:02:00.000Z",
	            metadataKeys: ["destructiveWrite", "requestId"],
	            metadataKeyCount: 2,
	          },
	        ],
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await exportRecordMutationAuditManifest(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      limit: 20,
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	  expect(result.manifestPolicy).toBe("record_mutation_request_audit_manifest");
	  expect(result.metadataPolicy).toBe("keys_only");
	  expect(result.events[0]?.metadataKeys).toContain("requestId");
	});

	it("creates record mutation rollback requests with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/requests/rollback-dry-run");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      summary: "Rollback task update.",
	    }));

	    const baseRequest = {
	      id: "mutation_request_1",
	      workspaceId: "workspace_acme",
	      entityType: "task",
	      entityId: "task_final_shot",
	      mutation: "update",
	      actorMemberId: "member_contributor",
	      allowedBy: "write_permission",
	      status: "applied",
	      summaryPreview: "Update the task status.",
	      summarySha256: "a".repeat(64),
	      fieldKeys: ["status"],
	      expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	      resolvedByMemberId: "member_producer",
	      resolvedAt: "2026-07-08T00:01:00.000Z",
	      resolutionNotePreview: null,
	      resolutionNoteSha256: null,
	      appliedByMemberId: "member_producer",
	      appliedAt: "2026-07-08T00:02:00.000Z",
	      application: {
	        action: "update",
	        applied: true,
	        idempotent: false,
	        fieldKeys: ["status"],
	        previousUpdatedAt: "2026-07-08T00:00:00.000Z",
	        updatedAt: "2026-07-08T00:02:00.000Z",
	        deletedAt: null,
	        fieldDiffs: [{ key: "status", before: "todo", after: "ready", changed: true }],
	        rollbackGuidance: {
	          strategy: "apply_inverse_update_request",
	          fieldKeys: ["status"],
	          requiresApproval: true,
	          requiresFreshRecord: true,
	          notes: ["Create an inverse mutation request."],
	        },
	      },
	      destructiveWrite: true,
	      createdAt: "2026-07-08T00:00:00.000Z",
	      updatedAt: "2026-07-08T00:02:00.000Z",
	    };

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        destructiveWrite: false,
	        persistence: "d1_record_mutation_requests",
	        auditPersistence: "d1_audit_events",
	        rollbackPolicy: "applied_update_inverse_mutation_request",
	        sourceRequest: baseRequest,
	        request: {
	          ...baseRequest,
	          id: "mutation_request_rollback",
	          status: "pending_owner_producer_review",
	          summaryPreview: "Rollback task update.",
	          destructiveWrite: false,
	          application: null,
	        },
	        suggestedUpdates: { status: "todo" },
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await createRecordMutationRollbackRequest(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      summary: "Rollback task update.",
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	  expect(result.rollbackPolicy).toBe("applied_update_inverse_mutation_request");
	  expect(result.destructiveWrite).toBe(false);
	  expect(result.request.status).toBe("pending_owner_producer_review");
	  expect(result.suggestedUpdates.status).toBe("todo");
	});

	it("previews delete recovery plans with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/requests/delete-recovery-plan");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_delete",
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: true,
	        destructiveWrite: false,
	        persistence: "d1_record_mutation_requests",
	        auditPersistence: "d1_audit_events",
	        recoveryPolicy: "deleted_record_backup_or_recreate_plan",
	        sourceRequest: {
	          id: "mutation_request_delete",
	          workspaceId: "workspace_acme",
	          entityType: "task",
	          entityId: "task_final_shot",
	          mutation: "delete",
	          actorMemberId: "member_producer",
	          allowedBy: "owner_producer",
	          status: "applied",
	          summaryPreview: "Delete duplicate task.",
	          summarySha256: "c".repeat(64),
	          fieldKeys: [],
	          expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	          resolvedByMemberId: "member_producer",
	          resolvedAt: "2026-07-08T00:01:00.000Z",
	          resolutionNotePreview: null,
	          resolutionNoteSha256: null,
	          appliedByMemberId: "member_producer",
	          appliedAt: "2026-07-08T00:02:00.000Z",
	          application: {
	            action: "delete",
	            applied: true,
	            idempotent: false,
	            fieldKeys: [],
	            previousUpdatedAt: "2026-07-08T00:00:00.000Z",
	            updatedAt: null,
	            deletedAt: "2026-07-08T00:02:00.000Z",
	            fieldDiffs: [{ key: "record", before: "present", after: "deleted", changed: true }],
	            rollbackGuidance: {
	              strategy: "restore_from_backup_or_recreate",
	              fieldKeys: ["record"],
	              requiresApproval: true,
	              requiresFreshRecord: false,
	              notes: ["Restore from backup."],
	            },
	          },
	          destructiveWrite: true,
	          createdAt: "2026-07-08T00:00:00.000Z",
	          updatedAt: "2026-07-08T00:02:00.000Z",
	        },
	        recoveryPlan: {
	          strategy: "restore_from_backup_or_recreate",
	          entityType: "task",
	          entityId: "task_final_shot",
	          deletedAt: "2026-07-08T00:02:00.000Z",
	          requiresBackupRestore: true,
	          requiresNewRecordApproval: true,
	          blockers: ["Mutation requests do not store raw deleted row contents."],
	          suggestedSteps: ["Preview a stored encrypted backup."],
	        },
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await previewRecordMutationDeleteRecoveryPlan(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_delete",
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	  expect(result.recoveryPolicy).toBe("deleted_record_backup_or_recreate_plan");
	  expect(result.destructiveWrite).toBe(false);
	  expect(result.recoveryPlan.requiresBackupRestore).toBe(true);
	});

	it("applies approved record mutation requests with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
	    expect(String(input)).toBe("https://worker.test/api/records/mutations/apply");
	    expect(init?.method).toBe("POST");
	    expect(init?.credentials).toBe("include");
	    expect(init?.headers).toEqual({
	      "content-type": "application/json",
	      "x-film-csrf": "csrf_1234567890",
	    });
	    expect(init?.body).toBe(JSON.stringify({
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      confirmation: "APPLY MUTATION mutation_request_1",
	      updates: { status: "ready" },
	    }));

	    return new Response(
	      JSON.stringify({
	        dryRun: false,
	        destructiveWrite: true,
	        persistence: "d1_record_mutation_requests",
	        auditPersistence: "d1_audit_events",
	        applicationPolicy: "approved_record_mutation_stale_checked",
	        request: {
	          id: "mutation_request_1",
	          workspaceId: "workspace_acme",
	          entityType: "task",
	          entityId: "task_final_shot",
	          mutation: "update",
	          actorMemberId: "member_contributor",
	          allowedBy: "write_permission",
	          status: "applied",
	          summaryPreview: "Update the task status.",
	          summarySha256: "a".repeat(64),
	          fieldKeys: ["status"],
	          expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
	          resolvedByMemberId: "member_producer",
	          resolvedAt: "2026-07-08T00:01:00.000Z",
	          resolutionNotePreview: "Approved by producer.",
	          resolutionNoteSha256: "b".repeat(64),
	          appliedByMemberId: "member_producer",
	          appliedAt: "2026-07-08T00:02:00.000Z",
	          application: {
	            action: "update",
	            applied: true,
	            idempotent: false,
	            fieldKeys: ["status"],
	            previousUpdatedAt: "2026-07-08T00:00:00.000Z",
	            updatedAt: "2026-07-08T00:02:00.000Z",
	            deletedAt: null,
	            fieldDiffs: [
	              { key: "status", before: "todo", after: "ready", changed: true },
	            ],
	            rollbackGuidance: {
	              strategy: "apply_inverse_update_request",
	              fieldKeys: ["status"],
	              requiresApproval: true,
	              requiresFreshRecord: true,
	              notes: ["Create an inverse mutation request."],
	            },
	          },
	          destructiveWrite: true,
	          createdAt: "2026-07-08T00:00:00.000Z",
	          updatedAt: "2026-07-08T00:02:00.000Z",
	        },
	        application: {
	          action: "update",
	          applied: true,
	          idempotent: false,
	          fieldKeys: ["status"],
	          previousUpdatedAt: "2026-07-08T00:00:00.000Z",
	          updatedAt: "2026-07-08T00:02:00.000Z",
	          deletedAt: null,
	          fieldDiffs: [
	            { key: "status", before: "todo", after: "ready", changed: true },
	          ],
	          rollbackGuidance: {
	            strategy: "apply_inverse_update_request",
	            fieldKeys: ["status"],
	            requiresApproval: true,
	            requiresFreshRecord: true,
	            notes: ["Create an inverse mutation request."],
	          },
	        },
	      }),
	      { status: 200 },
	    );
	  };

	  const result = await applyRecordMutationRequest(
	    "https://worker.test",
	    {
	      workspaceId: "workspace_acme",
	      requestId: "mutation_request_1",
	      confirmation: "APPLY MUTATION mutation_request_1",
	      updates: { status: "ready" },
	    },
	    "csrf_1234567890",
	    fetcher,
	  );

	  expect(result.applicationPolicy).toBe("approved_record_mutation_stale_checked");
	  expect(result.request.status).toBe("applied");
	  expect(result.application.fieldKeys).toEqual(["status"]);
	  expect(result.application.fieldDiffs[0]).toMatchObject({ key: "status", before: "todo", after: "ready" });
	});

	it("requests record permission history with csrf metadata", async () => {
	  const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/permissions/history");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_final_shot",
        limit: 20,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_audit_events",
          auditPersistence: "d1_audit_events",
          historyPolicy: "record_permission_audit_history",
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_final_shot",
          rowCount: 1,
          truncated: false,
          entries: [
            {
              id: "audit_permission",
              action: "record_permission.assigned",
              actorMemberId: "member_producer",
              memberId: "member_camera",
              permission: "write",
              department: "Camera",
              expiresAt: null,
              createdAt: "2026-07-08T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportRecordPermissionHistory(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_final_shot",
        limit: 20,
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.historyPolicy).toBe("record_permission_audit_history");
    expect(result.entries[0]?.permission).toBe("write");
  });

  it("assigns an explicit document record permission with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/permissions/assign-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_notes",
        memberId: "member_crew",
        permission: "write",
        department: null,
        expiresAt: null,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_permissions",
          permission: {
            id: "record_permission_doc_1",
            workspaceId: "workspace_acme",
            entityType: "document",
            entityId: "doc_notes",
            memberId: "member_crew",
            permission: "write",
            department: null,
            expiresAt: null,
          },
        }),
        { status: 200 },
      );
    };

    const result = await assignRecordPermission(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "document",
        entityId: "doc_notes",
        memberId: "member_crew",
        permission: "write",
        department: null,
        expiresAt: null,
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.permission.entityType).toBe("document");
    expect(result.permission.entityId).toBe("doc_notes");
  });

  it("assigns an explicit task record permission with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/permissions/assign-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_review",
        memberId: "member_crew",
        permission: "write",
        department: "Camera",
        expiresAt: null,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_permissions",
          permission: {
            id: "record_permission_task_1",
            workspaceId: "workspace_acme",
            entityType: "task",
            entityId: "task_review",
            memberId: "member_crew",
            permission: "write",
            department: "Camera",
            expiresAt: null,
          },
        }),
        { status: 200 },
      );
    };

    const result = await assignRecordPermission(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_review",
        memberId: "member_crew",
        permission: "write",
        department: "Camera",
        expiresAt: null,
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.permission.entityType).toBe("task");
    expect(result.permission.entityId).toBe("task_review");
  });

  it("throws worker errors for blocked record permissions", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "member_not_active" }), { status: 403 });

    await expect(
      assignRecordPermission(
        "https://worker.test",
        {
          workspaceId: "workspace_acme",
          entityType: "project",
          entityId: "proj_echoes",
          memberId: "member_disabled",
          permission: "write",
          department: null,
          expiresAt: null,
        },
        "csrf_1234567890",
        fetcher,
      ),
    ).rejects.toThrow("member_not_active");
  });

  it("requests a record permission manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/permissions/manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
        limit: 50,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_permissions",
          auditPersistence: "d1_audit_events",
          workspaceId: "workspace_acme",
          entityType: "project",
          entityId: "proj_echoes",
          manifestPolicy: "active_record_permissions_only",
          rowCount: 1,
          truncated: false,
          permissions: [
            {
              id: "permission_1",
              workspaceId: "workspace_acme",
              entityType: "project",
              entityId: "proj_echoes",
              memberId: "member_crew",
              permission: "write",
              department: "Camera",
              expiresAt: null,
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportRecordPermissionManifest(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "project",
        entityId: "proj_echoes",
        limit: 50,
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.manifestPolicy).toBe("active_record_permissions_only");
    expect(result.auditPersistence).toBe("d1_audit_events");
    expect(result.permissions[0]?.memberId).toBe("member_crew");
  });

  it("requests an expired record permission manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/permissions/expired-manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_review",
        limit: 50,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_permissions",
          auditPersistence: "d1_audit_events",
          workspaceId: "workspace_acme",
          entityType: "task",
          entityId: "task_review",
          manifestPolicy: "expired_record_permissions_only",
          rowCount: 1,
          truncated: false,
          permissions: [
            {
              id: "permission_expired_1",
              workspaceId: "workspace_acme",
              entityType: "task",
              entityId: "task_review",
              memberId: "member_crew",
              permission: "comment",
              department: "Camera",
              expiresAt: "2000-01-01T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportExpiredRecordPermissionManifest(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "task",
        entityId: "task_review",
        limit: 50,
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.manifestPolicy).toBe("expired_record_permissions_only");
    expect(result.permissions[0]?.expiresAt).toBe("2000-01-01T00:00:00.000Z");
  });

  it("revokes a record permission with exact manifest metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/permissions/revoke-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        permissionId: "permission_1",
        entityType: "project",
        entityId: "proj_echoes",
        memberId: "member_crew",
        permission: "write",
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_record_permissions",
          auditPersistence: "d1_audit_events",
          revokePolicy: "exact_permission_match_only",
          permission: {
            id: "permission_1",
            workspaceId: "workspace_acme",
            entityType: "project",
            entityId: "proj_echoes",
            memberId: "member_crew",
            permission: "write",
            department: "Camera",
            expiresAt: null,
          },
        }),
        { status: 200 },
      );
    };

    const result = await revokeRecordPermission(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        permissionId: "permission_1",
        entityType: "project",
        entityId: "proj_echoes",
        memberId: "member_crew",
        permission: "write",
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.revokePolicy).toBe("exact_permission_match_only");
    expect(result.permission.id).toBe("permission_1");
  });

  it("requests record owner history with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/records/owners/history");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        entityType: "equipment",
        entityId: "equipment_camera",
        limit: 20,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_audit_events",
          auditPersistence: "d1_audit_events",
          historyPolicy: "record_owner_transfer_audit_only",
          workspaceId: "workspace_acme",
          entityType: "equipment",
          entityId: "equipment_camera",
          rowCount: 1,
          truncated: false,
          entries: [
            {
              id: "audit_owner_transfer",
              actorMemberId: "member_producer",
              ownerMemberId: "member_camera",
              previousOwnerMemberId: "member_owner",
              createdAt: "2026-07-08T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportRecordOwnerHistory(
      "https://worker.test",
      {
        workspaceId: "workspace_acme",
        entityType: "equipment",
        entityId: "equipment_camera",
        limit: 20,
      },
      "csrf_1234567890",
      fetcher,
    );

    expect(result.historyPolicy).toBe("record_owner_transfer_audit_only");
    expect(result.entries[0]?.ownerMemberId).toBe("member_camera");
  });
});
