# App review access and notes

## The review account

App Review signs in with an email and a password. A password account confirms its address once, at sign-up; after that, signing in on the phone asks for no code, so the reviewer never needs the inbox. Google Play's reviewers use the same account.

Make it once, before the first submission:

1. Choose an address you can read and nobody else uses, such as a forwarding alias on `lymi.app`. It receives the confirmation link now, and later any deletion code or sign-in help for this account.
2. In a private browser window, open `https://my.lymi.app/login`, create an account with that email and a generated password of 20 or more characters, and confirm the address from the email.
3. In Settings, set the name to `App Review`.
4. Give it something to look at: add **Everyday Estonian** from Explore, make one deck of your own with five or six cards, a few with pictures, and review some so Today shows a lit lantern. Leave cards due for the reviewer.
5. Make it a member of a deck someone else shares, so a reviewer can try Report deck and Report card: from a second account of yours, share a small deck and open its join link signed in as the review account.
6. Sign in once in the TestFlight build to check the password works on the phone.
7. Keep the address and password in your password manager. They go only into App Store Connect and Play Console, never into this repository, an issue or a pull request.

Optionally add the account's ID to `INTERNAL_ACCOUNT_IDS` in [`packages/core/src/analytics.ts`](../../../packages/core/src/analytics.ts) so its events are marked internal in PostHog.

Before each submission, sign in with it and check that it still has its decks, cards due and the shared deck, because a reviewer may archive cards or leave decks.

The submitted build must include AI permission controls and shared-content reporting. Apple’s guideline 5.1.2(i) requires disclosure and permission before personal data goes to third-party AI; guideline 1.2 requires safeguards for shared content. Check these flows in the release candidate, not only in source.

## App Store Connect: App Review Information

App Store Connect, Apps, Lymi, the version being submitted, App Review Information.

- Sign-in required: ticked
- User name and Password: the review account
- Contact information: your name, phone number and `hello@lymi.app`
- Notes: the text below, with the content safeguards paragraph pasted in

```text
Lymi is a flashcard app for learning from your own material, including course concepts, facts for an exam and vocabulary.

SIGNING IN
Choose Sign in with email on the first screen, enter the email and password above and sign in. This account needs no code. Sign in with Apple and Google also work with your own accounts.

WHAT TO TRY
Today shows the cards due; start a review there and grade each card. Library holds the decks; open one to see its cards. Use + to add a card by hand, or turn on AI to fill its empty fields. Smart add extracts terms from photos, PDFs or pasted text; choose which become cards.

ACCOUNT DELETION
You tab > Delete account. The screen lists what will be erased, then asks for confirmation: an account made with Sign in with Apple confirms with Apple, and an email account confirms with a 6-digit code sent to its address. Please don't delete the demo account; if you do, tell us in App Review messages and we will make it again. To try the whole flow, sign in with Apple and delete that account.

AI SERVICES
Lymi asks for permission before using AI to process the learner’s own content. The permission screen describes enrichment, Smart add and pronunciation, explains that relevant text and lesson material go to third-party AI services, and links to the localized privacy policy for provider details. Change the account-wide choice in You > AI services. Manual card creation and review work with AI off. Existing text and saved audio remain; audio in shared and published decks follows the owner’s choice.

CONTENT SAFEGUARDS
[Paste the review note from docs/app-review.md here.]

PERMISSIONS
Camera and Photos are asked for only when you add a picture to a card or photograph lesson pages. Notifications are asked for only when you turn on the daily reminder. Lymi has no ads and no tracking.
```

Check the screen and button names in the notes against the build under review before pasting.

## Google Play Console: App access

Play Console, Lymi, Policy and programs, App content, App access, Manage.

- Choose **All or some functionality in my app is restricted**.
- Add instructions: name `Review account`, the username and password, and under any other information:

```text
Choose Sign in with email on the first screen, enter the email and password and sign in. This account needs no code. To delete an account: You tab > Delete account. An email account confirms with a 6-digit code sent to its address, so please don't delete this one.
```
