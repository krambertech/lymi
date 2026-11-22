# Lymi for Mac

An Electron shell around the product: its window loads `my.lymi.app`, and it adds a lantern in the menu bar with the due count and a quick-add panel on ⌃⌥L. The panel is the product's `/desktop/add` page, drawn as Lymi's plate in an opaque window that macOS rounds and shadows. The shape and what comes next are in [the proposal](../../docs/proposals/mac-desktop-app.md).

Windows and native menus follow the learner's theme. The page reports it over the bridge, the app saves it in `preferences.json` and sets `nativeTheme.themeSource`, and each window fills with the theme's `canvas` or `plate` wherever its page has not painted. Those colours are in `src/colours.gen.ts`, generated from the tokens, because the packaged app carries no workspace package.

Sign-in goes through the system browser: the proposal's Sign-in section has the flow. Each merge that changes this folder releases the app; see Releases below.

## Decisions in the code

The source carries no comments, so the reasons behind its less obvious choices live here, grouped by the module that holds them.

**Windows and trust (`main.ts`, `origin.ts`, `preload.cts`).** Origin equality with the product is the only trust boundary: a page, a redirect or an IPC caller is the product's or nothing, and every other link opens in the browser. Google and Apple sign-in pages open in the system browser too, because Google refuses sign-in inside an app's window and the browser holds the passkeys. Only a loopback product origin turns on personas, `SIGUSR2` and dev commands. The preload is the page's only reach into the app, as `window.lymiDesktop`; a sandboxed preload loads no other file, so it imports types from `packages/client/src/desktop.ts` only. An installed app updates long after the web, so that contract only grows: a method is never renamed or removed, and a new one goes in an `AddedInVersionN` interface, which makes it optional and called with `?.()`. `desktop.test.ts` beside it holds the first app and fails to compile otherwise. It holds a message that arrives before the page listens, such as a menu command that opened the window, and delivers it once. IPC handlers are one map keyed by that contract, so a missing handler fails to compile.

**The main window.** The page draws a 40 px title bar and the traffic lights sit centred in it, at (20, 13). A window closed while This Mac recorded a shortcut registers the shortcut again, because the page never said recording stopped. After a sign-in, a sign-in page that is still loading is left alone: its own redirect after an email sign-in is already under way. Closing every window does not quit Lymi. It lives in the menu bar alone while no window is open, and in the Dock whenever a window is open or the lantern is hidden, so it can always be reached. Menu bar and tray commands go to the product's page, which owns what each does; the Edit menu is also what makes ⌘C and ⌘V work in the page's text fields.

**The quick-add panel (`main.ts`, `selection.ts`, `term.ts`).** The panel opens like Spotlight, centred on the screen under the pointer, a fifth of the way down. Its window is opaque so text renders as crisply as in any app, and its background follows the plate colour the page sends, so it matches the learner's theme rather than the system's. A panel that failed to load, for example at login before the network is up, reloads on the next press, and a crashed one is recreated. After a sign-in change a visible panel reloads on its next press, never under the learner's typing. The selection is copied before the panel shows, while the app in front still has it, and a second press during the copy is ignored so two copies never trade the clipboard. The copy presses ⌘C through Core Graphics, which needs only Accessibility, where System Events would also need Automation. Clipboard item types resolve lazily, so each is read before the clipboard is cleared, and the clipboard is put back with every item in every type. A selection with a line break is not a term. Lymi asks macOS for Accessibility only from This Mac's button, never from the shortcut, and while This Mac records a new shortcut the current one is unregistered.

**Sign-in (`auth-state.ts`, `callback.ts`, `hand-back.ts`, `sign-in.ts`).** The `app.lymi.desktop` scheme must match `DESKTOP_APP_SCHEME` in `apps/web/src/shared/origins.ts` and the protocol in `forge.config.js`. The callback parser reads both `scheme:/auth/callback`, which the page sends, and `scheme://auth/callback`, which the browser hands macOS. Better Auth prefixes its cookie name, so the session cookie is matched by its `session_token` suffix; its daily refresh rewrites the cookie in place, an overwrite then an insert, which is neither a sign-in nor a sign-out. Max-Age wins over Expires, as in a browser, and a cookie with neither ends when the app quits. The token exchange uses Node's fetch, as Better Auth's own Electron client does, sends `Lymi for Mac/<version>` as its user agent so the learner's session list names the app, copies the cookies it receives into the windows' session, and words its errors so they carry nothing from the link. The PKCE verifier is kept until the exchange succeeds, so "Open Lymi for Mac again" can finish a sign-in that failed. A hand-back counts at once, because the cookie's own change event can land after the window opens; a link waits for the first cookie read, because a link can launch Lymi and an existing session decides whether a failure is reported. A failed link is reported once however many arrive, and not at all to a learner already signed in, since that page button sends a second link after the first worked. After the retry question the app checks again, because the browser tab can finish meanwhile. The retry dialog has no parent window and Lymi takes focus first, since the browser is in front and a menu-bar-only Lymi has nothing to raise. A cookie the server refuses with 401 still sizes the window as signed in while the tray offers Sign in; only a 2xx confirms a session, so a 5xx during a deploy keeps what was known. A new cookie over a refused one is signing in again. The first due count waits for the cookie read, so a 401 at launch is not lost to it. The promise for that read resolves even when start fails, so nothing waits on it for good.

**Start and settings (`main.ts`, `settings.ts`).** Unpackaged, the app sets its name to Lymi, which a packaged build takes from its bundle. A packaged Lymi outside Applications offers once per launch to move itself, because only there does it update itself and keep the sign-in link pointing at it; moving quits and relaunches, and a cancelled password prompt is ignored. `nativeTheme.themeSource` also drives the page's `prefers-color-scheme` and native menus and dialogs. Preferences live on the Mac, not the account, so each Mac keeps its own, and they hold the theme so a window opens in it before any page loads. They are parsed field by field, so a damaged or older file still starts the app. Hiding the menu bar lantern keeps the Dock icon. A global shortcut must hold ⌘ or ⌃ and one key, because ⌥ alone types accents; `acceleratorFrom` in `apps/web/src/client/lib/desktop.ts` records with the same rule.

**Updates (`updates.ts`, `update-state.ts`).** Updates download in the background without asking and Squirrel installs them at the next quit; once one is ready, the tray and This Mac offer to restart sooner. The error listener is attached before `setFeedURL`, which can fail at once when the app's signature cannot be read. A failed check, offline or with the feed briefly missing during a release, waits for the next hourly check, and leaves the state unknown so This Mac stops saying it is downloading. Checks stop once an update is ready, because on macOS every check downloads it again, and a ready update stays ready whatever a later check says.

**Packaging (`forge.config.js`, `scripts/`).** `forge.config.js` imports `DOWNLOADS` from `dist`, so `package` and `make` run `pnpm build` first. `LYMI_SIGN=1` is set only in the release job, which holds the Developer ID certificate and the notary key; an empty `osxSign` signs with the keychain's Developer ID Application identity and the hardened runtime notarization needs, and every other build is signed ad hoc because Apple silicon runs nothing unsigned. The bundle skips pruning and holds only `package.json`, `dist` and `assets`, since the app loads no npm package at run time. The DMG uses dmgbuild, which lays out the window without driving Finder, because Forge's DMG maker needs native modules pnpm does not build. Its background is drawn for a 640 by 400 point window with the icons centred at (180, 214) and (460, 214), which must match `scripts/dmg.py`: the light room with the lantern lit, its light pooling around Lymi's icon and the arrow brightening toward Applications. The renderer opens its page from a file, because a page set from a string may not load the tokens and font from disk, and writes both scales into one TIFF so Finder draws the sharp one on a Retina screen. The launch check needs no shortcut press, because the panel loads hidden at start. It waits up to 180 seconds, because the Intel build's first start under Rosetta took about a minute on CI, passes `--use-mock-keychain` so an unsigned copy does not claim the installed app's "Lymi Safe Storage", and sends SIGKILL 5 seconds after SIGTERM, because a Lymi stuck on a modal ignores SIGTERM and once held a release for an hour. The unit tests run in Node and cover only modules that import nothing from Electron.

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

Without a persona the app starts signed out, and its window is the 440 by 720 sign-in window; Apple and Google there, and the panel's sign-in, open `/desktop/sign-in` in the default browser. Unpackaged, macOS registers the generic Electron.app for `app.lymi.desktop` links, so the browser's hand-back reaches the running copy. A sign-in started before a restart cannot finish after it, because the PKCE verifier lives in memory; start it again. A dev profile lives in `~/Library/Application Support/Lymi`; delete its `Partitions/lymi` to start signed out again.

## Drive it from a script

On a loopback URL, `SIGUSR2` to the Electron process opens the panel and prints its window id and the tray's title, or, signed out, starts a sign-in and prints its URL. `LYMI_DEV_BROWSER=off` keeps that URL out of the default browser, so a script can open it in its own, sign in with `/api/dev/sign-in?as=learner&returnTo=…`, press **Open Lymi for Mac**, and pass the hand-back link to `open`. Write a menu command such as `today` or `settings`, or `open`, to `dev-command` in the profile before the signal, and the app runs it as if chosen from the menu bar. Start Electron with `--remote-debugging-port=9333` and Playwright's `chromium.connectOverCDP` reaches the panel's page to type and press Enter.

## Package it

```bash
pnpm --filter @lymi/desktop package
pnpm --filter @lymi/desktop launch-check "$PWD/apps/desktop/out/Lymi-darwin-arm64/Lymi.app"
```

`package` builds an unsigned `Lymi.app` for this Mac's chip in `out/`, signed ad hoc so Apple silicon runs it. `make` also needs [dmgbuild](https://pypi.org/project/dmgbuild/) on the `PATH` or named by `DMGBUILD`, as CI installs it: `python3 -m venv ~/.dmgbuild && ~/.dmgbuild/bin/pip install dmgbuild==1.6.7`. Its settings are `scripts/dmg.py`; the window's background, `assets/dmg-background.tiff`, is rendered from Lymi's tokens by `pnpm --filter @lymi/desktop dmg-background` (needs Playwright's Chromium). `launch-check` starts it with its own temporary profile, beside any other copy, and passes once a product page has the bridge. `make --arch=arm64,x64` also writes the update zips, their `RELEASES.json` feeds and a DMG for each chip in `out/make`. Electron Forge refuses pnpm without an explicit hoist pattern, so `pnpm-workspace.yaml` spells out pnpm's default.

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
