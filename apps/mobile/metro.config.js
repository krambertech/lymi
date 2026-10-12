const path = require("node:path");
const { getPostHogExpoConfig } = require("posthog-react-native/metro");
const { withUniwindConfig } = require("uniwind/metro");

// Expo's defaults plus a chunk ID in each bundle, which finds its uploaded source map in PostHog.
const config = getPostHogExpoConfig(__dirname);

// `.po` catalogs compile on import, as the web's do through Lingui's Vite plugin.
config.transformer.babelTransformerPath = require.resolve("@lingui/metro-transformer/expo");
config.resolver.sourceExts = [...config.resolver.sourceExts, "po"];

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
