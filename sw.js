/* 가게관리 통합앱 서비스워커 — 네트워크 우선, 오프라인 시 캐시 */
const CACHE = "store-mgr-v21";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function(e){
  const req = e.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== location.origin) return;   // 파이어베이스 등 외부 요청은 그대로

  /* 페이지 본문은 항상 최신으로 (브라우저 캐시도 건너뜀) */
  if(req.mode === "navigate" || req.destination === "document"){
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(function(res){
        const copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
        return res;
      }).catch(function(){
        return caches.match("./index.html").then(function(r){ return r || fetch(req); });
      })
    );
    return;
  }
  e.respondWith(
    fetch(req).then(function(res){
      const copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(r){ return r || caches.match("./index.html"); });
    })
  );
});
