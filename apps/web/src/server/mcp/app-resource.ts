import { html, version } from "virtual:lymi-mcp-app";
import type { AppLanguage } from "@lymi/core";
import { RESOURCE_MIME_TYPE, registerAppResource } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/server";
import { messages as en } from "../../locales/en.po";
import { messages as ru } from "../../locales/ru.po";
import { messages as uk } from "../../locales/uk.po";
import { MCP_VIEWS, type McpView } from "../../shared/mcp-app";

const catalogs = { en, uk, ru } as const;

/**
 * Hosts cache a resource by its URI, so the content hash and the language are part of it.
 * ADR 0026.
 */
export function viewUri(view: McpView, locale: AppLanguage): string {
  return `ui://lymi/${locale}/${view}-${version}.html`;
}

/** Claude serves each connector's views from a subdomain named by a hash of the server URL. */
async function claudeDomain(mcpUrl: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(mcpUrl));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 32)}.claudemcpcontent.com`;
}

function isClaude(clientId: string | undefined): boolean {
  if (!clientId) return false;
  try {
    const { hostname } = new URL(clientId);
    return hostname === "claude.ai" || hostname.endsWith(".claude.ai");
  } catch {
    return false;
  }
}

/**
 * The view is one document. The server writes in which view it is, where Lymi lives, and the
 * one catalog the learner's language needs, so the bundle carries none of the three.
 */
export function viewDocument(view: McpView, origin: string, locale: AppLanguage): string {
  // `<` escaped, so no message can close the script element early.
  const catalog = JSON.stringify({ locale, messages: catalogs[locale] }).replace(/</g, "\\u003c");
  const tags =
    `<meta name="lymi-view" content="${view}"><meta name="lymi-origin" content="${origin}">` +
    `<script type="application/json" id="lymi-messages">${catalog}</script>`;
  return html
    .replace('<html lang="en"', `<html lang="${locale}"`)
    .replace("<head>", `<head>${tags}`);
}

/**
 * One `ui://` resource per view, all serving the same bundle. The view needs no network of its
 * own: every read and write goes through the host's tool calls, so the CSP allows nothing
 * beyond links into Lymi.
 */
export function registerViews(
  server: Pick<McpServer, "registerResource">,
  {
    origin,
    clientId,
    locale,
  }: { origin: string; clientId: string | undefined; locale: AppLanguage },
): void {
  for (const view of MCP_VIEWS) {
    const uri = viewUri(view, locale);
    registerAppResource(
      server,
      `Lymi ${view}`,
      uri,
      { mimeType: RESOURCE_MIME_TYPE },
      async () => ({
        contents: [
          {
            uri,
            mimeType: RESOURCE_MIME_TYPE,
            text: viewDocument(view, origin, locale),
            _meta: {
              ui: {
                csp: { connectDomains: [], resourceDomains: [] },
                prefersBorder: true,
                domain: isClaude(clientId) ? await claudeDomain(`${origin}/mcp`) : origin,
              },
              "openai/widgetCSP": {
                connect_domains: [],
                resource_domains: [],
                redirect_domains: [origin],
              },
              "openai/widgetDescription":
                "Shows the Lymi result to the learner, who can open a card, edit it, or open it in Lymi.",
            },
          },
        ],
      }),
    );
  }
}
