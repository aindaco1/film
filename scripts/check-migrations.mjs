import { mkdir, readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "migrations");
const sqliteBin = process.env.SQLITE3_BIN ?? "sqlite3";
const databasePath = process.env.FILM_MIGRATION_CHECK_DATABASE_PATH
  ? path.resolve(process.env.FILM_MIGRATION_CHECK_DATABASE_PATH)
  : path.join(root, "tmp", "film-migration-check.sqlite");
const expectedTables = [
  "attachment_package_plans",
  "attachment_upload_intents",
  "audit_events",
  "backup_object_download_plans",
  "documents",
  "equipment",
  "equipment_requests",
  "expenses",
  "film_profile_mutation_requests",
  "film_profiles",
  "folders",
  "integrations",
  "invite_delivery_attempts",
  "invite_delivery_suppressions",
  "invite_delivery_webhook_events",
  "locations",
  "magic_links",
  "media_items",
  "meeting_notes",
  "meta_data_deletion_requests",
  "meta_provider_connections",
  "merch_items",
  "operation_log",
  "opportunities",
  "people",
  "production_roles",
  "provider_connections",
  "project_people",
  "project_memberships",
  "record_comment_intents",
  "projects",
  "record_permissions",
  "restore_approvals",
  "restore_application_preflights",
  "restore_attachment_package_preflights",
  "restore_attachment_package_verifications",
  "restore_attachment_object_commit_preflights",
  "restore_attachment_object_plans",
  "restore_commit_attempts",
  "restore_planning_previews",
  "restore_points",
  "sessions",
  "shows",
  "sms_consent_events",
  "sms_delivery_attempts",
  "sms_recipients",
  "tasks",
  "telnyx_webhook_events",
  "workspace_invites",
  "workspace_member_statuses",
  "workspace_members",
  "workspace_restore_metadata",
  "workspaces",
];
const expectedColumns = new Map([
  ["documents", ["owner_member_id"]],
  ["equipment", ["owner_member_id"]],
  ["expenses", ["owner_member_id"]],
  ["film_profiles", ["created_at", "updated_at"]],
  ["meta_data_deletion_requests", ["confirmation_code", "request_fingerprint", "meta_user_id_sha256", "status"]],
  ["meta_provider_connections", ["user_access_token_ciphertext", "page_access_token_ciphertext", "token_key_version", "page_id", "instagram_account_id"]],
  ["people", ["owner_member_id"]],
  ["projects", ["owner_member_id", "shoot_dates", "location"]],
  ["provider_connections", ["access_token_ciphertext", "refresh_token_ciphertext", "token_key_version"]],
  ["sms_consent_events", ["source_event_id", "disclosure_version", "categories_json"]],
  ["sms_delivery_attempts", ["provider_message_id", "segment_count", "emergency_override", "error_codes_json"]],
  ["sms_recipients", ["recipient_hash", "recipient_ciphertext", "encryption_key_version", "status", "categories_json"]],
  ["tasks", ["owner_member_id"]],
  ["telnyx_webhook_events", ["provider_event_id", "delivery_status", "autoresponse_type", "recipient_hash"]],
  ["workspace_members", ["display_name", "last_seen_at"]],
]);
const expectedIndexes = [
  "idx_meta_connections_workspace_status",
  "idx_meta_deletion_status_updated",
  "idx_sms_delivery_attempts_retention",
  "idx_sms_recipients_workspace_status",
  "idx_telnyx_webhook_events_retention",
];

const migrationFiles = (await readdir(migrationsDir))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error("No migration files found.");
}

await mkdir(path.dirname(databasePath), { recursive: true });

for (let pass = 1; pass <= 2; pass += 1) {
  await rm(databasePath, { force: true });
  for (const migrationFile of migrationFiles) {
    await runSqlite([
      "PRAGMA foreign_keys = ON;",
      `.read ${quoteReadPath(path.join("migrations", migrationFile))}`,
    ]);
  }
}

const integrity = await runSqlite(["PRAGMA integrity_check;"]);
if (integrity.trim() !== "ok") {
  throw new Error(`SQLite integrity check failed: ${integrity.trim()}`);
}

const foreignKeyCheck = await runSqlite(["PRAGMA foreign_key_check;"]);
if (foreignKeyCheck.trim()) {
  throw new Error(`SQLite foreign key check failed:\n${foreignKeyCheck.trim()}`);
}

const tableOutput = await runSqlite([
  ".mode list",
  "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
]);
const actualTables = tableOutput.trim().split("\n").filter(Boolean);
const missingTables = expectedTables.filter((table) => !actualTables.includes(table));

if (missingTables.length > 0) {
  throw new Error(`Missing expected migration tables: ${missingTables.join(", ")}`);
}

for (const [table, columns] of expectedColumns.entries()) {
  const columnOutput = await runSqlite([
    ".mode list",
    `PRAGMA table_info(${quoteIdentifier(table)});`,
  ]);
  const actualColumns = columnOutput
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|")[1]);
  const missingColumns = columns.filter((column) => !actualColumns.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Missing expected migration columns on ${table}: ${missingColumns.join(", ")}`);
  }
}

const indexOutput = await runSqlite([
  ".mode list",
  "SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name;",
]);
const actualIndexes = indexOutput.trim().split("\n").filter(Boolean);
const missingIndexes = expectedIndexes.filter((index) => !actualIndexes.includes(index));
if (missingIndexes.length > 0) {
  throw new Error(`Missing expected migration indexes: ${missingIndexes.join(", ")}`);
}

console.log(`Migrations validated with ${sqliteBin} over 2 fresh passes: ${migrationFiles.join(", ")}`);

function runSqlite(commands) {
  return new Promise((resolve, reject) => {
    const child = spawn(sqliteBin, [databasePath], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(new Error(`Could not run sqlite3. Install sqlite3 or set SQLITE3_BIN. ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`sqlite3 exited ${code}: ${stderr || stdout}`));
    });

    child.stdin.end(`${commands.join("\n")}\n`);
  });
}

function quoteReadPath(value) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
