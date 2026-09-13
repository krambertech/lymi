import { registerSW } from "virtual:pwa-register";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { bootstrapLanguage } from "./lib/i18n";
import "./lib/pwa-install";
import { routeTree } from "./routeTree.gen";

// Before the first render so no screen paints in the wrong language. The settings query
// corrects the choice once the learner's stored language lands.
bootstrapLanguage(window.location.pathname);

registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Stamped by Vite at build time. See `define` in vite.config.ts. */
declare const __QUERY_CACHE_BUSTER__: string;

// Query cache survives reloads and offline starts. Mutations queue separately (see lib/api.ts).
// The buster is the build id: a deploy that changes a response shape throws the old cache
// away rather than hydrating it into code that expects the new one.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "lymi-query-cache",
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/** Mount the private product. Public pages are built and deployed from apps/site. */
export function mountApp(root: HTMLElement) {
  createRoot(root).render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7,
          buster: __QUERY_CACHE_BUSTER__,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              defaultShouldDehydrateQuery(query) && query.meta?.persist !== false,
          },
        }}
      >
        <I18nProvider i18n={i18n}>
          <RouterProvider router={router} />
        </I18nProvider>
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}
