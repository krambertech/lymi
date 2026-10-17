# Deck invitation

An owner invites an email address to a deck from its settings. Lymi writes to that address at once: the deck's cover with the owner as its byline, how many cards it holds and never one of them, and a link that admits only that address.

## Reach

A deck's settings, the **Invite** button in **People**; or `/library/<deck id>/settings`.

## Drive

[`deck-invitation.mjs`](deck-invitation.mjs), as `learner` on **Lezione 12**: invite `anna@example.com`, then read the email the local outbox kept and draw it in the page.

## End state

`/api/decks/<id>/invitations` lists the address, People shows it as **Not joined yet**, and the outbox holds one email to it whose subject names the owner and the deck, whose text counts the deck's cards and names none, and whose HTML carries the deck's cover and the Lymi letterhead.

## Gotchas

- The outbox lives in the Worker's memory and holds only loopback sends; a server restart empties it.
- The drawn email is the HTML as sent; the `/emails` page shows the same renderer with sample data in both rooms.
