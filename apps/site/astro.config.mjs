import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://lymi.app",
  trailingSlash: "never",
  i18n: { defaultLocale: "en", locales: ["en", "uk", "ru"] },
  // Pages prerender unless they opt out; only published deck pages render per request. ADR 0016.
  adapter: cloudflare({ imageService: "passthrough" }),
  session: false,
  integrations: [react()],
  vite: {
    // Pages prerender in workerd, whose clock reads 1970, so the changelog takes its day from here.
    define: { "import.meta.env.BUILD_DAY": JSON.stringify(new Date().toISOString().slice(0, 10)) },
    plugins: [
      tailwindcss(),
      lingui({ failOnMissing: true }),
      babel({ include: [/\/src\/.*\.tsx?(\?.*)?$/], presets: [linguiTransformerBabelPreset()] }),
    ],
  },
});
