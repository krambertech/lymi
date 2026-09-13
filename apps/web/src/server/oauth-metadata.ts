interface ResourceMetadata extends Record<string, unknown> {
  resource?: unknown;
}

function isResourceMetadata(value: unknown): value is ResourceMetadata {
  return typeof value === "object" && value !== null && "resource" in value;
}

/** Add the public trust links that RFC 9728 defines but the auth plugin does not expose. */
export async function advertisePublicResourceMetadata(
  request: Request,
  response: Response,
  publicSiteOrigin: string,
): Promise<Response> {
  if (request.method === "HEAD" || !response.ok) return response;
  if (!response.headers.get("content-type")?.includes("application/json")) return response;

  let metadata: unknown;
  try {
    metadata = await response.clone().json();
  } catch {
    return response;
  }
  if (!isResourceMetadata(metadata)) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(
    JSON.stringify({
      ...metadata,
      resource_name: "Lymi MCP",
      resource_documentation: new URL("/docs/mcp", publicSiteOrigin).toString(),
      resource_policy_uri: new URL("/privacy", publicSiteOrigin).toString(),
      resource_tos_uri: new URL("/terms", publicSiteOrigin).toString(),
    }),
    { status: response.status, statusText: response.statusText, headers },
  );
}
