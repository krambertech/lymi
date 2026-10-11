# Lymi for iOS (proof of concept)

An Expo app that shows the phone's design language and stack. It runs on demo data held on the device and does not sign in; [the proposal](../../docs/proposals/native-mobile-app.md) has what is decided and what is not.

## Run it

You need Xcode 26.4 or later and an iOS 26 Simulator runtime (`xcodebuild -downloadPlatform iOS`). No Expo account is needed.

```bash
pnpm install
cd apps/mobile
LANG=en_US.UTF-8 npx expo run:ios
```

The first build takes several minutes; after that `npx expo start --dev-client` reloads JavaScript in place. CocoaPods fails with an encoding error unless `LANG` is UTF-8. A change to `app.json`, a config plugin or a native module needs `npx expo prebuild --clean` and a new build.

## Design choices

The proof of concept compared options side by side and kept one of each: the glass pill (opaque before iOS 26), the title in the top bar, the lit room on Today, Onest everywhere and plate grades. [The proposal](../../docs/proposals/native-mobile-app.md#design-language) records them.

## What is shared with the web

- `@lymi/core` unchanged: the review uses its FSRS `schedule` and the draw's `RETURN_GAPS`.
- Colours, radii and type step names: `pnpm tokens` writes `src/theme.gen.css` and `src/theme/tokens.gen.ts` from `apps/web/src/client/styles.css`. The phone keeps its own type ramp in `src/global.css`, because iOS reads at 17 pt.
- The lantern's drawing and flame sizes, copied into `src/brand/geometry.ts` until they move to a shared package.
- Lucide icons, rendered by `lucide-react-native`.

## Widgets

`src/widgets` holds two Home Screen widgets, **Lantern** (small and medium) and **Week** (medium), and a Lock Screen widget, written with `expo-widgets` and `@expo/ui`. Widget layouts are compiled into the native build, so a change to one needs `npx expo run:ios` again. The app pushes today's numbers to them through the shared app group whenever they change. On the Simulator, touch and hold the Home Screen, choose **Edit**, then **Add Widget**, and search for Lymi.
