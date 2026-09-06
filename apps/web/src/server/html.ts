import type { Bindings } from "./env";
import { canonicalOrigins, type Surface } from "./origin-routing";

/** Attach the runtime origin contract to the shared HTML shell. */
export function configureHtml(response: Response, env: Bindings, surface: Surface): Response {
  const origins = canonicalOrigins(env);
  let rewriter = new HTMLRewriter()
    .on("html", {
      element(element) {
        element.setAttribute("data-lymi-surface", surface);
      },
    })
    .on("head", {
      element(element) {
        element.append(
          `<meta name="lymi-public-site-origin" content="${origins.publicSite}">` +
            `<meta name="lymi-product-origin" content="${origins.product}">` +
            (surface === "product" ? '<meta name="robots" content="noindex, nofollow">' : ""),
          { html: true },
        );
      },
    });

  if (surface === "public") {
    for (const selector of [
      'link[rel="manifest"]',
      'meta[name="apple-mobile-web-app-capable"]',
      'meta[name="apple-mobile-web-app-status-bar-style"]',
      'meta[name="apple-mobile-web-app-title"]',
      'meta[name="mobile-web-app-capable"]',
    ]) {
      rewriter = rewriter.on(selector, {
        element(element) {
          element.remove();
        },
      });
    }
  }

  return rewriter.transform(response);
}

export async function fetchConfiguredAsset(
  request: Request,
  env: Bindings,
  surface: Surface,
): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (!response.headers.get("content-type")?.startsWith("text/html")) return response;
  return configureHtml(response, env, surface);
}
