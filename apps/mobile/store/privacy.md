# Privacy declarations

The answers for Apple's App Privacy label and Google Play's Data safety form, based on the data flows below. Declare what the submitted build collects under each store's definitions, not every kind of personal information someone could put in a card. The same data types are declared in the app's privacy manifest, `ios.privacyManifests` in [`app.json`](../app.json), so a change here changes that too. Re-check both whenever an SDK, a provider or a new kind of upload is added.

Lymi has no ads, no ad SDK, no App Tracking Transparency prompt and no advertising identifier, so nothing is used for tracking on either store.

## What leaves the device

| Data | Where it goes | Why |
| --- | --- | --- |
| Email, name, Apple or Google account ID | Lymi's server on Cloudflare | Sign-in, account emails through Resend, the name members of a shared deck see |
| Cards, decks, sections, tags, hints, reviews, settings | Lymi's server | The product itself, synced between phone and web |
| Card pictures, profile photo | Lymi's server (R2), re-encoded to WebP without metadata | Shown on the card and to members of a shared deck |
| Lesson pages, PDFs and text for Smart add | Lymi's server, then Anthropic through Cloudflare AI Gateway | Extracting terms; the material is not kept after the read |
| A card's term and existing fields, the deck's name, instructions and style | OpenAI, Google Gemini and Workers AI through AI Gateway | Enrichment, hint drafts, Japanese lead-ins, language detection |
| A card's term, reading or example sentence, with pronunciation context where needed | Google Cloud TTS, Gemini, ElevenLabs or OpenAI speech | Speech; the clip is cached on Lymi's server |
| Import files (Anki, Mochi, Quizlet, Noji, Lymi), including retained card recordings | Lymi's server (R2) | Importing |
| Feedback notes | Lymi's server, emailed to the operator inbox | Answering the learner |
| Usage events with the account ID, app version and a country from Cloudflare | PostHog EU through Lymi's server | Product analytics; no card text, prompts, email or name. Opt-out is by email |
| Error reports with the account ID, or PostHog's random launch ID when signed out | PostHog EU | Fixing crashes; sent even when analytics are off |

AI Gateway runs with payload logging off. The AI and speech providers, PostHog, Resend and Cloudflare process data for Lymi as service providers. Google Play excludes qualifying service-provider transfers from "sharing"; Apple’s "tracking" definition concerns cross-company advertising or data brokers, not every transfer to a processor.

The app does not request device location, contacts, health data or microphone access, or collect browsing history or purchases. Imported card recordings are audio data even though Lymi never uses the microphone. Search queries go to the server to answer the search and are not kept.

## App Store Connect: App Privacy

App Store Connect, Apps, Lymi, App Privacy, Get Started (or Edit next to Data Types).

1. "Do you or your third-party partners collect data from this app?" **Yes, we collect data from this app.**
2. Tick these data types and nothing else:
   - Contact Info: **Name**, **Email Address**
   - User Content: **Photos or Videos**, **Audio Data**, **Customer Support**, **Other User Content**
   - Identifiers: **User ID**, **Device ID**
   - Usage Data: **Product Interaction**
   - Diagnostics: **Crash Data**
   - Location: **Coarse Location**
3. For each type, answer:

| Data type | Purposes | Linked to the user | Used for tracking |
| --- | --- | --- | --- |
| Name | App Functionality | Yes | No |
| Email Address | App Functionality | Yes | No |
| Photos or Videos | App Functionality | Yes | No |
| Audio Data | App Functionality | Yes | No |
| Customer Support | App Functionality | Yes | No |
| Other User Content | App Functionality | Yes | No |
| User ID | App Functionality, Analytics | Yes | No |
| Device ID | App Functionality | Yes | No |
| Product Interaction | App Functionality, Analytics | Yes | No |
| Crash Data | App Functionality | Yes | No |
| Coarse Location | App Functionality, Analytics | Yes | No |

4. Publish only with the account holder’s approval.

These classifications follow [Apple’s data-type definitions](https://developer.apple.com/app-store/app-privacy-details/):

- **Coarse Location.** No location API runs, but the proxy adds the IP-derived country to usage events and error reports. Error reporting continues after a product-analytics objection, so collection is required and serves both Analytics and App Functionality. Apple defines coarse location by the information retained, not the use of a location permission.
- **Device ID.** An error report sent while signed out carries a random SDK identifier for the current launch. It is not a hardware or advertising ID; it still identifies an app instance for diagnostics.
- **Audio Data.** Imports can retain sound recordings on cards. Declare this upload rather than treating the absence of microphone access as the absence of audio collection.
- **Product Interaction for App Functionality.** Grades and other review interactions schedule reviews as well as generating analytics events. Both purposes apply.

## Google Play Console: Data safety

Play Console, Lymi, Policy and programs, App content, Data safety, Start (or Manage).

### Data collection and security

- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data collected by your app encrypted in transit? **Yes**
- Which of the following methods of account creation does your app support? **Username and password**, **OAuth** (Sign in with Google), and, if Play lists it, **Other** for Sign in with Apple
- Delete account URL: see [Account deletion URL](#account-deletion-url) below
- Do you provide a way for users to request that some or all of their data is deleted, without requiring them to delete their account? **No**. Archiving hides a card without erasing it, and data requests go by email.

### Data types

Every type below is **Collected: yes**, **Shared: no**, **Processed ephemerally: no** unless noted.

| Category | Data type | Required or optional | Purposes |
| --- | --- | --- | --- |
| Location | Approximate location | Required | App functionality, Analytics |
| Personal info | Name | Required | App functionality, Account management |
| Personal info | Email address | Required | App functionality, Account management, Developer communications |
| Personal info | User IDs | Required | App functionality, Analytics, Account management |
| Photos and videos | Photos | Optional | App functionality |
| Files and docs | Files and docs | Optional | App functionality |
| Audio files | Voice or sound recordings | Optional | App functionality |
| Audio files | Other audio files | Optional | App functionality |
| App activity | App interactions | Required | App functionality, Analytics |
| App activity | Other user-generated content | Required | App functionality |
| App info and performance | Crash logs | Required | App functionality |
| Device or other IDs | Device or other IDs | Required | App functionality |

Not collected: precise location, phone number, address, other personal info, financial info, health and fitness, messages, videos, calendar, contacts, web browsing, in-app search history, installed apps, other actions, diagnostics, other app performance data.

Declare only the audio subtypes retained by the submitted import paths; an import may contain sound recordings or other audio files. Photos, support notes and free-form card text do not require declaring every possible sensitive fact someone could put in them. [Google’s form definitions](https://support.google.com/googleplay/android-developer/answer/10787469) govern these categories.

"Developer communications" covers the account emails: confirmation, sign-in help, invitations and the deletion receipt. Lymi sends no marketing email.

### Account deletion URL

`https://my.lymi.app/settings/delete-account`, the web app's own deletion screen, after sign-in. The in-app path is **You**, **Delete account**, confirmed with the emailed code or with Apple. [`docs/phone-release.md`](../../../docs/phone-release.md) uses the same answers in its Play setup.

## Provider terms

Use the service-provider exception only for transfers covered by the provider’s processing terms and the account’s actual settings. Disabling AI Gateway payload logs does not disable upstream retention or model training. Verify those separately before making a no-training promise.

[Google’s Gemini API terms](https://ai.google.dev/gemini-api/terms) restrict API clients directed at or likely to be accessed by under-18s and require Paid Services when serving EEA, Swiss or UK users. This applies to the AI Studio API paths used for Japanese pronunciation context and some speech, not automatically to separate Google Cloud services. Resolve the provider and audience choice before offering those paths to younger learners; do not silently impose an app-wide age limit to cover a provider constraint.

## AI permission and native builds

AI permission does not by itself change either store’s data-type answers. App Review guideline 5.1.2(i) requires disclosure and permission before personal data is sent to third-party AI. The phone requires permission for AI processing of the learner’s own content; shared and published audio follows the owner’s choice. Submit a build that includes these controls. Changes to the privacy manifest in `app.json` require a new native build.
