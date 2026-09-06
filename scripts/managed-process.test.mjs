import assert from "node:assert/strict";
import test from "node:test";
import { runManagedCommand, spawnManagedProcess, stopManagedProcess } from "./managed-process.mjs";

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

test("managed command keeps the supervisor event loop responsive", async () => {
  let ticks = 0;
  const timer = setInterval(() => { ticks += 1; }, 10);
  try {
    await runManagedCommand(process.execPath, ["-e", "setTimeout(() => {}, 100)"]);
    assert(ticks > 1);
  } finally {
    clearInterval(timer);
  }
});

test("managed command reports failed exits", async () => {
  await assert.rejects(runManagedCommand(process.execPath, ["-e", "process.exit(9)"]), /exited with 9/);
});

test("managed command reports launch errors without an unhandled event", async () => {
  await assert.rejects(runManagedCommand("film-missing-command-for-test", []), /ENOENT/);
});

test("managed command bounds a stalled subprocess", async () => {
  await assert.rejects(runManagedCommand(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { timeoutMs: 100 }), /timed out after 100ms/);
});

test("managed command relays supervisor termination to its child", { skip: process.platform === "win32" }, async () => {
  const source = `import { runManagedCommand } from ${JSON.stringify(new URL("./managed-process.mjs", import.meta.url).href)};
    await runManagedCommand(process.execPath, ["-e", "console.log(process.pid); setInterval(() => {}, 1000)"]);`;
  const supervisor = spawnManagedProcess(process.execPath, ["--input-type=module", "-e", source], { stdio: ["ignore", "pipe", "pipe"] });
  supervisor.stderr.resume();
  let childPid;
  let childStopped = false;
  try {
    childPid = Number.parseInt(await waitForLine(supervisor.stdout), 10);
    assert(Number.isInteger(childPid));
    const exited = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Supervisor ignored termination")), 2_000);
      supervisor.once("exit", () => { clearTimeout(timer); resolve(); });
    });
    supervisor.kill("SIGTERM");
    await exited;
    await waitUntilGone(childPid);
    childStopped = true;
  } finally {
    await stopManagedProcess(supervisor);
    if (childPid && !childStopped) {
      try { process.kill(childPid, "SIGTERM"); } catch (error) { if (error?.code !== "ESRCH") throw error; }
    }
  }
});
