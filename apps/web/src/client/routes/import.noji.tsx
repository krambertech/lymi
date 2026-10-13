import { createFileRoute } from "@tanstack/react-router";
import { ImportStart } from "./-import-start";

export const Route = createFileRoute("/import/noji")({
  component: () => <ImportStart source="noji" />,
});
