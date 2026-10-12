# Releasing the phone app

The phone's JavaScript ships over the air with `expo-updates` and EAS Update, and a store build happens only when its native fingerprint has none ([ADR 0032](adr/0032-the-phone-ships-over-the-air-and-the-api-keeps-every-supported-release-working.md)). Four GitHub workflows run it, and each skips with a notice until the setup below is done, so CI stays green without an Expo account.

## How a change reaches phones

The runtime version is the iOS fingerprint (`runtimeVersion.policy: fingerprint` in `apps/mobile/app.json`), so an update is only offered to binaries with the same native code. `node scripts/phone-release.mjs runtime` prints it. `app.json` lists its `platforms` because Expo otherwise detects web from whether `react-dom` is hoisted, which made the fingerprint differ between a pnpm script and a plain `node` call. `apps/mobile/fingerprint.config.js` leaves `version` out of the fingerprint, so an update can carry a new release version without a new binary.

An installed app checks for an update on every launch without waiting for it, so an update downloads on one launch and runs from the next. Until an update arrives, or when one cannot load, the app runs the bundle inside the binary. The `x-lymi-client` header names the running update, which the Worker adds to the phone's server outcomes as `app_update`.

| Workflow | When | What it does |
| --- | --- | --- |
| Phone beta | Each green CI run on `main`, or by hand | When the phone or a shared package changed since the last beta update, publishes an update to the `beta` branch, and starts a `beta` build that goes to TestFlight when no build has this runtime yet. TestFlight's What to Test lists the merged pull request titles. |
| Phone promote | By hand, once a week | Runs the Phone smoke journey on the commit behind the latest beta update and freezes that commit's API contract, and stops if either fails or the contract is not on `main` yet. Then checks that beta still has that update and no production rollout is running, republishes it to `production` for 10% of installs, and starts a `production` build uploaded to App Store Connect when no build has this runtime yet. |
| Phone rollout | Every six hours, or by hand | Widens a `production` rollout that is at least a day old to every install. |
| Phone rollback | By hand | Reverts the newest update on `production` or `beta`: a partial rollout is reverted, otherwise the previous update on the same runtime is republished, or the binary's own bundle when there is none. A group ID input republishes that update instead. |

The first run of any of them creates the `beta` and `production` channels and their branches when the project lacks them. Promote, rollout and production rollback share one `phone-production` lock, so they never change production at the same time.

Each release version keeps its frozen contract in `apps/mobile/contract/<version>.json` until the minimum version passes it. Promote fails before publishing when the commit calls an API that differs from the contract already frozen for its version; raise `expo.version` in `app.json`, merge it, let Phone beta publish it, then promote. A version with no contract on `main` publishes nothing: Promote opens a pull request with its contract that merges itself once CI checks the Worker against it, and the next Promote goes ahead.

Every EAS call goes through `scripts/phone-release.mjs`. `node scripts/phone-release.mjs manifest` installs the pinned `eas-cli`, runs a sample of every call through that CLI's own parser, values included, and records its command list and the accepted calls in `scripts/eas-cli-commands.json`. The tests fail when a call differs from what the parser accepted, so run it after changing a call or the pin.

`beta` builds read the `beta` channel and `production` builds the `production` channel, with one bundle identifier ([`apps/mobile/eas.json`](../apps/mobile/eas.json)). EAS owns the build number. A native change costs two of the free tier's 15 iOS builds a month, one for TestFlight and one at Promote. Submitting a version for App Store review stays a person's step in App Store Connect.

Each update's Hermes source maps go to PostHog's error tracking from Phone beta, and Promote republishes the same files. Metro writes a chunk ID into every bundle (`getPostHogExpoConfig` in `apps/mobile/metro.config.js`), which is how PostHog finds the map for a frame. Source maps for the bundle inside a binary are not uploaded yet, so an error before a binary's first update stays unreadable.

The Simulator smoke journey turns updates off in its build, so it always tests the bundle it embedded.

## Setting it up

Do these once, in order. Steps 1 to 4 change `app.json` or `eas.json`, which are part of the fingerprint, so finish them before the first build.

1. **Choose the final bundle identifier.** Replace `app.lymi.poc` in `ios.bundleIdentifier` and `android.package` in `apps/mobile/app.json` and in the smoke journey's `appId`, for example with `app.lymi`. It cannot change after the first upload. The widgets' app group follows it, and Simulators sign out once.
2. **Create a free Expo account** at expo.dev. Then, in `apps/mobile`, run `npx eas-cli@24.13.0 login`, `npx eas-cli@24.13.0 init` to create the project and write `extra.eas.projectId` and `owner` into `app.json`, and `npx eas-cli@24.13.0 update:configure --platform ios` to add `updates.url`. It keeps the fingerprint runtime and the channels already set. Commit `app.json`.
3. **Enrol in the Apple Developer Program** (#507) and create the app in App Store Connect with that bundle identifier.
4. **Give EAS the Apple credentials.** Run `npx eas-cli@24.13.0 credentials --platform ios` in `apps/mobile` and sign in to Apple when asked. Let it create the distribution certificate and the provisioning profiles for the app and its widget extension, and add an App Store Connect API key for EAS Submit. Then add the app's numeric Apple ID as `ascAppId` to both `submit` profiles in `eas.json` and commit it.
5. **Add the repository secrets** under Settings, Secrets and variables, Actions:
   - `EXPO_TOKEN`: an access token from expo.dev, Account settings, Access tokens. A robot user with the Developer role on the project is safer than a personal token.
   - `POSTHOG_CLI_API_KEY`: a PostHog personal API key with error tracking write access to project 292417. Without it, updates still ship and the workflow warns that their errors stay unreadable.
   - `RELEASE_GITHUB_TOKEN`: a fine-grained token for this repository with read and write access to contents and pull requests, so Promote's contract pull request runs CI. Turn on Allow auto-merge in the repository settings too. Without the token, Promote stops on a new version and attaches its frozen contract to the run for a person to commit.
6. **Run Phone beta by hand** from the Actions tab. It publishes the first beta update and starts the first build, which reaches TestFlight once Apple has processed it.

The workflows need no EAS environment variables: `preview` serves beta and `production` serves the App Store, and the app reaches `https://my.lymi.app` by default.

## Checking a release

`npx eas-cli@24.13.0 update:list --branch beta` lists the updates with their runtimes, one runtime per fingerprint. A TestFlight install picks up a beta update on its second launch after publishing. After a native change, `eas build:list --platform ios` shows a new build with a new runtime, and older binaries keep getting only updates for their own runtime.
