import { fileURLToPath } from "node:url";
import { localWorkerArgs } from "./local-worker-config.mjs";
import { spawnManagedProcess, stopManagedProcess } from "./managed-process.mjs";

const worker = spawnManagedProcess(process.platform === "win32" ? "npx.cmd" : "npx", ["wrangler", ...localWorkerArgs()], {
  cwd: fileURLToPath(new URL("../apps/worker", import.meta.url)),
  stdio: "inherit",
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await stopManagedProcess(worker);
}
worker.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
worker.on("exit", (code, signal) => { process.exitCode = signal && stopping ? 0 : code ?? 1; });
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
