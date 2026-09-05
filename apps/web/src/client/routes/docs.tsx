import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DocsShell } from "../docs/DocsShell";

/** Everything under /docs. Public: the documentation reads without signing in. */
export const Route = createFileRoute("/docs")({
  component: () => (
    <DocsShell>
      <Outlet />
    </DocsShell>
  ),
});
