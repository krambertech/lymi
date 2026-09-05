import { createFileRoute } from "@tanstack/react-router";
import { McpOverview } from "../docs/pages/McpOverview";

export const Route = createFileRoute("/docs/mcp/")({ component: McpOverview });
