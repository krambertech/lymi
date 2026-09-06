import { initTheme } from "./lib/theme";
import "./styles.css";

initTheme();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root missing");

if (rootEl.dataset.ssr === "landing" && rootEl.hasChildNodes()) {
  void import("./landing-entry").then(({ hydrateLanding }) => hydrateLanding(rootEl));
} else {
  void import("./app-entry").then(({ mountApp }) => mountApp(rootEl));
}
