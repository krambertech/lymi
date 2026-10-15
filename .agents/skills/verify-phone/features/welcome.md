# Welcome and the arrivals

**Welcome** is a new account's questions, one full-screen step each, then its first review ([onboarding.md](../../../../docs/design/onboarding.md)). An account that signs up from a published deck's link or a join link gets that deck's welcome and only the daily goal. Three features drive it, each from a signed-out app.

## Reach

Signed in with no decks, no reviews and no `onboarded_at`, Today opens Welcome as a cover. A deck's `lymi://add/<slug>` or a join link's `lymi://join/<token>`, opened signed out, asks to sign in, then joins and opens the deck's welcome.

## Drive

- [`welcome.yaml`](welcome.yaml): **Dev sign-up as new**, then A language, Finnish, Keen, Everyday Finnish, **Add and review**, and one Good.
- [`welcome-deck-link.yaml`](welcome-deck-link.yaml): `lymi://add/everyday-estonian`, **Sign in to add**, **Dev sign-up as new**, then the deck's welcome, the goal and **Start review**.
- [`welcome-join-link.yaml`](welcome-join-link.yaml): the learner persona's join link, **Sign in to join**, and the same.

## End state

[`welcome.mjs`](welcome.mjs) reads `/api/settings`: `onboardedAt` is set and the goal is 50; Everyday Finnish is in Library and one review is stored. The arrivals' checks read `onboardedAt` and the deck in Library, owned by someone else.

## Gotchas

- The flows sign out first through [`_signed-out.yaml`](_signed-out.yaml), skipping a Welcome left open, because **Dev sign-up as new** is only on the signed-out door. It signs up the `fresh` persona with `reset=1`, so it always starts empty.
- Each flow ends signed out, because `_open.yaml` keeps whoever is signed in and the next feature's persona would otherwise be this new account; `99-end.png` is therefore the door.
- `env()` signs in the `publisher` persona once, which seeds the published decks Explore and the add link need.
- The Ready-made decks banner and the assistant offer show on Today only until the first review; Skip for now from Welcome reaches them.
