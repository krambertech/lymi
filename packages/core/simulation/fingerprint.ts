import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Everything the year-long studies read. A change to any of them makes the results stale. */
const INPUTS = [
  "src/draw.ts",
  "src/fsrs.ts",
  "simulation/learner.ts",
  "simulation/year.ts",
  "node_modules/ts-fsrs/package.json",
];

export const RESULTS_PATH = join(root, "simulation/results.json");

export function fingerprint(): string {
  const hash = createHash("sha256");
  // Whitespace is dropped, so reformatting a file does not demand a 20-second rerun.
  for (const path of INPUTS) {
    hash.update(path).update(readFileSync(join(root, path), "utf8").replace(/\s+/g, ""));
  }
  return hash.digest("hex");
}
