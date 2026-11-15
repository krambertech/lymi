# Letting an app in

MCP connections use sign-in at `/login`, authorization at `/consent` and a completion state on the consent route. Product access rules live in [MCP directory review](../mcp-directory-review.md#access-follows-the-live-grant).

## Identify the client

The consent screen identifies the app by the HTTPS host of its `client_id` metadata document. Use a known app’s name only for a recognized host. Otherwise use the address as the title and present `client_name` as a claim: “it calls itself X”. Show the host in monospace and state when it is unrecognized. The metadata host establishes domain control, not trust in an arbitrary app name.

Bundle known client marks in their brand colours. Keep those colours inside the mark, with a neutral surrounding panel; monochrome marks use the text token. Never render a client-supplied `logo_uri`. Unknown clients use a monogram so they cannot copy a trusted client’s appearance through metadata.

## Ask for access

Read access is required and explained without a toggle. Write access is the choice, shown as a switch. The grant indicators summarize the resulting access. Below them, state the operations integrations can never perform, including review grading.

After Allow or refusal, show what happened and whether the tab can be closed. A custom-scheme redirect can open the client while leaving the browser tab visible, so redirect alone is insufficient feedback.

Before the first connection, the rail offers setup guides and the learner menu offers Connect AI assistant ([rail.md](system/rail.md#the-offer-to-connect-an-assistant)).

## List connected apps

Settings lists grants in Apps. Each app page shows its access and Disconnect, on web and phone ([app-pages.md](app-pages.md)). Access lasts until disconnected.

List titles help identify an existing connection: use the recognized name, otherwise the supplied name, otherwise its host. Show the host below, with an alert and **Unverified** when unrecognized, followed by the connection date. Truncate long hosts in the middle so the domain remains visible. If an unrecognized host claims a known app’s name, such as Claude Desktop, use danger colour for Unverified. `listedApp` in `packages/client` owns this rule for both clients.
