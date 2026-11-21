# Store console checklist

What App Store Connect and Play Console need by hand for the first submission, in order. The answers live beside this file: listing text in [`listing/`](listing), privacy answers in [`privacy.md`](privacy.md), review access in [`review.md`](review.md), screenshots from [`screenshots/`](screenshots). Play's account, signing and testing-track setup is in [`docs/phone-release.md`](../../../docs/phone-release.md#setting-up-google-play); this list covers only the listing and its declarations.

## Before either store

1. Raise `expo.version` in `apps/mobile/app.json` to `1.0.0`, the version the stores will show, and follow the contract steps in `docs/phone-release.md` for a new version.
2. Ship a binary with this pull request's privacy manifest, the AI consent prompt (#973) and content reports (#971). Each changes the native fingerprint or the review notes, so the build under review must postdate all three.
3. Make the review account as [`review.md`](review.md) describes.
4. Run `node apps/mobile/store/screenshots/set.mjs` to write the screenshots to `apps/mobile/store/screenshots/out/`.

## App Store Connect

All under App Store Connect, Apps, Lymi.

1. **Languages.** App Information, then the language menu at the top right of the page: add Ukrainian and Russian. English (U.S.) stays the primary language.
2. **App Information**, per language: Name and Subtitle from `listing/<language>.md`. Then, once:
   - Category: Primary **Education**, Secondary **Reference**.
   - Content Rights: **No**, it does not contain, show or access third-party content. Cards are the learner's own or Lymi's.
   - Age Rating: Edit, and answer as in [Age rating](#age-rating) below. The result should be 4+.
3. **App Privacy.** Privacy Policy URL `https://lymi.app/privacy`, then the data types in [`privacy.md`](privacy.md#app-store-connect-app-privacy). Publish.
4. **Pricing and Availability.** Price **Free** (USD 0). Availability: all countries and regions.
5. **EU trader status.** App Store Connect home, Business, then the Digital Services Act section. A trader's address, phone and email are shown on the EU store page. Deciding whether Lymi is a trader is yours; distribution in the EU waits until it is answered.
6. **The version page**, `iOS App 1.0` in the sidebar, per language:
   - iPhone screenshots: the 6.9" slot takes `out/<language>/6.9/`, the 6.3" slot takes `out/<language>/6.3/`, all nine in file order.
   - Promotional Text, Description, Keywords from `listing/<language>.md`.
   - Support URL `https://lymi.app/support`, Marketing URL `https://lymi.app`.
   - What's New stays empty on the first version.
7. **The version page**, once:
   - Build: the TestFlight build from step 2 of [Before either store](#before-either-store).
   - Copyright: `2026 Kateryna Porshnieva`.
   - App Review Information: from [`review.md`](review.md).
   - Version Release: **Manually release this version**, so you choose the day.
8. **Add for Review**, then **Submit to App Review**.

### Age rating

- In-app controls and capabilities: Parental Controls **No**, Age Assurance **No**, Unrestricted Web Access **No**, User-Generated Content **Yes**, Messaging and Chat **No**, Social Media **No**, Advertising **No**.
- Every frequency question (profanity, horror, alcohol and drugs, medical information, sexual content, violence, weapons, simulated gambling, contests): **None**. Health or wellness topics, gambling and loot boxes: **No**.
- Age categories: **Not Applicable**. No override.

User-generated content is **Yes** because a learner can share a deck with anyone holding its link. It keeps 4+ and is why the review notes describe reporting.

## Google Play Console

All under Play Console, Lymi. Do the setup steps in `docs/phone-release.md` first.

1. **Store settings.** Grow users, Store presence, Store settings: category **Education**, contact email `hello@lymi.app`, website `https://lymi.app`.
2. **Main store listing.** Grow users, Store presence, Main store listing, in English (United States):
   - App name, Short description, Full description from `listing/en.md`.
   - App icon: `apps/mobile/assets/icon.png` resized to 512 × 512, `sips -z 512 512 apps/mobile/assets/icon.png --out icon-512.png`.
   - Feature graphic: `out/play-feature/en.jpg`.
   - Phone screenshots: `out/en/play/`, all nine in file order. Skip tablet screenshots; the app is phone-only.
3. **Translations.** On the same page, Manage translations, Add your own translations: Ukrainian and Russian, with the text from `listing/uk.md` and `listing/ru.md`, the feature graphic `out/play-feature/<language>.jpg` and the screenshots `out/<language>/play/`.
4. **App content**, under Policy and programs. Each declaration below opens from that page:
   - Privacy policy: `https://lymi.app/privacy`.
   - Ads: **No, my app does not contain ads**.
   - App access: from [`review.md`](review.md#google-play-console-app-access).
   - Content rating: start the questionnaire with `hello@lymi.app`, category **Reference, News, or Educational**. Answer **No** to violence, sexuality, language, controlled substances, crude humour and gambling. Interactive features: users can interact or exchange content **Yes** (shared decks), shares location **No**, digital purchases **No**, unrestricted internet **No**. Expect Everyone / PEGI 3 with "Users Interact".
   - Target audience and content: **18 and over** only. Lymi is built for adult learners and its terms set no age, so this avoids the Families policy and the teen rules; widening it later is one change here.
   - News app **No**, COVID-19 contact tracing **No**, Government app **No**, Financial features **None**, Health **My app does not have any health features**.
   - Data safety: from [`privacy.md`](privacy.md#google-play-console-data-safety).
   - Advertising ID: **No**, the app does not use it.
5. **Release notes.** When promoting the release, paste the release notes from `listing/<language>.md`.

## Replacing the screenshots later

- App Store screenshots belong to a version. A live version's screenshots are locked, so new ones go on the next version's page (`+` beside iOS App), which then goes to App Review with its build.
- Play's screenshots and feature graphic change in Main store listing and in each translation at any time; with managed publishing on, the change waits in Publishing overview until you publish it.

## Uploading by API

`screenshots/upload.mjs` uploads what `set.mjs` rendered, so neither console needs a drag and drop:

```bash
node apps/mobile/store/screenshots/upload.mjs apple 1.0.1
node apps/mobile/store/screenshots/upload.mjs play --skip 6
```

- `apple <version>` creates that version beside the live one when it is missing, then replaces both iPhone sizes in every language. Attach the build, write What's New and submit it by hand.
- `play --skip <shot>` replaces the phone screenshots and the feature graphic in every listing and commits the edit. Play takes at most eight, so one shot stays out; Hear every word is the one left out today, since Made for your language has a speaker on every card.
- The keys live in `~/.lymi/keys/`, never in the repo: `AuthKey_<key id>.p8` and `app-store-connect.json` (`{"keyId", "issuerId"}`) from App Store Connect → Users and Access → Integrations, with App Manager access, and `play-service-account.json`, a JSON key for the eas-submit service account in the Google Cloud project Lymi Text to Speech. `LYMI_STORE_KEYS` points elsewhere.

## After approval

- Release the App Store version by hand from its version page.
- Check the live listings in each language on a phone: name, screenshots in order, and that the privacy label matches [`privacy.md`](privacy.md).
- The next release's What's New and release notes go into `listing/` first, then into both consoles.
