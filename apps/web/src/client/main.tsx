import { initTheme } from "./lib/theme";
import "./styles.css";

initTheme();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root missing");

async function boot(root: HTMLElement) {
  // Local development only: a change of persona must not hydrate the last one's cache.
  if (import.meta.env.DEV) (await import("./dev/session-guard")).guardPersistedCache();
  const { mountApp } = await import("./app-entry");
  mountApp(root);
}

void boot(rootEl);
