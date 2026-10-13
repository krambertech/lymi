# Welcome

The questions a new account answers before its first review: what it is learning, how much time a day, and where to start. Finishing or skipping them records the account as set up, and Welcome never shows them again; opening `/welcome` afterwards lands on Today.

## Reach

Today sends an account with no decks that has not been set up to `/welcome`. A published deck's add page or a join link opens it as `/welcome?deck=<id>` for a new account.

## Drive

[`welcome.mjs`](welcome.mjs), as `fresh` from `/welcome`: check the first question, press **Skip for now**, then open `/welcome` again at once.

## End state

After the skip the page is `/today` and `/api/settings` has an `onboardedAt`. Opening `/welcome` straight after lands on `/today` again, without the questions.

## Gotchas

- The kept query cache is written up to a second after a change, so a return to Welcome within that second restores a copy from before the skip. The recipe waits until that copy is kept, then returns at once, so it fails every time when Welcome trusts the copy.
- Personas are never set up, so every persona with no decks reaches Welcome from Today.
