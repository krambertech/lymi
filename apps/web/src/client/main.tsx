import { initTheme } from "./lib/theme";
import "./styles.css";

initTheme();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root missing");

void import("./app-entry").then(({ mountApp }) => mountApp(rootEl));
