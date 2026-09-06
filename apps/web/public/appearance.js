(() => {
  const key = "film.appearance.v1";
  const root = document.documentElement;
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  const normalize = (value) => ["light", "dark"].includes(value) ? value : "system";
  let preference = "system";
  try { preference = normalize(localStorage.getItem(key)); } catch { /* Session-only when storage is unavailable. */ }

  function apply() {
    root.dataset.appearancePreference = preference;
    root.dataset.theme = preference === "system" ? (system.matches ? "dark" : "light") : preference;
    document.querySelectorAll("select[data-appearance]").forEach((control) => { control.value = preference; });
    const chrome = document.querySelector('meta[name="theme-color"]');
    if (chrome) chrome.content = getComputedStyle(root).backgroundColor;
  }

  document.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLSelectElement) || !event.target.matches("[data-appearance]")) return;
    preference = normalize(event.target.value);
    try { localStorage.setItem(key, preference); } catch { /* The current page still changes. */ }
    apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      preference = normalize(event.newValue);
      apply();
    }
  });
  system.addEventListener("change", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  apply();
})();
