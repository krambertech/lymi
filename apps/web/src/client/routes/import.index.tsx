import { createFileRoute, redirect } from "@tanstack/react-router";

/** Imports start from Settings; the old address keeps working. */
export const Route = createFileRoute("/import/")({
  beforeLoad: () => {
    throw redirect({ to: "/settings", hash: "import", replace: true });
  },
});
