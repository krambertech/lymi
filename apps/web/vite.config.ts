import { cloudflare } from "@cloudflare/vite-plugin";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { configDefaults, type TestProjectConfiguration } from "vitest/config";
import type { BrowserInstanceOption } from "vitest/node";
import { e2eOperatorEmails, e2ePublisherEmails } from "../../e2e/settings.mjs";

const isE2E = process.env.LYMI_E2E === "1";
const isAppPreview = process.env.LYMI_APP_PREVIEW === "1";
// Workers Builds has no Playwright browsers; GitHub CI runs the component tests before merge.
const isWorkersBuild = process.env.WORKERS_CI === "1";
// `pnpm verify:changed` and the CI plan name the browser instances a change needs. docs/testing.md.
const requestedInstances = process.env.LYMI_COMPONENT_INSTANCES
  ? process.env.LYMI_COMPONENT_INSTANCES.split(",").filter(Boolean)
  : undefined;

/**
 * Stamped into the persisted query cache. Any rebuild discards a cache written by an older
 * build, so a payload that gained a field can never hydrate into code that reads it.
 */
const buildId = Date.now().toString(36);

function selectInstances(instances: BrowserInstanceOption[]): BrowserInstanceOption[] {
  if (!requestedInstances) return instances;
  const known = instances.flatMap((instance) => (instance.name ? [instance.name] : []));
  const unknown = requestedInstances.filter((name) => !known.includes(name));
  if (unknown.length > 0) {
    throw new Error(`LYMI_COMPONENT_INSTANCES names no component instance: ${unknown.join(", ")}`);
  }
  return instances.filter(
    (instance) => instance.name !== undefined && requestedInstances.includes(instance.name),
  );
}

export default defineConfig({
  define: {
    __QUERY_CACHE_BUSTER__: JSON.stringify(buildId),
    "import.meta.env.LYMI_APP_PREVIEW": JSON.stringify(isAppPreview),
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/client/routes",
      generatedRouteTree: "src/client/routeTree.gen.ts",
    }),
    react(),
    lingui({ failOnCompileError: true, failOnMissing: true }),
    // Only Lymi source carries Lingui macros; keep Babel off dependencies and the test runner.
    // The query suffix matters: TanStack's split route modules end in `?tsr-split=component`.
    babel({ include: [/\/src\/.*\.tsx?(\?.*)?$/], presets: [linguiTransformerBabelPreset()] }),
    tailwindcss(),
    cloudflare(
      isE2E
        ? {
            persistState: { path: ".wrangler/e2e" },
            inspectorPort: false,
            config: {
              vars: {
                PUBLIC_SITE_URL: "http://localhost:4174",
                PRODUCT_URL: "http://localhost:4173",
                OPERATOR_EMAILS: e2eOperatorEmails.join(","),
                PUBLISHER_EMAILS: e2ePublisherEmails.join(","),
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
        navigateFallbackDenylist: [
          /^\/$/,
          /^\/api\//,
          /^\/mcp/,
          /^\/docs(?:\/|$)/,
          /^\/join(?:\/|$)/,
          /^\/add\//,
        ],
        runtimeCaching: [
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
  test: {
    projects: (
      [
        {
          extends: true,
          test: {
            name: "unit",
            exclude: [...configDefaults.exclude, "**/*.browser.test.tsx"],
            // Service tests run against a real local D1, and a busy CI runner can take several seconds per test.
            testTimeout: 15_000,
            // One local runtime per worker rather than one per file: `test-db.ts` holds it on the
            // `globalThis` the files of a worker share. The setup file gives back what isolation
            // paid for, a module registry and stubbed globals per file. docs/testing.md.
            isolate: false,
            setupFiles: ["src/test/unit-setup.ts"],
          },
        },
        {
          // The primitives in real browsers, one instance per machine an overlay adapts to. Not the
          // Worker's config: the Cloudflare plugin cannot run inside a browser session.
          extends: false,
          plugins: [
            react(),
            lingui({ failOnCompileError: true, failOnMissing: true }),
            babel({
              include: [/\/src\/.*\.tsx?(\?.*)?$/],
              presets: [linguiTransformerBabelPreset()],
            }),
            tailwindcss(),
          ],
          resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
          optimizeDeps: {
            include: [
              "react",
              "react-dom",
              "react-dom/client",
              "vitest-browser-react",
              "@lingui/core",
              "@lingui/react",
              // Discovered mid-run, a dependency reloads the page and loads a second React.
              "@base-ui/react/**/*",
              "zod",
            ],
          },
          test: {
            name: "components",
            include: ["src/client/**/*.browser.test.tsx"],
            setupFiles: ["src/client/test/browser-setup.ts"],
            // These gate the same merges as the journeys, which have always retried once.
            retry: process.env.CI ? 1 : 0,
            browser: {
              enabled: true,
              headless: true,
              screenshotFailures: false,
              // A part that is still moving is not clickable, and `forced-states` rewrites the
              // motion queries into `data-motion`, so the specimens still prove both. docs/testing.md.
              provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
              instances: selectInstances([
                {
                  name: "desktop",
                  browser: "chromium",
                  viewport: { width: 1280, height: 800 },
                  provide: { machine: "desktop" },
                },
                {
                  name: "touch",
                  browser: "chromium",
                  viewport: { width: 390, height: 844 },
                  provider: playwright({
                    contextOptions: { hasTouch: true, isMobile: true, reducedMotion: "reduce" },
                  }),
                  provide: { machine: "touch" },
                },
                {
                  name: "touch-webkit",
                  browser: "webkit",
                  viewport: { width: 390, height: 844 },
                  provider: playwright({
                    contextOptions: { hasTouch: true, isMobile: true, reducedMotion: "reduce" },
                  }),
                  provide: { machine: "touch" },
                },
              ]),
            },
          },
        },
      ] satisfies TestProjectConfiguration[]
    ).filter((project) => !(isWorkersBuild && project.test.name === "components")),
  },
});
