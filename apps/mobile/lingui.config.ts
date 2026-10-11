import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

// The web's message IDs: each message is its English source, hashed by the macro.
export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "uk", "ru"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}",
      include: ["<rootDir>/src"],
      // Widgets cannot run Lingui; the app formats their strings. The design screen is for us.
      exclude: ["**/locales/**", "**/widgets/**", "**/design/**"],
    },
  ],
  format: formatter({ lineNumbers: false, origins: false }),
});
