#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(args["source-dev-vars"] ?? path.join(root, "..", "pool", "worker", ".dev.vars"));
const sourceKey = args["source-key"] ?? "ADMIN_BOOTSTRAP_EMAILS";
const workspaceId = safeIdentifier(args.workspace ?? "workspace_acme", "workspace");
const workspaceName = safeLabel(args["workspace-name"] ?? "Acme Films", "workspace name");
const memberId = safeIdentifier(args.member ?? "member_owner", "member");
const memberName = safeLabel(args["member-name"] ?? "Workspace Owner", "member name");
const databaseName = safeIdentifier(args.database ?? "film", "database");
const configPath = path.resolve(args.config ?? path.join(root, "apps", "worker", "wrangler.toml"));

const sourceVars = readDevVars(readFileSync(sourcePath, "utf8"));
const ownerEmail = firstEmail(sourceVars.get(sourceKey) ?? "");
if (!ownerEmail) {
  throw new Error(`No valid owner email was available in ${path.basename(sourcePath)} under ${sourceKey}.`);
}

const emailHash = createHash("sha256").update(ownerEmail).digest("hex");
const auditId = `audit_operator_owner_bootstrap_${randomUUID()}`;
const auditMetadata = JSON.stringify({
  memberId,
  role: "owner",
  source: "operator_cli",
  sessionRevocation: "target_member_and_workspace_less",
  priorMagicLinksExpired: true,
});
const sql = `
PRAGMA foreign_keys = ON;
UPDATE magic_links
SET consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP)
WHERE email_hash IN (
  SELECT email_hash
  FROM workspace_members
  WHERE id = '${memberId}'
)
  AND consumed_at IS NULL;
UPDATE sessions
SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
WHERE member_id = '${memberId}'
   OR workspace_id IS NULL
   OR member_id IS NULL;
INSERT INTO workspaces (id, name, created_at, updated_at)
VALUES ('${workspaceId}', '${sqlString(workspaceName)}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = CURRENT_TIMESTAMP;
INSERT INTO workspace_members (id, workspace_id, email_hash, role, display_name, created_at)
VALUES ('${memberId}', '${workspaceId}', '${emailHash}', 'owner', '${sqlString(memberName)}', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET workspace_id = excluded.workspace_id, email_hash = excluded.email_hash, role = 'owner', display_name = excluded.display_name;
INSERT INTO workspace_member_statuses (member_id, workspace_id, status, updated_at)
VALUES ('${memberId}', '${workspaceId}', 'active', CURRENT_TIMESTAMP)
ON CONFLICT(member_id) DO UPDATE SET workspace_id = excluded.workspace_id, status = 'active', updated_at = CURRENT_TIMESTAMP;
INSERT INTO audit_events (id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at)
VALUES ('${auditId}', '${workspaceId}', NULL, '${memberId}', 'operator.owner_bootstrapped', '${sqlString(auditMetadata)}', CURRENT_TIMESTAMP);
`;

if (!args.apply) {
  console.log("Production owner bootstrap is ready. Re-run with --apply to rotate the member hash, expire prior owner links, revoke target and workspace-less sessions, and record an audit event.");
  process.exit(0);
}

const result = spawnSync("npx", [
  "wrangler",
  "d1",
  "execute",
  databaseName,
  "--remote",
  "--config",
  configPath,
  "--command",
  sql,
], {
  cwd: root,
  encoding: "utf8",
});

if (result.status !== 0) {
  const detail = firstOutputLine(result.stderr || result.stdout || "wrangler d1 execute failed");
  throw new Error(`Production owner bootstrap failed: ${detail}`);
}

console.log(`Production owner bootstrap applied to ${databaseName}: workspace and active owner membership are present; prior owner links and sessions were invalidated; an audit event was recorded.`);

function readDevVars(value) {
  const vars = new Map();
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const name = trimmed.slice(0, index).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    vars.set(name, unquote(trimmed.slice(index + 1).trim()));
  }
  return vars;
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

function firstEmail(value) {
  const email = value.split(",")[0]?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeIdentifier(value, label) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,119}$/.test(value)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return value;
}

function safeLabel(value, label) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 120 || /[\r\n]/.test(normalized)) {
    throw new Error(`Invalid ${label}.`);
  }
  return normalized;
}

function sqlString(value) {
  return value.replaceAll("'", "''");
}

function firstOutputLine(value) {
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "unknown error";
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      result.apply = true;
      continue;
    }
    if (["--source-dev-vars", "--source-key", "--workspace", "--workspace-name", "--member", "--member-name", "--database", "--config"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value.`);
      result[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}
