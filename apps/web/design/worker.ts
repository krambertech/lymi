interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  CF_VERSION_METADATA: { id: string; tag: string; timestamp: string };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let response: Response;
    if (url.pathname === "/api/health") {
      response = Response.json({
        ok: true,
        name: "lymi-design",
        version: {
          id: env.CF_VERSION_METADATA.id,
          tag: env.CF_VERSION_METADATA.tag,
          deployedAt: env.CF_VERSION_METADATA.timestamp,
        },
      });
    } else if (url.pathname === "/robots.txt") {
      response = new Response("User-agent: *\nDisallow: /\n", {
        headers: { "Content-Type": "text/plain" },
      });
    } else if (url.pathname === "/") {
      response = new Response(null, { status: 302, headers: { Location: "/design" } });
    } else if (
      /^\/design(?:\/(?:[^/.]+|components\/[^/.]+|frame\/[^/.]+))?\/?$/.test(url.pathname)
    ) {
      url.pathname = "/index.html";
      response = await env.ASSETS.fetch(new Request(url, request));
    } else if (url.pathname.startsWith("/assets/")) {
      response = await env.ASSETS.fetch(request);
    } else {
      response = new Response("Not found", { status: 404 });
    }
    response = new Response(response.body, response);
    if (url.pathname === "/api/health") response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  },
};
