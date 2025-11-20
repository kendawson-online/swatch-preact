self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple message handler: main page can postMessage to the SW to request showing a notification
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    if (data.type === 'SHOW_NOTIFICATION') {
      const { title, options } = data;
      self.registration.showNotification(title, options || {});
    }
  } catch (e) {
    // ignore
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ includeUncontrolled: true });
      if (all.length > 0) {
        all[0].focus();
      } else {
        clients.openWindow('/');
      }
    })()
  );
});
