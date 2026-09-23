---
status: exploration
date: 2026-09-23
decision: none
---

# Native mobile app

This explores a React Native app that feels native, not a WebView around the product: what it can share with `apps/web`, what it cannot, and what it costs to build and keep. It does not commit Lymi to Expo, store distribution, a platform, or a date. An earlier version of this proposal weighed Capacitor and a WebView shell; both are kept below only as the fallback if the native cost is too high.

## Desired outcome

A phone app whose review, capture and Today are indistinguishable from a good native app: a native stack with the system back swipe, native sheets and keyboard handling, haptics on grades, reminders that need no install step, a share-sheet target so a word from any app lands as a card while the lesson is fresh, and a home-screen widget with the flame and today's due count. Learner-owned data, provenance and cross-device continuity stay exactly as they are, because the Worker, the API and the scheduling are the same.

The PWA remains the product surface until an app on a real iPhone is demonstrably better at the phone jobs in `PRODUCT.md`: short evening reviews and fast capture.

## What is shared and what is not

The client is about 35,000 lines outside tests. A proper native app reuses the fifth that holds the rules and rewrites the four fifths that draw them.

| Layer | Lines | Native fate |
| --- | --- | --- |
| `packages/core` root: Zod types, FSRS, the draw, streak, modes, terms, notes, passwords | 4,300 | Imported unchanged. Only `./db`, `./catalog` and `./publication-media` pull Drizzle and stay on the server. |
| `client/lib/api`, `client/lib/queries` | 940 | Shared as is: they use `fetch` and TanStack Query only. `request.ts` needs a base origin and a session header instead of a same-origin cookie. |
| DOM-free `client/lib` logic: review draw, review completion, modes, timeline, library groups, deck and activity lists | ~1,000 | Shared once moved out of `apps/web`. |
| Browser-bound `client/lib`: the grade outbox, i18n bootstrap, persisted state, card pictures, theme, device, add-card and sign-out hooks | ~2,400 | Logic shared behind a storage adapter; the outbox is the one that matters. localStorage becomes MMKV, Cache Storage becomes the file system. |
| Lingui `.po` catalogs, en, uk, ru | | Shared through `@lingui/metro-transformer`. A native screen that uses the same English sentence gets the existing Ukrainian and Russian for free. |
| Tokens in `styles.css`, OKLCH variables and the `bg-amber`, `ms-`, `pe-` vocabulary | 820 | Largely reused: Uniwind reads Tailwind v4 CSS syntax and React Native has logical margins natively. |
| `lantern-geometry.tsx` path data and `FLAME_MOTION` values | 300 | Paths go to `react-native-svg`; the springs are re-tuned by eye in Reanimated, whose spring parameters differ from Motion's. The glow filter needs a check on the new architecture. |
| Views, components, `components/ui`, routes | 29,300 | Rewritten. React DOM markup, Base UI, TanStack Router, Motion, View Transitions, dnd-kit, the service worker, `<audio>`, canvas cropping and multipart file upload have no native equivalent that takes the same code. |

The replacements are ordinary: Expo Router for TanStack Router, React Native Reusables on Uniwind for shadcn on Base UI, Reanimated and Gesture Handler for Motion and the drawer's drag, `expo-audio` for pronunciation, `expo-image` for pictures, Expo notifications for Web Push. None of them accept the web component as input, so every screen the phone shows is designed and built a second time and reviewed on a device a second time.

## Server and contract changes

These are small, mostly additive, and the same for any native path.

- **Auth.** Better Auth's Expo plugin stores the session in SecureStore and sends it as a header; the Worker adds the plugin and `lymi://` to `trustedOrigins`. Google runs through the system browser. Sign in with Apple is not required by guideline 4.8 while email and password exist, but it is what an iPhone learner expects, and the stack already reserved it for this moment. Confirmation and join links must open the app through universal links, and the rule that drops a password confirmed from a different browser must recognise the app's cookie jar as the browser that signed up.
- **Push.** `push_subscriptions` holds Web Push fields. Add a device-token kind and send native tokens through Expo's push service from the same 15-minute cron, so ADR 0006's per-device reminder logic is untouched.
- **Versioning.** Installed binaries lag the Worker. Every native request names its client version, and an update-required answer never discards queued grades.
- **Deep links.** `/join/:token`, `/add/:slug` and `/review` open the app when it is installed.

## What it costs

**Money is small.** Apple's developer programme is 99 USD a year and Google Play 25 USD once. EAS Build's free tier gives 15 iOS and 15 Android builds a month, and the local Mac with Xcode 26.6 can build without it. Expo's push service is free. Nothing else is recurring.

**Time is the cost.** For a phone-scoped app, in order: foundation (Expo app, auth, shared client package, Query persistence, outbox, catalogs, tokens), the review screen with the lantern and both choreographed moments, Today and the streak, Library, deck and word, the capture sheet, a Settings subset, reminders and the share target, then store assets, privacy labels and review. Each is one to three weeks for one person with an agent; the whole is two to three months before it is better than the PWA, and the review screen is the part that cannot be rushed because the lantern and its motion are the identity.

**Maintenance is the recurring cost.** Every phone-facing change is made twice or the two clients diverge. Expo ships an SDK about every six months; SDK 56 on React Native 0.85 is current as of 23 September 2026 and the new architecture is mandatory. Any native change is a store binary; JavaScript-only changes can go over the air. CI gains an iOS build and a simulator test lane beside Playwright. Two interface systems means two design reviews per screen.

The lever is scope. Imports, exports, connected apps, API keys, deck settings, sections and publishing are desktop jobs; the app links to the web for them. That leaves Today, Review, Library, the deck, the word, capture, the streak, Explore's add and a short Settings, and keeps about a quarter of the interface, some 7,000 lines, out of the second implementation permanently.

## Fallbacks weighed

Capacitor around the existing app and an Expo shell around one persistent WebView are the cheap experiments the previous version of this proposal favoured. Both keep the interface a WebView, which is what "proper native feel" rules out, so they are the fallback if the cost above is too high, not the plan. Expo DOM components could render long-tail screens from web code inside a native app, but as of 23 September 2026 they cannot be updated over the air, run in a separate JavaScript engine with their own React tree and Query cache, and Expo Router does not navigate across the boundary; they fit a Settings page, not a review.

## Current leaning and first steps

1. **Extract the shared client now**, with no native code: `packages/client` for the API modules, queries, the outbox behind a storage adapter, and the DOM-free `client/lib` logic, consumed by `apps/web` unchanged. This is worth doing regardless, proves the boundary, and is the only step the web app pays for.
2. **Spike the phone jobs in Expo** on a real iPhone: sign in through the Expo plugin, Today from the shared queries, Review on the shared draw and outbox with a first Reanimated lantern, offline with the Worker stopped, through a force quit. One to two weeks. It answers whether the outbox survives, how much of the review choreography ports at what fidelity, and whether it feels better than the standalone PWA.
3. **Decide** with that evidence. If it does not feel better, the PWA continues and the shared client still paid for itself.

## Open questions

- iOS first, or both stores from the start? One learner is on an iPhone; Play adds a second review process and binary lifecycle.
- Which native capabilities move the daily jobs: the share target, the widget, reliable reminders, or all three?
- If [payments](premium-subscription-and-payments.md) arrive, which store rules on in-app purchase apply to a subscription bought outside the app? They vary by region and change often, so date the answer.
- Does the Expo spike keep the web app's Undo, grade ordering and deterministic draw exactly, or does it reveal logic still hiding in components?

## Sources checked

- [Expo SDK 56 and React Native 0.85](https://docs.expo.dev/versions/latest/) and [the New Architecture guide](https://docs.expo.dev/guides/new-architecture/)
- [Expo plans and pricing](https://docs.expo.dev/billing/plans/)
- [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo)
- [Lingui for React Native](https://lingui.dev/tutorials/react-native) and [the Metro transformer](https://lingui.dev/blog/2024/11/20/metro-transformer)
- [Uniwind](https://docs.uniwind.dev/) and [React Native Reusables](https://reactnativereusables.com/docs)
- [Expo DOM components](https://docs.expo.dev/guides/dom-components/)
- [App Store Review Guidelines, 4.8](https://developer.apple.com/app-store/review/guidelines/)
