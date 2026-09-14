import { createFileRoute } from "@tanstack/react-router";
import { ScreenPage } from "../design/pages";

export const Route = createFileRoute("/design/screens/$screen")({
  component: function DesignScreen() {
    const { screen } = Route.useParams();
    return <ScreenPage slug={screen} />;
  },
});
