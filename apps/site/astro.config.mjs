import react from "@astrojs/react";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://lymi.app",
  i18n: { defaultLocale: "en", locales: ["en", "uk", "ru"] },
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      lingui({ failOnMissing: true }),
      babel({ include: [/\/src\/.*\.tsx?(\?.*)?$/], presets: [linguiTransformerBabelPreset()] }),
    ],
  },
});
