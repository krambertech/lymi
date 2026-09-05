import { createFileRoute } from "@tanstack/react-router";
import { Quickstart } from "../docs/pages/Quickstart";

export const Route = createFileRoute("/docs/quickstart")({ component: Quickstart });
