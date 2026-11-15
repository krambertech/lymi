import { fileURLToPath } from "node:url";
import { unstable_readConfig } from "wrangler";

type EvalEnv = Record<string, string | undefined>;

/**
 * An evaluation script's environment: the Worker's `vars` from wrangler.jsonc, such as
 * `AI_GATEWAY_URL`, overlaid by the shell and `.dev.vars` where they hold a value.
 */
export function evalEnv(
  shell: EvalEnv = process.env,
  config = fileURLToPath(new URL("../../../wrangler.jsonc", import.meta.url)),
): EvalEnv {
  const env: EvalEnv = {};
  for (const [key, value] of Object.entries(unstable_readConfig({ config }).vars)) {
    if (typeof value === "string") env[key] = value;
  }
  for (const [key, value] of Object.entries(shell)) {
    if (value?.trim()) env[key] = value;
  }
  return env;
}

export function requireKeys(env: EvalEnv, keys: string[], purpose: string): void {
  const missing = keys.filter((key) => !env[key]?.trim());
  if (missing.length === 0) return;
  const names = new Intl.ListFormat("en", { type: "conjunction" }).format(missing);
  throw new Error(
    `Set ${names} in apps/web/.dev.vars to ${purpose}. docs/local-dev.md says where each comes from.`,
  );
}
