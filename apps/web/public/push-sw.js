/* The generated Workbox service worker imports this file. Keep it dependency-free. */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }
  const notification = payload.notification ?? {};
  const title = notification.title || "Lymi";
  const url = safeAppUrl(notification.navigate);
  event.waitUntil(
    self.registration.showNotification(title, {
      body: notification.body || "A few words are ready when you are.",
      icon: notification.icon || "/icons/icon-192.png",
      tag: "daily-review",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeAppUrl(event.notification.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        if ("navigate" in existing) await existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

function safeAppUrl(value) {
  try {
    const url = new URL(value || "/review", self.location.origin);
    return url.origin === self.location.origin
      ? url.href
      : new URL("/review", self.location.origin).href;
  } catch {
    return new URL("/review", self.location.origin).href;
  }
}
