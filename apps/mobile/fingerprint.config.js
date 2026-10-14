// The version is left out of the native fingerprint, so an over-the-air update can carry a new release identity (ADR 0032).
const { DEFAULT_SOURCE_SKIPS, SourceSkips } = require("expo/fingerprint");

/** @type {import("expo/fingerprint").Config} */
module.exports = {
  sourceSkips: DEFAULT_SOURCE_SKIPS | SourceSkips.ExpoConfigVersions,
  // Share to Lymi's Swift is native code; the fonts and colours prebuild copies into it are not sources.
  // The menus' symbols are copied into the asset catalog at prebuild, so a changed icon needs a build.
  extraSources: [
    { type: "dir", filePath: "targets", reasons: ["appleTargets"] },
    { type: "dir", filePath: "assets/symbols", reasons: ["menuSymbols"] },
  ],
  ignorePaths: ["targets/*/fonts/**", "targets/*/Assets.xcassets/**"],
};
