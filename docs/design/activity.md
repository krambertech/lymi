# Activity

Activity is the one place that answers "did anything land in my decks that I did not put there". It lists writes made by imports, connected apps and the AI, the files the learner took out, and the people events of a shared deck: who joined, who left, who was removed, and when the join link was turned on or off. The learner's own edits are not here; a card's own history holds those, and Activity is not a log of everything.

Activity sits behind **You**, not in the rail: it is read when something is in question rather than steered by. DESIGN.md's Layout says so, and the learner menu holds it on every device.

## The list

One list, newest first, under day headings: **Today**, **Yesterday**, then the date. A heading sits on the canvas above its plate, so a day reads as a block rather than a row with a label.

Each day is one plate of rows with hairlines between, the shape Library and the old imports list already use. A row is one sentence about what happened, a line under it saying who and when, and an end that says what pressing it does.

The sentence never names who did it, because the line under it does. "Added 3 cards to German verbs", then "Claude · 14:32". This keeps one message per event in every language, rather than a subject glued to a verb, and it keeps the plural of the count inside the sentence where a translator can inflect it. The two people events whose subject is another person are the exception: "Maryna joined German verbs" names her, because the sentence is about her and the owner is not the actor.

An archived deck has no screen to open, so a row that names one is read rather than pressed, and so are the cards inside it.

Who is the app's name when Lymi knows it — a connected app names itself when it asks for consent, and an API key carries the name the learner gave it. Where there is no name, the row falls back to the words the card history already uses: a connected app, the API, the AI, Lymi.

An export is the one row whose action sits on the row: **Download**, while the file lasts its day. Everything else a row can do is behind the thing it opens.

Rows that wrote cards **expand in place** to the cards they wrote, so a write can be read without leaving the screen. A card opens where every card opens: the word in its deck, which holds its fields, its history and Archive. A group holding more cards than the expansion shows ends with a row that opens the deck. Everything else opens where the work is: an import row opens its import, a deck row opens the deck.

## Grouping

Twelve cards from one app in one afternoon is one row, not twelve. Writes group by day, actor, app, what they did, and the deck they landed in; the row carries the count and the time of the most recent write in the group. A group never spans two days, so a day heading is always true.

## Empty, loading, failing

An empty Activity is not a screen to fill, so it has no start panel and asks for nothing: it is an `EmptySection` with the screen's own mark, **Nothing yet**, and one line saying what shows up here. The screen carries no subtitle either, because the rows say what they are. Nothing having come in is the good news, and importing starts in Settings. Loading is a day heading and a plate of two rows at the height they load at. The foot of the list stays put: **Show more** while there is another page, and **That's everything** once there is not, so the key that pressed the button still has somewhere to be. A list that fails to load is `ErrorState` with Try again; a later page that fails says so beside its button and leaves the rows above it alone.

## What it costs to add an event

An event appears here because a service wrote an audit row for it, so the screen is a read and never a second source of truth. A new kind of write is one entry in the reader's table of kinds and one sentence. Two things make a write invisible: no audit row at all, which is the bug to look for when something lands unseen, and an action on the reader's unsaid list, which is deliberate — caching a card's audio is the AI's work but not a change to the card, and naming it an edit here would be a lie on the one screen that must not tell one.

Only a caller Lymi can name is named. Card, deck and sharing writes keep the app or key behind them; the other services do not yet, so their rows say "a connected app". A row keeps the name it had at the write, so revoking a key leaves its history readable.
