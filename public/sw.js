// Phase 6: Service Worker for Offline Timetable PWA
// Versioned cache name: Bumping this version updates assets for all installed users
const CACHE_NAME = "timetable-cache-v20";

// Explicit precache list of all application files using strictly relative paths
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./time.js",
  "./validate.js",
  "./ui-today.js",
  "./ui-week.js",
  "./ui-explore.js",
  "./ui-now.js",
  "./ui-next.js",
  "./ui-overview.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon.svg"
];

// Install Event: Precaches every application asset and immediately activates
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate Event: Purges stale caches from previous versions and takes immediate control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Force any active browser tabs to refresh to the latest network shell immediately
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          if (client.navigate) {
            client.navigate(client.url);
          }
        });
      });
    })
  );
});

// Fetch Event: Network-First strategy with Cache Fallback
// When connected, fetches fresh resources from network and updates cache.
// When offline on campus, serves instantly from cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === "basic" || networkResponse.type === "cors")
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === "navigate") {
            return caches.match("./index.html") || caches.match("./");
          }
        });
      })
  );
});

// Message Listener for explicit activation
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
