// Add a word and Review as controls for Control Center, the Lock Screen and the Action button
// (#546). `_shared` holds the intents, which the app compiles too, since a control's intent
// runs in the app; Siri, Shortcuts and Spotlight's compile only there (LYMI_CONTROLS).
const path = require("node:path");

const TOKENS = path.join(__dirname, "../../../../packages/design/src/tokens.gen.ts");

/** Amber in each room, from the generated tokens, so the controls cannot drift from the app. */
function amber() {
  const source = require("node:fs").readFileSync(TOKENS, "utf8");
  const of = (room) =>
    source.match(new RegExp(`\\n  ${room}: \\{[^}]*?\\n    amber: "(#[0-9a-f]{6})"`))[1];
  return { light: of("light"), dark: of("dark") };
}

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "LymiControls",
  displayName: "Lymi",
  bundleIdentifier: ".controls",
  deploymentTarget: "18.0",
  frameworks: ["SwiftUI", "WidgetKit", "AppIntents"],
  colors: { amber: amber() },
  // A control draws only an SF Symbol; scripts/symbols.mjs draws these two from the lantern.
  images: {
    "lymi.controlAdd": "../../assets/symbols/lymi.controlAdd.symbolset/lymi.controlAdd.svg",
    "lymi.controlReview":
      "../../assets/symbols/lymi.controlReview.symbolset/lymi.controlReview.svg",
  },
  entitlements: {
    "com.apple.security.application-groups": [`group.${config.ios.bundleIdentifier}`],
  },
});
