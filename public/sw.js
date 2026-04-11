const CACHE = 'esfuerzo-v2'
const ASSETS = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  // No skipWaiting aquí — esperamos que el usuario confirme la actualización
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Solo interceptar GET de mismo origen o assets estáticos
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  // No interceptar peticiones a APIs externas (Apps Script, Drive, etc.)
  if (url.origin !== self.location.origin) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Solo cachear respuestas válidas
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(e.request).then(cached =>
          cached || new Response('Sin conexión', { status: 503, statusText: 'Service Unavailable' })
        )
      )
  )
})

// El Navbar envía este mensaje cuando el usuario presiona "Actualizar"
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
