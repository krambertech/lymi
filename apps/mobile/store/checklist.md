# Store console checklist

What App Store Connect and Play Console need for submission. Listing text lives in [`listing/`](listing), privacy answers in [`privacy.md`](privacy.md), review access in [`review.md`](review.md), and screenshot captions and order in [`screenshots/shots.json`](screenshots/shots.json). Signing, testing tracks, version contracts and build promotion are in [`docs/phone-release.md`](../../../docs/phone-release.md).

## Before either store

1. Set the public release version in `apps/mobile/app.json` and follow the version-contract steps in `docs/phone-release.md`. The selected binary and console version must match.
2. Build after all native configuration changes, including privacy manifests and extensions. Verify AI permission, account deletion and shared-content reporting in that release candidate; source changes or a working development build do not prove the submitted binary includes them.
3. Prepare the review account as [`review.md`](review.md) describes. Verify email/password sign-in without inbox access, cards due, and a deck owned by a second account for reporting. Use a separate disposable account to test deletion.
4. Verify every advertised feature on each submitted platform: imports and exports, Smart add, offline review and reconnection, reminders, sharing, and iOS widgets and the share extension. Recheck translations and permission-denied paths. Remove a listing claim if the release candidate does not support it.
5. Check the support, privacy and account-deletion URLs while signed out, including the route back after signing in. Confirm the support and moderation inboxes are monitored.
6. Render screenshots with `node apps/mobile/store/screenshots/render.mjs`. Read the selected style from `shots.json`; output is `screenshots/out/<style>/<language>/<size>/`. Inspect captions, order and the actual app screens before uploading. Header artwork is a separate asset.
7. Resolve the AI-provider audience and processing terms described in [`privacy.md`](privacy.md#provider-terms). A store age rating does not by itself satisfy a provider’s age restrictions.

## App Store Connect

All under App Store Connect, Apps, Lymi.

1. **Languages.** Add Ukrainian and Russian; keep English (U.S.) primary. Copy Name and Subtitle from each `listing/<language>.md` into App Information.
2. **App Information.** Primary category **Education**, secondary **Reference**. The account holder must confirm the Content Rights declaration against the actual imported and published content and the necessary permissions; do not automatically declare that Lymi never accesses third-party content.
3. **Age Rating.** Answer the current questionnaire from the content learners can reach, including published decks; do not target a predetermined rating. See [Age rating](#age-rating).
4. **App Privacy.** Use the data types and purposes in [`privacy.md`](privacy.md#app-store-connect-app-privacy), matched to the submitted build and third-party services. Localize the policy URL: `https://lymi.app/privacy`, `https://lymi.app/uk/privacy`, `https://lymi.app/ru/privacy`. Publishing the declaration requires the account holder’s approval.
5. **Pricing and Availability.** Price **Free**, all countries and regions, including future regions. Disable iPhone/iPad app availability on Apple silicon Mac. Confirm regional eligibility separately; choosing every region does not complete its compliance requirements.
6. **Agreements and EU trader status.** The account holder accepts any required Apple Developer Program agreement. Complete the Digital Services Act declaration with the operator’s correct status and verified details; a trader’s contact details appear on the EU listing. Do not reuse the private App Review contact as a public trader contact without confirmation.
7. **Version page, per language.** Upload the six selected-style iPhone screenshots to the matching 6.9-inch and 6.3-inch slots, in file order. Paste Promotional Text, Description and Keywords from `listing/<language>.md`; set Support URL `https://lymi.app/support` and Marketing URL `https://lymi.app`. Leave What’s New empty for the first release. Check header and search artwork separately when supplied.
8. **Version page, once.** Select the verified release build, enter copyright `2026 Kateryna Porshnieva`, and fill App Review Information from [`review.md`](review.md). Paste the content safeguards note only after verifying its reporting fixture. Select **Manually release this version**.
9. Review export-compliance questions for the selected build and resolve any submission warnings. **Add for Review** and **Submit to App Review** require separate approval; saving metadata does not authorize submission.

### Age rating

The first-release questionnaire was saved on 25 October 2026 with a global rating of **13+**, with regional variations. Re-answer when the app’s content or capabilities change; do not treat this as a permanent rating.

- Capabilities: User-Generated Content **Yes** because members study shared decks. Parental controls, age assurance, unrestricted web access, messaging, social media and advertising were **No**.
- Frequency: **Infrequent** alcohol references, mature themes, realistic violence, and guns or other weapons. Published decks include beer vocabulary and historical material about persecution, the Holocaust, an assassination attempt, torture, the death penalty and weapon ownership. The remaining frequency answers were **None**, with no medical/wellness, gambling or loot-box features.
- The app was not entered in the Kids category and had no age override. Reconcile any future minimum age in the terms or product with the questionnaire and override requirements.

## Google Play Console

Complete the account verification and app setup in `docs/phone-release.md` first. Text and images prepared locally are not saved Play Console listings until an app record exists and they have been uploaded.

1. **Account and testing.** Complete identity, device and contact verification as required by the account dashboard. New personal developer accounts created after 13 November 2023 need a closed test with at least 12 continuously opted-in testers for 14 days before applying for production access; confirm the account’s current requirements in the console. Internal testing does not satisfy that closed-test requirement. See [Google’s testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
2. **Store settings.** Category **Education**, contact email `hello@lymi.app`, website `https://lymi.app`.
3. **Main store listing and translations.** Use the Google Play fields from `listing/en.md`, `listing/uk.md` and `listing/ru.md`. Upload a 512 × 512 app icon, a 1024 × 500 feature graphic per locale, and the six selected-style phone screenshots from `out/<style>/<language>/play/`. Do not paste the App Store description’s iOS-only widget or share-extension claims into Play.
4. **App content.** Set the localized privacy policy, review access from [`review.md`](review.md#google-play-console-app-access), Data safety from [`privacy.md`](privacy.md#google-play-console-data-safety), and the external account-deletion URL. No ads or Advertising ID are used.
5. **Content rating and audience.** Complete the IARC questionnaire from the actual catalog, shared content and app capabilities; include applicable alcohol and historical violence references rather than copying an all-No answer sheet. The operator must choose the intended target ages and resolve provider restrictions first. Do not select 18+ solely to avoid another policy or assume Apple’s rating determines Google’s audience declaration.
6. **Other declarations.** Review the current console questions. Lymi is not a news, government, financial or health app and has no COVID-19 tracing features. Verify that the selected build and SDKs still match those answers.
7. **Release.** Use the matching release notes from `listing/<language>.md`. Complete any required testing and production-access steps before seeking separate approval to submit or publish.

## After approval

- Release the App Store version manually after approval to launch.
- Check the live listings in each language on a phone: name, screenshot order, support links, availability, pricing and privacy label. Verify the installed store build’s sign-in and first review.
- Put future What’s New and release notes in `listing/` first, then copy them into both consoles.
