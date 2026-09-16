// The product's server modules import each other without file extensions, which the bundler
// resolves and plain Node does not. Retrying a failed relative specifier as `.ts` lets this
// harness run the real provider code rather than a copy of it. No build step, no dependency.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".") || /\.[cm]?[jt]s$/.test(specifier)) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
