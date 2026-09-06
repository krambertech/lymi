import { isProductSurface, PRODUCT_ORIGIN, PUBLIC_SITE_ORIGIN } from "./lib/origins";
import { initTheme } from "./lib/theme";
import "./styles.css";

initTheme();

if (!isProductSurface() && PUBLIC_SITE_ORIGIN !== PRODUCT_ORIGIN) {
  void retirePublicPwa();
}

async function retirePublicPwa() {
  await Promise.allSettled([
    "serviceWorker" in navigator
      ? navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.allSettled(registrations.map((registration) => registration.unregister())),
          )
      : Promise.resolve(),
    "caches" in window
      ? caches.keys().then((names) => Promise.allSettled(names.map((name) => caches.delete(name))))
      : Promise.resolve(),
  ]);
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root missing");

if (rootEl.dataset.ssr === "landing" && rootEl.hasChildNodes()) {
  void import("./landing-entry").then(({ hydrateLanding }) => hydrateLanding(rootEl));
} else {
  void import("./app-entry").then(({ mountApp }) => mountApp(rootEl));
}
