// Service Worker — GuiGabi Finanças
// Recebe push notifications e exibe para o usuário

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── Recebe push e exibe notificação ─────────────────────────────────────────
self.addEventListener('push', function (event) {
  const data = event.data?.json?.() ?? {}

  const title   = data.title   || 'GuiGabi Finanças'
  const body    = data.body    || 'Você tem um aviso financeiro.'
  const url     = data.url     || '/'
  const tag     = data.tag     || 'guigabi-default'

  const options = {
    body,
    icon:  '/icon-192.png',
    badge: '/favicon-32.png',
    tag,
    renotify: true,
    data: { url },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Abre o app ao clicar na notificação ─────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Se já há uma janela aberta, foca nela
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Senão abre uma nova
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
