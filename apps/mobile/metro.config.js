const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// From `packages/client`, these would resolve to the web's copies, and a second React fails every hook with "Invalid hook call".
const fromApp = ["@tanstack/react-query", "react"];
const appOrigin = path.join(__dirname, "package.json");
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pinned = fromApp.some((name) => moduleName === name || moduleName.startsWith(`${name}/`));
  return context.resolveRequest(
    pinned ? { ...context, originModulePath: appOrigin } : context,
    moduleName,
    platform,
  );
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});
