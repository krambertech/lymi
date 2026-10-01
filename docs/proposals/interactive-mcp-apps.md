---
status: in_progress
date: 2026-10-01
decision: Build interactive MCP results and a Lymi plugin for every major assistant, then submit them to the directories
---

# Interactive MCP apps and the Lymi plugin

A learner turns a lesson into cards from whichever assistant they already use, sees what was added and what was skipped, fixes a card in place, asks about the card they selected, practises, and checks how the week went. Review and grading stay in Lymi. This proposal holds the delivery outline; the platform choices are in [ADR 0026](../adr/0026-interactive-mcp-results-use-the-mcp-apps-standard.md) and [ADR 0027](../adr/0027-each-assistant-signs-in-with-its-own-registered-client.md).

## Hosts

ChatGPT, Codex, Claude (web, desktop and mobile), Claude Code, VS Code Copilot, Gemini CLI, Cursor, Grok and the Gemini app. The first six already sign in through a Client ID Metadata Document, and the Gemini app reportedly does too. Cursor and Grok need a client Lymi registers for them ([ADR 0027](../adr/0027-each-assistant-signs-in-with-its-own-registered-client.md)).

## What the assistant shows

One interface bundle, built on the MCP Apps standard, renders wherever the host supports it. Every tool keeps its complete text and structured result, so a host without the interface loses nothing but the view.

| Result | View |
| --- | --- |
| `add_cards` | Cards added and skipped, with field sources and enrichment still running; select one to edit in place or open it in Lymi |
| `get_card`, `update_card` | One card, editable: term, meaning, example, pronunciation and hook |
| `search_cards` | Matching cards with their deck and state |
| `get_deck` | The deck's summary and its newest cards |
| `due_counts` | What is due now, per deck, with a link to review in Lymi |
| `get_insights`, `get_streak` | Recall, the week's lights and the run |

Selecting a card tells the assistant which card the learner means (`ui/update-model-context`), so "make this example simpler" lands on the right card. The panel never grades, never starts a review and never shows a review control.

ChatGPT adds a side-panel tab beside the conversation, a read-only sidebar home (due today, recent adds, search), @-mentions of decks and cards on desktop, native settings for the app language, a setup skill after install, and deep links into Lymi. Rich forms for choosing a deck and section follow the move to MCP `2026-07-28`. Event subscriptions are out: nothing in Lymi needs the assistant to act on its own.

## The plugin

`plugins/lymi/` holds one package with three manifests over the same `skills/`: `plugin.json` (Agent Plugins, read by ChatGPT, Codex, VS Code, Cursor and M365), `.claude-plugin/plugin.json` (Claude and Claude Code) and `gemini-extension.json` (Gemini CLI). Every manifest points at `https://my.lymi.app/mcp`.

| Skill | Teaches the assistant to |
| --- | --- |
| `lesson-to-cards` | Pick the terms worth keeping, write each as used, keep the lesson's wording and sources, and send one `add_cards` call |
| `tend-cards` | Improve a card on request: an example, a memory hook, splitting a card that keeps being forgotten, accepting a diagnosis fix |
| `practise` | Quiz or talk with the learner using weak or new cards, record nothing, and say plainly that practice does not count toward the streak |
| `weekly-check-in` | Read insights and the streak when asked, and suggest what to add or fix |
| `setup` | Choose the default deck and confirm the meaning language after install |

## Delivery

1. Publish Cursor's client document and test its sign-in.
2. Build the plugin package and install it privately in each host.
3. Serve the interface bundle as a `ui://` resource and render the `add_cards` result; prove it in ChatGPT and Claude.
4. Edit in place, share the selected card, and keep a draft when the card changed underneath it.
5. Add the read-only views.
6. Add the ChatGPT extensions.
7. Connect Grok and the Gemini app.
8. Move the server to MCP `2026-07-28`, then add rich forms.
9. Submit to the ChatGPT and Codex directory, the Claude directory and plugin portal, the Cursor and VS Code marketplaces, the Gemini CLI gallery and the MCP Registry.

## Done means

- A real session passes in each host, not only a local host harness.
- Every write from the interface shows in Activity with the connected app's name, and a read-only grant cannot write.
- Practice leaves no review, grade or streak change behind.
- No card content reaches logs, analytics or model context the learner did not select.
- The interface works in both rooms, in English, Ukrainian and Russian, and at phone width in ChatGPT and Claude mobile.

## Constraints found in research

Checked on 1 October 2026.

- ChatGPT plugins may not sell subscriptions or show upgrade prompts ([OpenAI app review](https://developers.openai.com/plugins/deploy/app-review)). Premium features reached through ChatGPT can say that another plan is needed and link to an informational page.
- Claude requires a hashed sandbox domain and 3–5 screenshots for a connector with an interface ([Claude submission guide](https://claude.com/docs/connectors/building/submission)).
- The Gemini app's custom apps are limited to adults in the US, in English ([Google help](https://support.google.com/gemini/answer/17209137)); testing needs a US account.
- Grok's sign-in rules come only from third-party guides and need confirming against a real connection.
- Private card pictures load through authenticated routes and do not reach a sandboxed view in the first version; the view shows the picture's description instead.
