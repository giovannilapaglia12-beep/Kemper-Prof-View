const CACHE = "kemper-profiler-view-v1710";
const ASSETS = ["./", "./index.html", "./css/base.css", "./css/palco.css", "./css/rig.css", "./css/looper.css", "./css/tuner.css", "./css/altro.css", "./css/tema-sole.css", "./app.js", "./js/config.js", "./js/dom.js", "./js/text.js", "./js/state.js", "./js/views.js", "./js/diagnostics.js", "./js/tempo.js", "./js/morph.js", "./js/tuner.js", "./js/effects.js", "./js/fixed-fx.js", "./js/rig-names.js", "./js/rig.js", "./js/screen.js", "./js/connection.js", "./js/bidi.js", "./js/sync.js", "./js/looper.js", "./js/looper-touch.js", "./js/transpose-probe.js", "./js/transpose.js", "./kemper-midi.js", "./demo.js", "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    })),
  );
});
