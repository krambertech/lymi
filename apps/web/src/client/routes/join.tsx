import { createFileRoute } from "@tanstack/react-router";
import { JoinView } from "../views/JoinView";

export const Route = createFileRoute("/join")({
  component: JoinView,
});
