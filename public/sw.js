const CACHE = "shepherdwell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes('/auth/')) {
    return; // Let auth routes go straight to network
  }
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .match("/")
        .then((cached) => cached || fetch(event.request))
    );
  }
});
