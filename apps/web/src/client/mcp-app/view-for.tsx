import type { InsightsOut, StreakOut } from "@lymi/core";
import type { CallToolResult } from "@modelcontextprotocol/client";
import {
  MCP_META,
  type McpView,
  type ViewAddResult,
  type ViewCard,
  type ViewDeckResult,
  type ViewDueResult,
  type ViewSearchResult,
} from "../../shared/mcp-app";
import { ToolError } from "./tool-error";
import { CaptureView } from "./views/capture-view";
import { CardView } from "./views/card-view";
import { DeckView } from "./views/deck-view";
import { DueView } from "./views/due-view";
import { InsightsView } from "./views/insights-view";
import { SearchView } from "./views/search-view";
import { StreakView } from "./views/streak-view";

/** The view for a tool's result. A refused or failed call shows its message instead. */
export function ViewFor({ view, result }: { view: McpView; result: CallToolResult }) {
  if (result.isError || !result.structuredContent) {
    const text = result.content?.find((block) => block.type === "text");
    return <ToolError message={text && "text" in text ? text.text : null} />;
  }
  const data = result.structuredContent;
  const decks = (result._meta?.[MCP_META.decks] ?? {}) as Record<string, string>;
  switch (view) {
    case "capture":
      return <CaptureView result={data as unknown as ViewAddResult} decks={decks} />;
    case "card":
      return <CardView card={data as unknown as ViewCard} />;
    case "search":
      return <SearchView result={data as unknown as ViewSearchResult} />;
    case "deck":
      return <DeckView result={data as unknown as ViewDeckResult} />;
    case "due":
      return <DueView result={data as unknown as ViewDueResult} />;
    case "insights":
      return <InsightsView result={data as unknown as InsightsOut} />;
    case "streak":
      return <StreakView result={data as unknown as StreakOut} />;
    case "home":
      return <DueView result={data as unknown as ViewDueResult} />;
  }
}
