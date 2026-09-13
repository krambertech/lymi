import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "uk", "ru"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}",
      include: ["<rootDir>/src/client", "<rootDir>/src/server"],
      exclude: ["**/*.test.ts", "**/routeTree.gen.ts", "**/client/design/**", "**/routes/design.*"],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
