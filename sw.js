const CACHE='pocketwise-v2.0.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(resp=>{const clone=resp.clone();caches.open(CACHE).then(c=>c.put(event.request,clone));return resp}).catch(()=>caches.match('./index.html'))))});
