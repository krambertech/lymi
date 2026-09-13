import { createFileRoute } from "@tanstack/react-router";
import { ScreenPage } from "../design/Pages";

export const Route = createFileRoute("/design/screens/$screen")({
  component: function DesignScreen() {
    const { screen } = Route.useParams();
    return <ScreenPage slug={screen} />;
  },
});
