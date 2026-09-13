import "../styles.css";

declare module "vitest" {
  export interface ProvidedContext {
    /** Which machine this browser instance stands in for. */
    machine: "desktop" | "touch";
  }
}
