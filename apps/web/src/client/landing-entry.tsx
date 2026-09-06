import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { LandingView } from "./landing/LandingView";

/** Hydrate only the public component tree the Worker rendered into the response. */
export function hydrateLanding(root: HTMLElement) {
  const queryClient = new QueryClient();
  hydrateRoot(
    root,
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <LandingView />
      </QueryClientProvider>
    </StrictMode>,
  );
}
