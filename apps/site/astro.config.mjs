import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://lymi.app",
  i18n: { defaultLocale: "en", locales: ["en", "uk", "ru"] },
  // Pages prerender unless they opt out; only published deck pages render per request. ADR 0016.
  adapter: cloudflare({ imageService: "passthrough" }),
  session: false,
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      lingui({ failOnMissing: true }),
      babel({ include: [/\/src\/.*\.tsx?(\?.*)?$/], presets: [linguiTransformerBabelPreset()] }),
    ],
  },
});
