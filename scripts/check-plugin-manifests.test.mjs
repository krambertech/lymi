import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const plugin = read("plugins/lymi/plugin.json");
const claude = read("plugins/lymi/.claude-plugin/plugin.json");
const cursor = read("plugins/lymi/.cursor-plugin/plugin.json");
const grok = read("plugins/lymi/.grok-plugin/plugin.json");
const gemini = read("gemini-extension.json");
const pluginGemini = read("plugins/lymi/gemini-extension.json");
const mcp = read("plugins/lymi/mcp.json");
const server = read("server.json");
const url = "https://my.lymi.app/mcp";

test("manifests share name and version", () => {
  for (const m of [claude, cursor, grok, gemini, pluginGemini]) {
    assert.equal(m.name, plugin.name);
    assert.equal(m.version, plugin.version);
  }
  assert.equal(server.version, plugin.version);
  assert.equal(server.name, `app.lymi/${plugin.name}`);
});

test("manifests point at the same MCP server", () => {
  assert.equal(mcp.mcpServers.lymi.url, url);
  assert.equal(gemini.mcpServers.lymi.httpUrl, url);
  assert.deepEqual(gemini, pluginGemini);
  assert.deepEqual(server.remotes, [{ type: "streamable-http", url }]);
  assert.ok(server.description.length <= 100);
});

test("root skills link resolves to the plugin skills", () => {
  assert.ok(existsSync(new URL("../skills/setup/SKILL.md", import.meta.url)));
  assert.ok(existsSync(new URL(`../plugins/lymi/${cursor.logo}`, import.meta.url)));
});

test("OpenAI review has 5 positive and 3 negative cases", () => {
  const { positive, negative } = plugin.extensions["com.openai"].review.test_cases;
  assert.equal(positive.length, 5);
  assert.equal(negative.length, 3);
  for (const c of positive)
    for (const k of ["description", "prompt", "tools_triggered", "expected_behavior"])
      assert.ok(c[k]);
  for (const c of negative) assert.ok(c.description && c.prompt);
});
