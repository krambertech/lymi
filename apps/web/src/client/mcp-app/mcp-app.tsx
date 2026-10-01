import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { MCP_VIEWS, type McpView } from "../../shared/mcp-app";
import { Skeleton } from "../components/skeleton";
import { bridgeHost, HostContext } from "./host";
import { ViewFor } from "./view-for";

/** The resource names its view and Lymi's origin in meta tags, so the first paint is right. */
function meta(name: string): string | null {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;
}

function viewOf(value: string | null): McpView | null {
  return MCP_VIEWS.find((view) => view === value) ?? null;
}

/**
 * The root of the MCP Apps view. It connects to the host, follows the host's theme, speaks the
 * learner's app language, and renders the view its resource names with the tool's result.
 */
export function McpApp() {
  const origin = meta("lymi-origin") ?? window.location.origin;
  const [result, setResult] = useState<CallToolResult | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const { app, error } = useApp({
    appInfo: { name: "Lymi", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (created) => {
      created.ontoolresult = (params) => setResult(params);
      created.ontoolcancelled = () => setCancelled(true);
      created.onhostcontextchanged = (context) => applyHostContext(context);
    },
  });
  useEffect(() => {
    const context = app?.getHostContext();
    if (context) applyHostContext(context);
  }, [app]);

  const host = useMemo(() => (app ? bridgeHost(app, origin) : null), [app, origin]);
  const view =
    viewOf(meta("lymi-view")) ?? viewOf(toolView(app?.getHostContext()?.toolInfo?.tool.name));

  return (
    <I18nProvider i18n={i18n}>
      {error ? (
        <Message>
          <Trans>Couldn’t connect to Lymi. Try again in a moment.</Trans>
        </Message>
      ) : cancelled ? (
        <Message>
          <Trans>Cancelled before it finished.</Trans>
        </Message>
      ) : !host || !result || !view ? (
        <Loading />
      ) : (
        <HostContext value={host}>
          <ViewFor view={view} result={result} />
        </HostContext>
      )}
    </I18nProvider>
  );
}

/** Which view a tool's result gets, when the resource did not say. */
function toolView(tool: string | undefined): string | null {
  switch (tool) {
    case "add_cards":
      return "capture";
    case "get_card":
    case "update_card":
      return "card";
    case "search_cards":
      return "search";
    case "get_deck":
      return "deck";
    case "due_counts":
      return "due";
    case "get_insights":
      return "insights";
    case "get_streak":
      return "streak";
    default:
      return null;
  }
}

function applyHostContext(context: { theme?: "light" | "dark" | undefined }) {
  if (context.theme) document.documentElement.dataset.theme = context.theme;
}

function Message({ children }: { children: ReactNode }) {
  return <p className="p-4 text-sm text-text-2">{children}</p>;
}

function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3 p-4">
      <Skeleton className="h-4 w-16 rounded" />
      <Skeleton className="h-5 w-48 rounded" />
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}
