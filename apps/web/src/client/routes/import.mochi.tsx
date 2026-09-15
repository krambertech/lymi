import { createFileRoute } from "@tanstack/react-router";
import { ImportStart } from "./-import-start";

export const Route = createFileRoute("/import/mochi")({
  component: () => <ImportStart source="mochi" />,
});
