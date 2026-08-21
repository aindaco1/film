import assert from "node:assert/strict";
import test from "node:test";
import { spawnManagedProcess, stopManagedProcess } from "./managed-process.mjs";

function waitForLine(stream, timeoutMs = 2_000) {
  return new Promise((resolveLine, rejectLine) => {
    let output = "";
    const timeout = setTimeout(() => rejectLine(new Error("Timed out waiting for child output")), timeoutMs);

    stream.on("data", (chunk) => {
      output += chunk.toString();
      const newline = output.indexOf("\n");
      if (newline === -1) return;
      clearTimeout(timeout);
      resolveLine(output.slice(0, newline).trim());
    });
  });
}

async function waitUntilGone(pid, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return;
      throw error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  throw new Error(`Process ${pid} remained alive after managed teardown`);
}

test("managed teardown stops a process and its long-lived descendant", { skip: process.platform === "win32" }, async () => {
  const descendantSource = "setInterval(() => {}, 1000)";
  const parentSource = [
    'const { spawn } = require("node:child_process");',
    `const child = spawn(process.execPath, ["-e", ${JSON.stringify(descendantSource)}], { stdio: "ignore" });`,
    "console.log(child.pid);",
    "setInterval(() => {}, 1000);",
  ].join("\n");
  const parent = spawnManagedProcess(process.execPath, ["-e", parentSource], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let descendantPid = null;
  try {
    descendantPid = Number.parseInt(await waitForLine(parent.stdout), 10);
    assert(Number.isInteger(descendantPid));
  } finally {
    await stopManagedProcess(parent, { graceMs: 1_000 });
  }

  assert(parent.exitCode !== null || parent.signalCode !== null);
  await waitUntilGone(descendantPid);
});
