export function registerOfflineShell(onError: () => void): void {
  if (!("serviceWorker" in navigator)) return;
  const register = () => { void navigator.serviceWorker.register("/service-worker.js").catch(onError); };
  // IndexedDB initialization can finish after window.load has already fired.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
