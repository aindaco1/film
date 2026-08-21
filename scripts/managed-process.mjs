import { spawn } from "node:child_process";

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function hasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function signalProcessTree(child, signal) {
  if (!child?.pid) return;

  if (process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error?.code === "ESRCH") return;
    }
  }

  if (!hasExited(child)) child.kill(signal);
}

async function waitForExit(child, timeoutMs) {
  if (hasExited(child)) return true;

  return Promise.race([
    new Promise((resolveExit) => child.once("exit", () => resolveExit(true))),
    delay(timeoutMs).then(() => false),
  ]);
}

export function spawnManagedProcess(command, args, options = {}) {
  return spawn(command, args, {
    ...options,
    detached: process.platform !== "win32",
  });
}

export async function stopManagedProcess(child, { graceMs = 3_000, killWaitMs = 1_000 } = {}) {
  if (!child) return;

  signalProcessTree(child, "SIGTERM");
  if (!(await waitForExit(child, graceMs))) {
    signalProcessTree(child, "SIGKILL");
    await waitForExit(child, killWaitMs);
  }

  child.stdout?.destroy();
  child.stderr?.destroy();
}
