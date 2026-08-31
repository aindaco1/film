#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalWorkerProofClient } from "./local-worker-proof-client.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = path.join(root, "apps", "worker");
const REQUEST_TIMEOUT_MS = 30_000;

let worker = null;
let browserOwner = null;
let proofClient = null;

try {
  console.log("Applying local D1 migrations...");
  runChecked("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], {
    cwd: workerDir,
    input: "yes\n",
  });

  const workerPort = await smokePort("FILM_LOCAL_WORKER_SMOKE_WORKER_PORT", 8787);
  const appPort = await smokePort("FILM_LOCAL_WORKER_SMOKE_APP_PORT", 5173);
  const workerOrigin = `http://127.0.0.1:${workerPort}`;
  const appOrigin = `http://127.0.0.1:${appPort}`;

  console.log(`Starting local Worker at ${workerOrigin}...`);
  worker = spawn("npx", [
    "wrangler",
    "dev",
    "src/index.ts",
    "--local",
    "--port",
    String(workerPort),
    "--var",
    "AUTH_MAGIC_LINK_MODE:dry_run",
    "--var",
    "INVITE_DELIVERY_MODE:dry_run",
    "--var",
    `ALLOWED_ORIGINS:${appOrigin}`,
    "--var",
    'RATE_LIMIT_OVERRIDES:{"auth_magic_link_request":{"limit":100,"windowSeconds":10}}',
  ], {
    cwd: workerDir,
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  worker.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  worker.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  await waitForWorker(workerOrigin, worker, () => logs);

  proofClient = createLocalWorkerProofClient({ origin: workerOrigin });
  browserOwner = proofClient.provisionOwnerMember("browser_worker_probe");

  const smokeEnv = {
    ...process.env,
    FILM_WORKER_SMOKE_ORIGIN: workerOrigin,
    FILM_BROWSER_WORKER_SMOKE_APP_ORIGIN: appOrigin,
    FILM_BROWSER_WORKER_SMOKE_EMAIL: browserOwner.email,
    NO_COLOR: "1",
  };

  runChecked("npm", ["run", "smoke:worker"], { cwd: root, env: smokeEnv });
  runChecked("node", ["scripts/local-member-status-smoke.mjs"], { cwd: root, env: smokeEnv });
  runChecked("node", ["scripts/local-collaboration-smoke.mjs"], { cwd: root, env: smokeEnv });
  runChecked("node", ["scripts/local-restore-proof-smoke.mjs"], { cwd: root, env: smokeEnv });
  runChecked("node", ["scripts/local-attachment-proof-smoke.mjs"], { cwd: root, env: smokeEnv });
  runChecked("npm", ["run", "smoke:browser:worker"], { cwd: root, env: smokeEnv });
  runChecked("npm", ["run", "smoke:providers:live"], { cwd: root, env: smokeEnv });

  console.log("Local Worker smoke suite passed: migrations, Worker smoke, member-status, collaboration, core restore-proof, and attachment restore-proof transactions, browser Worker smoke, provider adapter readiness");
} catch (error) {
  console.error(`Local Worker smoke suite failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (proofClient && browserOwner) {
    try {
      proofClient.disposeOwnerMember(browserOwner);
    } catch (error) {
      console.error(`Local Worker browser-owner cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
  if (worker) {
    worker.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => worker.once("exit", resolve)),
      delay(3_000).then(() => {
        if (worker.exitCode === null) worker.kill("SIGKILL");
      }),
    ]);
  }
}

function runChecked(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: {
      ...process.env,
      NO_COLOR: "1",
      ...(options.env ?? {}),
    },
    input: options.input,
    encoding: "utf8",
    timeout: 10 * 60_000,
    stdio: options.input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}: ${result.error?.message ?? "no process error"}`);
  }
}

async function waitForWorker(origin, child, getLogs) {
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Worker exited early with code ${child.exitCode}: ${tail(getLogs())}`);
    }
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${origin}/health: ${lastError instanceof Error ? lastError.message : "unknown error"} ${tail(getLogs())}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tail(value) {
  return value.split(/\r?\n/).slice(-20).join("\n");
}

function portFromEnv(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a TCP port number`);
  }
  return value;
}

async function smokePort(name, preferred) {
  if (process.env[name]?.trim()) return portFromEnv(name, preferred);
  return findAvailablePort(preferred);
}

async function findAvailablePort(preferred) {
  try {
    return await reservePort(preferred);
  } catch (error) {
    if (error?.code !== "EADDRINUSE") throw error;
    return reservePort(0);
  }
}

function reservePort(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to reserve a local smoke port"));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}
