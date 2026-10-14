const { cpSync, existsSync, readdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

// Lymi's icons as custom SF Symbols, so iOS's own menus draw them: copies assets/symbols, which
// scripts/symbols.mjs writes from src/ui/icons.tsx, into the app's asset catalog.
module.exports = (config) =>
  withDangerousMod(config, [
    "ios",
    (c) => {
      const from = join(c.modRequest.projectRoot, "assets/symbols");
      const to = join(
        c.modRequest.platformProjectRoot,
        c.modRequest.projectName,
        "Images.xcassets",
      );
      if (!existsSync(to)) throw new Error(`with-symbols: no asset catalog at ${to}`);
      // A symbol whose icon was removed must not linger from an earlier prebuild.
      for (const set of readdirSync(to)) {
        if (set.startsWith("lymi.") && set.endsWith(".symbolset")) {
          rmSync(join(to, set), { recursive: true });
        }
      }
      for (const set of readdirSync(from)) {
        if (set.endsWith(".symbolset")) cpSync(join(from, set), join(to, set), { recursive: true });
      }
      return c;
    },
  ]);
