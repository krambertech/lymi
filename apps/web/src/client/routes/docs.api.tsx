import { createFileRoute } from "@tanstack/react-router";
import { ApiReference } from "../docs/pages/ApiReference";

export const Route = createFileRoute("/docs/api")({ component: ApiReference });
