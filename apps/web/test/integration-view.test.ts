import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { getProviderDryRunStatus, TELNYX_SMS_CONSENT_DISCLOSURE } from "@film/providers";
import type { IntegrationKey } from "@film/schema";
import { captureIntegrationContext, emptyIntegrationResults, INTEGRATION_DEFINITIONS, type IntegrationViewState } from "../src/integration-state";
import { renderIntegrationView } from "../src/integration-view";
import { escapeHtml } from "../src/presentation-format";

function viewState(key?: IntegrationKey): IntegrationViewState {
  return {
    ...emptyIntegrationResults(),
    demo: false, signedIn: false, canManageSmsConsent: false,
    providerPreview: key ? { ...getProviderDryRunStatus(key)!, checkedAt: "2026-09-05T12:00:00Z", auditPersistence: null } : null,
  };
}

describe("integration view boundary", () => {
  it("renders one provider picker without fetching or presenting a connection as verified", () => {
    const markup = renderIntegrationView(viewState());
    expect(markup.match(/data-integration="/g)).toHaveLength(INTEGRATION_DEFINITIONS.length);
    expect(markup.match(/aria-pressed="false"/g)).toHaveLength(INTEGRATION_DEFINITIONS.length);
    expect(markup).toContain("Service status has not been checked");
    expect(markup.match(/>Not checked<\/small>/g)).toHaveLength(INTEGRATION_DEFINITIONS.length);
    expect(markup).not.toContain("Google connected");
    expect(markup).not.toContain('data-action="sms-send"');
  });

  it("preserves self-consent and management boundaries with one shared disclosure", () => {
    const state = viewState("sms");
    expect(renderIntegrationView(state)).not.toContain('data-action="sms-consent-enroll"');
    state.signedIn = true;
    let markup = renderIntegrationView(state);
    expect(markup).toContain(escapeHtml(TELNYX_SMS_CONSENT_DISCLOSURE));
    expect(markup).toContain('data-action="sms-consent-enroll"');
    expect(markup).not.toContain('data-action="telnyx-provider-readiness"');
    state.canManageSmsConsent = true;
    markup = renderIntegrationView(state);
    expect(markup).toContain('data-action="telnyx-provider-readiness"');
    expect(markup).toContain('data-action="sms-consent-manifest"');
  });

  it("does not offer revoked recipients and does not preselect anyone for sending", () => {
    const state = viewState("sms");
    state.signedIn = state.canManageSmsConsent = true;
    state.smsConsentManifest = {
      persistence: "d1_sms_compliance", checkedAt: "now", count: 2, truncated: false, secretValuesExposed: false,
      recipients: ["active", "revoked"].map((status) => ({
        id: status, memberId: `Crew ${status}`, status: status as "active" | "revoked",
        categories: ["call_sheet"], disclosureVersion: "v1", consentedAt: null, revokedAt: null, updatedAt: "2026-09-05",
      })),
    };
    const markup = renderIntegrationView(state);
    const sendForm = markup.match(/<form[^>]+data-action="sms-send">[\s\S]*?<\/form>/)?.[0] ?? "";
    expect(sendForm).toContain('value="active"');
    expect(sendForm).not.toContain('value="revoked"');
    expect(sendForm).not.toContain("checked");
    state.smsConsentManifest.recipients.shift();
    expect(renderIntegrationView(state)).not.toContain('data-action="sms-send"');
  });

  it("escapes provider text and keeps results scoped to the selected provider", () => {
    const state = viewState("social");
    state.providerPreview!.label = '<img src=x onerror="bad">';
    state.googleDriveManifest = {
      manifest: { rootFolderId: "folder", nextPageToken: null, truncated: false, files: [] },
      tokenRefreshed: false, persistence: "fixture", connectionPersistence: "fixture", auditPersistence: "fixture", checkedAt: "now",
    };
    state.metaPageCandidates = {
      pages: [{ id: "123456", name: "<script>unsafe</script>", tasks: [], instagramAccount: null }],
      persistence: "fixture", connectionPersistence: "fixture", auditPersistence: null, checkedAt: "now",
    };
    const markup = renderIntegrationView(state);
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("<script>");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).toContain('data-page-id="123456" disabled');
    expect(markup).not.toContain("Folder is empty");
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("invalidates pending provider work when the session or workspace changes", () => {
    let current = { session: {} as unknown, workspaceId: "workspace-one" };
    const isCurrent = captureIntegrationContext(() => current);
    expect(isCurrent()).toBe(true);
    current = { ...current, workspaceId: "workspace-two" };
    expect(isCurrent()).toBe(false);
    current = { session: {}, workspaceId: "workspace-one" };
    expect(isCurrent()).toBe(false);
    const next = captureIntegrationContext(() => current);
    current.session = null;
    expect(next()).toBe(false);
    expect(Object.values(emptyIntegrationResults()).every(value => value === null)).toBe(true);
  });

  it("offers Facebook-only Pages without counting inaccessible Pages as eligible", () => {
    const state = viewState("social");
    state.metaPageCandidates = {
      pages: [
        { id: "123456", name: "Social Test", tasks: ["ANALYZE"], instagramAccount: null },
        { id: "654321", name: "No access", tasks: ["CREATE_CONTENT"], instagramAccount: null },
      ],
      persistence: "fixture", connectionPersistence: "fixture", auditPersistence: null, checkedAt: "now",
    };
    const markup = renderIntegrationView(state);
    expect(markup).toContain("1 eligible Page");
    expect(markup).toContain("Facebook only");
    expect(markup).toContain('data-page-id="123456">Select');
    expect(markup).toContain('data-page-id="654321" disabled');
    expect(markup).toContain("Analytics access required");
  });

  it("keeps all provider imports inside guarded action error boundaries", () => {
    const source = readFileSync("src/main.ts", "utf8");
    const ast = ts.createSourceFile("main.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const handlers = ast.statements.filter(ts.isFunctionDeclaration)
      .filter(fn => fn.getText(ast).includes('await import("./provider-client")'));
    expect(handlers.length).toBe(21);
    for (const fn of handlers) {
      const body = fn.getText(ast);
      expect(body.includes("captureCurrentIntegrationContext()"), fn.name?.text).toBe(true);
      expect(body.includes("if (!isCurrent()) return;"), fn.name?.text).toBe(true);
    }
    const imports = ast.statements.filter(ts.isImportDeclaration);
    expect(imports.some(node => node.moduleSpecifier.getText(ast) === '"./provider-client"' && !node.importClause?.isTypeOnly)).toBe(false);
    const view = readFileSync("src/integration-view.ts", "utf8");
    expect(view).not.toMatch(/\b(fetch|workerFetch|sessionStorage|localStorage)\(/);
    expect(view).not.toContain('from "./main"');
  });

  it("offers one reconnect action for revoked Google access and retains explicit disconnect", () => {
    const state = viewState("google");
    state.signedIn = true;
    state.googleConnection = {
      checkedAt: "now", persistence: "fixture", auditPersistence: null,
      readiness: {
        provider: "google", mode: "oauth_connection", status: "live_oauth_enabled", liveOAuthAllowed: true,
        configured: { clientId: true, clientSecret: true, redirectUri: true, tokenEncryptionKey: true, appOrigin: true, d1: true, kv: true, liveMode: true },
        requiredConfiguration: [], blockers: [], dataBoundary: "drive_metadata_and_explicit_file_content",
      },
      connection: { provider: "google", status: "active", scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"], hasRefreshToken: true,
        tokenExpiresAt: "2026-09-05T12:00:00Z", rootFolderId: null, connectedAt: "2026-09-01", disconnectedAt: null, updatedAt: "2026-09-06", reauthorizationRequired: true },
    };
    let markup = renderIntegrationView(state);
    expect(markup).toContain("Google access expired or was revoked");
    expect(markup).not.toContain("Google connected");
    expect(markup).not.toContain('data-action="google-drive-manifest"');
    expect(markup.match(/data-action="google-connect"/g)).toHaveLength(1);
    expect(markup).toContain('data-action="google-disconnect"');
    state.googleConnection.readiness.liveOAuthAllowed = false;
    expect(renderIntegrationView(state)).toContain('data-action="google-connect" disabled');
    state.googleConnection.connection!.reauthorizationRequired = false;
    markup = renderIntegrationView(state);
    expect(markup).toContain("Google connected");
    expect(markup).toContain('data-action="google-drive-manifest"');
    expect(markup).not.toContain('data-action="google-connect"');
  });
});
