import { describe, expect, it } from "vitest";
import { advertisePublicResourceMetadata } from "./oauth-metadata";

describe("OAuth protected-resource metadata", () => {
  it("advertises the public documentation, policy and terms", async () => {
    const request = new Request("https://my.lymi.app/.well-known/oauth-protected-resource/mcp");
    const response = Response.json({
      resource: "https://my.lymi.app/mcp",
      authorization_servers: ["https://my.lymi.app"],
      scopes_supported: ["read", "write"],
    });

    const advertised = await advertisePublicResourceMetadata(request, response, "https://lymi.app");

    expect(await advertised.json()).toEqual({
      resource: "https://my.lymi.app/mcp",
      authorization_servers: ["https://my.lymi.app"],
      scopes_supported: ["read", "write"],
      resource_name: "Lymi MCP",
      resource_documentation: "https://lymi.app/docs/mcp",
      resource_policy_uri: "https://lymi.app/privacy",
      resource_tos_uri: "https://lymi.app/terms",
    });
  });

  it("leaves HEAD and non-metadata responses untouched", async () => {
    const head = new Request("https://my.lymi.app/.well-known/oauth-protected-resource/mcp", {
      method: "HEAD",
    });
    const response = Response.json({ resource: "https://my.lymi.app/mcp" });
    expect(await advertisePublicResourceMetadata(head, response, "https://lymi.app")).toBe(
      response,
    );

    const error = Response.json({ error: "not found" }, { status: 404 });
    expect(
      await advertisePublicResourceMetadata(
        new Request("https://my.lymi.app/.well-known/oauth-protected-resource/mcp"),
        error,
        "https://lymi.app",
      ),
    ).toBe(error);
  });
});
