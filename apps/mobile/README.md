# Lymi for iOS

The iPhone app, in Expo React Native, signed in to a real Lymi account and run on the learner's own data. Why it is React Native sharing `packages/core` is [ADR 0029](../../docs/adr/0029-the-phone-app-is-expo-react-native-sharing-core.md); where it differs from the web is [the phone design file](../../docs/design/system/phone.md); how it ships is [the phone release guide](../../docs/phone-release.md).

## Run it

You need Xcode 26.4 or later and an iOS 26 Simulator runtime (`xcodebuild -downloadPlatform iOS`). No Expo account is needed.

```bash
pnpm install
cd apps/mobile
pnpm exec stim start
pnpm exec stim ios
```

[Stim](https://stim.appandflow.com) starts Metro, creates this worktree's own Simulator, installs a cached dev client and opens it on that Metro. It builds one, in several minutes, only when no worktree has built this native fingerprint yet; a change to `app.json`, a config plugin or a native module changes the fingerprint. Metro then reloads JavaScript in place. `pnpm exec stim stop` shuts it all down. [Local development](../../docs/local-dev.md#run-the-phone-app-in-a-simulator) has the details, including a local Worker.

## Sign-in

Better Auth's Expo plugin keeps the session cookie in SecureStore, and `sessionHeaders()` in `src/auth/client.ts` returns it for any request to the API. Signed out, the root layout shows only `(auth)`: a welcome screen with the ways in (Google through the system browser, email, Create an account), which pushes the email forms on their own top-aligned screen. A new password account is confirmed with a code from its email, because a confirmation link would open in Safari, which did not sign up, and the Worker would retire the password (issue 251). The app talks to production unless `EXPO_PUBLIC_API_URL` names another Worker; [local development](../../docs/local-dev.md#sign-the-phone-app-in) has the local setup.

## Design choices

Of the options the proof of concept compared side by side, the app keeps the title in the top bar, the lit room on Today, Onest everywhere and plate grades. [The proposal](../../docs/proposals/native-mobile-app.md#design-language) records them. The tabs are iOS's own tab bar and capture sits in the top bar ([ADR 0034](../../docs/adr/0034-the-phone-uses-the-system-tab-bar-and-captures-from-the-top-bar.md)).

## What is shared with the web

- `@lymi/core` unchanged: the review draws each next card with core's `draw` (ADR 0019), and today's count turns at the learner's midnight by the review zone.
- `@lymi/client`: screens read hooks in `src/data/queries.ts`, which spread the web's query options. Grades and card writes go through the shared outboxes, kept in MMKV so they survive a quit and replay in order (ADR 0023). `src/data/client.ts` configures the client, and `src/data/sync.ts` replays the outboxes at sign-in, on reconnect and on return to the front, as the web's root does.
- `@lymi/design`: colours, radii, the lantern's drawing, the flame's and the seven lights' rules, and motion presets. `src/global.css` imports its Uniwind theme; the phone keeps its own type ramp there under the shared step names, because iOS reads at 17 pt. `src/theme/motion.ts` converts the shared springs and curves for Reanimated.
- Lucide icons, rendered by `lucide-react-native`. The system tab bar takes images, so `pnpm tab-icons` draws its icons into `assets/tabs` (it needs `rsvg-convert`).

## Interface text

Strings use the web's Lingui macros, compiled by `babel.config.js` on Expo's own Babel 7; the web compiles on Babel 8. The catalogs are `src/locales/*.po`, which Metro compiles on import, and `pnpm i18n:extract` at the root writes them with the web's and the site's. A message the web already has keeps its translation when it is worded the same. `src/i18n` opens in the phone's language until the learner's setting arrives. Widgets cannot run Lingui, so their text is formatted in the app and sent with their data.

## Motion and type

React Native Skia draws the lantern (`src/brand/lantern.tsx`) and the end of a review's light and embers (`src/brand/ending.tsx`), so they move on the UI thread. The end of a review runs on one clock that the first tap finishes. `useReduceMotion` in `src/theme/motion.ts` follows the setting while the app runs; every animation takes `ReduceMotion.Never` and the screen picks the reduced version itself. `Text` follows Dynamic Type through the iOS text style nearest its size, capped per size in `src/theme/type.ts`, with tracking set for the size it is drawn at.

## Widgets

`src/widgets` holds two Home Screen widgets, **Lantern** (small and medium) and **Week** (medium), and a Lock Screen widget, written with `expo-widgets` and `@expo/ui`. Widget layouts are compiled into the native build, so a change to one needs a new native build through `pnpm exec stim ios`; see the local-development guide linked above. The app pushes today's numbers and the theme colours to them through the shared app group whenever they change. On the Simulator, touch and hold the Home Screen, choose **Edit**, then **Add Widget**, and search for Lymi.

Widget text and weekday letters follow the account’s app language, including the next-day timeline; the app formats them before sending, so widgets load no catalogs. WidgetKit’s gallery names and descriptions follow iOS’s language through `assets/widgets/Localizable.xcstrings`, copied into the extension by `plugins/with-widget-localizations.cjs`.

## Reminders

The daily reminder is a local notification, so it needs no push service and no push entitlement; `plugins/no-push-entitlement.cjs` takes away the one `expo-notifications` adds, because a free Apple team cannot sign it. The time stays on the phone, as the web keeps one per browser. `src/reminders` plans a week ahead from today's draw and Insights' forecast, skips a day that counts or has nothing due, and plans again after each grade and on each return to the front. iOS asks for permission when the learner first turns the reminder on. Sign-out cancels everything scheduled. On the Simulator, `xcrun simctl push <udid> app.lymi <file>` with `"category": "review-reminder"` in its `aps` shows a reminder with its actions at once.

## Links

A deck's join link, `https://my.lymi.app/join/<token>`, and Add to Lymi, `/add/<slug>`, open the app when it is installed. On iOS the Worker serves `/.well-known/apple-app-site-association` once `APPLE_APP_ID` (`TEAMID.app.lymi`) is set, and `plugins/app-links.cjs` adds the `applinks:my.lymi.app` entitlement only when `LYMI_APP_LINKS=1`, because a free Apple team cannot sign it. `eas.json` sets it for EAS builds, so eas-cli's capability sync and the build machine both see it; set it yourself for a local build. On Android the manifest's intent filter asks to verify both paths, and the Worker serves `/.well-known/assetlinks.json` once `ANDROID_CERT_FINGERPRINTS` lists the signing certificates; [`docs/phone-release.md`](../../docs/phone-release.md#android-app-links) says where to copy them from. Either file answers 404 until its value is set, so the links open the website. `lymi://join/<token>` reaches the same screen on the Simulator: `xcrun simctl openurl <udid> lymi://join/<token>`.
