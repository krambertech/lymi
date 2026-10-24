# Lymi for Mac

An Electron shell around the product: its window loads `my.lymi.app`, and it adds a lantern in the menu bar with the due count and a quick-add panel on ⌃⌥L. The panel is the product's `/desktop/add` page, drawn as Lymi's plate in an opaque window that macOS rounds and shadows. The shape and what comes next are in [the proposal](../../docs/proposals/mac-desktop-app.md).

Sign-in goes through the system browser: the proposal's Sign-in section has the flow. Each merge that changes this folder releases the app; see Releases below.

## Run it against local dev

Start the product on a free port, with `PRODUCT_URL` in `apps/web/.dev.vars` naming that port, then:

```bash
pnpm --filter @lymi/desktop dev
```

`LYMI_URL` points the shell at the product (default `https://my.lymi.app`). On a loopback URL, `LYMI_DEV_PERSONA=learner` signs the shell in as that persona, as `/api/dev/sign-in` does in a browser:

```bash
LYMI_URL=http://localhost:5263 LYMI_DEV_PERSONA=learner pnpm --filter @lymi/desktop dev
```

`pnpm install` skips Electron's binary download, so `dev` fetches it first. `pnpm --filter @lymi/desktop test` runs the unit tests for the app's own rules. The menu bar icon is `assets/tray.svg`, the lantern mark; `pnpm --filter @lymi/desktop tray-icon` renders its template PNGs (needs `rsvg-convert`). The app icon is `assets/icon.svg`, the product's icon on Apple's rounded-square grid; `pnpm --filter @lymi/desktop app-icon` renders `icon.png`, which the Dock shows in development, and `icon.icns` for packaging. Unpackaged, the menu bar's first menu still reads Electron, because macOS takes it from Electron's own bundle; a packaged Lymi.app fixes that.

Without a persona the app starts signed out, and **Sign in…** in the tray menu opens `/desktop/sign-in` in the default browser. Unpackaged, macOS registers the generic Electron.app for `app.lymi.desktop` links, so the browser's hand-back reaches the running copy. A sign-in started before a restart cannot finish after it, because the PKCE verifier lives in memory; start it again. A dev profile lives in `~/Library/Application Support/Lymi`; delete its `Partitions/lymi` to start signed out again.

## Drive it from a script

On a loopback URL, `SIGUSR2` to the Electron process opens the panel and prints its window id and the tray's title, or, signed out, starts a sign-in and prints its URL. `LYMI_DEV_BROWSER=off` keeps that URL out of the default browser, so a script can open it in its own, sign in with `/api/dev/sign-in?as=learner&returnTo=…`, press **Open Lymi for Mac**, and pass the hand-back link to `open`. Write a menu command such as `today` or `settings`, or `open`, to `dev-command` in the profile before the signal, and the app runs it as if chosen from the menu bar. Start Electron with `--remote-debugging-port=9333` and Playwright's `chromium.connectOverCDP` reaches the panel's page to type and press Enter.

## Package it

```bash
pnpm --filter @lymi/desktop package
pnpm --filter @lymi/desktop launch-check "$PWD/apps/desktop/out/Lymi-darwin-arm64/Lymi.app"
```

`package` builds an unsigned `Lymi.app` for this Mac's chip in `out/`, signed ad hoc so Apple silicon runs it. `launch-check` starts it with its own temporary profile, beside any other copy, and passes once a product page has the bridge. `make --arch=arm64,x64` also writes the update zips, their `RELEASES.json` feeds and a DMG for each chip in `out/make`. Electron Forge refuses pnpm without an explicit hoist pattern, so `pnpm-workspace.yaml` spells out pnpm's default.

## Releases

The Desktop workflow (`.github/workflows/desktop.yml`) runs the launch check on a pull request that changes this folder, and releases on the merge to `main`: both chips built, the apps and DMGs signed and notarized, both apps launched, all four checked by Gatekeeper and uploaded to the `lymi-downloads` bucket behind `downloads.lymi.app`. Installed apps read `darwin/<arch>/RELEASES.json` at launch and hourly, download in the background and install on quit; the tray menu offers Restart to update meanwhile. The download button links to `darwin/arm64/Lymi.dmg`, and Intel's to `darwin/x64/Lymi.dmg`.

The release needs seven repository secrets, set once. Without them it skips with a notice.

1. **The Developer ID certificate**, which only the Apple account holder can make. In Xcode, Settings → Accounts → Manage Certificates → + → Developer ID Application. In Keychain Access, export it with its private key as a `.p12` with a password, then:

   ```bash
   base64 -i DeveloperID.p12 | gh secret set MAC_CERTIFICATE_P12
   ```

   ```bash
   gh secret set MAC_CERTIFICATE_PASSWORD
   ```

2. **The notary key.** In App Store Connect, Users and Access → Integrations → App Store Connect API → Team Keys → +, with Developer access. Download the `.p8`, then set the key, its ID and the issuer ID shown above the list:

   ```bash
   gh secret set APPLE_API_KEY < AuthKey_XXXXXXXXXX.p8
   ```

   ```bash
   gh secret set APPLE_API_KEY_ID
   ```

   ```bash
   gh secret set APPLE_API_ISSUER
   ```

3. **The upload credentials.** In Cloudflare, R2 → Manage API tokens → Create Account API token, with Object Read & Write on `lymi-downloads` only. Copy its S3 Access Key ID and Secret Access Key into these secrets:

   ```bash
   gh secret set CLOUDFLARE_R2_ACCESS_KEY_ID
   ```

   ```bash
   gh secret set CLOUDFLARE_R2_SECRET_ACCESS_KEY
   ```

Bucket-scoped Object Read & Write permissions work through [R2’s S3 API](https://developers.cloudflare.com/r2/api/tokens/), so the workflow uploads with the AWS CLI instead of Wrangler’s REST API.

Replace the signing certificate before it expires: the one made on 23 October 2026 ends on 1 February 2027, when Apple's Developer ID intermediate does. From 60 days before, each release run warns. Builds already shipped keep opening; only new releases need the new certificate.

The version is `1.0.` and the workflow's run number, so every release is newer than the one installed.
