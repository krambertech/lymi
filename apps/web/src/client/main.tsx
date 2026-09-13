import { initTheme } from "./lib/theme";
import "./styles.css";

initTheme();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root missing");

async function boot(root: HTMLElement) {
  // Local and isolated previews can switch personas without hydrating the last one's cache.
  if (import.meta.env.DEV || import.meta.env.LYMI_APP_PREVIEW) {
    (await import("./dev/session-guard")).guardPersistedCache();
  }
  const { mountApp } = await import("./app-entry");
  mountApp(root);
}

void boot(rootEl);
