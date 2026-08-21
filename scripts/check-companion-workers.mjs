import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const poolPath = readArgPath("--pool", path.resolve(root, "..", "pool"));
const storePath = readArgPath("--store", path.resolve(root, "..", "store"));

const companions = [
  {
    label: "Pool",
    root: poolPath,
    source: "pool",
    acceptedRef: "campaign slugs",
  },
  {
    label: "Store",
    root: storePath,
    source: "store",
    acceptedRef: "order tokens, marketing refs, product IDs, variant IDs, SKUs, or item IDs",
  },
];

const checks = [];
const warnings = [];
const blockers = [];

for (const companion of companions) {
  await checkCompanion(companion);
}

console.log("Companion Worker readiness checks:");
for (const check of checks) {
  console.log(`- OK: ${check}`);
}

if (warnings.length > 0) {
  console.log("\nCompanion Worker readiness warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (blockers.length > 0) {
  console.log("\nCompanion Worker readiness blockers:");
  for (const blocker of blockers) {
    console.log(`- ${blocker}`);
  }
  if (strict) {
    process.exit(1);
  }
  console.log("\nRun `npm run check:companions -- --strict` to fail on missing tracked adapter support.");
} else {
  console.log("\nNo companion Worker readiness blockers found.");
}

async function checkCompanion(companion) {
  const workerDir = path.join(companion.root, "worker");
  if (!(await exists(workerDir))) {
    blockers.push(`${companion.label} repo not found at ${companion.root}.`);
    return;
  }

  const wranglerPath = path.join(workerDir, "wrangler.toml");
  const wrangler = await readTextIfExists(wranglerPath);
  if (!wrangler) {
    blockers.push(`${companion.label} Worker is missing worker/wrangler.toml.`);
  } else {
    record(
      /^\s*workers_dev\s*=\s*false\s*$/m.test(wrangler),
      `${companion.label} Worker has workers_dev disabled.`,
      `${companion.label} Worker should keep workers_dev disabled for the Film adapter.`,
    );
    record(
      hasWorkerRoute(wrangler),
      `${companion.label} Worker has a production route/custom domain configured.`,
      `${companion.label} Worker needs a production route/custom domain for Film's production adapter URL.`,
    );
    record(
      wrangler.includes("FILM_STRIPE_SUMMARY_ADAPTER_SECRET"),
      `${companion.label} Worker config documents FILM_STRIPE_SUMMARY_ADAPTER_SECRET.`,
      `${companion.label} Worker config should document FILM_STRIPE_SUMMARY_ADAPTER_SECRET.`,
    );
  }

  const sourcePaths = [
    path.join(workerDir, "src", "index.ts"),
    path.join(workerDir, "src", "index.js"),
  ];
  const sourceText = (await Promise.all(sourcePaths.map(readTextIfExists))).join("\n");
  record(
    sourceText.includes("/film/stripe-summary"),
    `${companion.label} Worker source routes /film/stripe-summary.`,
    `${companion.label} Worker source does not appear to route /film/stripe-summary.`,
  );
  record(
    sourceText.includes("FILM_STRIPE_SUMMARY_ADAPTER_SECRET") || sourceText.includes("STRIPE_SUMMARY_ADAPTER_SECRET"),
    `${companion.label} Worker source reads a Film summary adapter bearer secret.`,
    `${companion.label} Worker source does not appear to read a Film summary adapter bearer secret.`,
  );
  record(
    sourceText.includes(`source: "${companion.source}"`)
      || sourceText.includes(`source: '${companion.source}'`)
      || sourceText.includes(`source === "${companion.source}"`)
      || sourceText.includes(`source === '${companion.source}'`)
      || sourceText.includes(`source !== "${companion.source}"`)
      || sourceText.includes(`source !== '${companion.source}'`)
      || sourceText.includes(`!== "${companion.source}"`)
      || sourceText.includes(`!== '${companion.source}'`),
    `${companion.label} Worker source checks source="${companion.source}".`,
    `${companion.label} Worker source should verify Film summary requests declare source="${companion.source}".`,
  );
  record(
    sourceText.includes("summary_only"),
    `${companion.label} Worker source enforces or returns the summary_only boundary.`,
    `${companion.label} Worker source should enforce or return the summary_only data boundary.`,
  );

  const docsText = (await Promise.all([
    readTextIfExists(path.join(workerDir, "README.md")),
    readTextIfExists(path.join(companion.root, "scripts", "setup-deploy.mjs")),
    readTextIfExists(path.join(companion.root, "scripts", "configure-dev-secrets.sh")),
  ])).join("\n");
  record(
    docsText.includes("/film/stripe-summary") && docsText.includes("FILM_STRIPE_SUMMARY_ADAPTER_SECRET"),
    `${companion.label} docs/scripts document the Film adapter endpoint and bearer secret name.`,
    `${companion.label} docs/scripts should document /film/stripe-summary and FILM_STRIPE_SUMMARY_ADAPTER_SECRET.`,
  );

  const devVarsPath = path.join(workerDir, ".dev.vars");
  const devVars = await readTextIfExists(devVarsPath);
  if (!devVars) {
    warnings.push(`${companion.label} local worker/.dev.vars not found; this is fine if secrets are managed through Wrangler or Cloudflare dashboard.`);
    return;
  }

  const names = readDevVarNames(devVars);
  if (names.has("FILM_STRIPE_SUMMARY_ADAPTER_SECRET")) {
    checks.push(`${companion.label} local worker/.dev.vars declares FILM_STRIPE_SUMMARY_ADAPTER_SECRET by name.`);
  } else {
    warnings.push(`${companion.label} local worker/.dev.vars does not declare FILM_STRIPE_SUMMARY_ADAPTER_SECRET by name; no value was read or printed.`);
  }
}

function record(ok, success, failure) {
  if (ok) {
    checks.push(success);
  } else {
    blockers.push(failure);
  }
}

function readArgPath(flag, fallback) {
  const index = args.indexOf(flag);
  if (index < 0 || !args[index + 1]) return fallback;
  return path.resolve(args[index + 1]);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(target) {
  try {
    return await readFile(target, "utf8");
  } catch {
    return "";
  }
}

function hasWorkerRoute(value) {
  return /^\s*route\s*=/m.test(value)
    || /^\s*routes\s*=/m.test(value)
    || /^\s*\[\[routes\]\]/m.test(value);
}

function readDevVarNames(value) {
  const names = new Set();
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [name] = trimmed.split("=", 1);
    const normalized = name.trim();
    if (/^[A-Z0-9_]+$/.test(normalized)) {
      names.add(normalized);
    }
  }
  return names;
}
