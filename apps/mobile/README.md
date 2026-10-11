# Lymi for iOS (proof of concept)

An Expo app that shows the phone's design language and stack. It signs in to a real Lymi account and still runs Today, Review and Library on demo data held on the device; [the proposal](../../docs/proposals/native-mobile-app.md) has what is decided and what is not.

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

The proof of concept compared options side by side and kept one of each: the glass pill (opaque before iOS 26), the title in the top bar, the lit room on Today, Onest everywhere and plate grades. [The proposal](../../docs/proposals/native-mobile-app.md#design-language) records them.

## What is shared with the web

- `@lymi/core` unchanged: the review uses its FSRS `schedule` and the draw's `RETURN_GAPS`.
- `@lymi/client`: screens read hooks in `src/data/queries.ts` under the web's query keys, returning the API's response types. `src/data/demo-server.ts` answers them until the phone signs in, and `src/data/client.ts` configures the client for `my.lymi.app`.
- `@lymi/design`: colours, radii, the lantern's drawing, the flame's and the seven lights' rules, and motion presets. `src/global.css` imports its Uniwind theme; the phone keeps its own type ramp there under the shared step names, because iOS reads at 17 pt. `src/theme/motion.ts` converts the shared springs and curves for Reanimated.
- Lucide icons, rendered by `lucide-react-native`.

## Widgets

`src/widgets` holds two Home Screen widgets, **Lantern** (small and medium) and **Week** (medium), and a Lock Screen widget, written with `expo-widgets` and `@expo/ui`. Widget layouts are compiled into the native build, so a change to one needs `npx expo run:ios` again. The app pushes today's numbers and the rooms' colours to them through the shared app group whenever they change. On the Simulator, touch and hold the Home Screen, choose **Edit**, then **Add Widget**, and search for Lymi.
