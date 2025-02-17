const CACHE_NAME = "goat-app-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/styles.css",
  "/utils.js",
  "/chatSocket.js",
];

// 安装事件，缓存重要资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 缓存资源:", urlsToCache);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 激活事件，清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("🧹 删除旧缓存:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 拦截网络请求，使用缓存优先策略
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // API 请求，直接走网络
  if (requestUrl.origin === "https://websocket-server-o0o0.onrender.com" && requestUrl.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response("后端 API 不可用", { status: 503 });
      })
    );
    return;
  }

  // 其他静态资源请求，使用缓存优先策略
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        // 允许 `Range` 请求，但不缓存 `206 Partial Content`
        if (!networkResponse || !networkResponse.ok || (networkResponse.status !== 200 && networkResponse.status !== 206)) {
          return networkResponse;
        }
  
        // 只缓存 `200 OK`，`206` 直接返回，不存缓存
        if (networkResponse.status === 206) {
          return networkResponse;
        }
  
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {
      // 如果请求的是 HTML 页面且网络离线，返回 offline.html
      if (event.request.mode === "navigate") {
        return caches.match("/offline.html");
      }
    })
  );  
});
