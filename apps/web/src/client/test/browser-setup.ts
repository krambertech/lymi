import "../styles.css";
import { configureWebClient } from "../lib/client";

declare module "vitest" {
  export interface ProvidedContext {
    /** Which machine this browser instance stands in for. */
    machine: "desktop" | "touch";
  }
}

// Components read the shared API client and its outboxes, as the app does after `main.tsx`.
configureWebClient();
