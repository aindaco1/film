#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  boundedInteger,
  normalizeSecureHttpBaseUrl,
  parseCliArgs,
  parseEnvFile,
} from "./script-input.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseCliArgs(process.argv.slice(2), {
  booleans: ["--json"],
  values: ["--source-dev-vars", "--config", "--api-origin", "--script", "--hours"],
});
const sourcePath = path.resolve(args["source-dev-vars"] ?? path.join(root, "..", "pool", "worker", ".dev.vars"));
const configPath = path.resolve(args.config ?? path.join(root, "apps", "worker", "wrangler.toml"));
const sourceVars = parseEnvFile(readFileSync(sourcePath, "utf8"));
const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || sourceVars.get("CLOUDFLARE_ACCOUNT_ID") || "";
const analyticsCredential = process.env.CLOUDFLARE_USAGE_API_TOKEN?.trim()
  || sourceVars.get("CLOUDFLARE_USAGE_API_TOKEN")
  || process.env.CLOUDFLARE_API_TOKEN?.trim()
  || sourceVars.get("CLOUDFLARE_API_TOKEN")
  || "";
const kvCredential = process.env.CLOUDFLARE_API_TOKEN?.trim()
  || sourceVars.get("CLOUDFLARE_API_TOKEN")
  || analyticsCredential;
const sessionNamespaceId = kvNamespaceId(readFileSync(configPath, "utf8"), "SESSIONS");
const apiOrigin = normalizeSecureHttpBaseUrl(
  args["api-origin"] ?? process.env.FILM_CLOUDFLARE_API_ORIGIN ?? "https://api.cloudflare.com/client/v4",
  "Cloudflare API origin",
);
const scriptName = safeScriptName(args.script ?? "film-worker");
const windowHours = boundedInteger(args.hours, 24, 1, 720, "hours");

if (!accountTag || !analyticsCredential || !kvCredential || !sessionNamespaceId) {
  fail("required Cloudflare account, analytics, or KV configuration names are unavailable");
}

try {
  const report = await buildReport();
  if (args.json) {
    console.log(JSON.stringify(report));
  } else {
    const bucketSummary = Object.entries(report.rateLimits.buckets)
      .map(([bucket, value]) => `${bucket}=${value.maxRequestsInWindow}`)
      .join(", ") || "none";
    console.log(`Production traffic report (${report.windowHours}h): ${report.worker.requests} requests, ${report.worker.runtimeErrors} runtime errors, ${report.worker.subrequests} subrequests; active rate-limit windows ${report.rateLimits.activeIdentityWindows}; maximum counts ${bucketSummary}.`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : "unknown failure");
}

async function buildReport() {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - windowHours * 60 * 60 * 1000);
  const query = `query GetWorkersAnalytics($accountTag: string, $datetimeStart: string, $datetimeEnd: string, $scriptName: string) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        workersInvocationsAdaptive(limit: 10000, filter: {
          scriptName: $scriptName,
          datetime_geq: $datetimeStart,
          datetime_leq: $datetimeEnd
        }) {
          sum { subrequests requests errors }
          quantiles { cpuTimeP50 cpuTimeP99 }
          dimensions { datetime scriptName status }
        }
      }
    }
  }`;
  const analytics = await requestJson(`${apiOrigin}/graphql`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${analyticsCredential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag,
        datetimeStart: startedAt.toISOString(),
        datetimeEnd: endedAt.toISOString(),
        scriptName,
      },
    }),
  });
  if (Array.isArray(analytics.errors) && analytics.errors.length > 0) {
    throw new Error("Cloudflare Workers analytics returned query errors");
  }
  const rows = analytics.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive;
  if (!Array.isArray(rows)) throw new Error("Cloudflare Workers analytics response shape was invalid");

  const worker = {
    requests: 0,
    runtimeErrors: 0,
    subrequests: 0,
    statuses: {},
    cpuTimeP99Max: 0,
  };
  for (const row of rows) {
    const requests = finiteNumber(row.sum?.requests);
    worker.requests += requests;
    worker.runtimeErrors += finiteNumber(row.sum?.errors);
    worker.subrequests += finiteNumber(row.sum?.subrequests);
    const status = safeStatus(row.dimensions?.status);
    worker.statuses[status] = (worker.statuses[status] ?? 0) + requests;
    worker.cpuTimeP99Max = Math.max(worker.cpuTimeP99Max, finiteNumber(row.quantiles?.cpuTimeP99));
  }

  const keys = await listRateLimitKeys();
  const rateLimits = { activeIdentityWindows: keys.length, buckets: {} };
  const values = await Promise.all(keys.map(async (item) => {
    const response = await fetch(`${apiOrigin}/accounts/${encodeURIComponent(accountTag)}/storage/kv/namespaces/${encodeURIComponent(sessionNamespaceId)}/values/${encodeURIComponent(item.name)}`, {
      headers: { authorization: `Bearer ${kvCredential}` },
    });
    if (!response.ok) return null;
    try {
      return { name: item.name, value: await response.json() };
    } catch {
      return null;
    }
  }));
  for (const row of values) {
    if (!row) continue;
    const bucket = safeBucket(row.name.split(":")[1]);
    const count = finiteNumber(row.value.count);
    const summary = rateLimits.buckets[bucket] ?? { identityWindows: 0, totalRequests: 0, maxRequestsInWindow: 0 };
    summary.identityWindows += 1;
    summary.totalRequests += count;
    summary.maxRequestsInWindow = Math.max(summary.maxRequestsInWindow, count);
    rateLimits.buckets[bucket] = summary;
  }

  return {
    generatedAt: endedAt.toISOString(),
    windowHours,
    worker,
    rateLimits,
    limitations: [
      "Worker errors are runtime invocation errors, not HTTP 4xx/5xx response counts.",
      "KV rate-limit counts include only identity windows that have not expired.",
    ],
  };
}

async function listRateLimitKeys() {
  const keys = [];
  let cursor = "";
  do {
    const url = new URL(`${apiOrigin}/accounts/${encodeURIComponent(accountTag)}/storage/kv/namespaces/${encodeURIComponent(sessionNamespaceId)}/keys`);
    url.searchParams.set("prefix", "rl:");
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const page = await requestJson(url.toString(), {
      method: "GET",
      headers: { authorization: `Bearer ${kvCredential}` },
    });
    if (!page.success || !Array.isArray(page.result)) throw new Error("Cloudflare KV key metadata response shape was invalid");
    keys.push(...page.result.filter((item) => typeof item?.name === "string"));
    cursor = typeof page.result_info?.cursor === "string" ? page.result_info.cursor : "";
  } while (cursor && keys.length < 10_000);
  return keys;
}

async function requestJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("Cloudflare traffic report request failed");
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Cloudflare traffic report returned non-JSON content");
  }
  if (!response.ok) throw new Error(`Cloudflare traffic report returned unexpected status ${response.status}`);
  return body;
}

function kvNamespaceId(toml, binding) {
  for (const block of toml.split(/(?=\[\[kv_namespaces\]\])/)) {
    if (!block.startsWith("[[kv_namespaces]]")) continue;
    const bindingMatch = block.match(/^binding\s*=\s*"([^"]+)"/m);
    const idMatch = block.match(/^id\s*=\s*"([a-f0-9]{32})"/m);
    if (bindingMatch?.[1] === binding && idMatch?.[1]) return idMatch[1];
  }
  return "";
}

function safeScriptName(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,119}$/.test(value)) throw new Error("Invalid Worker script name.");
  return value;
}

function safeStatus(value) {
  return typeof value === "string" && /^[a-z_]{1,40}$/i.test(value) ? value : "unknown";
}

function safeBucket(value) {
  return typeof value === "string" && /^[a-z_]{1,60}$/.test(value) ? value : "unknown";
}

function finiteNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function fail(message) {
  console.error(`Production traffic report failed: ${message}`);
  process.exit(1);
}

