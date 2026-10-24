# Account name

Settings → Account shows the learner's name as text, and the row's **Edit** button (named Edit name) opens a dialog with the name field, Cancel and Save. An empty name is refused under the field and never sent, the field stops at the schema's 80 characters, an unchanged name just closes the dialog, and a failed save keeps the dialog open with the typed name and the reason beside the buttons.

## Reach

The learner menu's Settings, or `/settings`.

## Drive

[`account-name.mjs`](account-name.mjs), as `learner`: refuse an empty name, cancel, rename and save, try to save with writes to `/api/me` cut off, then reload.

## End state

`/api/me` stores the new name, Settings and the rail's learner menu show it (the menu carries its first word), and after a reload Settings still shows it. The refused empty name and the name typed while offline never reach `/api/me`.

## Gotchas

- A persona reset keeps the learner's name, so the recipe picks a target that differs from the current one.
- The learner menu is in the rail only at desktop width, so under `--phone` the recipe skips that check.
- The kept query cache is written at most once a second, and `/api/me` stays fresh for five minutes, so a reload within a second of a rename shows the old name; the recipe waits before reloading.
- Offline is a routed abort of `PATCH /api/me` only, so the rest of the screen keeps loading.
