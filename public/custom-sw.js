// Custom Service Worker for NutriumFit Web Push Notifications & Click Actions

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'NutriumFit Promemoria';
    const options = {
      body: data.body || 'È ora di registrare i tuoi pasti o il tuo workout!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        url: data.url || '/'
      },
      vibrate: [200, 100, 200],
      tag: data.tag || 'nutriumfit-notification'
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const title = 'NutriumFit Promemoria';
    const options = {
      body: event.data.text(),
      icon: '/icon-192.png',
      data: { url: '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
