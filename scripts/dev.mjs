#!/usr/bin/env node
import process from "node:process";
import { spawnManagedProcess, stopManagedProcess } from "./managed-process.mjs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawnManagedProcess(npm, ["run", "dev:worker"], { stdio: "inherit" }),
  spawnManagedProcess(npm, ["run", "dev:web"], { stdio: "inherit" }),
];
let stopping = false;

async function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  await Promise.all(children.map((child) => stopManagedProcess(child)));
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    void stop(1);
  });
  child.on("exit", (code, signal) => {
    if (stopping) return;
    if (signal) {
      void stop(signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1);
      return;
    }
    void stop(code ?? 1);
  });
}

process.on("SIGINT", () => void stop(0));
process.on("SIGTERM", () => void stop(0));
