import { createFileRoute, redirect } from "@tanstack/react-router";

// The screen was called You until September 2026; the docs and old bookmarks still say so.
export const Route = createFileRoute("/you")({
  beforeLoad: () => {
    throw redirect({ to: "/settings", replace: true });
  },
});
