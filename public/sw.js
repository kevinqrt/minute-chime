self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Minute Chime",
    body: "Volle Minute erreicht",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text();
    }
  }

  // Close previous minute notifications first, then show with a fresh unique tag
  // so iOS WebKit always triggers a fresh alert/sound instead of a silent tag replacement!
  event.waitUntil(
    self.registration
      .getNotifications()
      .then((existing) => {
        for (const n of existing) {
          n.close();
        }
      })
      .then(() =>
        self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: "/icon?size=192",
          badge: "/icon?size=192",
          tag: `minute-chime-${Date.now()}`,
          silent: false,
        })
      )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
  );
});
