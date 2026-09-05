import { createFileRoute } from "@tanstack/react-router";
import { McpChatgpt } from "../docs/pages/McpChatgpt";

export const Route = createFileRoute("/docs/mcp/chatgpt")({ component: McpChatgpt });
