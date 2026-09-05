import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "../docs/pages/Overview";

export const Route = createFileRoute("/docs/")({ component: Overview });
