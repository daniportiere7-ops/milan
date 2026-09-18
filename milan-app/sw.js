// Маршрут в Милан — офлайн-кэш оболочки приложения
const VERSION = "v1";
const SHELL = "shell-" + VERSION;
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // всё, что связано с базой и аналитикой, не трогаем
  if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("firebaseio.com") || url.hostname.endsWith("firebase.com")) return;

  // страница: сначала сеть, офлайн — из кэша
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => { const copy = r.clone(); caches.open(SHELL).then((c) => c.put("./index.html", copy)); return r; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // скрипты firebase, шрифты и иконки: сначала кэш, потом сеть
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r && (r.ok || r.type === "opaque")) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
      return r;
    }).catch(() => hit))
  );
});
