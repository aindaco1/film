import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "check-deployment-readiness.mjs");
const workerVarsExamplePath = path.join(root, "apps", "worker", ".dev.vars.example");

test("deployment readiness accepts production-shaped configuration without printing secrets", () => {
  const secrets = {
    RESEND_API_KEY: "resend_secret_should_not_print",
    INVITE_DELIVERY_WEBHOOK_SECRET: "invite_secret_should_not_print",
    STRIPE_WEBHOOK_SECRET: "stripe_secret_should_not_print",
    STRIPE_SUMMARY_ADAPTER_SECRET: "adapter_secret_should_not_print",
    GOOGLE_OAUTH_CLIENT_ID: "google_client_id_should_not_print",
    GOOGLE_OAUTH_CLIENT_SECRET: "google_client_secret_should_not_print",
    GOOGLE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    SMS_RECIPIENT_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString("base64"),
    SMS_RECIPIENT_HASH_KEY: Buffer.alloc(32, 12).toString("base64"),
  };

  const result = runCheck(readyWranglerConfig(), ["--strict"], secrets);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /No deployment readiness blockers found\./);
  for (const value of Object.values(secrets)) {
    assert.doesNotMatch(result.stdout, new RegExp(value));
  }
});

test("deployment readiness blocks local adapter URLs and placeholder mappings", () => {
  const result = runCheck(
    readyWranglerConfig({
      poolAdapterUrl: "http://127.0.0.1:8788/film/stripe-summary",
      stripeProjectMappings: "configured",
    }),
    ["--strict"],
    readySecrets(),
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Pool Stripe summary adapter URL must be a production HTTPS endpoint/);
  assert.match(result.stdout, /Stripe project mappings must be JSON or text mappings with at least one safe Pool\/Store ref/);
});

test("deployment readiness blocks invalid allowed origins", () => {
  const result = runCheck(
    readyWranglerConfig({
      allowedOrigins: "https://app.film.example/callback",
    }),
    ["--strict"],
    readySecrets(),
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /`ALLOWED_ORIGINS` must contain only exact http\(s\) origins/);
});

test("deployment readiness blocks malformed rate limit overrides", () => {
  const result = runCheck(
    readyWranglerConfig({
      rateLimitOverrides: JSON.stringify({
        unknown_bucket: { limit: 0, windowSeconds: 5 },
      }),
    }),
    ["--strict"],
    readySecrets(),
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /`RATE_LIMIT_OVERRIDES` must be a JSON object keyed by known bucket name/);
});

test("deployment readiness can opt into local dev vars without printing values", () => {
  const devVarsSecrets = {
    RESEND_API_KEY: "resend_dev_secret_should_not_print",
    INVITE_DELIVERY_WEBHOOK_SECRET: "invite_dev_secret_should_not_print",
    STRIPE_WEBHOOK_SECRET: "stripe_dev_secret_should_not_print",
    STRIPE_SUMMARY_ADAPTER_SECRET: "adapter_dev_secret_should_not_print",
    GOOGLE_OAUTH_CLIENT_ID: "google_dev_client_id_should_not_print",
    GOOGLE_OAUTH_CLIENT_SECRET: "google_dev_client_secret_should_not_print",
    GOOGLE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
    SMS_RECIPIENT_ENCRYPTION_KEY: Buffer.alloc(32, 13).toString("base64"),
    SMS_RECIPIENT_HASH_KEY: Buffer.alloc(32, 14).toString("base64"),
  };
  const result = runCheck(
    readyWranglerConfig(),
    ["--strict", "--dev-vars", "__DEV_VARS__"],
    {},
    {
      devVars: Object.entries(devVarsSecrets).map(([name, value]) => `${name}=${value}`).join("\n"),
    },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Loaded local Worker dev vars/);
  assert.match(result.stdout, /No deployment readiness blockers found\./);
  for (const value of Object.values(devVarsSecrets)) {
    assert.doesNotMatch(result.stdout, new RegExp(value));
  }
});

test("deployment readiness can count remote Wrangler secret names without values", () => {
  const result = runCheck(
    readyWranglerConfig(),
    ["--strict", "--wrangler-secrets"],
    {},
    {
      fakeNpx: `#!/usr/bin/env node
if (process.argv.slice(2).join(" ") !== "wrangler secret list --config ${JSON.stringify("__CONFIG__").slice(1, -1)} --format json") {
  console.error("unexpected npx args", process.argv.slice(2).join(" "));
  process.exit(2);
}
console.log(JSON.stringify([
  { name: "RESEND_API_KEY", type: "secret_text" },
  { name: "INVITE_DELIVERY_WEBHOOK_SECRET", type: "secret_text" },
  { name: "STRIPE_WEBHOOK_SECRET", type: "secret_text" },
  { name: "STRIPE_SUMMARY_ADAPTER_SECRET", type: "secret_text" }
  ,{ name: "GOOGLE_OAUTH_CLIENT_ID", type: "secret_text" }
  ,{ name: "GOOGLE_OAUTH_CLIENT_SECRET", type: "secret_text" }
  ,{ name: "GOOGLE_TOKEN_ENCRYPTION_KEY", type: "secret_text" }
  ,{ name: "SMS_RECIPIENT_ENCRYPTION_KEY", type: "secret_text" }
  ,{ name: "SMS_RECIPIENT_HASH_KEY", type: "secret_text" }
]));
`,
    },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Loaded 9 remote Wrangler secret name\(s\) without reading values\./);
  assert.match(result.stdout, /No deployment readiness blockers found\./);
  assert.doesNotMatch(result.stdout, /secret_text/);
});

test("Worker dev vars example documents readiness configuration names", () => {
  const example = readFileSync(workerVarsExamplePath, "utf8");
  for (const name of [
    "ALLOWED_ORIGINS",
    "RESEND_API_KEY",
    "INVITE_FROM_EMAIL",
    "INVITE_APP_ORIGIN",
    "INVITE_DELIVERY_WEBHOOK_SECRET",
    "INVITE_DELIVERY_MODE",
    "AUTH_MAGIC_LINK_MODE",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REDIRECT_URI",
    "GOOGLE_TOKEN_ENCRYPTION_KEY",
    "GOOGLE_OAUTH_MODE",
    "META_OAUTH_CLIENT_ID",
    "META_OAUTH_CLIENT_SECRET",
    "META_OAUTH_REDIRECT_URI",
    "META_GRAPH_API_VERSION",
    "META_LOGIN_CONFIGURATION_ID",
    "META_TOKEN_ENCRYPTION_KEY",
    "META_OAUTH_MODE",
    "SMS_RECIPIENT_ENCRYPTION_KEY",
    "SMS_RECIPIENT_HASH_KEY",
    "TELNYX_API_KEY",
    "TELNYX_MESSAGING_PROFILE_ID",
    "TELNYX_WEBHOOK_PUBLIC_KEY",
    "TELNYX_INBOUND_NUMBER_MAPPINGS",
    "TELNYX_WEBHOOK_MODE",
    "SMS_QUIET_HOURS_TIME_ZONE",
    "SMS_QUIET_HOURS_START",
    "SMS_QUIET_HOURS_END",
    "SMS_DELIVERY_RETENTION_DAYS",
    "SMS_MODE",
    "RATE_LIMIT_OVERRIDES",
    "POOL_STRIPE_SUMMARY_ADAPTER_URL",
    "STORE_STRIPE_SUMMARY_ADAPTER_URL",
    "STRIPE_PROJECT_MAPPINGS",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_REDACTED_AUDIT",
    "STRIPE_SUMMARY_ADAPTER_SECRET",
    "STRIPE_SUMMARY_MODE",
  ]) {
    assert.match(example, new RegExp(`\\b${name}\\b`));
  }
});

test("Meta live mode requires the complete app, Login for Business, and token-key gate", () => {
  const liveMetaConfig = readyWranglerConfig().replace(
    'GOOGLE_OAUTH_MODE = "live"',
    `GOOGLE_OAUTH_MODE = "live"
META_OAUTH_REDIRECT_URI = "https://worker.film.example/api/providers/meta/oauth/callback"
META_GRAPH_API_VERSION = "v23.0"
META_OAUTH_MODE = "live"`,
  );
  const incomplete = runCheck(liveMetaConfig, ["--strict"], readySecrets());
  assert.equal(incomplete.status, 1);
  assert.match(incomplete.stdout, /Meta OAuth live mode needs a numeric `META_OAUTH_CLIENT_ID`/);
  assert.match(incomplete.stdout, /Meta OAuth live mode needs `META_OAUTH_CLIENT_SECRET`/);
  assert.match(incomplete.stdout, /Meta OAuth live mode needs a numeric `META_LOGIN_CONFIGURATION_ID`/);
  assert.match(incomplete.stdout, /Meta OAuth live mode needs an independent base64 32-byte `META_TOKEN_ENCRYPTION_KEY`/);

  const complete = runCheck(liveMetaConfig, ["--strict"], {
    ...readySecrets(),
    META_OAUTH_CLIENT_ID: "123456789012345",
    META_OAUTH_CLIENT_SECRET: "meta-client-secret-value",
    META_LOGIN_CONFIGURATION_ID: "987654321098765",
    META_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 21).toString("base64"),
  });
  assert.equal(complete.status, 0, complete.stdout + complete.stderr);
  assert.match(complete.stdout, /No deployment readiness blockers found/);
  assert.doesNotMatch(complete.stdout, /meta-client-secret-value/);
});

test("SMS live mode requires the Telnyx sender, signed webhook, and quiet-hours gate", () => {
  const liveSmsConfig = readyWranglerConfig().replace(
    'GOOGLE_OAUTH_MODE = "live"',
    `GOOGLE_OAUTH_MODE = "live"
SMS_MODE = "live"`,
  );
  const incomplete = runCheck(liveSmsConfig, ["--strict"], readySecrets());
  assert.equal(incomplete.status, 1);
  assert.match(incomplete.stdout, /SMS live mode needs `TELNYX_API_KEY`/);
  assert.match(incomplete.stdout, /SMS live mode needs a valid `TELNYX_MESSAGING_PROFILE_ID` UUID/);
  assert.match(incomplete.stdout, /SMS live mode needs a valid `TELNYX_CAMPAIGN_ID`/);
  assert.match(incomplete.stdout, /SMS live mode needs `TELNYX_WEBHOOK_PUBLIC_KEY`/);
  assert.match(incomplete.stdout, /SMS live mode needs `TELNYX_INBOUND_NUMBER_MAPPINGS`/);
  assert.match(incomplete.stdout, /SMS live mode needs `TELNYX_WEBHOOK_MODE=live`/);
  assert.match(incomplete.stdout, /SMS live mode needs a valid IANA `SMS_QUIET_HOURS_TIME_ZONE`/);
  assert.match(incomplete.stdout, /SMS live mode needs `SMS_DELIVERY_RETENTION_DAYS` between 30 and 730/);
  assert.match(incomplete.stdout, /SMS live mode needs a Worker cron trigger/);

  const telnyxSecretFixture = "telnyx_fixture_" + "x".repeat(24);
  const completeConfig = liveSmsConfig.replace("[vars]", "[triggers]\ncrons = [\"17 9 * * *\"]\n\n[vars]");
  const complete = runCheck(completeConfig, ["--strict"], {
    ...readySecrets(),
    TELNYX_API_KEY: telnyxSecretFixture,
    TELNYX_MESSAGING_PROFILE_ID: "4000eba1-a0c0-4563-9925-b25e842a7cb6",
    TELNYX_CAMPAIGN_ID: "823d6b1a-6ed6-41a3-9c50-c8ff41b682ba",
    TELNYX_WEBHOOK_PUBLIC_KEY: Buffer.alloc(32, 19).toString("base64"),
    TELNYX_INBOUND_NUMBER_MAPPINGS: '{"+15555550999":"workspace_acme"}',
    TELNYX_WEBHOOK_MODE: "live",
    SMS_QUIET_HOURS_TIME_ZONE: "America/Denver",
    SMS_QUIET_HOURS_START: "22:00",
    SMS_QUIET_HOURS_END: "07:00",
    SMS_DELIVERY_RETENTION_DAYS: "90",
  });
  assert.equal(complete.status, 0, complete.stdout + complete.stderr);
  assert.match(complete.stdout, /No deployment readiness blockers found/);
  assert.doesNotMatch(complete.stdout, new RegExp(telnyxSecretFixture));
});

test("SMS preflight requires complete staging configuration while both activation gates stay disabled", () => {
  const preflightConfig = readyWranglerConfig().replace(
    'GOOGLE_OAUTH_MODE = "live"',
    `GOOGLE_OAUTH_MODE = "live"
TELNYX_MESSAGING_PROFILE_ID = "4000eba1-a0c0-4563-9925-b25e842a7cb6"
TELNYX_CAMPAIGN_ID = "823d6b1a-6ed6-41a3-9c50-c8ff41b682ba"
TELNYX_WEBHOOK_MODE = "disabled"
SMS_QUIET_HOURS_TIME_ZONE = "America/Denver"
SMS_QUIET_HOURS_START = "22:00"
SMS_QUIET_HOURS_END = "07:00"
SMS_DELIVERY_RETENTION_DAYS = "90"
SMS_MODE = "disabled"`,
  ).replace("[vars]", "[triggers]\ncrons = [\"17 9 * * *\"]\n\n[vars]");
  const telnyxSecretFixture = "telnyx_preflight_fixture_" + "x".repeat(24);
  const complete = runCheck(preflightConfig, ["--strict", "--sms-preflight"], {
    ...readySecrets(),
    TELNYX_API_KEY: telnyxSecretFixture,
    TELNYX_WEBHOOK_PUBLIC_KEY: Buffer.alloc(32, 19).toString("base64"),
    TELNYX_INBOUND_NUMBER_MAPPINGS: '{"+15555550999":"workspace_acme"}',
  });

  assert.equal(complete.status, 0, complete.stdout + complete.stderr);
  assert.match(complete.stdout, /webhook gate remains explicitly disabled during preflight/);
  assert.match(complete.stdout, /live-send gate remains explicitly disabled during preflight/);
  assert.doesNotMatch(complete.stdout, new RegExp(telnyxSecretFixture));
});

function runCheck(config, args = [], env = {}, files = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "film-deploy-check-"));
  const configPath = path.join(dir, "wrangler.toml");
  const devVarsPath = path.join(dir, ".dev.vars");
  const binPath = path.join(dir, "bin");
  writeFileSync(configPath, config);
  if (files.devVars) writeFileSync(devVarsPath, files.devVars);
  if (files.fakeNpx) {
    mkdirSync(binPath);
    writeFileSync(
      path.join(binPath, "npx"),
      files.fakeNpx.replaceAll("__CONFIG__", configPath),
      { mode: 0o755 },
    );
  }
  const expandedArgs = args.map((arg) => arg === "__DEV_VARS__" ? devVarsPath : arg);

  try {
    return spawnSync(process.execPath, [scriptPath, "--config", configPath, ...expandedArgs], {
      cwd: root,
      env: {
        PATH: files.fakeNpx ? `${binPath}:${process.env.PATH ?? ""}` : process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        TMPDIR: process.env.TMPDIR ?? tmpdir(),
        ...env,
      },
      encoding: "utf8",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readyWranglerConfig(overrides = {}) {
  const {
    allowedOrigins = "https://app.film.example",
    poolAdapterUrl = "https://pool.example.com/film/stripe-summary",
    storeAdapterUrl = "https://store.example.com/film/stripe-summary",
    rateLimitOverrides = "",
    stripeProjectMappings = JSON.stringify({
      workspace_acme: {
        project_dust: {
          poolRefs: ["dust-wave"],
          storeRefs: ["dust-wave-blu-ray"],
        },
      },
    }),
  } = overrides;

  return `
name = "film-worker"
main = "src/index.ts"
compatibility_date = "2026-07-07"
workers_dev = false
route = { pattern = "worker.film.example/*", custom_domain = true }

[vars]
ALLOWED_ORIGINS = "${allowedOrigins}"
INVITE_FROM_EMAIL = "Film <invites@example.com>"
INVITE_APP_ORIGIN = "https://app.film.example"
INVITE_DELIVERY_MODE = "live"
AUTH_MAGIC_LINK_MODE = "live"
GOOGLE_OAUTH_REDIRECT_URI = "https://worker.film.example/api/providers/google/oauth/callback"
GOOGLE_OAUTH_MODE = "live"
${rateLimitOverrides ? `RATE_LIMIT_OVERRIDES = '${rateLimitOverrides}'` : ""}
POOL_STRIPE_SUMMARY_ADAPTER_URL = "${poolAdapterUrl}"
STORE_STRIPE_SUMMARY_ADAPTER_URL = "${storeAdapterUrl}"
STRIPE_PROJECT_MAPPINGS = '${stripeProjectMappings}'
STRIPE_REDACTED_AUDIT = "true"
STRIPE_SUMMARY_MODE = "live"

[[d1_databases]]
binding = "DB"
database_name = "film"
database_id = "test-db"

[[kv_namespaces]]
binding = "SESSIONS"
id = "test-sessions"

[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "film-backups"

[[r2_buckets]]
binding = "ATTACHMENTS"
bucket_name = "film-attachments"
`;
}

function readySecrets() {
  return {
    RESEND_API_KEY: "resend_test_secret",
    INVITE_DELIVERY_WEBHOOK_SECRET: "invite_test_secret",
    STRIPE_WEBHOOK_SECRET: "stripe_test_webhook_secret",
    STRIPE_SUMMARY_ADAPTER_SECRET: "adapter_test_secret",
    GOOGLE_OAUTH_CLIENT_ID: "google_test_client_id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google_test_client_secret",
    GOOGLE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
    SMS_RECIPIENT_ENCRYPTION_KEY: Buffer.alloc(32, 15).toString("base64"),
    SMS_RECIPIENT_HASH_KEY: Buffer.alloc(32, 16).toString("base64"),
  };
}
