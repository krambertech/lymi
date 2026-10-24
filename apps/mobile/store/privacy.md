# Privacy declarations

The answers for Apple's App Privacy label and Google Play's Data safety form, worked out from the code at `main` 4bfd3b729. The same data types are declared in the app's privacy manifest, `ios.privacyManifests` in [`app.json`](../app.json), so a change here changes that too. Re-check both whenever an SDK, a provider or a new kind of upload is added.

Lymi has no ads, no ad SDK, no App Tracking Transparency prompt and no advertising identifier, so nothing is used for tracking on either store.

## What leaves the device

| Data | Where it goes | Why |
| --- | --- | --- |
| Email, name, Apple or Google account ID | Lymi's server on Cloudflare | Sign-in, account emails through Resend, the name members of a shared deck see |
| Cards, decks, sections, tags, hooks, reviews, settings | Lymi's server | The product itself, synced between phone and web |
| Card pictures, profile photo | Lymi's server (R2), re-encoded to WebP without metadata | Shown on the card and to members of a shared deck |
| Lesson pages, PDFs and text for Smart add | Lymi's server, then Anthropic through Cloudflare AI Gateway | Extracting terms; the material is not kept after the read |
| A card's term and existing fields, the deck's name, instructions and style | OpenAI, Google Gemini and Workers AI through AI Gateway | Enrichment, hook drafts, Japanese lead-ins, language detection |
| A card's term or reading | Google Cloud TTS, Gemini, ElevenLabs or OpenAI speech | Speech; the clip is cached on Lymi's server |
| Import files (Anki, Mochi, Quizlet, Noji, Lymi) | Lymi's server (R2) | Importing |
| Feedback notes | Lymi's server, emailed to the operator inbox | Answering the learner |
| Usage events with the account ID, app version and a country from Cloudflare | PostHog EU through Lymi's server | Product analytics; no card text, prompts, email or name. Opt-out is by email |
| Error reports with the account ID, or PostHog's random install ID when signed out | PostHog EU | Fixing crashes; sent even when analytics are off |

AI Gateway runs with payload logging off. The AI and speech providers, PostHog, Resend and Cloudflare process data for Lymi as service providers, which both stores exclude from "shared" and from "tracking".

Nothing collects location from the device, contacts, health data, the microphone, browsing history or purchases. Search queries go to the server to answer the search and are not kept.

## App Store Connect: App Privacy

App Store Connect, Apps, Lymi, App Privacy, Get Started (or Edit next to Data Types).

1. "Do you or your third-party partners collect data from this app?" **Yes, we collect data from this app.**
2. Tick these data types and nothing else:
   - Contact Info: **Name**, **Email Address**
   - User Content: **Photos or Videos**, **Customer Support**, **Other User Content**
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
| Customer Support | App Functionality | Yes | No |
| Other User Content | App Functionality | Yes | No |
| User ID | App Functionality, Analytics | Yes | No |
| Device ID | App Functionality | Yes | No |
| Product Interaction | App Functionality, Analytics | Yes | No |
| Crash Data | App Functionality | Yes | No |
| Coarse Location | Analytics | Yes | No |

4. Publish.

Three answers are judgement calls, each chosen to over-declare rather than under-declare:

- **Coarse Location.** No location API runs. The server adds the country Cloudflare derives from the IP address to each analytics event. Dropping the country from events would let this one go.
- **Device ID.** An error report sent while signed out carries PostHog's random per-install ID instead of an account ID. It is not a hardware or advertising ID, but Apple does not draw that line clearly.
- **Product Interaction for App Functionality.** Grades are the product's data, used to schedule reviews, as well as analytics events.

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
| Location | Approximate location | Required | Analytics |
| Personal info | Name | Required | App functionality, Account management |
| Personal info | Email address | Required | App functionality, Account management, Developer communications |
| Personal info | User IDs | Required | App functionality, Analytics, Account management |
| Photos and videos | Photos | Optional | App functionality |
| Files and docs | Files and docs | Optional | App functionality |
| App activity | App interactions | Required | App functionality, Analytics |
| App activity | Other user-generated content | Required | App functionality |
| App info and performance | Crash logs | Required | App functionality |
| Device or other IDs | Device or other IDs | Required | App functionality |

Not collected: precise location, phone number, address, other personal info, financial info, health and fitness, messages, videos, audio, calendar, contacts, web browsing, in-app search history, installed apps, other actions, diagnostics, other app performance data.

"Developer communications" covers the account emails: confirmation, sign-in help, invitations and the deletion receipt. Lymi sends no marketing email.

### Account deletion URL

`https://my.lymi.app/settings/delete-account`, the web app's own deletion screen, after sign-in. The in-app path is **You**, **Delete account**, confirmed with the emailed code or with Apple. [`docs/phone-release.md`](../../../docs/phone-release.md) uses the same answers in its Play setup.

## Depends on the AI consent work

Neither store's form changes with the AI consent pull request (#973), because the AI providers are service providers. What it changes is App Review: under guideline 5.1.2(i), personal data sent to a third-party AI needs disclosure and the learner's permission first. Once #973 ships, the phone sends nothing to AI until the learner allows it in the first-time prompt or in You, AI services. Submit only a build that has it.
