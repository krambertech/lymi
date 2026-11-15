# Apps

**Apps** under You lists the apps that add cards: connected ones as rows on a plate, then **Add an app**, a strip of chips with Custom MCP last; with nothing connected it shows the apps' marks, **Connect your first app** and every chip. Each app opens its own page: an assistant's steps, Lymi's MCP address and any client ID to copy, and "Then try asking"; Yomitan's key, made and shown once; Readwise's token ([app-pages.md](../../../../docs/design/app-pages.md)).

## Reach

**You**, then **Apps** under Your data; a chip or row opens `/you/apps/<app>` (`claude`, `chatgpt`, `gemini`, `grok`, `cursor`, `custom`, `readwise`, `yomitan`, or a connected app's grant id).

## Drive

[`apps.yaml`](apps.yaml), as `learner`: open **Apps** and read the empty state, open **Grok** and read its two copy fields, go back, open **Yomitan**, make a key, read it once and press **Done**, then **Disconnect Yomitan** and confirm in the alert; open **Readwise**, paste the fake token and connect, then **Disconnect Readwise** and confirm.

## End state

The learner has no key named Yomitan and no Readwise connection, which [`apps.mjs`](apps.mjs) reads from `/api/keys` and `/api/readwise`; the flow saw the key once and Readwise as Connected while each existed.

## Gotchas

- A connected assistant needs a real OAuth grant, which Maestro cannot sign in for. To see one, insert an `oauth_client` row (it needs `redirect_uris` of `'[]'`, or `INSERT OR IGNORE` drops it silently) and an `oauth_consent` row with `wrangler d1 execute lymi --local` in `apps/web`.
- `lymi-dev-readwise-0000` reaches the local fake Readwise; a book's language needs the AI, so its books stay unplaced without an AI gateway.
- The copy buttons are named **Copy** and the field, such as **Copy MCP server address**.
