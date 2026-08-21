import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const configArgIndex = args.indexOf("--config");
const configPath = configArgIndex >= 0 && args[configArgIndex + 1]
  ? path.resolve(args[configArgIndex + 1])
  : path.join(root, "apps", "worker", "wrangler.toml");
const devVarsArgIndex = args.indexOf("--dev-vars");
const devVarsPath = devVarsArgIndex >= 0 && args[devVarsArgIndex + 1]
  ? path.resolve(args[devVarsArgIndex + 1])
  : "";
const strict = args.includes("--strict");
const includeWranglerSecrets = args.includes("--wrangler-secrets");
const smsPreflight = args.includes("--sms-preflight");
const config = await readFile(configPath, "utf8");
const devVars = devVarsPath ? readDevVars(await readFile(devVarsPath, "utf8")) : new Map();
const wranglerSecrets = includeWranglerSecrets ? readWranglerSecretNames(configPath) : {
  ok: true,
  names: new Set(),
  error: "",
};

const checks = [];
const blockers = [];

if (devVarsPath) {
  checks.push(`Loaded local Worker dev vars from ${path.relative(root, devVarsPath) || devVarsPath}.`);
}
if (includeWranglerSecrets) {
  if (wranglerSecrets.ok) {
    checks.push(`Loaded ${wranglerSecrets.names.size} remote Wrangler secret name(s) without reading values.`);
  } else {
    blockers.push(`Unable to list remote Wrangler secret names: ${wranglerSecrets.error}`);
  }
}

const workersDevDisabled = /^\s*workers_dev\s*=\s*false\s*$/m.test(config);
record(
  workersDevDisabled,
  "`workers_dev` is disabled.",
  "`workers_dev` must stay disabled until production routes, auth delivery, and origins are explicit.",
);

const hasD1 = hasBindingBlock("d1_databases", "DB");
record(hasD1, "D1 binding `DB` is configured.", "D1 binding `DB` is missing.");

const hasSessionsKv = hasBindingBlock("kv_namespaces", "SESSIONS");
record(hasSessionsKv, "KV binding `SESSIONS` is configured.", "KV binding `SESSIONS` is missing.");

const hasBackups = hasBindingBlock("r2_buckets", "BACKUPS");
record(hasBackups, "R2 binding `BACKUPS` is configured.", "R2 binding `BACKUPS` is missing.");

const hasAttachments = hasBindingBlock("r2_buckets", "ATTACHMENTS");
record(hasAttachments, "R2 binding `ATTACHMENTS` is configured.", "R2 binding `ATTACHMENTS` is missing.");

const allowedOrigins = readAllowedOrigins(readConfiguredValue("ALLOWED_ORIGINS"));
const invalidAllowedOrigins = allowedOrigins.filter((origin) => !isAllowedHttpOrigin(origin));
record(
  allowedOrigins.length > 0 && !allowedOrigins.includes("*") && invalidAllowedOrigins.length === 0,
  "`ALLOWED_ORIGINS` is explicit and does not use `*`.",
  invalidAllowedOrigins.length > 0
    ? "`ALLOWED_ORIGINS` must contain only exact http(s) origins without paths, credentials, query strings, fragments, or wildcards."
    : "`ALLOWED_ORIGINS` must be explicit and must not use `*`.",
);

const productionOrigins = allowedOrigins.filter((origin) => !isLocalOrigin(origin));
record(
  productionOrigins.length > 0,
  `Production app origins configured: ${productionOrigins.join(", ")}.`,
  "`ALLOWED_ORIGINS` currently contains only local development origins; add the production app origin before public deployment.",
);

const hasRoute = hasWorkerRoute(config);
record(
  hasRoute,
  "Worker production route/custom domain is configured.",
  "No Worker production route/custom domain is configured in `apps/worker/wrangler.toml`.",
);

const rateLimitOverrides = readConfiguredValue("RATE_LIMIT_OVERRIDES");
if (rateLimitOverrides) {
  record(
    hasValidRateLimitOverrides(rateLimitOverrides),
    "`RATE_LIMIT_OVERRIDES` uses bounded bucket limit/window settings.",
    "`RATE_LIMIT_OVERRIDES` must be a JSON object keyed by known bucket name with integer `limit` 1-1000 and `windowSeconds` 10-3600.",
  );
} else {
  checks.push("Default Worker rate-limit profile is active.");
}

const inviteAppOrigin = readConfiguredValue("INVITE_APP_ORIGIN");
record(
  hasConfiguredValue("RESEND_API_KEY"),
  "Invite delivery Resend API key is available via environment/secret binding.",
  "Invite live delivery is missing `RESEND_API_KEY`; dry-run outbox remains the only delivery mode.",
);
record(
  hasConfiguredValue("INVITE_FROM_EMAIL"),
  "Invite delivery sender is configured.",
  "Invite live delivery is missing `INVITE_FROM_EMAIL`.",
);
record(
  Boolean(inviteAppOrigin) && isProductionHttpOrigin(inviteAppOrigin) && allowedOrigins.includes(inviteAppOrigin),
  "Invite app origin is production HTTPS and included in `ALLOWED_ORIGINS`.",
  "Invite live delivery needs `INVITE_APP_ORIGIN` set to a production HTTPS origin that is also listed in `ALLOWED_ORIGINS`.",
);
record(
  hasConfiguredValue("INVITE_DELIVERY_WEBHOOK_SECRET"),
  "Invite delivery webhook secret is available via environment/secret binding.",
  "Invite live delivery is missing `INVITE_DELIVERY_WEBHOOK_SECRET` for Resend webhook verification.",
);
record(
  readConfiguredValue("INVITE_DELIVERY_MODE").toLowerCase() === "live",
  "Invite live delivery mode is explicitly enabled.",
  "Invite live delivery needs `INVITE_DELIVERY_MODE=live` before emails are sent.",
);
record(
  readConfiguredValue("AUTH_MAGIC_LINK_MODE").toLowerCase() === "live",
  "Member-only live magic-link delivery is explicitly enabled.",
  "Production auth needs `AUTH_MAGIC_LINK_MODE=live` so unknown emails cannot receive dry-run owner sessions.",
);

const googleRedirectUri = readConfiguredValue("GOOGLE_OAUTH_REDIRECT_URI");
const googleTokenKey = readConfiguredValue("GOOGLE_TOKEN_ENCRYPTION_KEY");
record(
  hasConfiguredValue("GOOGLE_OAUTH_CLIENT_ID"),
  "Google OAuth client ID is available via environment/secret binding.",
  "Google OAuth is missing `GOOGLE_OAUTH_CLIENT_ID`.",
);
record(
  hasConfiguredValue("GOOGLE_OAUTH_CLIENT_SECRET"),
  "Google OAuth client secret is available via environment/secret binding.",
  "Google OAuth is missing `GOOGLE_OAUTH_CLIENT_SECRET`.",
);
record(
  isProductionGoogleOAuthRedirectUri(googleRedirectUri),
  "Google OAuth redirect URI is a production HTTPS Worker callback.",
  "Google OAuth needs `GOOGLE_OAUTH_REDIRECT_URI` set to the production HTTPS `/api/providers/google/oauth/callback` route.",
);
record(
  googleTokenKey ? isBase64Key32(googleTokenKey) : wranglerSecrets.names.has("GOOGLE_TOKEN_ENCRYPTION_KEY"),
  "Google token encryption key is available through a valid local value or remote secret name.",
  "Google OAuth needs a base64 32-byte `GOOGLE_TOKEN_ENCRYPTION_KEY` secret.",
);
record(
  readConfiguredValue("GOOGLE_OAUTH_MODE").toLowerCase() === "live",
  "Google OAuth live mode is explicitly enabled.",
  "Google OAuth needs `GOOGLE_OAUTH_MODE=live` after consent and least-privilege scope review.",
);

const metaOAuthMode = readConfiguredValue("META_OAUTH_MODE").toLowerCase();
const metaRedirectUri = readConfiguredValue("META_OAUTH_REDIRECT_URI");
const metaGraphVersion = readConfiguredValue("META_GRAPH_API_VERSION");
const metaTokenKey = readConfiguredValue("META_TOKEN_ENCRYPTION_KEY");
if (metaOAuthMode === "live") {
  const metaClientId = readConfiguredValue("META_OAUTH_CLIENT_ID");
  const metaClientSecret = readConfiguredValue("META_OAUTH_CLIENT_SECRET");
  const metaLoginConfigurationId = readConfiguredValue("META_LOGIN_CONFIGURATION_ID");
  record(
    metaClientId ? /^\d{5,40}$/.test(metaClientId) : wranglerSecrets.names.has("META_OAUTH_CLIENT_ID"),
    "Meta OAuth app ID is configured.",
    "Meta OAuth live mode needs a numeric `META_OAUTH_CLIENT_ID`.",
  );
  record(
    metaClientSecret ? metaClientSecret.length >= 16 : wranglerSecrets.names.has("META_OAUTH_CLIENT_SECRET"),
    "Meta OAuth app secret is available via environment/secret binding.",
    "Meta OAuth live mode needs `META_OAUTH_CLIENT_SECRET`.",
  );
  record(
    isProductionMetaOAuthRedirectUri(metaRedirectUri),
    "Meta OAuth redirect URI is a production HTTPS Worker callback.",
    "Meta OAuth live mode needs `META_OAUTH_REDIRECT_URI` set to the production HTTPS `/api/providers/meta/oauth/callback` route.",
  );
  record(
    /^v\d{1,2}\.\d$/.test(metaGraphVersion),
    "Meta Graph API version is explicit.",
    "Meta OAuth live mode needs an explicit `META_GRAPH_API_VERSION` such as `v23.0`.",
  );
  record(
    metaLoginConfigurationId
      ? /^\d{5,40}$/.test(metaLoginConfigurationId)
      : wranglerSecrets.names.has("META_LOGIN_CONFIGURATION_ID"),
    "Meta Login for Business configuration ID is configured.",
    "Meta OAuth live mode needs a numeric `META_LOGIN_CONFIGURATION_ID`.",
  );
  record(
    metaTokenKey ? isBase64Key32(metaTokenKey) : wranglerSecrets.names.has("META_TOKEN_ENCRYPTION_KEY"),
    "Meta token encryption key is available through a valid local value or remote secret name.",
    "Meta OAuth live mode needs an independent base64 32-byte `META_TOKEN_ENCRYPTION_KEY` secret.",
  );
} else {
  checks.push("Meta OAuth live mode is intentionally disabled pending Meta app review and configuration.");
  if (metaRedirectUri) {
    record(
      isProductionMetaOAuthRedirectUri(metaRedirectUri),
      "Disabled Meta OAuth redirect URI is a valid production Worker callback.",
      "Configured `META_OAUTH_REDIRECT_URI` must be the production HTTPS `/api/providers/meta/oauth/callback` route.",
    );
  }
  if (metaGraphVersion) {
    record(
      /^v\d{1,2}\.\d$/.test(metaGraphVersion),
      "Disabled Meta integration pins an explicit Graph API version.",
      "Configured `META_GRAPH_API_VERSION` must use the `vN.N` form.",
    );
  }
}

const smsRecipientEncryptionKey = readConfiguredValue("SMS_RECIPIENT_ENCRYPTION_KEY");
const smsRecipientHashKey = readConfiguredValue("SMS_RECIPIENT_HASH_KEY");
record(
  smsRecipientEncryptionKey
    ? isBase64Key32(smsRecipientEncryptionKey)
    : wranglerSecrets.names.has("SMS_RECIPIENT_ENCRYPTION_KEY"),
  "SMS recipient encryption key is available through a valid local value or remote secret name.",
  "Telnyx SMS needs a dedicated base64 32-byte `SMS_RECIPIENT_ENCRYPTION_KEY` secret before recipient consent can be stored.",
);
record(
  smsRecipientHashKey
    ? isBase64Key32(smsRecipientHashKey)
    : wranglerSecrets.names.has("SMS_RECIPIENT_HASH_KEY"),
  "SMS recipient HMAC key is available through a valid local value or remote secret name.",
  "Telnyx SMS needs a separate base64 32-byte `SMS_RECIPIENT_HASH_KEY` secret before recipient identity can be indexed.",
);
const smsMode = readConfiguredValue("SMS_MODE").toLowerCase();
if (smsMode === "live" || smsPreflight) {
  const telnyxApiKey = readConfiguredValue("TELNYX_API_KEY");
  const telnyxProfileId = readConfiguredValue("TELNYX_MESSAGING_PROFILE_ID");
  const telnyxCampaignId = readConfiguredValue("TELNYX_CAMPAIGN_ID");
  const telnyxPublicKey = readConfiguredValue("TELNYX_WEBHOOK_PUBLIC_KEY");
  const telnyxMappings = readConfiguredValue("TELNYX_INBOUND_NUMBER_MAPPINGS");
  const quietTimeZone = readConfiguredValue("SMS_QUIET_HOURS_TIME_ZONE");
  const quietStart = readConfiguredValue("SMS_QUIET_HOURS_START");
  const quietEnd = readConfiguredValue("SMS_QUIET_HOURS_END");
  const retentionDays = Number(readConfiguredValue("SMS_DELIVERY_RETENTION_DAYS"));
  record(
    telnyxApiKey ? telnyxApiKey.length >= 16 : wranglerSecrets.names.has("TELNYX_API_KEY"),
    "Telnyx API key is available via environment/secret binding.",
    "SMS live mode needs `TELNYX_API_KEY`.",
  );
  record(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(telnyxProfileId),
    "Telnyx messaging profile ID is configured.",
    "SMS live mode needs a valid `TELNYX_MESSAGING_PROFILE_ID` UUID.",
  );
  record(
    /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/.test(telnyxCampaignId),
    "Telnyx campaign ID is configured.",
    "SMS live mode needs a valid `TELNYX_CAMPAIGN_ID`.",
  );
  record(
    Boolean(telnyxPublicKey) || wranglerSecrets.names.has("TELNYX_WEBHOOK_PUBLIC_KEY"),
    "Telnyx webhook public key is available via environment/secret binding.",
    "SMS live mode needs `TELNYX_WEBHOOK_PUBLIC_KEY`.",
  );
  record(
    Boolean(telnyxMappings) || wranglerSecrets.names.has("TELNYX_INBOUND_NUMBER_MAPPINGS"),
    "Telnyx receiving-number workspace mapping is available via environment/secret binding.",
    "SMS live mode needs `TELNYX_INBOUND_NUMBER_MAPPINGS`.",
  );
  if (smsMode === "live") {
    record(
      readConfiguredValue("TELNYX_WEBHOOK_MODE").toLowerCase() === "live",
      "Telnyx signed webhook live mode is explicitly enabled.",
      "SMS live mode needs `TELNYX_WEBHOOK_MODE=live`.",
    );
  } else {
    record(
      readConfiguredValue("TELNYX_WEBHOOK_MODE").toLowerCase() === "disabled",
      "Telnyx signed webhook gate remains explicitly disabled during preflight.",
      "SMS preflight needs `TELNYX_WEBHOOK_MODE=disabled` until campaign approval and signed fixtures pass.",
    );
    record(
      smsMode === "disabled",
      "Telnyx live-send gate remains explicitly disabled during preflight.",
      "SMS preflight needs `SMS_MODE=disabled` until the owned-number smoke window.",
    );
  }
  record(
    isValidQuietHoursConfiguration(quietTimeZone, quietStart, quietEnd),
    "SMS quiet-hours policy is explicitly configured.",
    "SMS live mode needs a valid IANA `SMS_QUIET_HOURS_TIME_ZONE` and distinct HH:MM start/end values.",
  );
  record(
    Number.isSafeInteger(retentionDays) && retentionDays >= 30 && retentionDays <= 730,
    "SMS terminal metadata retention period is explicitly configured.",
    "SMS live mode needs `SMS_DELIVERY_RETENTION_DAYS` between 30 and 730.",
  );
  record(
    /^\s*crons\s*=\s*\[[^\]]+\]/m.test(config),
    "Worker cron trigger is configured for SMS retention cleanup.",
    "SMS live mode needs a Worker cron trigger for terminal metadata retention cleanup.",
  );
} else {
  checks.push("Telnyx SMS live-send mode is intentionally disabled pending account, campaign, policy, and owned-number approval.");
}

const poolStripeAdapterUrl = readConfiguredValue("POOL_STRIPE_SUMMARY_ADAPTER_URL");
const storeStripeAdapterUrl = readConfiguredValue("STORE_STRIPE_SUMMARY_ADAPTER_URL");
const stripeProjectMappings = readConfiguredValue("STRIPE_PROJECT_MAPPINGS");
const stripeSummaryMode = readConfiguredValue("STRIPE_SUMMARY_MODE").toLowerCase();
if (stripeSummaryMode === "live") {
  record(Boolean(poolStripeAdapterUrl), "Pool Stripe summary adapter URL is configured.", "Stripe summaries need `POOL_STRIPE_SUMMARY_ADAPTER_URL` before live summary reads.");
  record(
    isProductionStripeSummaryAdapterUrl(poolStripeAdapterUrl),
    "Pool Stripe summary adapter URL is a production HTTPS `/film/stripe-summary` endpoint.",
    "Pool Stripe summary adapter URL must be a production HTTPS endpoint with path `/film/stripe-summary` before live summary reads.",
  );
  record(Boolean(storeStripeAdapterUrl), "Store Stripe summary adapter URL is configured.", "Stripe summaries need `STORE_STRIPE_SUMMARY_ADAPTER_URL` before live summary reads.");
  record(
    isProductionStripeSummaryAdapterUrl(storeStripeAdapterUrl),
    "Store Stripe summary adapter URL is a production HTTPS `/film/stripe-summary` endpoint.",
    "Store Stripe summary adapter URL must be a production HTTPS endpoint with path `/film/stripe-summary` before live summary reads.",
  );
  record(Boolean(stripeProjectMappings), "Stripe project mapping configuration is present.", "Stripe summaries need `STRIPE_PROJECT_MAPPINGS` before live summary reads.");
  record(
    hasUsableStripeProjectMappings(stripeProjectMappings),
    "Stripe project mappings include at least one safe Pool/Store ref.",
    "Stripe project mappings must be JSON or text mappings with at least one safe Pool/Store ref before live summary reads.",
  );
  record(hasConfiguredValue("STRIPE_WEBHOOK_SECRET"), "Stripe webhook secret is available via environment/secret binding.", "Stripe summaries need `STRIPE_WEBHOOK_SECRET` before webhook-backed live summary reads.");
  record(isEnabledFlag(readConfiguredValue("STRIPE_REDACTED_AUDIT")), "Stripe redacted audit logging is explicitly enabled.", "Stripe summaries need `STRIPE_REDACTED_AUDIT=true` before live summary reads.");
  record(
    hasConfiguredValue("STRIPE_SUMMARY_ADAPTER_SECRET"),
    "Film-side Stripe summary adapter shared secret is available via environment/secret binding.",
    "Stripe summaries need Film's `STRIPE_SUMMARY_ADAPTER_SECRET` before live Pool/Store adapter reads; Pool/Store companion Workers use `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` with the same value.",
  );
} else {
  checks.push("Stripe summary mode is intentionally disabled until canonical production project mappings exist.");
  if (poolStripeAdapterUrl) record(isProductionStripeSummaryAdapterUrl(poolStripeAdapterUrl), "Disabled Pool adapter URL remains production-shaped.", "Configured Pool adapter URL must be production HTTPS `/film/stripe-summary`.");
  if (storeStripeAdapterUrl) record(isProductionStripeSummaryAdapterUrl(storeStripeAdapterUrl), "Disabled Store adapter URL remains production-shaped.", "Configured Store adapter URL must be production HTTPS `/film/stripe-summary`.");
}

console.log("Deployment readiness checks:");
for (const check of checks) {
  console.log(`- OK: ${check}`);
}

if (blockers.length > 0) {
  console.log("\nDeployment readiness blockers:");
  for (const blocker of blockers) {
    console.log(`- ${blocker}`);
  }
  if (strict) {
    process.exit(1);
  }
  console.log("\nRun `npm run check:deploy:strict` when production route/origin decisions are ready to fail on blockers.");
} else {
  console.log("\nNo deployment readiness blockers found.");
}

function record(ok, success, failure) {
  if (ok) {
    checks.push(success);
    return;
  }
  blockers.push(failure);
}

function hasBindingBlock(blockName, bindingName) {
  const blockPattern = new RegExp(`\\[\\[${escapeRegExp(blockName)}\\]\\]([\\s\\S]*?)(?=\\n\\[|$)`, "g");
  for (const match of config.matchAll(blockPattern)) {
    const block = match[1] ?? "";
    if (new RegExp(`^\\s*binding\\s*=\\s*["']${escapeRegExp(bindingName)}["']\\s*$`, "m").test(block)) {
      return true;
    }
  }
  return false;
}

function readAllowedOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function readConfiguredValue(name) {
  const fromEnv = process.env[name]?.trim();
  if (fromEnv) return fromEnv;

  const fromDevVars = devVars.get(name)?.trim();
  if (fromDevVars) return fromDevVars;

  const match = config.match(new RegExp(`^\\s*${escapeRegExp(name)}\\s*=\\s*(.+?)\\s*$`, "m"));
  return match ? readTomlScalarString(match[1]).trim() : "";
}

function readDevVars(value) {
  const vars = new Map();
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [name, ...parts] = trimmed.split("=");
    const normalizedName = name.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedName)) continue;
    vars.set(normalizedName, readTomlScalarString(parts.join("=")).trim());
  }
  return vars;
}

function readTomlScalarString(rawValue) {
  const value = rawValue.trim();
  if (!value) return "";

  if (value.startsWith("'")) {
    const end = value.lastIndexOf("'");
    return end > 0 ? value.slice(1, end) : "";
  }

  if (value.startsWith('"')) {
    const end = value.lastIndexOf('"');
    return end > 0 ? value.slice(1, end).replace(/\\"/g, '"').replace(/\\\\/g, "\\") : "";
  }

  return value.replace(/\s+#.*$/, "").trim();
}

function hasConfiguredValue(name) {
  return Boolean(readConfiguredValue(name)) || wranglerSecrets.names.has(name);
}

function readWranglerSecretNames(configFile) {
  const result = spawnSync("npx", [
    "wrangler",
    "secret",
    "list",
    "--config",
    configFile,
    "--format",
    "json",
  ], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return {
      ok: false,
      names: new Set(),
      error: firstOutputLine(result.stderr || result.stdout || "wrangler secret list failed"),
    };
  }

  try {
    const parsed = JSON.parse(result.stdout || "[]");
    const names = new Set(
      Array.isArray(parsed)
        ? parsed.map((item) => String(item?.name ?? "").trim()).filter(Boolean)
        : [],
    );
    return { ok: true, names, error: "" };
  } catch {
    return {
      ok: false,
      names: new Set(),
      error: "wrangler secret list returned non-JSON output",
    };
  }
}

function firstOutputLine(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "unknown error";
}

function isEnabledFlag(value) {
  return ["1", "true", "yes", "enabled"].includes(value.trim().toLowerCase());
}

function isAllowedHttpOrigin(origin) {
  try {
    const url = new URL(origin);
    return ["http:", "https:"].includes(url.protocol)
      && url.origin === origin
      && url.username === ""
      && url.password === ""
      && url.pathname === "/"
      && url.search === ""
      && url.hash === "";
  } catch {
    return false;
  }
}

function isLocalOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isProductionHttpOrigin(origin) {
  try {
    const url = new URL(origin);
    return isAllowedHttpOrigin(origin) && url.protocol === "https:" && !isLocalOrigin(origin);
  } catch {
    return false;
  }
}

function isProductionStripeSummaryAdapterUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !isLocalOrigin(url.origin)
      && url.username === ""
      && url.password === ""
      && url.pathname === "/film/stripe-summary"
      && url.search === ""
      && url.hash === "";
  } catch {
    return false;
  }
}

function hasUsableStripeProjectMappings(value) {
  const raw = value.trim();
  if (!raw) return false;

  try {
    return hasUsableStripeProjectMappingsValue(JSON.parse(raw));
  } catch {
    return hasUsableStripeProjectMappingsText(raw);
  }
}

function hasUsableStripeProjectMappingsValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (!isObjectRecord(item)) return false;
      const projectId = String(item.projectId ?? item.project_id ?? "").trim();
      return Boolean(projectId) && hasUsableStripeProjectMappingRefs(item);
    });
  }

  if (!isObjectRecord(value)) return false;

  if (hasUsableStripeProjectMappingRefs(value)) return true;

  return Object.values(value).some((candidate) => {
    if (hasUsableStripeProjectMappingRefs(candidate)) return true;
    if (!isObjectRecord(candidate)) return false;
    return Object.values(candidate).some((nested) => hasUsableStripeProjectMappingRefs(nested));
  });
}

function hasUsableStripeProjectMappingRefs(value) {
  if (typeof value === "string") return hasUsableStripeProjectMappingsText(value);
  if (Array.isArray(value)) return value.some((item) => Boolean(safeStripeMappingRef(item)));
  if (!isObjectRecord(value)) return false;

  return [
    value.pool,
    value.poolRefs,
    value.pool_refs,
    value.poolCampaigns,
    value.pool_campaigns,
    value.store,
    value.storeRefs,
    value.store_refs,
    value.storeProducts,
    value.store_products,
  ].some((candidate) => stripeMappingRefsFromUnknown(candidate).length > 0);
}

function hasUsableStripeProjectMappingsText(value) {
  const entries = value.includes(";") ? value.split(";") : [value];
  return entries.some((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return false;
    const mappingText = trimmed.includes("=") ? trimmed.split(/=(.*)/s, 2)[1] ?? "" : trimmed;
    const poolMatch = mappingText.match(/(?:^|[,|\s])pool:([^,|;]+)/i);
    const storeMatch = mappingText.match(/(?:^|[,|\s])store:([^,|;]+)/i);
    return stripeMappingRefsFromText(poolMatch?.[1] ?? "").length > 0
      || stripeMappingRefsFromText(storeMatch?.[1] ?? "").length > 0;
  });
}

function hasValidRateLimitOverrides(value) {
  const allowedBuckets = new Set([
    "auth_magic_link_request",
    "auth_magic_link_verify",
    "auth_logout",
    "invite_dry_run",
    "project_membership",
    "record_permission",
    "member_status",
    "workspace_snapshot",
    "document_content",
    "provider_dry_run",
    "google_oauth_start",
    "google_oauth_callback",
    "google_oauth_disconnect",
    "meta_oauth_start",
    "meta_oauth_callback",
    "meta_oauth_disconnect",
    "meta_connection_status",
    "meta_page_candidates",
    "meta_page_select",
    "meta_analytics",
    "meta_data_deletion_callback",
    "meta_deauthorization_callback",
    "meta_data_deletion_status",
    "import_dry_run",
    "notion_import_preflight",
    "notion_core_import",
    "notion_planning_import",
    "provider_runtime_readiness",
    "sms_consent_commit",
    "sms_consent_manifest",
    "sms_consent_revoke",
    "sms_live_send",
    "telnyx_provider_readiness",
    "telnyx_webhook",
    "google_connection_status",
    "attachment_dry_run",
    "backup_restore",
    "operation_sync",
    "unknown_mutation",
  ]);

  try {
    const parsed = JSON.parse(value);
    if (!isObjectRecord(parsed) || Object.keys(parsed).length === 0) return false;
    return Object.entries(parsed).every(([bucket, override]) => {
      if (!allowedBuckets.has(bucket) || !isObjectRecord(override)) return false;
      const limit = Number(override.limit);
      const windowSeconds = Number(override.windowSeconds ?? override.window_seconds);
      return Number.isSafeInteger(limit)
        && limit >= 1
        && limit <= 1000
        && Number.isSafeInteger(windowSeconds)
        && windowSeconds >= 10
        && windowSeconds <= 3600;
    });
  } catch {
    return false;
  }
}

function isProductionGoogleOAuthRedirectUri(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname !== "localhost"
      && url.hostname !== "127.0.0.1"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && url.pathname === "/api/providers/google/oauth/callback";
  } catch {
    return false;
  }
}

function isProductionMetaOAuthRedirectUri(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname !== "localhost"
      && url.hostname !== "127.0.0.1"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && url.pathname === "/api/providers/meta/oauth/callback";
  } catch {
    return false;
  }
}

function isValidQuietHoursConfiguration(timeZone, start, end) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start === end) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isBase64Key32(value) {
  try {
    return Buffer.from(value, "base64").byteLength === 32;
  } catch {
    return false;
  }
}

function stripeMappingRefsFromUnknown(value) {
  if (Array.isArray(value)) {
    return value.map((item) => safeStripeMappingRef(item)).filter(Boolean).slice(0, 20);
  }
  if (typeof value === "string") {
    return stripeMappingRefsFromText(value);
  }
  return [];
}

function stripeMappingRefsFromText(value) {
  return value
    .split(/[,\s|]+/)
    .map((item) => safeStripeMappingRef(item))
    .filter(Boolean)
    .slice(0, 20);
}

function safeStripeMappingRef(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(text) ? text : null;
}

function isObjectRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasWorkerRoute(value) {
  return /^\s*route\s*=/m.test(value)
    || /^\s*routes\s*=/m.test(value)
    || /^\s*\[\[routes\]\]/m.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
