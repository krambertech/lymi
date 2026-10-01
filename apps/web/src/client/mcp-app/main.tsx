import { createRoot } from "react-dom/client";
import "../styles.css";
import { bootstrapI18n } from "./i18n";
import { McpApp } from "./mcp-app";

bootstrapI18n();

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(<McpApp />);
