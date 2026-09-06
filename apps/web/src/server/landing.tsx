import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server.edge";
import { LANDING_BLURB, LANDING_TITLE, LandingView } from "../client/landing/LandingView";
import type { Bindings } from "./env";

function metadata(origin: string): string {
  const canonical = new URL("/", origin).toString();
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lymi",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description: LANDING_BLURB,
    url: canonical,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }).replaceAll("<", "\\u003c");

  return [
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${LANDING_TITLE}">`,
    `<meta property="og:description" content="${LANDING_BLURB}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${LANDING_TITLE}">`,
    `<meta name="twitter:description" content="${LANDING_BLURB}">`,
    `<script type="application/ld+json" data-landing-structured-data="true">${structuredData}</script>`,
  ].join("");
}

/**
 * Render the public landing page into Vite's HTML shell. The shell still owns hashed client
 * assets in production and development transforms locally; the Worker only supplies the React
 * markup and request-aware metadata. React hydrates the same markup in the browser.
 */
export async function renderLandingPage(request: Request, env: Bindings): Promise<Response> {
  const shellUrl = new URL("/index.html", request.url);
  const shell = await env.ASSETS.fetch(new Request(shellUrl, { headers: request.headers }));
  if (!shell.ok) return shell;

  const queryClient = new QueryClient();
  let markup: string;
  try {
    markup = renderToString(
      <QueryClientProvider client={queryClient}>
        <LandingView />
      </QueryClientProvider>,
    );
  } finally {
    queryClient.clear();
  }

  const origin = env.APP_URL ?? new URL(request.url).origin;
  const response = new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(LANDING_TITLE);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute("content", LANDING_BLURB);
      },
    })
    .on("head", {
      element(element) {
        element.append(metadata(origin), { html: true });
      },
    })
    .on("#root", {
      element(element) {
        element.setAttribute("data-ssr", "landing");
        element.setInnerContent(markup, { html: true });
      },
    })
    .transform(shell);

  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(response.body, { status: response.status, headers });
}
