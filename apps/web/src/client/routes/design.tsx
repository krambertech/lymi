import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DesignPage = lazy(() => import("../design/DesignPage"));

/** The design system, documented with the real components. Local only: production redirects home. */
export const Route = createFileRoute("/design")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw redirect({ to: "/" });
  },
  component: () => (
    <Suspense fallback={null}>
      <DesignPage />
    </Suspense>
  ),
});
