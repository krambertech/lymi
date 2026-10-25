# Activity

Activity lists imports, exports, connected-app and AI writes, and shared-deck membership and join-link changes. It lets the learner inspect changes made outside their own in-app editing. Their direct edits appear in each card’s history.

On the web, Activity opens from the learner menu. On the native phone app it opens from You ([layout](system/layout.md#you)).

## The list

One list, newest first, under day headings: **Today**, **Yesterday**, then the date. A heading sits on the canvas above its plate, so a day reads as a block rather than a row with a label.

Each day is one plate of rows with hairlines between, the shape Library uses. A row is one sentence about what happened, a line under it saying who and when, and an end that says what pressing it does.

Keep the event sentence separate from its attribution: “Added 3 cards to German verbs”, then “Claude · 14:32”. Translate the complete event sentence with its plural count. Membership events can name the person in the sentence, such as “Maryna joined German verbs”, because that person is the subject.

An archived deck has no screen to open, so a row that names one is read rather than pressed, and so are the cards inside it.

Use the connected app’s name or the learner’s API-key name as attribution. When unavailable, use the card-history fallback: a connected app, the API, the AI or Lymi.

Exports have an inline Download action while the file remains available for a day. Other row actions are reached through the row’s destination.

Rows that wrote cards **expand in place** to the cards they wrote, so a write can be read without leaving the screen. A card opens where every card opens: the card in its deck, which holds its fields, its history and Archive. A group holding more cards than the expansion shows ends with a row that opens the deck. Everything else opens where the work is: an import row opens its import, a deck row opens the deck.

## One app at a time

`/activity?app=` lists one caller's writes, by the app or key the audit rows name, with **Show everything** beside a line naming the app. An app's page opens it from its own Activity ([app pages](app-pages.md)).

## Grouping

Group writes by local day, actor, app, action and deck. Each group shows the count and latest write time. A group never crosses a day boundary.

## Empty, loading, failing

Empty Activity uses `EmptySection`, its screen icon, **Nothing yet** and one explanatory line. Omit a start panel, action and screen subtitle; imports begin in Settings. Loading shows a day heading and two row placeholders at their final height. Keep the list footer stable: **Show more** when more pages exist, then **That’s everything**. Initial failure uses `ErrorState` with Try again. A later-page failure appears beside the pagination action and retains loaded rows.

## What it costs to add an event

Activity reads service audit rows rather than maintaining a separate event store. `services/audit.ts` defines write kinds; `services/activity.ts` maps each to a sentence or explicitly omits it. When a write is missing, check both the audit record and mapping. Background audio caching is intentionally omitted because it does not edit card content.

The AI's own writes are here too: a run that fills empty fields after an add is "Enriched 3 cards in Verbi", never an edit.

Store the app or key id and its name at write time from the service context. Fall back to “a connected app” when no name is available. Retain the recorded name after revocation so older events remain understandable.
