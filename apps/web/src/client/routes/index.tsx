import { createFileRoute } from "@tanstack/react-router";
import { LandingView } from "../landing/LandingView";

export const Route = createFileRoute("/")({
  component: LandingView,
});
