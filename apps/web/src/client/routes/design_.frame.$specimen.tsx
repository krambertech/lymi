import { createFileRoute, redirect } from "@tanstack/react-router";
import { FrameDocument } from "../design/device-frame";

/** One specimen alone in a document, for a device frame on the design pages. Local only. */
export const Route = createFileRoute("/design_/frame/$specimen")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw redirect({ to: "/" });
  },
  component: function DesignFrame() {
    const { specimen } = Route.useParams();
    return <FrameDocument specimen={specimen} />;
  },
});
