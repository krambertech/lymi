import "../styles.css";
import { beforeAll } from "vitest";
import { commands } from "vitest/browser";
import { configureWebClient } from "../lib/client";

declare module "vitest" {
  export interface ProvidedContext {
    /** Which machine this browser instance stands in for. */
    machine: "desktop" | "touch";
  }
}

declare module "vitest/browser" {
  interface BrowserCommands {
    resetPageScale: () => Promise<void>;
  }
}

// Components read the shared API client and its outboxes, as the app does after `main.tsx`.
configureWebClient();

// Files share the browser page, so each starts unzoomed whatever the file before it resized.
beforeAll(() => commands.resetPageScale());
