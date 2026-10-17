import { transformSync } from "@babel/core";
import { defineConfig } from "vitest/config";

// The modules here that import nothing native, run in Node.
export default defineConfig({
  plugins: [
    {
      name: "lingui-macros",
      enforce: "pre",
      transform(code, id) {
        if (!id.endsWith("/i18n/widgets.ts")) return;
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
