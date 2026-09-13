---
status: exploration
date: 2026-09-13
decision: none
---

# Native mobile app

This explores a proper iOS and Android app without maintaining three interfaces. It does not commit Lymi to Capacitor, React Native, store distribution, or a native roadmap.

## Desired outcome

A native app is worthwhile when it improves capture, reminders, offline review, or return to the right card. It should preserve the complete experience, learner-owned data, provenance, and cross-device continuity.

The PWA remains the validated product surface until an experiment demonstrates an advantage. A first release should reuse most of the React interface, add platform value, and leave room for widgets, Live Activities, sharing, native navigation, and selectively native screens.

## Existing advantages and boundaries

Lymi already has a phone-oriented interface, offline state, shared API contracts, design tokens, and scheduling logic in `packages/core` that a React Native client can import.

A wrapper does not automatically solve several boundaries:

- the current Vite build combines the public site, authenticated app, and Worker rather than producing a standalone mobile bundle;
- the client uses same-origin `/api` requests, while bundled mobile assets have a local origin and must reach the deployed Worker explicitly;
- Better Auth trusts the web origin, so mobile sign-in, callbacks, credentials, and deep links need a deliberate contract;
- store apps need APNs and FCM rather than the current Web Push channel, while retaining per-device reminder behavior;
- offline state must survive process termination, app upgrades, backgrounding, and storage pressure;
- widgets and Live Activities remain native extensions even when they use the same API and product state.

## Two viable paths

### Capacitor around the existing app

Capacitor packages the React application inside ordinary Xcode and Android Studio projects. Plugins expose common native APIs, with custom Swift or Kotlin available beyond them.

This is the leaner experiment because it reuses the interface and route model. It supports push, deep links, haptics, sharing, widgets, Live Activities, and custom native code. Its trade-off is that the main surface remains a WebView; replacing individual screens with React Native views is not a natural continuation.

### Expo or React Native with a persistent WebView

An Expo or React Native shell with native navigation and one persistent WebView is also viable. The shell can own navigation, authentication, deep links, notifications, and future native screens while the WebView renders Lymi routes. One WebView preserves one runtime and review state; a typed bridge synchronizes routes.

This path is more attractive when native navigation belongs in the first experience or several core screens are likely to become native. Expo contributes strong tooling, cloud builds, submissions, compatible JavaScript updates, and native modules.

It creates two interface systems earlier. Navigation, back behavior, authentication, shared state, accessibility, and theming need ownership. React DOM components cannot become React Native views unchanged. Expo DOM components help reuse but run separately, communicate asynchronously, and, as of 13 September 2026, do not support Expo over-the-air updates.

## Decision-relevant comparison

| Concern | Capacitor | Expo or React Native shell |
| --- | --- | --- |
| Current UI reuse | Directly packages it | Hosts it in a WebView |
| Initial surface | Smaller | Native shell plus route bridge |
| Native navigation | Custom addition | First-class architecture |
| Progressive native screens | Awkward | Natural over time |
| Native capability | Plugins plus arbitrary native code | Modules plus arbitrary native code |
| Best fit | Product stays mostly web | Native UI becomes a meaningful share |

Neither path changes Apple or Google approval requirements. Review depends on the resulting experience, privacy, authentication, account deletion, payments, and sufficient functionality rather than the framework.

## Current leaning and experiment

Run a disposable iOS Capacitor experiment first as the cheapest test in a native container. Keep Expo with native navigation and a persistent WebView as an active alternative.

The local Mac has Node 22 and Xcode 26.6, satisfying Capacitor 8's iOS prerequisites. The fast loop loads Lymi's local Vite and Worker server through Capacitor live reload, preserving same-origin APIs and local authentication. Web changes reload in the simulator or phone; plugins, permissions, and native changes require rebuilding. A development `server.url` must never become production configuration.

A bundled test must run with the server stopped. It needs a mobile build rooted at the authenticated app, excluding the public site and Worker, with an explicit test API origin. It should prove offline launch, login restoration, grading and outbox replay, persistence across force quit and upgrade, deep links, back behavior, and one plugin call.

If the result meets Lymi's quality bar and keeps the bridge narrow, Capacitor is the lower-cost path. If navigation or authentication demands a substantial shell, build the same journey in Expo and compare it before deciding.

## Release implications

Compatible Worker and API changes can continue independently. Bundled web or native changes require new store binaries unless a separately evaluated compliant update mechanism applies. The Worker must remain compatible with installed versions and eventually expose an update-required contract that cannot discard queued reviews.

## Open questions and decision evidence

- Is native navigation part of the first desired experience or only possible future polish?
- Which two or three native capabilities materially improve capture or daily review?
- Can mobile authentication use the existing session model safely, or should it use a dedicated token and deep-link flow?
- How much of the next twelve months' interface work is likely to become native?
- Does the Capacitor experiment feel better than the standalone PWA on a real device?
- If it does not, does the equivalent Expo shell justify its additional boundary and maintenance cost?

Proceed when phone use is demonstrably limited by PWA constraints and a local experiment shows that native integration improves the experience without weakening offline review, authentication, or learner ownership.

## Sources checked

- [Capacitor installation](https://capacitorjs.com/docs/getting-started)
- [Capacitor workflow](https://capacitorjs.com/docs/basics/workflow)
- [Capacitor live reload](https://capacitorjs.com/docs/guides/live-reload)
- [Expo DOM components](https://docs.expo.dev/guides/dom-components/)
- [Expo navigation](https://docs.expo.dev/develop/app-navigation/)
- [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
