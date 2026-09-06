import type { Bindings } from "./env";
import { canonicalOrigins } from "./origin-routing";

/** Attach the product origin contract and indexing boundary to the application shell. */
export function configureHtml(response: Response, env: Bindings): Response {
  const origins = canonicalOrigins(env);
  const rewriter = new HTMLRewriter()
    .on("html", {
      element(element) {
        element.setAttribute("data-lymi-surface", "product");
      },
    })
    .on("head", {
      element(element) {
        element.append(
          `<meta name="lymi-public-site-origin" content="${origins.publicSite}">` +
            `<meta name="lymi-product-origin" content="${origins.product}">` +
            '<meta name="robots" content="noindex, nofollow">',
          { html: true },
        );
      },
    });
  return rewriter.transform(response);
}

export async function fetchConfiguredAsset(request: Request, env: Bindings): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (!response.headers.get("content-type")?.startsWith("text/html")) return response;
  return configureHtml(response, env);
}
