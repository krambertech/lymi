---
status: exploration
date: 2026-10-13
decision: delete at once; members keep a private copy of shared and published decks; publishers delete in the app
---

# Deleting a Lymi account

A learner can end their Lymi account from Settings on the web and on the phone, and what it held is erased for good. Apple's App Store Review Guideline 5.1.1(v) requires this in any app where people can make an account, and it must start inside the app, not as a link to a web form. Issue #588.

## What is decided by existing rules

These follow from the data model, `CONTEXT.md` and the web's precedents, so they are defaults rather than questions.

- **The word.** "Delete account" is what every platform and Apple's guideline call it, and the learner expects it. `CONTEXT.md` gains an entry: deleting the account is the second delete after a series, and the only one that erases what the learner wrote. Cards, decks and sections still only archive.
- **What goes.** The `user` row and everything that cascades from it: decks the learner owns with their cards, sections, pictures and editions; their schedules, reviews, review days, important marks and hooks in every deck, including shared decks they joined; settings, photo, push subscriptions, imports, exports, API keys, connected apps, OAuth tokens, sessions and their audit rows. R2 objects the database cannot cascade into are deleted explicitly: the photo, card pictures, card audio (generated speech and imported recordings), import uploads and export files.
- **Publishers.** Publishing is limited to Lymi's own accounts on `PUBLISHER_EMAILS`, and the app refuses to delete those, since they hold the decks in Explore; the delete page says so and points to hello@lymi.app. A publisher's decks would otherwise leave Explore with their learners keeping copies.
- **Decks the learner joined.** They leave every shared deck as part of the delete; the owner sees the member gone, as with Leave.
- **Invitations to the learner's address** that are still open are revoked, so an owner's list does not show a pending invite to a deleted account.
- **Re-authentication.** The button sends a six-digit code to the account's email, through the email-code sign-in that exists, and the delete runs only with that code. It works the same for password, email-code and Google accounts and on both clients. An account with Sign in with Apple confirms with Apple's sheet on the phone instead, which is also what lets Lymi revoke Apple's token. The web has no Sign in with Apple, so it always sends the code; for an Apple account the page then says to remove Lymi in Apple ID settings, as Apple's TN3194 allows when no token is held. A private-relay address gets the code only once Lymi's sending domain is registered with Apple's relay.
- **Sign in with Apple.** Apple requires the app's tokens to be revoked through its REST API when an account ends. The phone's Apple sheet returns an authorization code; the server exchanges it for a refresh token and calls `/auth/revoke`. This needs a Sign in with Apple key from the Developer account (team id, key id, private key as Worker secrets), which waits on the Apple Developer enrolment. Every Apple account's delete writes an `apple_revocations` row in the same batch; a refused revoke is retried by the cron for about a day and a half, and one that never succeeds, or could not be tried without the key, stays on record and the goodbye email asks the person to remove Lymi themselves. The release checklist blocks App Store submission on the key.
- **Export first.** The confirmation offers the existing library export as a link, never as a required step.
- **Analytics.** PostHog's person and their events are deleted through PostHog's API, which needs a personal API key with person write scope as a Worker secret. Both clients reset their analytics identity, and the phone clears its usage queue (#630). Crash reports already carry no content.
- **A record without content.** A new `account_deletions` row keeps the deleted user id, when, which client asked and the counts of what went, and nothing private: no email, name or text. It is what answers "did this account exist and when did it end". One `account_deleted` event, sent before the person is erased, carries the client and whether shared decks were kept, for the product question "how often do learners leave, and from where".
- **After.** The session ends on every device, the client lands on the signed-out start screen, and a short email to the old address says the account was deleted. The email doubles as an alarm if someone else did it.

## Decided

**Decks other people study** (24 October 2026). Apple's guidance counts shared content as the account's own, so the deleted person's decks no longer stay for their members under the former owner. Each member of an unarchived deck, shared or published, gets a private copy with their own progress, in the edition they pinned, without the owner's name, link or tags. The delete page says so and tells the owner to archive a deck first to take it from its members; an archived deck goes for everyone. Deleting outright for everyone and letting the owner choose per deck were the alternatives. A notice telling members their deck became a copy is a follow-up.

**When it happens.** At once. The emailed code guards against a slip and against someone holding an open session.

## Flow

Settings ends with a **Delete account** row on both clients. It opens a page, not a dialog: what goes (counted: decks, cards, reviews), which decks other people study, which they keep as copies, the export link, then **Send code**. The learner types the code and **Delete account** runs it. On the phone the page is a pushed page in the system style with the destructive button at the end; an Apple account shows **Continue with Apple** instead of the code step.

## Delivery

1. Server and API: `GET /api/me/deletion`, `POST /api/me/deletion/code` and `DELETE /api/me` with the code, the cleanup, the record, the event, the email and Apple revocation behind its secret; phone contract re-frozen.
2. Web: the Settings row and page.
3. Phone: the You → Settings row and page, replacing the Settings stub (#587).

Production deletions of real accounts and any data clean-up beyond the normal deploy wait for Kateryna's yes.
