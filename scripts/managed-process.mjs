import { stopProcess } from "../shared/dust-wave-platform/packages/node-core/src/process.js";
export { spawnManagedProcess, runManagedCommand } from "../shared/dust-wave-platform/packages/node-core/src/process.js";
export function stopManagedProcess(child, options = {}) {
  return stopProcess(child, { ...options, processGroup: true });
}
