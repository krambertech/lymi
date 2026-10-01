import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import type { Db } from "../db";
import { buildMcpServer } from "./server";

const plugin = join(__dirname, "../../../../../plugins/lymi");
const json = (path: string) => JSON.parse(readFileSync(join(plugin, path), "utf8"));
const skills = readdirSync(join(plugin, "skills")).map((name) => ({
  name,
  text: readFileSync(join(plugin, "skills", name, "SKILL.md"), "utf8"),
}));

async function toolNames(): Promise<Set<string>> {
  const server = buildMcpServer({
    ctx: { db: {} as Db, userId: "user-1", actor: "mcp" },
    scope: "write",
    resourceMetadataUrl: "https://my.lymi.app/.well-known/oauth-protected-resource/mcp",
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  const { tools } = await client.listTools();
  return new Set(tools.map((tool) => tool.name));
}

describe("the Lymi plugin", () => {
  it("names only tools the MCP server has", async () => {
    const tools = await toolNames();
    for (const skill of skills) {
      // Every snake_case word is a tool name: card fields are camelCase and skills are kebab-case.
      const named = skill.text.match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [];
      expect(
        named.filter((name) => !tools.has(name)),
        `${skill.name} names tools the server lacks`,
      ).toEqual([]);
    }
  });

  it("gives every skill a name matching its folder and a description", () => {
    for (const skill of skills) {
      expect(skill.text).toMatch(new RegExp(`^---\\nname: ${skill.name}\\ndescription: \\S`));
    }
  });

  it("points every manifest at the same server and version", () => {
    const url = "https://my.lymi.app/mcp";
    expect(json("mcp.json").mcpServers.lymi.url).toBe(url);
    expect(json(".mcp.json").mcpServers.lymi.url).toBe(url);
    expect(json("gemini-extension.json").mcpServers.lymi.httpUrl).toBe(url);

    const version = json("plugin.json").version;
    expect(json(".claude-plugin/plugin.json").version).toBe(version);
    expect(json("gemini-extension.json").version).toBe(version);
  });

  it("runs setup after install in ChatGPT", () => {
    const onboarding: string = json("plugin.json").extensions["com.openai"].onboardingSkill;
    expect(skills.map((s) => `./skills/${s.name}/SKILL.md`)).toContain(onboarding);
  });
});
