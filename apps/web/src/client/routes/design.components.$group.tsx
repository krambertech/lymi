import { createFileRoute } from "@tanstack/react-router";
import { GroupPage } from "../design/pages";

export const Route = createFileRoute("/design/components/$group")({
  component: function DesignGroup() {
    const { group } = Route.useParams();
    return <GroupPage slug={group} />;
  },
});
