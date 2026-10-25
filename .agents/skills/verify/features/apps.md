# Apps

Settings has one Apps group: connected apps as rows, then a strip of chips for every supported app not yet connected, or a plate with the apps' marks and every chip when nothing is connected. Each AI assistant has a page that shows how to connect it from inside Lymi, and once connected what it may do, its Activity and Disconnect.

## Reach

Settings, **Apps**, any assistant's chip or row, which opens `/settings/apps/<app>` (`claude`, `chatgpt`, `gemini`, `grok`, `cursor`, `custom`, or a connected app's grant id).

## Drive

[`apps.mjs`](apps.mjs), as `learner` from Settings: find the Apps group, open **Grok** from its chip or row, read the page's status, steps and the two copy fields, follow **Settings** back, then open **Custom MCP**.

## End state

The group lists **Apps you can add** with Custom MCP. Grok's page has the heading **Grok**, three steps, an **MCP server address** ending in `/mcp`, a **Client ID** ending in `/oauth/grok.json`, and **Read the Grok guide**. Custom MCP's page has the address and no client ID. The API keys list never shows a key named Yomitan.

## Gotchas

- A reseed keeps OAuth grants, so an assistant connected earlier is a row rather than a chip; the recipe finds Grok either way.
- The connected state needs a real grant; locally insert an `oauth_client` row (it needs `redirect_uris` of `'[]'`, or `INSERT OR IGNORE` drops it silently) and an `oauth_consent` row with `wrangler d1 execute lymi --local` in `apps/web`.
