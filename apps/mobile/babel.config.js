// Expo's preset on the phone's own Babel 7, plus the Lingui macros; the web apps compile on Babel 8.
const preset = require.resolve("babel-preset-expo", {
  paths: [require.resolve("expo/package.json")],
});

module.exports = (api) => {
  api.cache(true);
  return { presets: [preset], plugins: ["@lingui/babel-plugin-lingui-macro"] };
};
