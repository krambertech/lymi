---
status: accepted
date: 2026-10-11
---

# Phone updates use EAS; the API supports older releases

The phone app's JavaScript ships over the air with `expo-updates` and EAS Update, and a store build happens only when the app's native fingerprint changes. The Worker stays compatible with every phone release that is still supported: each release freezes the API it was built against, every pull request checks the Worker against each frozen release, and a release below the minimum version is told to update. Unit, route, contract and client-integration tests on Linux are the gates; one Maestro journey on a Simulator is a smoke test before a release.

## Context

The Worker deploys on every merge. An installed binary does not change until the learner updates it, and it can lag the web by weeks ([ADR 0029](0029-the-phone-app-is-expo-react-native-sharing-core.md)). Features ship on the web first and reach the phone later ([ADR 0030](0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md)), so the Worker regularly sends values an installed app has never seen. The shared packages keep code that is built together in step, and typechecking the current source cannot verify an installed binary. The repository is public, so GitHub's standard Mac runners cost nothing.

## Considered options

- **Over the air with EAS Update, store builds when the fingerprint changes:** accepted. A fix reaches phones in minutes, rollouts and rollback are one command, and the free tier covers 1,000 monthly users and 15 iOS builds.
- **A store build every week:** rejected. Every change waits for Apple's review, and a bad release stays on phones for days.
- **A self-hosted update server on a Worker:** deferred. It removes the Expo account and adds free code signing, but requires two to four days of setup and ongoing maintenance of the update service.
- **Frozen contracts checked on every pull request:** accepted. They share the Zod schemas the Worker already publishes as `/api/openapi.json`, so they need no second source of truth.
- **Pact or versioned API paths:** rejected. Both suit many teams and many clients, and add a broker or a second API to keep.
- **Maestro as a smoke test before a release:** accepted. It drives the shipped Release build through its interface, and supports React Native 0.86 and iOS 26.
- **Detox:** rejected. It supports React Native up to 0.84, and its Expo plugin targets SDK 53.
- **The device journey on every pull request:** rejected. It costs eight minutes on a cached build and 27 on a cold one, while the Linux layers catch what an installed app depends on in seconds.
- **Sentry for crashes:** deferred. It reports crash-free users per release, but PostHog already holds Lymi's analytics and exceptions under one set of privacy rules.

## Consequences

- `runtimeVersion` uses the `fingerprint` policy, so an update can never call native code its binary lacks.
- Two build profiles share one bundle identifier. `beta` reads the `beta` channel and goes to TestFlight. Every green merge to `main` reaches it as an update; a new `beta` binary is built only when someone runs Phone beta by hand, so merges never spend the build allowance.

- `production` reads the `production` channel and goes to the App Store. Promote, a manual workflow, republishes the tested update to `production` at 10% and builds and uploads a `production` binary when the fingerprint changed. A native change costs two EAS builds, so the free 15 a month allow about seven native changes.

- Android follows the same path with its own fingerprint and update groups: `beta` goes to Play's internal testing track and `production` to its closed testing track, from which a person promotes it to production.
- Promote freezes the Worker's contract into `apps/mobile/contract/`. A frozen release leaves that folder only when the minimum version passes it.
- The app sends `x-lymi-client` with its platform, version, build and update. Below the minimum version the Worker answers 426, and the app shows Update Lymi. Both must ship in the first TestFlight build, because a binary without them can never be told to update.
- `version` names the JavaScript release, which an update can carry without a new binary, so the native fingerprint leaves it out. A fresh install or a roll back to embedded runs the App Store binary's own version first, so the minimum version never passes the version embedded in the current App Store binary; otherwise new installs would receive 426 with no newer binary available in the store.
- A response may gain fields. A response field may gain an enum value or a union branch only where its schema carries `x-lymi-open`, which promises that the app shows an unknown value safely. A feature the phone cannot show yet is left out of that client's responses on the Worker.
- Removing a field takes four steps in order: deprecate it, raise the minimum version, delete the frozen releases that used it, then remove it.
- The phone reports `app_opened` and JavaScript exceptions to PostHog with the web's settings in `@lymi/core/telemetry`: memory persistence, no person profiles, no autocapture or replay, and scrubbed exception messages. Unlike the web, it uploads source maps for every build and update, because Hermes stack traces are unreadable without them. Product actions already reach PostHog from the Worker, tagged with the client. Native crashes come from App Store Connect and Xcode Organizer.
- Shipping needs a free Expo account for EAS Update, credentials, Build and Submit.

[Testing the phone app](../testing.md#the-phone-app) has what runs when.
