# Delete account

**Delete account** ends the learner's account from the last row of You. Its page says what goes (decks, cards, reviews), lists the owned decks that stay for their members, links to the export on the web, then confirms: an emailed six-digit code, or **Continue with Apple** for an account that signs in with Apple. An account that publishes decks gets no button and is told to write to hello@lymi.app.

## Reach

You, the last row, **Delete account**.

## Drive

[`delete-account.yaml`](delete-account.yaml), as `learner`: [`delete-account.mjs`](delete-account.mjs) first turns on a join link for the learner's first owned deck and has `streak` join it. The flow opens the page, checks the card count, the shared deck and "1 person", sends the code, tries a wrong one and sees **That code isn’t right**, reads the real code from `/api/dev/outbox` in [`delete-account-code.js`](delete-account-code.js), deletes, and lands signed out on Welcome.

## End state

The learner's session answers 401 on `/api/me`, and `streak`'s Library still has the shared deck with `owner.former` true.

## Gotchas

- Scrolls to the row and to **Send code** centre them: stopped at the first sight, they sit behind the glass tab bar and the tap lands on Library.
- The page title and the button share the label **Delete account**, so the flow taps the button by its `delete-account` test ID.
- The flow deletes the `learner` account; the next run's reset sign-in creates it again.
- The Apple path and the publisher state need a manual check: Apple needs an account row with `provider_id = 'apple'` (insert one for a persona in the local D1), and Apple's sheet needs an Apple ID signed in on the Simulator. `publisher` shows the write-to-us state.
