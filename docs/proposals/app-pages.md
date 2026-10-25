---
status: accepted
date: 2026-10-23
decision: "One Sections page per app: header, Settings, Activity, How it connects, Stop"
---

# A page for every app that talks to Lymi

Every app that writes to a learner's decks gets one page built from the same template, so Claude, Readwise and Yomitan answer the same questions in the same places: is it connected, what can I change, what did it do, how does it connect, and how do I stop it. Today each app is handled a different way: a connected app is a row with Disconnect and nowhere to see what it wrote, Readwise has its own page, and Yomitan has another.

Kateryna chose the Sections layout over Tabs on 23 October 2026, from a prototype of the template filled in for Claude, Readwise and Yomitan.

## The template

One scrolling page under Settings, with the way back to Settings on every screen size. Each part sits on plates, as the rest of Settings does.

1. **Header.** The app's mark, its name, a status chip with one line under it ("Since 12 Oct · claude.ai", "Checked at 19:30 · next around 20:30"), one line on what it does for the learner, and its one everyday action when it has one: **Check now** for Readwise, none for Yomitan (its address is already in How it connects) or Claude. A mark is the app's real one, bundled as connected apps' marks are and drawn in the room's ink when the brand is one colour; `logo_uri` is never rendered ([letting an app in](../design/connected-apps.md)).
2. **Settings.** The app's own controls in one plate of rows: what a connected app may do, Readwise's books and each language's deck, Yomitan's deck and key.
3. **Activity.** That app's rows from Activity, in Activity's own shape, each opening to the cards it wrote, then **Everything Claude did, in Activity**, which opens Activity filtered to the app. The section is Activity rather than "what it added", because an app also edits and archives.
4. **How it connects.** One plate: a line on how the app reaches Lymi, numbered steps, a copy field for anything the learner pastes into the other app, and **Read the Claude guide** as a button at its foot, opening the guide on lymi.app.
5. **Stop.** A sentence saying what goes and what stays, then the danger button: **Disconnect Claude**, **Disconnect Readwise**, or **Revoke the key** for an app that uses one. Cards an app added always stay.

## Which apps move

| App | Today | With the template |
| --- | --- | --- |
| Claude, ChatGPT, Cursor, Codex, Gemini, Grok, Zed, and any other connected app | A row in Connected apps with an inline Disconnect | The row opens the app's page. Settings shows what it may do; How it connects uses its guide under `docs/mcp` |
| Readwise | Its own page, from #948 | Rebuilt on the template |
| Yomitan | Its own page, from #954 | Rebuilt on the template |
| A plain API key for a script | A row in API keys | Stays a row: a key is not an app. A key made for an app, as Yomitan's is, shows on that app's page |
| Anki, Mochi, Noji, Lymi, Quizlet, Pleco imports | One page per app with export steps | Stay import flows, which are one file rather than a standing connection. Their steps move onto a plate so the two kinds of page agree |

On 25 October 2026 Kateryna replaced the two Settings groups with one **Apps** group: connected apps first as rows, then an "Add an app" strip of chips for every supported app not yet connected (Claude, ChatGPT, Gemini, Grok, Cursor, Readwise, Yomitan and Custom MCP for any other MCP client). Every row and chip opens its app's page; an assistant's page before it connects holds the guide's steps, Lymi's MCP address and any client ID to copy. With nothing connected the group shows the apps' marks, one line on what they do and every chip. A separate Apps page and an assistant-first page were considered and rejected. Import, Export and API keys stay their own groups, and a key an app made, such as Yomitan's, shows only on that app's page.

## What it needs

- **Activity by app.** `GET /api/activity` takes an `app`, the audit rows' `actor_client`, and returns that caller's rows. It needs an index on `(user_id, actor_client, created_at)`, so a page loads one app's rows without reading the learner's whole log.
- **What a connected app may do.** The page shows a connected app's scope from day one. Changing it from the page needs the server to narrow an existing grant; whether Better Auth's OAuth provider can, or the app has to ask again, is open. Until then the row says what the app may do and how to change it: disconnect, then connect again with read only.
- **Guides.** Claude, ChatGPT, Cursor, Gemini and Grok have guides under `lymi.app/docs/mcp`. Readwise and Yomitan need theirs, in English, Ukrainian and Russian like every public page.
- **Marks.** Readwise's R from readwise.io and Yomitan's icon from its repository. Yomitan's repository is GPL-3.0, so its icon's licence is settled before it ships.

## Instrumentation

The question is whether learners use an app's page to check what it did. `app_page_viewed` carries the app's key from the known list (or `other`), and `app_activity_opened` fires when a row opens its cards or the link opens Activity. Neither carries a card, a name the learner typed or the app's own name for itself.

## Delivery

1. **The template and Readwise.** An `AppPage` component with the five parts, Activity filtered by app, and the Readwise page rebuilt on it.
2. **Connected apps.** Each row opens its page: status, what it may do, its Activity, its guide, and Disconnect moved from the row to the page.
3. **Yomitan** on the template, in #954 if it is still open.
4. **Guides** for Readwise and Yomitan on lymi.app, in all three languages.
5. **The phone.** The same pages under You, pushed from the same rows.
6. **Import pages** put their export steps on a plate.

Narrowing a connected app's access from its page comes after, once the server can do it.
