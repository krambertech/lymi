import { createHash } from "node:crypto";

/** A short digest of what a call site's model reads besides the cards. For tests and evaluation scripts, not the Worker. */
export function promptHash(prompt: unknown): string {
  return createHash("sha256").update(JSON.stringify(prompt)).digest("hex").slice(0, 16);
}
