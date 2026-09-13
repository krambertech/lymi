import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/design/")({
  beforeLoad: () => {
    throw redirect({ to: "/design/$page", params: { page: "brand" }, replace: true });
  },
});
