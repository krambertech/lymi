import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

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
    cloudflare(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
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
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/$/, /^\/api\//, /^\/mcp/],
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
