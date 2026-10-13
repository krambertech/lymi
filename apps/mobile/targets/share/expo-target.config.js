// Share to Lymi: a SwiftUI sheet inside the share sheet that adds the shared text as a card (#509).
const fs = require("node:fs");
const path = require("node:path");

const FONTS = ["400Regular", "500Medium", "600SemiBold"];
const TOKENS = path.join(__dirname, "../../../../packages/design/src/tokens.gen.ts");

// The extension cannot read the app's bundle, so it gets its own copy of Onest.
const fonts = path.join(__dirname, "fonts");
fs.mkdirSync(fonts, { recursive: true });
for (const weight of FONTS) {
  const file = `Onest_${weight}.ttf`;
  const from = require.resolve(`@expo-google-fonts/onest/${weight}/${file}`, {
    paths: [path.join(__dirname, "../..")],
  });
  fs.copyFileSync(from, path.join(fonts, file));
}

/** Each room's colours from the generated tokens, so the sheet cannot drift from the app. */
function rooms() {
  const source = fs.readFileSync(TOKENS, "utf8");
  const room = (name) => {
    const body = source.match(new RegExp(`\\n  ${name}: \\{([^}]*)\\}`))[1];
    return Object.fromEntries(
      [...body.matchAll(/"?([\w-]+)"?: "(#[0-9a-f]{6,8})"/g)].map(([, key, hex]) => [key, hex]),
    );
  };
  return { light: room("light"), dark: room("dark") };
}

/** `top` laid over the opaque `bottom`: a colorset's alpha would show the sheet's glass through. */
function over(top, bottom) {
  const channel = (hex, i) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const alpha = top.length === 9 ? channel(top, 3) / 255 : 1;
  const mixed = [0, 1, 2].map((i) =>
    Math.round(channel(top, i) * alpha + channel(bottom, i) * (1 - alpha)),
  );
  return `#${mixed.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function colors() {
  const { light, dark } = rooms();
  const names = {
    sheet: (p) => p.sheet,
    text: (p) => p.text,
    text2: (p) => p["text-2"],
    muted: (p) => p.muted,
    faint: (p) => p.faint,
    edge: (p) => over(p.edge, p.sheet),
    group: (p) => over(p["glass-group"], p.sheet),
    chosen: (p) => over(p["glass-chosen"], p.sheet),
    amber: (p) => p.amber,
    amberInk: (p) => p["amber-ink"],
    amberText: (p) => p["amber-text"],
    amberSoft: (p) => over(p["amber-soft"], p.sheet),
    ai: (p) => p.ai,
    aiSoft: (p) => over(p["ai-soft"], p.sheet),
    good: (p) => p.good,
    danger: (p) => p.danger,
  };
  return Object.fromEntries(
    Object.entries(names).map(([name, pick]) => [name, { light: pick(light), dark: pick(dark) }]),
  );
}

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "share",
  name: "LymiShare",
  displayName: "Lymi",
  bundleIdentifier: ".share",
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI"],
  colors: colors(),
  // The group expo-widgets already gives the app, named after its bundle identifier.
  entitlements: {
    "com.apple.security.application-groups": [`group.${config.ios.bundleIdentifier}`],
  },
});
