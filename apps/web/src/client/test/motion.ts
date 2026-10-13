import { afterEach } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateReducedMotion: (reducedMotion: "reduce" | "no-preference") => Promise<void>;
  }
}

/** The suite runs with reduced motion; a test of the motion itself lifts it until the test ends. */
export async function withMotion() {
  await commands.emulateReducedMotion("no-preference");
}

afterEach(() => commands.emulateReducedMotion("reduce"));
