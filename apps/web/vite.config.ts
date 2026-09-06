import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { e2eAllowedEmails } from "../../e2e/settings.mjs";

const isE2E = process.env.LYMI_E2E === "1";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/client/routes",
      generatedRouteTree: "src/client/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    cloudflare(
      isE2E
        ? {
            persistState: { path: ".wrangler/e2e" },
            inspectorPort: false,
            config: {
              vars: {
                PUBLIC_SITE_URL: "http://localhost:4173",
                PRODUCT_URL: "http://localhost:4173",
                ALLOWED_EMAILS: e2eAllowedEmails.join(","),
                BETTER_AUTH_SECRET: "lymi-e2e-secret-at-least-thirty-two-characters",
                GOOGLE_CLIENT_ID: "e2e-client-id",
                GOOGLE_CLIENT_SECRET: "e2e-client-secret",
                OPENAI_API_KEY: "",
                OPENAI_MODEL: "gpt-5-mini",
                OPENAI_TTS_MODEL: "gpt-4o-mini-tts",
                OPENAI_TTS_VOICE: "coral",
                GOOGLE_TTS_MODEL: "chirp-3-hd",
                GOOGLE_TTS_VOICE: "Kore",
              },
            },
          }
        : undefined,
    ),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Lymi",
        short_name: "Lymi",
        description: "Vocabulary you carry with you.",
        start_url: "/today",
        display: "standalone",
        orientation: "portrait",
        background_color: "#151210",
        theme_color: "#151210",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // The shell is precached. API responses are never cached by the service worker;
        // TanStack Query owns data caching so offline reviews go through one path.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        importScripts: ["/push-sw.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/$/, /^\/api\//, /^\/mcp/, /^\/docs(?:\/|$)/, /^\/join$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/api\/audio\//,
            handler: "CacheFirst",
            options: {
              cacheName: "audio",
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  // motion/react has to be pre-bundled against the same React the app renders with. Left to
  // the optimiser it picks up its own copy, and the client only finds out as "Invalid hook
  // call" the first time a motion component renders.
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
  optimizeDeps: { include: ["motion/react", "react", "react-dom", "react-dom/client"] },
  server: { port: 5173 },
});
