import { createFileRoute, redirect } from "@tanstack/react-router";
import { DesignLayout } from "../design/design-layout";

/** The design system, documented with the real components. Local only: production redirects home. */
export const Route = createFileRoute("/design")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw redirect({ to: "/" });
  },
  component: DesignLayout,
});
