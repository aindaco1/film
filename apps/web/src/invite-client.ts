import type { WorkspaceRole } from "@film/schema";
import { parseWorkerJsonResponse as parseJsonResponse, type Fetcher } from "./worker-client";

export type WorkspaceInviteCreateResult = {
  dryRun: boolean;
  delivery: "queued_dry_run" | "blocked_provider_not_configured" | "blocked_suppressed" | "queued_live" | "sent_live" | "failed_live_delivery" | "not_sent";
  persistence: string;
  deliveryPersistence?: string;
  auditPersistence?: string;
  deliveryAttempt?: {
    id: string | null;
    provider: "resend";
    channel: "email";
    targetHash: string;
    templateKey: "workspace_invite";
    deliveryMode: "dry_run_outbox" | "live_resend";
    status: "queued_dry_run" | "blocked_provider_not_configured" | "queued_live" | "sent_live" | "failed_live_delivery";
    providerMessageId: string | null;
    errorCode: string | null;
  };
  invite: {
    id: string;
    workspaceId: string;
    emailHash: string;
    role: WorkspaceRole;
    expiresAt: string;
    devOnlyInviteToken: string | null;
  };
};

export type InviteDeliveryReadiness = {
  provider: "resend";
  channel: "email";
  mode: "readiness_only";
  status: "dry_run_outbox_ready" | "ready_for_live_adapter" | "live_delivery_enabled" | "blocked_live_delivery";
  dryRunOutboxAllowed: boolean;
  liveDeliveryAllowed: boolean;
  configured: {
    resendApiKey: boolean;
    fromEmail: boolean;
    appOrigin: boolean;
    webhookSecret: boolean;
    productionOrigin: boolean;
    liveMode: boolean;
  };
  requiredConfiguration: string[];
  blockers: string[];
  complianceNotes: string[];
};

export type InviteDeliveryReadinessResult = {
  dryRun: boolean;
  persistence: string;
  readiness: InviteDeliveryReadiness;
};

export type WorkspaceInviteManifestEntry = {
  id: string;
  workspaceId: string;
  emailHash: string;
  role: WorkspaceRole;
  status: "pending";
  expiresAt: string;
  createdAt: string;
};

export type WorkspaceInviteManifestResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  manifestPolicy: "pending_invites_hash_only";
  rowCount: number;
  truncated: boolean;
  invites: WorkspaceInviteManifestEntry[];
};

export type InviteDeliverySuppressionEntry = {
  id: string;
  provider: "resend";
  targetHash: string;
  reason: "bounced" | "complained" | "suppressed";
  workspaceId: string | null;
  inviteId: string | null;
  deliveryAttemptId: string | null;
  providerMessageId: string | null;
  sourceWebhookEventId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type InviteDeliverySuppressionManifestResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  manifestPolicy: "invite_delivery_suppressions_hash_only";
  rowCount: number;
  truncated: boolean;
  suppressions: InviteDeliverySuppressionEntry[];
};

export type WorkspaceInviteRevokeResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  revokePolicy: "pending_invite_exact_match_only";
  invite: WorkspaceInviteManifestEntry;
};

export type WorkspaceInviteAcceptResult = {
  dryRun: boolean;
  persistence: string;
  auditPersistence?: string;
  member: {
    id: string;
    workspaceId: string;
    emailHash: string;
    role: WorkspaceRole;
    status: "active";
  };
};

export async function createWorkspaceInvite(
  workerUrl: string,
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<WorkspaceInviteCreateResult> {
  return parseJsonResponse<WorkspaceInviteCreateResult>(
    await fetcher(`${workerUrl}/api/invites/create-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, email, role }),
    }),
    "Invite creation failed",
  );
}

export async function checkInviteDeliveryReadiness(
  workerUrl: string,
  workspaceId: string,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<InviteDeliveryReadinessResult> {
  return parseJsonResponse<InviteDeliveryReadinessResult>(
    await fetcher(`${workerUrl}/api/invites/delivery-readiness`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId }),
    }),
    "Invite delivery readiness failed",
  );
}

export async function exportWorkspaceInviteManifest(
  workerUrl: string,
  workspaceId: string,
  limit: number,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<WorkspaceInviteManifestResult> {
  return parseJsonResponse<WorkspaceInviteManifestResult>(
    await fetcher(`${workerUrl}/api/invites/manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, limit }),
    }),
    "Invite manifest export failed",
  );
}

export async function exportInviteDeliverySuppressions(
  workerUrl: string,
  workspaceId: string,
  limit: number,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<InviteDeliverySuppressionManifestResult> {
  return parseJsonResponse<InviteDeliverySuppressionManifestResult>(
    await fetcher(`${workerUrl}/api/invites/delivery-suppressions`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, limit }),
    }),
    "Invite delivery suppression manifest export failed",
  );
}

export async function revokeWorkspaceInvite(
  workerUrl: string,
  request: {
    workspaceId: string;
    inviteId: string;
    emailHash: string;
    role: WorkspaceRole;
  },
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<WorkspaceInviteRevokeResult> {
  return parseJsonResponse<WorkspaceInviteRevokeResult>(
    await fetcher(`${workerUrl}/api/invites/revoke-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify(request),
    }),
    "Invite revoke failed",
  );
}

export async function acceptWorkspaceInvite(
  workerUrl: string,
  token: string,
  displayName: string,
  fetcher: Fetcher = fetch,
): Promise<WorkspaceInviteAcceptResult> {
  return parseJsonResponse<WorkspaceInviteAcceptResult>(
    await fetcher(`${workerUrl}/api/invites/accept-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, displayName }),
    }),
    "Invite acceptance failed",
  );
}
