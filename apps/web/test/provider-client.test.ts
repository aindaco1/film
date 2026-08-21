import { describe, expect, it } from "vitest";
import {
  checkMetaConnection,
  checkGoogleConnection,
  checkProviderRuntimeReadiness,
  checkStripeSummaryReadiness,
  checkTelnyxProviderStatus,
  commitSmsSelfConsent,
  disconnectMeta,
  disconnectGoogle,
  fetchMetaAnalytics,
  fetchMetaPageCandidates,
  fetchGoogleDriveManifest,
  fetchSmsConsentManifest,
  fetchStripeSummary,
  runGoogleDriveSyncDryRun,
  runProviderDryRun,
  sendSmsBatch,
  selectMetaPage,
  startMetaOAuth,
  startGoogleOAuth,
} from "../src/provider-client";

describe("provider client", () => {
  it("posts provider dry-run requests with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/stripe/dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });

      return new Response(
        JSON.stringify({
          dryRun: true,
          auditPersistence: "d1_audit_events",
          provider: {
            key: "stripe",
            label: "Stripe",
            mode: "dry-run",
            status: "needs_scope",
            capabilities: ["payment_summary"],
            requiredScopes: ["charges:read"],
            secretsPolicy: "worker_only",
            nextStep: "Implement summary adapters.",
            complianceNotes: [],
            productionReadPolicy: {
              mode: "summary_adapter_first",
              source: "pool_store_summary_adapter",
              liveReadAllowed: false,
              dataBoundary: "summary_only",
              blockers: ["Define summary adapter fields."],
            },
          },
        }),
        { status: 200 },
      );
    };

    const result = await runProviderDryRun("https://worker.test", "stripe", "csrf_1234567890", fetcher);

    expect(result.key).toBe("stripe");
    expect(result.auditPersistence).toBe("d1_audit_events");
    expect(result.capabilities).toEqual(["payment_summary"]);
    expect(result.productionReadPolicy?.source).toBe("pool_store_summary_adapter");
  });

  it("throws provider preflight errors", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "missing_csrf" }), { status: 403 });

    await expect(runProviderDryRun("https://worker.test", "pool", "", fetcher)).rejects.toThrow("missing_csrf");
  });

  it("posts protected provider runtime readiness requests", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/runtime-readiness");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme" }));
      return new Response(JSON.stringify({
        dryRun: true,
        persistence: "d1_kv_auth_records",
        auditPersistence: "d1_audit_events",
        readiness: {
          policy: "explicit_provider_live_gates",
          secretValuesExposed: false,
          liveCount: 4,
          partialLiveCount: 0,
          blockedCount: 3,
          providers: [],
        },
      }), { status: 200 });
    };

    const result = await checkProviderRuntimeReadiness(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      fetcher,
    );
    expect(result.liveCount).toBe(4);
    expect(result.blockedCount).toBe(3);
    expect(result.secretValuesExposed).toBe(false);
    expect(result.auditPersistence).toBe("d1_audit_events");
  });

  it("reads redacted Telnyx campaign and number readiness", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/sms/provider-readiness");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme" }));
      return new Response(JSON.stringify({
        dryRun: true,
        persistence: "d1_kv_auth_records",
        auditPersistence: "d1_audit_events",
        readiness: {
          provider: "telnyx",
          mode: "read_only_provider_preflight",
          status: "pending_campaign_review",
          providerApiChecked: true,
          profile: { reachable: true, enabled: true, nameMatches: true, webhookMatches: true, webhookApiV2: true },
          campaign: {
            reachable: true,
            status: "PENDING_MNO_REVIEW",
            active: false,
            rejectedOrSuspended: false,
            mno: { approved: 1, review: 1, rejected: 0, other: 0, total: 2 },
          },
          number: {
            reachable: true,
            smsCapable: true,
            profileAssigned: true,
            campaignAssigned: false,
            assignmentStatus: null,
          },
          configured: {
            apiKey: true,
            messagingProfile: true,
            campaign: true,
            senderMapping: true,
            webhookPublicKey: true,
            recipientEncryptionKey: true,
            recipientHashKey: true,
            quietHours: true,
            retention: true,
            d1: true,
          },
          activationGates: { webhookLive: false, sendLive: false },
          readyForOwnedNumberSmoke: false,
          blockers: [],
          secretValuesExposed: false,
        },
      }), { status: 200 });
    };

    const result = await checkTelnyxProviderStatus(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      fetcher,
    );

    expect(result.status).toBe("pending_campaign_review");
    expect(result.campaign.mno.review).toBe(1);
    expect(result.activationGates).toEqual({ webhookLive: false, sendLive: false });
    expect(result.secretValuesExposed).toBe(false);
  });

  it("reads a redacted SMS consent manifest without recipient identity fields", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/sms/consent/manifest");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme", limit: 25 }));
      return new Response(JSON.stringify({
        persistence: "d1_sms_compliance",
        recipients: [{
          id: "sms_recipient_opaque",
          memberId: "member_producer",
          status: "active",
          disclosureVersion: "crew-sms-v1",
          categories: ["call_sheet"],
          consentedAt: "2026-07-10T16:00:00.000Z",
          revokedAt: null,
          updatedAt: "2026-07-10T16:00:00.000Z",
        }],
        count: 1,
        truncated: false,
        secretValuesExposed: false,
      }), { status: 200 });
    };

    const result = await fetchSmsConsentManifest(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      25,
      fetcher,
    );

    expect(result.count).toBe(1);
    expect(result.secretValuesExposed).toBe(false);
    expect(JSON.stringify(result)).not.toContain("phone");
    expect(JSON.stringify(result)).not.toContain("ciphertext");
    expect(JSON.stringify(result)).not.toContain("recipientHash");
  });

  it("submits authenticated self-consent with the fixed workspace-form boundary", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/sms/consent/commit");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(request).toMatchObject({
        workspaceId: "workspace_acme",
        recipientE164: "+15055550100",
        categories: ["call_sheet", "schedule_change"],
        disclosureVersion: "crew-sms-v1-2026-07-13",
        source: "workspace_form",
        disclosureAcknowledged: true,
      });
      expect(request).not.toHaveProperty("memberId");
      expect(request.evidenceId).toMatch(/^workspace-form:[0-9a-f-]{36}$/);
      return new Response(JSON.stringify({
        ok: true,
        persistence: "d1_sms_compliance",
        auditPersistence: "d1_audit_events",
        destructiveWrite: true,
        idempotent: false,
        recipient: {
          id: "sms_recipient_opaque",
          memberId: "member_contributor",
          status: "active",
          disclosureVersion: "crew-sms-v1-2026-07-13",
          categories: ["call_sheet", "schedule_change"],
          consentedAt: "2026-07-13T18:00:00.000Z",
          revokedAt: null,
          updatedAt: "2026-07-13T18:00:00.000Z",
        },
        eventType: "consented",
        secretValuesExposed: false,
      }), { status: 200 });
    };

    const result = await commitSmsSelfConsent(
      "https://worker.test",
      "csrf_1234567890",
      {
        workspaceId: "workspace_acme",
        recipientE164: "+15055550100",
        categories: ["call_sheet", "schedule_change"],
        disclosureVersion: "crew-sms-v1-2026-07-13",
      },
      fetcher,
    );

    expect(result.recipient.memberId).toBe("member_contributor");
    expect(JSON.stringify(result)).not.toContain("+15055550100");
  });

  it("sends SMS through the protected transient-content boundary", async () => {
    const request = {
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      recipientIds: ["sms_recipient_0123456789abcdef0123456789abcdef"],
      category: "call_sheet" as const,
      messageBody: "Call sheet ready. Reply STOP to opt out.",
      requestKey: "send_request_client_0001",
      emergencyOverride: false,
      emergencyReasonCode: null,
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/sms/send");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(JSON.stringify(request));
      return new Response(JSON.stringify({
        ok: true,
        provider: {
          status: "sent",
          persistence: "d1_sms_delivery_attempts",
          recipientCount: 1,
          segmentCountPerRecipient: 1,
          totalSegmentCount: 1,
          queuedCount: 1,
          failedCount: 0,
          replayedCount: 0,
          emergencyOverrideApplied: false,
          attempts: [{ id: "sms_attempt_opaque", status: "queued" }],
          secretValuesExposed: false,
        },
      }), { status: 200 });
    };

    const result = await sendSmsBatch("https://worker.test", "csrf_1234567890", request, fetcher);
    expect(result).toMatchObject({ status: "sent", queuedCount: 1, secretValuesExposed: false });
    expect(JSON.stringify(result)).not.toContain(request.messageBody);
  });

  it("posts Stripe summary readiness requests with workspace scope", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/stripe/summary-readiness");
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
          auditPersistence: "d1_audit_events",
          readiness: {
            provider: "stripe",
            source: "pool_store_summary_adapter",
            mode: "readiness_only",
            status: "blocked_summary_adapter",
            dataBoundary: "summary_only",
            directStripeReadAllowed: false,
            liveSummaryReadAllowed: false,
            configured: {
              poolAdapter: false,
              storeAdapter: false,
              projectMappings: false,
              webhookSecret: false,
              redactedAudit: false,
              adapterSecret: false,
              liveMode: false,
            },
            requiredConfiguration: ["POOL_STRIPE_SUMMARY_ADAPTER_URL"],
            blockers: ["Missing POOL_STRIPE_SUMMARY_ADAPTER_URL."],
            complianceNotes: ["Stripe summaries must come through Pool/Store."],
          },
        }),
        { status: 200 },
      );
    };

    const result = await checkStripeSummaryReadiness(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      fetcher,
    );

    expect(result.provider).toBe("stripe");
    expect(result.persistence).toBe("d1_kv_auth_records");
    expect(result.auditPersistence).toBe("d1_audit_events");
    expect(result.directStripeReadAllowed).toBe(false);
    expect(result.blockers).toContain("Missing POOL_STRIPE_SUMMARY_ADAPTER_URL.");
  });

  it("posts Stripe summary aggregate requests with workspace and project scope", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/stripe/summary");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme", projectId: "proj_echoes" }));

      return new Response(
        JSON.stringify({
          dryRun: false,
          persistence: "d1_kv_auth_records",
          auditPersistence: "d1_audit_events",
          summary: {
            provider: "stripe",
            source: "pool_store_summary_adapter",
            mode: "live_summary_adapter",
            status: "complete_summary",
            workspaceId: "workspace_acme",
            projectId: "proj_echoes",
            dataBoundary: "summary_only",
            directStripeReadAllowed: false,
            liveSummaryReadAllowed: true,
            adapters: [
              {
                source: "pool",
                status: "available",
                mappedRefCount: 1,
                generatedAt: "2026-07-08T00:00:00.000Z",
                currency: "USD",
                totals: {
                  grossAmountCents: 1000,
                  feeAmountCents: 100,
                  netAmountCents: 900,
                  pledgedAmountCents: 1000,
                  chargedAmountCents: 1000,
                  orderRevenueCents: 0,
                  paymentFailedAmountCents: 0,
                  refundedAmountCents: 0,
                  disputedAmountCents: 0,
                },
                counts: {
                  paymentCount: 1,
                  paymentFailedCount: 0,
                  refundCount: 0,
                  disputeCount: 0,
                  invoiceCount: 0,
                  payoutCount: 0,
                },
                errorCode: null,
              },
            ],
            totals: {
              grossAmountCents: 1000,
              feeAmountCents: 100,
              netAmountCents: 900,
              pledgedAmountCents: 1000,
              chargedAmountCents: 1000,
              orderRevenueCents: 0,
              paymentFailedAmountCents: 0,
              refundedAmountCents: 0,
              disputedAmountCents: 0,
            },
            counts: {
              paymentCount: 1,
              paymentFailedCount: 0,
              refundCount: 0,
              disputeCount: 0,
              invoiceCount: 0,
              payoutCount: 0,
            },
            warnings: [],
          },
        }),
        { status: 200 },
      );
    };

    const result = await fetchStripeSummary(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      "proj_echoes",
      fetcher,
    );

    expect(result.status).toBe("complete_summary");
    expect(result.persistence).toBe("d1_kv_auth_records");
    expect(result.auditPersistence).toBe("d1_audit_events");
    expect(result.directStripeReadAllowed).toBe(false);
    expect(result.liveSummaryReadAllowed).toBe(true);
    expect(result.totals.netAmountCents).toBe(900);
  });

  it("posts Google Drive sync dry-run requests with workspace scope", async () => {
    const request = {
      workspaceId: "workspace_acme",
      rootFolderId: "folder_abc123456",
      includeCalendarSync: true,
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/google/drive-sync-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          dryRun: true,
          auditPersistence: "d1_audit_events",
          provider: {
            key: "google",
            label: "Google Drive",
            mode: "dry-run",
            workspaceId: "workspace_acme",
            syncMode: "metadata_preflight_only",
            rootFolderId: "folder_abc123456",
            rootFolderConfigured: true,
            oauthPolicy: "worker_encrypted_oauth_ready",
            webhookPolicy: "not_configured",
            secretsPolicy: "worker_only",
            requiredScopes: ["drive.metadata.readonly", "documents.readonly"],
            plannedActions: [
              {
                id: "link_root_folder",
                label: "Link a workspace root folder",
                mode: "dry-run",
                liveReadAllowed: false,
              },
            ],
            blockers: ["Configure the Google OAuth client secrets and explicit live-mode gate."],
            complianceNotes: ["Native Film documents remain canonical."],
          },
        }),
        { status: 200 },
      );
    };

    const result = await runGoogleDriveSyncDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.key).toBe("google");
    expect(result.auditPersistence).toBe("d1_audit_events");
    expect(result.rootFolderConfigured).toBe(true);
    expect(result.plannedActions[0]?.liveReadAllowed).toBe(false);
  });

  it("reads redacted Google connection status", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/google/connection");
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme" }));
      return Response.json({
        persistence: "d1_provider_connections",
        auditPersistence: "d1_audit_events",
        readiness: {
          provider: "google",
          mode: "oauth_connection",
          status: "live_oauth_enabled",
          liveOAuthAllowed: true,
          configured: {
            clientId: true,
            clientSecret: true,
            redirectUri: true,
            tokenEncryptionKey: true,
            appOrigin: true,
            d1: true,
            kv: true,
            liveMode: true,
          },
          requiredConfiguration: [],
          blockers: [],
          dataBoundary: "drive_metadata_and_explicit_file_content",
        },
        connection: {
          provider: "google",
          status: "active",
          scopes: ["https://www.googleapis.com/auth/drive.readonly"],
          hasRefreshToken: true,
          tokenExpiresAt: "2026-07-09T23:00:00.000Z",
          rootFolderId: null,
          connectedAt: "2026-07-09T22:00:00.000Z",
          disconnectedAt: null,
          updatedAt: "2026-07-09T22:00:00.000Z",
        },
      });
    };

    const result = await checkGoogleConnection(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      fetcher,
    );
    expect(result.connection).toMatchObject({ status: "active", hasRefreshToken: true });
    expect(result.readiness.liveOAuthAllowed).toBe(true);
  });

  it("starts Google OAuth with explicit capabilities", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/google/oauth/start");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        includeDocsExport: false,
        includeCalendarSync: false,
      }));
      return Response.json({
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=test",
        scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
        expiresAt: "2026-07-09T22:10:00.000Z",
        persistence: "kv_oauth_state",
        auditPersistence: "d1_audit_events",
      });
    };

    const result = await startGoogleOAuth(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      { includeDocsExport: false, includeCalendarSync: false },
      fetcher,
    );
    expect(result.authorizationUrl).toContain("accounts.google.com");
    expect(result.persistence).toBe("kv_oauth_state");
  });

  it("disconnects Google through the protected Worker route", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/google/disconnect");
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme" }));
      return Response.json({
        persistence: "d1_provider_connections",
        auditPersistence: "d1_audit_events",
        providerRevoked: true,
        connection: {
          provider: "google",
          status: "disconnected",
          scopes: [],
          hasRefreshToken: false,
          tokenExpiresAt: null,
          rootFolderId: null,
          connectedAt: "2026-07-09T22:00:00.000Z",
          disconnectedAt: "2026-07-09T22:05:00.000Z",
          updatedAt: "2026-07-09T22:05:00.000Z",
        },
      });
    };

    const result = await disconnectGoogle(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      fetcher,
    );
    expect(result.providerRevoked).toBe(true);
    expect(result.connection.status).toBe("disconnected");
  });

  it("reads a bounded Google Drive folder manifest", async () => {
    const request = { workspaceId: "workspace_acme", rootFolderId: "drive_folder_12345" };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/providers/google/drive-manifest");
      expect(init?.body).toBe(JSON.stringify(request));
      return Response.json({
        tokenRefreshed: false,
        persistence: "google_drive_api",
        connectionPersistence: "d1_provider_connections",
        auditPersistence: "d1_audit_events",
        manifest: {
          rootFolderId: "drive_folder_12345",
          files: [{
            id: "google_doc_12345",
            name: "Production bible",
            mimeType: "application/vnd.google-apps.document",
            modifiedTime: "2026-07-09T22:00:00.000Z",
            sizeBytes: null,
            webViewLink: "https://docs.google.com/document/d/google_doc_12345/edit",
          }],
          nextPageToken: null,
          truncated: false,
        },
      });
    };

    const result = await fetchGoogleDriveManifest(
      "https://worker.test",
      "csrf_1234567890",
      request,
      fetcher,
    );
    expect(result.manifest.files[0]).toMatchObject({ name: "Production bible" });
    expect(result.tokenRefreshed).toBe(false);
  });
});

describe("Meta provider client", () => {
  it("runs the protected read-only connection lifecycle", async () => {
    const calls: Array<{ path: string; body: Record<string, unknown>; credentials: RequestCredentials | undefined }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      calls.push({
        path: url.pathname,
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        credentials: init?.credentials,
      });
      expect(new Headers(init?.headers).get("x-film-csrf")).toBe("csrf_1234567890");
      if (url.pathname.endsWith("/connection")) {
        return Response.json({
          persistence: "d1_meta_provider_connections",
          readiness: {
            provider: "meta",
            mode: "read_only_oauth_connection",
            status: "live_oauth_enabled",
            liveOAuthAllowed: true,
            configured: {
              clientId: true,
              clientSecret: true,
              redirectUri: true,
              graphVersion: true,
              loginConfigurationId: true,
              tokenEncryptionKey: true,
              appOrigin: true,
              d1: true,
              kv: true,
              liveMode: true,
            },
            requiredConfiguration: [],
            blockers: [],
            dataBoundary: "meta_page_and_instagram_read_only_analytics_and_calendar_metadata",
          },
          connection: null,
        });
      }
      if (url.pathname.endsWith("/oauth/start")) {
        return Response.json({
          authorizationUrl: "https://www.facebook.com/v23.0/dialog/oauth?state=test",
          scopes: ["pages_show_list", "read_insights"],
          expiresAt: "2026-07-10T12:10:00.000Z",
          persistence: "kv_oauth_state",
        });
      }
      if (url.pathname.endsWith("/pages")) {
        return Response.json({
          persistence: "meta_graph_api",
          connectionPersistence: "d1_meta_provider_connections",
          secretValuesExposed: false,
          pages: [{
            id: "111111111111111",
            name: "Big Sword",
            tasks: ["ANALYZE"],
            instagramAccount: { id: "222222222222222", username: "bigswordfilm" },
          }],
        });
      }
      if (url.pathname.endsWith("/select-page")) {
        return Response.json({
          persistence: "d1_meta_provider_connections",
          secretValuesExposed: false,
          connection: metaConnection("active"),
        });
      }
      if (url.pathname.endsWith("/analytics")) {
        return Response.json({
          persistence: "meta_graph_api",
          connectionPersistence: "d1_meta_provider_connections",
          analytics: {
            status: "complete",
            since: "2026-07-01",
            until: "2026-07-10",
            calendar: [],
            insights: [],
            warnings: [],
            dataBoundary: "read_only_calendar_and_bounded_engagement_summaries",
            secretValuesExposed: false,
          },
        });
      }
      if (url.pathname.endsWith("/disconnect")) {
        return Response.json({
          persistence: "d1_meta_provider_connections",
          providerRevoked: true,
          connection: metaConnection("disconnected"),
        });
      }
      throw new Error(`Unexpected Meta client path: ${url.pathname}`);
    };

    const status = await checkMetaConnection("https://worker.test", "csrf_1234567890", "workspace_acme", fetcher);
    const start = await startMetaOAuth("https://worker.test", "csrf_1234567890", "workspace_acme", fetcher);
    const pages = await fetchMetaPageCandidates("https://worker.test", "csrf_1234567890", "workspace_acme", fetcher);
    const selected = await selectMetaPage(
      "https://worker.test",
      "csrf_1234567890",
      "workspace_acme",
      "111111111111111",
      fetcher,
    );
    const analytics = await fetchMetaAnalytics(
      "https://worker.test",
      "csrf_1234567890",
      { workspaceId: "workspace_acme", since: "2026-07-01", until: "2026-07-10" },
      fetcher,
    );
    const disconnected = await disconnectMeta("https://worker.test", "csrf_1234567890", "workspace_acme", fetcher);

    expect(status.readiness.liveOAuthAllowed).toBe(true);
    expect(start.authorizationUrl).toContain("facebook.com");
    expect(pages.pages[0]?.name).toBe("Big Sword");
    expect(selected.connection.status).toBe("active");
    expect(analytics.secretValuesExposed).toBe(false);
    expect(disconnected).toMatchObject({ providerRevoked: true, connection: { status: "disconnected" } });
    expect(calls.map((call) => call.path)).toEqual([
      "/api/providers/meta/connection",
      "/api/providers/meta/oauth/start",
      "/api/providers/meta/pages",
      "/api/providers/meta/select-page",
      "/api/providers/meta/analytics",
      "/api/providers/meta/disconnect",
    ]);
    expect(calls.every((call) => call.credentials === "include")).toBe(true);
    expect(calls[3]?.body).toMatchObject({ pageId: "111111111111111" });
  });
});

function metaConnection(status: "active" | "disconnected") {
  return {
    provider: "meta",
    status,
    scopes: status === "active" ? ["pages_show_list", "read_insights"] : [],
    tokenExpiresAt: status === "active" ? "2026-09-01T00:00:00.000Z" : null,
    page: status === "active" ? { id: "111111111111111", name: "Big Sword" } : null,
    instagramAccount: status === "active" ? { id: "222222222222222", username: "bigswordfilm" } : null,
    connectedAt: "2026-07-10T12:00:00.000Z",
    disconnectedAt: status === "disconnected" ? "2026-07-10T12:05:00.000Z" : null,
    updatedAt: "2026-07-10T12:05:00.000Z",
  };
}
