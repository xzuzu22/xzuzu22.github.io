// Uzkball: uygulama kabuğunu önbelleğe alır; ağ varsa her zaman yenisini kullanır.
const C='uzk-v2';
const SHELL=['./','index.html','style.css','app.js','config.js','manifest.webmanifest','assets/logo.webp','assets/bg.jpg','assets/icon-192.png','assets/premium.webp','assets/tier1.webp','assets/tier2.webp','assets/tier3.webp','assets/tier4.webp','assets/tier5.webp','assets/tier6.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request)));});
