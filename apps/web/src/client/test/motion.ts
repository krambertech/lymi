import { afterEach } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateReducedMotion: (reducedMotion: "reduce" | "no-preference") => Promise<void>;
  }
}

// Motion reads the setting once per mount from its own change listener, so wait for the event.
async function emulate(reducedMotion: "reduce" | "no-preference") {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (query.matches === (reducedMotion === "reduce")) return;
  const changed = new Promise((resolve) =>
    query.addEventListener("change", resolve, { once: true }),
  );
  await commands.emulateReducedMotion(reducedMotion);
  await changed;
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** The suite runs with reduced motion; a test of the motion itself lifts it until the test ends. */
export async function withMotion() {
  await emulate("no-preference");
}

afterEach(() => emulate("reduce"));
