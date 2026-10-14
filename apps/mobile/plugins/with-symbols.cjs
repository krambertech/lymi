const { cpSync, existsSync, readdirSync } = require("node:fs");
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
      if (existsSync(from) && existsSync(to)) {
        for (const set of readdirSync(from))
          cpSync(join(from, set), join(to, set), { recursive: true });
      }
      return c;
    },
  ]);
