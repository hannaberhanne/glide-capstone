self.addEventListener("notificationclick", (event) => {
  const targetRoute = event.notification?.data?.route || "/";
  event.notification?.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = new URL(client.url);
        if (url.pathname === targetRoute) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetRoute);
      }

      return undefined;
    })
  );
});
