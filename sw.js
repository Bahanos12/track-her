const CACHE_NAME = "track-her-shell-v33";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-48.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("track-her-") && key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const cacheKey = event.request.mode === "navigate" ? "./index.html" : event.request;
  // Always check the server first (skip the browser's HTTP cache) so a new version is picked up right away.
  event.respondWith(fetch(event.request, { cache: "no-cache" }).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, response.clone()));
    return response;
  }).catch(async () => (await caches.match(cacheKey)) || (event.request.mode === "navigate" ? caches.match("./index.html") : Promise.reject(new Error("Offline asset unavailable.")))));
});
// Tapping a rest notification brings Honna back (or opens it).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const open = clients.find((client) => client.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow("./");
  }));
});
