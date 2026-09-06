const CACHE_NAME = "film-shell-v2";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icon.svg", "/theme.css", "/appearance.js", "/legal.css", "/privacy.html", "/terms.html", "/sms.html", "/data-deletion.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("film-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const demoNavigation = event.request.mode === "navigate" && url.pathname === "/" && url.search === "?demo=portfolio";
  const cacheKey = demoNavigation ? `${url.origin}/` : event.request;
  // Only public app assets belong in the offline cache, never auth/API responses or token URLs.
  if (url.origin !== self.location.origin || (url.search && !demoNavigation) || event.request.headers.has("authorization")) return;
  if (!SHELL_ASSETS.includes(url.pathname) && !/^\/assets\/[\w.-]+\.(js|css)$/.test(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.ok && !/no-store|private/i.test(response.headers.get("cache-control") ?? "")) {
          const copy = response.clone();
          await caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(cacheKey).then((cached) => cached || Response.error())),
  );
});
