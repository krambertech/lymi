import { createFileRoute } from "@tanstack/react-router";
import { McpClaude } from "../docs/pages/McpClaude";

export const Route = createFileRoute("/docs/mcp/claude")({ component: McpClaude });
