import { createFileRoute } from "@tanstack/react-router";
import { FoundationPage } from "../design/pages";

export const Route = createFileRoute("/design/$page")({
  component: function DesignFoundation() {
    const { page } = Route.useParams();
    return <FoundationPage slug={page} />;
  },
});
