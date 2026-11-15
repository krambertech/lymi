import { transformSync } from "@babel/core";
import { defineConfig } from "vitest/config";

// The modules here that import nothing native, run in Node.
export default defineConfig({
  plugins: [
    // Metro compiles catalogs; no test reads one, but `vitest --changed` parses every import it can
    // reach, catalogs included.
    {
      name: "po-catalogs",
      enforce: "pre",
      transform(_code, id) {
        if (id.endsWith(".po")) return "export const messages = {};";
      },
    },
    {
      name: "lingui-macros",
      enforce: "pre",
      transform(code, id) {
        if (!/\/(i18n\/widgets|i18n\/reminders|import\/sources)\.ts$/.test(id)) return;
        return transformSync(code, {
          filename: id,
          configFile: false,
          babelrc: false,
          parserOpts: { plugins: ["typescript"] },
          plugins: ["@lingui/babel-plugin-lingui-macro"],
        })?.code;
      },
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
