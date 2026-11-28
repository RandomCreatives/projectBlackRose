/* Black Rose Lounge — Progressive Web App Service Worker */
const STATIC_CACHE = "br-static-v4";
const PAGES_CACHE = "br-pages-v4";

const PRECACHE_URLS = [
  "/offline",
  "/favicon/favicon-192.png",
  "/favicon/favicon-512.png",
  "/favicon/icon-maskable-192.png",
  "/img/room.jpg",
  "/img/watermark.jpg",
  "/img/profile.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache admin screens, API endpoints, or dev HMR streams.
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Page navigations: network-first so menu prices/hours stay fresh,
  // with automatic offline fallback to saved pages or /offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            const cacheKey = url.pathname === "/" ? "/" : req;
            caches.open(PAGES_CACHE).then((c) => c.put(cacheKey, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const pages = await caches.open(PAGES_CACHE);
          const direct = await pages.match(req);
          if (direct) return direct;
          if (url.pathname === "/") {
            const home = await pages.match("/");
            if (home) return home;
          }
          const staticCache = await caches.open(STATIC_CACHE);
          const offline = await staticCache.match("/offline");
          return offline || new Response("Offline", { status: 503, statusText: "Offline" });
        }),
    );
    return;
  }

  // Static images, favicons, fonts, and Next immutable static chunks:
  // stale-while-revalidate for fast repeat loads on mobile networks.
  if (
    url.pathname.startsWith("/img/") ||
    url.pathname.startsWith("/favicon/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req)
          .then((res) => {
            if (res.ok && res.type === "basic") {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      }),
    );
  }
});
