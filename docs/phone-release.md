# Releasing the phone app

The phone's JavaScript ships over the air with `expo-updates` and EAS Update, and a store build happens only when its native fingerprint has none ([ADR 0032](adr/0032-the-phone-ships-over-the-air-and-the-api-keeps-every-supported-release-working.md)). Four GitHub workflows run it, and each skips with a notice until the setup below is done, so CI stays green without an Expo account.

## How a change reaches phones

The runtime version is the iOS fingerprint (`runtimeVersion.policy: fingerprint` in `apps/mobile/app.json`), so an update is only offered to binaries with the same native code. `node scripts/phone-release.mjs runtime` prints it. `app.json` lists its `platforms` because Expo otherwise detects web from whether `react-dom` is hoisted, which made the fingerprint differ between a pnpm script and a plain `node` call. `apps/mobile/fingerprint.config.js` leaves `version` out of the fingerprint, so an update can carry a new release version without a new binary.

An installed app checks for an update on every launch without waiting for it, so an update downloads on one launch and runs from the next. Until an update arrives, or when one cannot load, the app runs the bundle inside the binary. The `x-lymi-client` header names the running update, which the Worker adds to the phone's server outcomes as `app_update`.

| Workflow | When | What it does |
| --- | --- | --- |
| Phone beta | Each green CI run on `main`, or by hand | When the phone or a shared package changed since the last beta update, publishes an update to the `beta` branch, and starts a `beta` build that goes to TestFlight when no build has this runtime yet. The build carries no What to Test notes, which EAS Submit accepts only on the Enterprise plan. |
| Phone promote | By hand, once a week | Runs the Phone smoke journey on the commit behind the latest beta update and freezes that commit's API contract, and stops if either fails or the contract is not on `main` yet. Then checks that beta still has that update and no production rollout is running, republishes it to `production` for 10% of installs, and starts a `production` build uploaded to App Store Connect when no build has this runtime yet. |
| Phone rollout | Every six hours, or by hand | Widens a `production` rollout that is at least a day old to every install. |
| Phone rollback | By hand | Reverts the newest update on `production` or `beta`: a partial rollout is reverted, otherwise the previous update on the same runtime is republished, or the binary's own bundle when there is none. A group ID input republishes that update instead. |

The first run of any of them creates the `beta` and `production` channels and their branches when the project lacks them. Promote, rollout and production rollback share one `phone-production` lock, so they never change production at the same time.

Each release version keeps its frozen contract in `apps/mobile/contract/<version>.json` until the minimum version passes it. Promote fails before publishing when the commit calls an API that differs from the contract already frozen for its version; raise `expo.version` in `app.json`, merge it, let Phone beta publish it, then promote. A version with no contract on `main` publishes nothing: Promote opens a pull request with its contract; merge it once CI has checked the Worker against it, and the next Promote goes ahead.

Every EAS call goes through `scripts/phone-release.mjs`. `node scripts/phone-release.mjs manifest` installs the pinned `eas-cli`, runs a sample of every call through that CLI's own parser, values included, and records its command list and the accepted calls in `scripts/eas-cli-commands.json`. The tests fail when a call differs from what the parser accepted, so run it after changing a call or the pin.

`beta` builds read the `beta` channel and `production` builds the `production` channel, with one bundle identifier ([`apps/mobile/eas.json`](../apps/mobile/eas.json)). EAS owns the build number. A native change costs two of the free tier's 15 iOS builds a month, one for TestFlight and one at Promote. Submitting a version for App Store review stays a person's step in App Store Connect.

Each update's Hermes source maps go to PostHog's error tracking from Phone beta, and Promote republishes the same files. Metro writes a chunk ID into every bundle (`getPostHogExpoConfig` in `apps/mobile/metro.config.js`), which is how PostHog finds the map for a frame. On EAS iOS Release builds, `with-source-maps.cjs` wraps the app's bundle phase with PostHog's Expo tooling, which preserves the Metro map, clones its chunk ID into the composed Hermes map and uploads it after bundling; a missing key or failed upload fails the build. The EAS pre-install hook installs the pinned CLI. Local and Debug builds run the original bundle phase without uploading; the gate runs at build time so the native fingerprint stays the same on every machine. [PostHog's React Native guide](https://posthog.com/docs/error-tracking/upload-source-maps/react-native) describes both upload paths.

The Simulator smoke journey turns updates off in its build, so it always tests the bundle it embedded.

Both upload paths use PostHog's `event` release mode: maps are matched by chunk ID, while an exception's `$app_namespace`, `$app_version` and `$app_build` name its release. Republishing an OTA or building another binary does not bind its shared maps to the first binary's build number; `app_update` names the bundle that actually ran.

## Setting it up

Do these once, in order. Steps 1 to 3 change `app.json` or `eas.json`, which are part of the fingerprint, so finish them before the first build. The bundle identifier is `app.lymi`; it cannot change after the first upload.

1. **Create a free Expo account** at expo.dev. Then, in `apps/mobile`, run `npx eas-cli@24.13.0 login` and `npx eas-cli@24.13.0 init --force --non-interactive` to create the project. `init` rewrites `app.json` with the config the plugins resolve, so restore the file and add only `owner`, `extra.eas.projectId`, and `updates.url` as `https://u.expo.dev/<projectId>`, which is what `update:configure` would add. Commit `app.json`.
2. **Enrol in the Apple Developer Program** (#507) and create the app in App Store Connect with the bundle identifier `app.lymi`.
3. **Give EAS the Apple credentials.** Run `npx eas-cli@24.13.0 credentials --platform ios` in `apps/mobile` and sign in to Apple when asked. Let it create the distribution certificate and the provisioning profiles for the app and its widget extension, and add an App Store Connect API key for EAS Submit. Then add the app's numeric Apple ID as `ascAppId` to both `submit` profiles in `eas.json`, and the Apple Team ID as `ios.appleTeamId` in `app.json`, which `@bacons/apple-targets` needs to sign the extensions. Commit both.
4. **Add the repository secrets** under Settings, Secrets and variables, Actions:
   - `EXPO_TOKEN`: an access token from expo.dev, Account settings, Access tokens. A robot user with the Developer role on the project is safer than a personal token.
   - `POSTHOG_CLI_API_KEY`: a PostHog personal API key scoped to project 292417 with `error tracking write` and `organization read`. Without it, OTA updates still ship and the workflow warns that their errors stay unreadable; acceptance requires a successful upload, not a green workflow.
   - `RELEASE_GITHUB_TOKEN`: a fine-grained token for this repository with read and write access to contents and pull requests, so Promote's contract pull request runs CI. Without the token, Promote stops on a new version and attaches its frozen contract to the run for a person to commit.
5. **Run Phone beta by hand** from the Actions tab. It publishes the first beta update and starts the first build, which reaches TestFlight once Apple has processed it.

Add the same `POSTHOG_CLI_API_KEY` as a secret in both EAS environments, `preview` for beta and `production` for the App Store. GitHub repository secrets do not reach the remote EAS builder. `eas.json` supplies the EU host and project ID, and the app reaches `https://my.lymi.app` by default. Never use an `EXPO_PUBLIC_` name for the upload key or put it in `app.json`.

## Checking a release

`npx eas-cli@24.13.0 update:list --branch beta` lists the updates with their runtimes, one runtime per fingerprint. A TestFlight install picks up a beta update on its second launch after publishing. After a native change, `eas build:list --platform ios` shows a new build with a new runtime, and older binaries keep getting only updates for their own runtime.

For Error Tracking acceptance, test both bundles on a real TestFlight install under an account in `INTERNAL_ACCOUNT_IDS`. The explicit link `lymi:///you?verify_phone_errors=source-maps` captures one handled exception per launch from `verifyReleaseException` in `apps/mobile/src/telemetry/posthog.ts` and flushes it; ordinary accounts, production-channel binaries and development/local builds cannot run it. The error message is scrubbed like every other exception, and the probe adds no usage event or private content.

1. Install a fresh beta binary, launch it without a network connection so no OTA can download, then restore connectivity without relaunching and open the link. Record the event in [Lymi Error Tracking](https://eu.posthog.com/project/292417/error-tracking), including an application frame's real source file and line, its chunk ID, `$app_version`, `$app_build` and `app_update`. An embedded bundle can have an Expo-generated update ID; a missing ID is recorded as null, never guessed from the newest published update.
2. Let the beta update download, relaunch to run it, and open the link again. Read back the new exception and confirm its `app_update` is the running OTA's ID, its frame resolves to the source file and line, and its version/build match that bundle and binary. The frame's chunk ID must match a symbol set with an uploaded file and no failure; a `last_used` timestamp alone does not prove resolution.
3. Open the same link in a development build against production and a release build against a local Worker; neither should emit an exception. Keep the device/build/update identifiers, event links and resolved frame evidence with the release check. Unit tests of the gates and successful EAS jobs do not establish TestFlight acceptance.

## Sign in with Apple

Enable Sign in with Apple on the `app.lymi` App ID as a primary App ID. Register the Services ID `app.lymi.web`, associate it with that primary App ID, and configure domain `my.lymi.app` with return URL `https://my.lymi.app/api/auth/callback/apple`. Apple requires HTTPS and does not accept localhost return URLs.

Register `notifications@lymi.app` as an email source in Sign in with Apple for Email Communication, with SPF or DKIM passing, so account emails reach learners who choose Hide My Email.

Create a Sign in with Apple key for that primary App ID and keep the downloaded `.p8` outside Git. Set the product Worker’s `APPLE_APP_BUNDLE_IDENTIFIER=app.lymi`, `APPLE_CLIENT_ID=app.lymi.web`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` as encrypted secrets. The private key is the full PKCS #8 PEM. Keep these secrets out of previews, logs, and pull requests. The Worker signs its own short-lived client secrets, so no static JWT needs periodic replacement.

The native module and `ios.usesAppleSignIn` entitlement require a new signed binary; an over-the-air update cannot add them. Rebuild provisioning profiles with the capability, then verify a fresh sign-in, Hide My Email, cancellation, repeat sign-in after relaunch, and account deletion on a physical iPhone. The Simulator does not prove Apple account authentication or grant revocation. On the web, verify the HTTPS callback, the original return destination, and sign-in to the same account used by the phone.
