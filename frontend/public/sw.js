self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const sameOriginPath = typeof payload.actionUrl === 'string' && payload.actionUrl.startsWith('/') && !payload.actionUrl.startsWith('//')
    ? payload.actionUrl
    : '/';
  const options = {
    body: String(payload.body || ''),
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || payload.type || 'footstream',
    data: { actionUrl: sameOriginPath },
  };
  event.waitUntil(self.registration.showNotification(String(payload.title || 'FootStream'), options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.actionUrl || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).pathname === actionUrl);
    if (existing) {
      await existing.focus();
      return;
    }
    await self.clients.openWindow(actionUrl);
  })());
});

self.addEventListener('notificationclose', () => {});
