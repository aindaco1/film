import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultWorkerDir = path.join(root, "apps", "worker");

export function createLocalWorkerProofClient({
  origin = process.env.FILM_WORKER_SMOKE_ORIGIN ?? "http://127.0.0.1:8787",
  workerDir = defaultWorkerDir,
  fetcher = fetch,
  spawnSyncImpl = spawnSync,
} = {}) {
  const normalizedOrigin = normalizeHttpOrigin(origin);

  const client = {
    origin: normalizedOrigin,
    async requestJson(method, pathname, body, includeHeaders = false, extraHeaders = {}) {
      const response = await fetcher(`${normalizedOrigin}${pathname}`, {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`${pathname} returned non-JSON`);
      }
      if (!response.ok) {
        throw new Error(`${pathname} returned ${response.status}: ${parsed.error ?? "unknown_error"}`);
      }
      return includeHeaders ? { body: parsed, headers: response.headers } : parsed;
    },
    executeLocalD1(command, json = false) {
      if (!command.trim()) return null;
      const result = spawnSyncImpl("npx", [
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--local",
        "--yes",
        ...(json ? ["--json"] : []),
        "--command",
        command,
      ], {
        cwd: workerDir,
        env: { ...process.env, NO_COLOR: "1" },
        encoding: "utf8",
        timeout: 60_000,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (result.status !== 0) {
        throw new Error(`local D1 command exited with ${result.status}: ${result.error?.message ?? tail(result.stderr || result.stdout)}`);
      }
      if (!json) return null;
      try {
        return JSON.parse(result.stdout);
      } catch {
        throw new Error(`local D1 command returned non-JSON: ${tail(result.stdout)}`);
      }
    },
    provisionOwnerMember(probeName, workspaceId = "workspace_acme") {
      if (!/^[a-z0-9_]{3,48}$/.test(probeName)) {
        throw new Error("Local owner probe name must use lowercase letters, numbers, and underscores");
      }
      if (!/^[A-Za-z0-9_-]{3,96}$/.test(workspaceId)) {
        throw new Error("Local owner workspace ID must be an opaque identifier");
      }
      const memberId = `member_local_${probeName}_owner`;
      const email = `film-${probeName}@example.invalid`;
      const emailHash = createHash("sha256").update(email).digest("hex");
      client.executeLocalD1(localOwnerCleanupSql({ memberId, emailHash }));
      client.executeLocalD1(`
        INSERT INTO workspaces (id, name) VALUES ('${workspaceId}', 'Film local smoke')
          ON CONFLICT(id) DO NOTHING;
        INSERT INTO workspace_members (id, workspace_id, email_hash, role)
          VALUES ('${memberId}', '${workspaceId}', '${emailHash}', 'owner');
        INSERT INTO workspace_member_statuses (member_id, workspace_id, status, updated_at)
          VALUES ('${memberId}', '${workspaceId}', 'active', CURRENT_TIMESTAMP);
      `);
      return { memberId, email, emailHash, workspaceId };
    },
    disposeOwnerMember(member) {
      client.executeLocalD1(localOwnerCleanupSql(member));
    },
    async createOwnerSession(probeName, workspaceId = "workspace_acme") {
      const member = client.provisionOwnerMember(probeName, workspaceId);

      const magic = await client.requestJson("POST", "/api/auth/magic-link/request", { email: member.email });
      if (typeof magic.devOnlyToken !== "string" || !magic.devOnlyToken.startsWith("dry_")) {
        throw new Error("Local owner magic-link request did not return a dry-run token");
      }
      const verification = await client.requestJson("POST", "/api/auth/magic-link/verify", {
        token: magic.devOnlyToken,
      }, true);
      const csrfToken = verification.body.session?.csrfToken;
      if (typeof csrfToken !== "string") {
        throw new Error("Local owner verification did not return a CSRF token");
      }
      return {
        ...member,
        headers: {
          cookie: sessionCookieFrom(verification.headers.get("set-cookie")),
          "x-film-csrf": csrfToken,
        },
      };
    },
    async disposeOwnerSession(session) {
      let logoutError = null;
      try {
        await client.requestJson("POST", "/api/auth/logout", {}, false, session.headers);
      } catch (error) {
        logoutError = error;
      }
      client.disposeOwnerMember(session);
      if (logoutError) throw logoutError;
    },
  };
  return client;
}

export function sessionCookieFrom(setCookie) {
  const cookie = setCookie?.split(";")[0]?.trim() ?? "";
  if (!cookie.startsWith("film_session=")) {
    throw new Error("Magic-link verification did not return a Film session cookie");
  }
  return cookie;
}

export function checkedOpaqueId(value, pattern) {
  if (typeof value !== "string" || !pattern.test(value) || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Worker proof returned an invalid opaque ID");
  }
  return value;
}

export function normalizeHttpOrigin(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("FILM_WORKER_SMOKE_ORIGIN must be an HTTP(S) URL");
  }
  return parsed.origin;
}

function tail(value) {
  return value.split(/\r?\n/).slice(-12).join("\n");
}

function localOwnerCleanupSql({ memberId, emailHash }) {
  return `
    DELETE FROM sessions WHERE member_id = '${memberId}';
    DELETE FROM magic_links WHERE email_hash = '${emailHash}';
    DELETE FROM workspace_member_statuses WHERE member_id = '${memberId}';
    DELETE FROM workspace_members WHERE id = '${memberId}';
  `;
}
