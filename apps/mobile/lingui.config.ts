import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

// The same message IDs as the web, since the macro hashes each English source, but a catalog of
// the phone's own: a translation fixed in one app is copied to the other by hand. ADR 0012.
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
