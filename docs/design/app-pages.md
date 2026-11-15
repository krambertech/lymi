# App pages

Use `AppPage` in `apps/web/src/client/components/app-page.tsx` for integrations that write to decks, including Readwise, Yomitan and AI assistants. It gives each app a consistent setup, status and activity layout ([proposal](../proposals/app-pages.md)).

Settings reaches them from one Apps group (`AppsSection`): connected apps first as rows with their mark and status, then **Add an app**, a strip of chips for every supported app not yet connected, ending with **Custom MCP** for any other MCP client. With nothing connected the group is a plate with the apps' marks fanned as in the rail's offer, one line on what assistants and reading apps do, and every chip.

An assistant's page lives at `/settings/apps/<key>`: before it connects, the steps from its guide, Lymi's MCP address and any client ID to copy, and a button to the app when it has a web page for it; How it connects ends with **Then try asking**, examples that copy to the clipboard. Once connected, the line under its name says what it may do, and the page shows its Activity and Disconnect; it has no Settings part, because an assistant's access is chosen when it signs in. A connected app Lymi does not recognise gets the same page at its grant's id.

App pages sit under Settings and return to its Apps group at every screen size. The header contains the app’s mark in a panel, name, status chip, access summary, short description and any main action, such as **Check now**. Status always has a text label, such as Connected, Not connected or Token refused.

Under the header come four parts, each on plates and in this order:

1. **Settings**: the app's own controls in plates of rows.
2. **Activity**: the app's latest writes from Activity, in Activity's own rows, each saying its day and time and leaving out the app's name, which the page already says. The plate ends with **Everything Readwise did, in Activity**, which opens Activity filtered to the app with **Show everything** beside the filter. The part is called Activity because an app edits and archives as well as adds.
3. **How it connects**: one plate with a line on how the app reaches Lymi, numbered steps, anything the learner fills in or copies, and **Read the Readwise guide** at its foot once the guide exists.
4. **Stop**: what goes and what stays, then the danger button, confirmed inline, with the safe choice beside it. Cards an app added always stay.

Before an app is connected, the page holds only the header and How it connects, with the field to connect in it.

Yomitan's page shows the key Yomitan holds: its Settings replace the key, its Activity is every AnkiConnect write made with a key named Yomitan, which survives a replaced key and leaves out another AnkiConnect tool's key, and Stop revokes it. Until Yomitan's icon licence is settled, a dictionary glyph stands in for its mark.

On the phone, You → Apps opens the integration list, followed by Add an app chips. The empty state is on the canvas. App pages push from this list, and iOS alerts confirm Stop ([phone.md](system/phone.md#navigation)). Unrecognized apps show an Unverified chip beside their name.
