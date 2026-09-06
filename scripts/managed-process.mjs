import { spawn } from "node:child_process";

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

  return new Promise((resolveExit) => {
    const finish = (exited) => {
      clearTimeout(timer);
      child.removeListener("exit", onExit);
      resolveExit(exited);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("exit", onExit);
  });
}

export function spawnManagedProcess(command, args, options = {}) {
  return spawn(command, args, {
    ...options,
    detached: process.platform !== "win32",
  });
}

export async function runManagedCommand(command, args, { input, timeoutMs = 10 * 60_000, ...options } = {}) {
  const child = spawnManagedProcess(command, args, {
    ...options,
    stdio: [input === undefined ? "ignore" : "pipe", "inherit", "inherit"],
  });
  try {
    await new Promise((resolveExit, rejectExit) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.removeListener("error", onError);
        child.removeListener("exit", onExit);
        process.removeListener("SIGINT", onInterrupt);
        process.removeListener("SIGTERM", onTerminate);
        if (error) rejectExit(error);
        else resolveExit();
      };
      const onError = (error) => finish(error);
      const onExit = (code, signal) => finish(code === 0 ? null : new Error(`${command} exited with ${signal ?? code}`));
      const onInterrupt = () => finish(new Error(`${command} interrupted by SIGINT`));
      const onTerminate = () => finish(new Error(`${command} interrupted by SIGTERM`));
      const timer = setTimeout(() => finish(new Error(`${command} timed out after ${timeoutMs}ms`)), timeoutMs);
      child.once("error", onError);
      child.once("exit", onExit);
      process.once("SIGINT", onInterrupt);
      process.once("SIGTERM", onTerminate);
      if (input !== undefined) {
        child.stdin.on("error", onError);
        child.stdin.end(input);
      }
    });
  } finally {
    await stopManagedProcess(child);
  }
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
