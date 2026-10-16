---
status: exploration
date: 2026-10-13
decision: none
---

# Deleting a Lymi account

A learner can end their Lymi account from Settings on the web and on the phone, and what it held is erased for good. Apple's App Store Review Guideline 5.1.1(v) requires this in any app where people can make an account, and it must start inside the app, not as a link to a web form. Issue #588.

## What is decided by existing rules

These follow from the data model, `CONTEXT.md` and the web's precedents, so they are defaults rather than questions.

- **The word.** "Delete account" is what every platform and Apple's guideline call it, and the learner expects it. `CONTEXT.md` gains an entry: deleting the account is the second delete after a series, and the only one that erases what the learner wrote. Cards, decks and sections still only archive.
- **What goes.** The `user` row and everything that cascades from it: decks the learner owns with their cards, sections, pictures and editions; their schedules, reviews, review days, important marks and hooks in every deck, including shared decks they joined; settings, photo, push subscriptions, imports, exports, API keys, connected apps, OAuth tokens, sessions and their audit rows. R2 objects the database cannot cascade into are deleted explicitly: the photo, card pictures, import uploads and export files. Pronunciation audio is keyed by term and shared, so it stays.
- **Publishers.** An account that owns a published deck, live or withdrawn, published an edition or approved a localization cannot be deleted (migration 0028), because its members would lose every review. Only Lymi's own publisher accounts publish, so the screen says to write to us instead of offering the button. Nothing changes for learners.
- **Decks the learner joined.** They leave every shared deck as part of the delete; the owner sees the member gone, as with Leave.
- **Invitations to the learner's address** that are still open are revoked, so an owner's list does not show a pending invite to a deleted account.
- **Re-authentication.** The button sends a six-digit code to the account's email, through the email-code sign-in that exists, and the delete runs only with that code. It works the same for password, email-code and Google accounts and on both clients. An account with Sign in with Apple confirms with Apple's sheet on the phone instead, which is also what lets Lymi revoke Apple's token. The web has no Sign in with Apple, so it always sends the code; for an Apple account the page then says to remove Lymi in Apple ID settings, as Apple's TN3194 allows when no token is held. A private-relay address gets the code only once Lymi's sending domain is registered with Apple's relay.
- **Sign in with Apple.** Apple requires the app's tokens to be revoked through its REST API when an account ends. The phone's Apple sheet returns an authorization code; the server exchanges it for a refresh token and calls `/auth/revoke`. This needs a Sign in with Apple key from the Developer account (team id, key id, private key as Worker secrets), which waits on the Apple Developer enrolment. Until the key exists, Apple accounts delete without revocation, and the release checklist blocks App Store submission on it.
- **Export first.** The confirmation offers the existing library export as a link, never as a required step.
- **Analytics.** PostHog's person and their events are deleted through PostHog's API, which needs a personal API key with person write scope as a Worker secret. Both clients reset their analytics identity, and the phone clears its usage queue (#630). Crash reports already carry no content.
- **A record without content.** A new `account_deletions` row keeps the deleted user id, when, which client asked and the counts of what went, and nothing private: no email, name or text. It is what answers "did this account exist and when did it end". One `account_deleted` event, sent before the person is erased, carries the client and whether shared decks were kept, for the product question "how often do learners leave, and from where".
- **After.** The session ends on every device, the client lands on the signed-out start screen, and a short email to the old address says the account was deleted. The email doubles as an alarm if someone else did it.

## Choices for Kateryna

**1. Decks other people study.** A deck the learner owns with active members cascades away today, taking every member's schedules and reviews with it.

- **Keep for members (recommended).** The deck stays for its members with the owner shown as "Former owner": no join link, no new members, nobody can change it, members keep studying and can leave. It holds the deleting learner's cards, which they already shared. This matches Leave and Remove, which never delete a member's reviews, and the reason migration 0028 exists.
- **Delete with the account.** The confirmation lists those decks and how many people study them, and they are gone for everyone.

**2. When it happens.**

- **At once (recommended).** The emailed code guards against a slip and against someone holding an open session, and immediate is what the learner asked for. Simpler to build and to explain.
- **After 30 days.** The account is signed out and hidden, signing in again within 30 days cancels, then it is erased. Protects against regret and against someone with the phone, at the cost of a scheduled job and a third account state.

## Flow

Settings ends with a **Delete account** row on both clients. It opens a page, not a dialog: what goes (counted: decks, cards, reviews), what stays for others (from choice 1), the export link, then **Send code**. The learner types the code and **Delete account** runs it. On the phone the page is a pushed page in the system style with the destructive button at the end; an Apple account shows **Continue with Apple** instead of the code step.

## Delivery

1. Server and API: `GET /api/me/deletion`, `POST /api/me/deletion/code` and `DELETE /api/me` with the code, the cleanup, the record, the event, the email and Apple revocation behind its secret; phone contract re-frozen.
2. Web: the Settings row and page.
3. Phone: the You → Settings row and page, replacing the Settings stub (#587).

Production deletions of real accounts and any data clean-up beyond the normal deploy wait for Kateryna's yes.
