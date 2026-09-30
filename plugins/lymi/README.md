# Lymi plugin

Connects an assistant to Lymi's MCP server at `https://my.lymi.app/mcp` and teaches it five skills: turning a lesson into cards, tending cards, practising in conversation, a weekly check-in, and setup. The assistant signs in as the learner over OAuth; nothing here holds a secret.

One folder serves every host. The skills in `skills/` are shared; each host reads its own manifest.

| Host | Manifest | Install from this repository |
| --- | --- | --- |
| ChatGPT and Codex | `plugin.json`, `mcp.json` | Codex: `/plugins`, then add the marketplace in `.agents/plugins/marketplace.json`. ChatGPT: the directory, once published. |
| VS Code Copilot, Cursor | `plugin.json`, `mcp.json` | Add this repository as a plugin marketplace. |
| Claude, Claude Code | `.claude-plugin/plugin.json`, `.mcp.json` | `/plugin marketplace add krambertech/lymi`, then `/plugin install lymi@lymi`. On claude.ai: **Customize → Plugins**, add the marketplace URL. |
| Gemini CLI | `gemini-extension.json` | From a checkout: `gemini extensions link plugins/lymi`. |

Gemini CLI installs from a repository only when `gemini-extension.json` sits at the repository root, and its gallery lists only such repositories. Listing Lymi there needs a mirror repository with this folder at its root.

`apps/web/src/server/mcp/plugin.test.ts` fails when a skill names a tool the server does not have, or when the manifests disagree on the server URL or version. Raise `version` in all three manifests together.
