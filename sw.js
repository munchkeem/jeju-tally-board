/* 제주 개표 상황판 — service worker (offline + installable) */
const CACHE = "jeju-tally-v1";
const SHELL = ["./", "./index.html", "./icon.svg", "./manifest.webmanifest", "./og.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // network-first for the HTML document so live edits show when online,
  // falling back to the cached shell when offline
  const isDoc = req.mode === "navigate" ||
    (url.origin === location.origin && (url.pathname === "/" || url.pathname.endsWith("/index.html")));
  if (isDoc) {
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
    );
    return;
  }

  // cache-first for everything else (assets, fonts, libs); fill runtime cache
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp));
      }
      return res;
    }).catch(() => m))
  );
});
