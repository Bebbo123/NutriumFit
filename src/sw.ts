import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

const sw = self as any;

// Cleanup old caches and route precached assets
cleanupOutdatedCaches();
precacheAndRoute((self as any).__WB_MANIFEST || []);

// Web Push Notification Event Listener
sw.addEventListener('push', (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'NutriumFit Promemoria';
    const options: any = {
      body: data.body || 'È ora di registrare i tuoi pasti o il tuo workout!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        url: data.url || '/'
      },
      vibrate: [200, 100, 200],
      tag: data.tag || 'nutriumfit-notification'
    };

    event.waitUntil(sw.registration.showNotification(title, options));
  } catch (e) {
    const title = 'NutriumFit Promemoria';
    const options: any = {
      body: event.data.text(),
      icon: '/icon-192.png',
      data: { url: '/' }
    };
    event.waitUntil(sw.registration.showNotification(title, options));
  }
});

// Notification Click Event Listener
sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(targetUrl);
      }
    })
  );
});
