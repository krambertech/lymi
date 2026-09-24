import { registerSW } from "virtual:pwa-register";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { bootstrapLanguage } from "./lib/i18n";
import "./lib/pwa-install";
import { queryPersister } from "./lib/query-persister";
import { bindWriteCache } from "./lib/writes";
import { routeTree } from "./routeTree.gen";

// Before the first render so no screen paints in the wrong language. The settings query
// corrects the choice once the learner's stored language lands.
bootstrapLanguage(window.location.pathname);

registerSW({
  immediate: true,
  // A page load is the only other check, so an app left open would run old code against a new API.
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (registration.installing) return;
      void registration.update().catch(() => {});
    });
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    // A write that works offline queues itself, and one that cannot says so rather than waiting.
    mutations: { networkMode: "always" },
  },
});
bindWriteCache(queryClient);

// Queued writes live in this origin's storage, which a browser may otherwise evict under pressure.
void navigator.storage?.persist?.().catch(() => false);

/** Stamped by Vite at build time. See `define` in vite.config.ts. */
declare const __QUERY_CACHE_BUSTER__: string;

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
        // Query cache survives reloads and offline starts; writes queue separately (lib/writes.ts).
        // The buster is the build id: a deploy that changes a response shape throws the old cache
        // away rather than hydrating it into code that expects the new one.
        persistOptions={{
          persister: queryPersister,
          maxAge: 1000 * 60 * 60 * 24 * 7,
          buster: __QUERY_CACHE_BUSTER__,
          dehydrateOptions: {
            // A Blob does not survive JSON, and a query filled by setQueryData carries no meta.
            shouldDehydrateQuery: (query) =>
              defaultShouldDehydrateQuery(query) &&
              query.meta?.persist !== false &&
              !(query.state.data instanceof Blob),
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
