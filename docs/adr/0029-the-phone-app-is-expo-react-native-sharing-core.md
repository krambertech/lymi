---
status: accepted
date: 2026-10-11
---

# The phone app is an Expo React Native app that shares Lymi's packages, not a wrapped web app

Lymi's iPhone app, and later its Android app, is `apps/mobile`: Expo with React Native, with screens written for the phone and everything underneath them shared with the web. Product rules come from `packages/core` unchanged. The API client, query options and grade outbox move to `packages/client`, and design values (tokens, the lantern's geometry, flame and motion values) move to `packages/design`. Both apps import them. The PWA stays the web product; the phone app replaces it on the phone only once it reaches parity.

## Context

The proof of concept in `apps/mobile` (11 October 2026, Expo SDK 57, React Native 0.86) ran Today, Review, Library, capture and Home Screen widgets on iOS 26, importing `packages/core`'s FSRS scheduler and draw unchanged. What made it feel native came from the system: real navigation stacks with swipe back, sheets with detents, peek-and-menu on a deck, haptics, Liquid Glass and widgets written in TypeScript. A WebView can imitate these, and the imitation is what makes an app feel like a website. React DOM components cannot run in React Native, so screens are written twice whichever way the code underneath is shared.

## Considered options

- **Expo React Native with shared packages:** accepted. System chrome and widgets come with it, and builds run locally with Xcode and no Expo account.
- **Capacitor around the existing React app:** rejected. It reuses every screen, but the screens stay a WebView, and native navigation, glass and gestures would be imitations drawn in CSS.
- **Expo shell around a persistent WebView:** rejected. It costs two runtimes and a route bridge while keeping the WebView feel where the learner spends their time.
- **Native Swift:** rejected. It shares no code with the web, so every product rule would be written and tested twice.

## Consequences

- Every screen exists twice under the same component names (`Screen`, `Plate`, `SevenLights`, `Lantern`), so a design rule reads the same on both. A feature lands on both apps, or the web ships first with a linked phone issue, as with MCP parity.
- The phone keeps Lymi's identity and draws its own persistent chrome: the pill navigation in Liquid Glass, top bar, buttons, form controls and grade plates, in Onest and Lucide. Apple draws only what comes and goes: long-press menus, the share sheet, alerts, the keyboard and permission prompts, in SF.
- Styling uses Uniwind, so the phone uses the web's Tailwind class names, and tokens are generated from one source; a token change reaches both apps. The phone keeps its own type ramp under the web's step names, because iOS reads at 17 pt.
- Motion runs on Reanimated and Gesture Handler on the UI thread. The web's timings in `motion.md` become shared presets.
- The Worker serves a second client. Sign-in uses Better Auth's Expo plugin with the app's URL scheme as a trusted origin, and the API stays compatible with installed app versions, which can lag the web by weeks.
- Shipping needs the Apple Developer Program. Expo's cloud services (EAS Build, Submit and Update) are optional.
- `NativeTabs` and `expo-widgets` are young APIs; the app keeps its own tab bar and can fall back to `@bacons/apple-targets` for widgets that need full WidgetKit.

[Proposal: native mobile app](../proposals/native-mobile-app.md)
