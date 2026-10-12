# Lymi for iOS (proof of concept)

An Expo app that shows the phone's design language and stack. It signs in to a real Lymi account and runs Today, Review and Library on the learner's own data; [the proposal](../../docs/proposals/native-mobile-app.md) has what is decided and what is not.

## Run it

You need Xcode 26.4 or later and an iOS 26 Simulator runtime (`xcodebuild -downloadPlatform iOS`). No Expo account is needed.

```bash
pnpm install
cd apps/mobile
LANG=en_US.UTF-8 npx expo run:ios
```

The first build takes several minutes; after that `npx expo start --dev-client` reloads JavaScript in place. CocoaPods fails with an encoding error unless `LANG` is UTF-8. A change to `app.json`, a config plugin or a native module needs `npx expo prebuild --clean` and a new build.

## Sign-in

Better Auth's Expo plugin keeps the session cookie in SecureStore, and `sessionHeaders()` in `src/auth/client.ts` returns it for any request to the API. Signed out, the root layout shows only `(auth)`: a welcome screen with the ways in (Google through the system browser, email, Create an account), which pushes the email forms on their own top-aligned screen. A new password account is confirmed with a code from its email, because a confirmation link would open in Safari, which did not sign up, and the Worker would retire the password (issue 251). The app talks to production unless `EXPO_PUBLIC_API_URL` names another Worker; [local development](../../docs/local-dev.md#sign-the-phone-app-in) has the local setup.

## Design choices

The proof of concept compared options side by side and kept one of each: the title in the top bar, the lit room on Today, Onest everywhere and plate grades. [The proposal](../../docs/proposals/native-mobile-app.md#design-language) records them. The tabs are iOS's own tab bar and capture sits in the top bar ([ADR 0034](../../docs/adr/0034-the-phone-uses-the-system-tab-bar-and-captures-from-the-top-bar.md)).

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

`src/widgets` holds two Home Screen widgets, **Lantern** (small and medium) and **Week** (medium), and a Lock Screen widget, written with `expo-widgets` and `@expo/ui`. Widget layouts are compiled into the native build, so a change to one needs `npx expo run:ios` again. The app pushes today's numbers and the rooms' colours to them through the shared app group whenever they change. On the Simulator, touch and hold the Home Screen, choose **Edit**, then **Add Widget**, and search for Lymi.
