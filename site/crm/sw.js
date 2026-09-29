// Service worker do CRM Rumëyart: permite instalar o app, abre sem internet (última versão vista)
// e mostra as notificações enviadas pelo servidor.
const CACHE = 'rumeyart-crm-v9';
const BASE = ['./', './crm.css', './documento.css', './manifest.webmanifest', './icones/icone-192.png', './icones/badge-96.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Rede primeiro (o CRM sempre mostra a versão mais nova); o cache só serve quando não há internet.
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;             // banco, fontes e bibliotecas: direto
  if(!/^\/(crm|img)\//.test(url.pathname)) return;
  ev.respondWith(
    fetch(req).then(res => {
      if(res.ok && res.type === 'basic'){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
  );
});

// ---------- notificações ----------
self.addEventListener('push', ev => {
  let d = {};
  try{ d = ev.data ? ev.data.json() : {}; }catch(e){ d = {titulo: ev.data ? ev.data.text() : ''}; }
  const titulo = d.titulo || 'Rumëyart CRM';
  ev.waitUntil(self.registration.showNotification(titulo, {
    body: d.corpo || '',
    icon: 'icones/icone-192.png',
    badge: 'icones/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: {url: d.url || '/crm/'},
    lang: 'pt-BR'
  }));
});

self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  const alvo = new URL((ev.notification.data && ev.notification.data.url) || '/crm/', self.location.origin).href;
  ev.waitUntil((async () => {
    const abertas = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for(const c of abertas){
      if(c.url.includes('/crm/')){
        try{ await c.focus(); }catch(e){}
        try{ await c.navigate(alvo); }catch(e){ c.postMessage({ir: alvo}); }
        return;
      }
    }
    await self.clients.openWindow(alvo);
  })());
});

// a assinatura foi renovada pelo navegador: avisa a página para registrar de novo
self.addEventListener('pushsubscriptionchange', ev => {
  ev.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => cs.forEach(c => c.postMessage({reinscrever: true}))));
});
