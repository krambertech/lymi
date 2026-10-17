import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "design",
  publicDir: false,
  plugins: [
    react(),
    lingui({ failOnCompileError: true, failOnMissing: true }),
    babel({
      include: [/\/(?:src|design)\/.*\.tsx?(\?.*)?$/],
      presets: [linguiTransformerBabelPreset()],
    }),
    tailwindcss(),
  ],
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom", "@tanstack/react-query"] },
  build: { outDir: "../dist-design", emptyOutDir: true },
});
