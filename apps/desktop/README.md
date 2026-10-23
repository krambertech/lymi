# Lymi for Mac

An Electron shell around the product: its window loads `my.lymi.app`, and it adds a lantern in the menu bar with the due count and a quick-add panel on ⌃⌥L. The panel is the product's `/desktop/add` page on the system's own material. The shape and what comes next are in [the proposal](../../docs/proposals/mac-desktop-app.md).

This is a spike: no packaging, signing or updates yet. Sign-in goes through the system browser: the proposal's Sign-in section has the flow.

## Run it against local dev

Start the product on a free port, with `PRODUCT_URL` in `apps/web/.dev.vars` naming that port, then:

```bash
pnpm --filter @lymi/desktop dev
```

`LYMI_URL` points the shell at the product (default `https://my.lymi.app`). On a loopback URL, `LYMI_DEV_PERSONA=learner` signs the shell in as that persona, as `/api/dev/sign-in` does in a browser:

```bash
LYMI_URL=http://localhost:5263 LYMI_DEV_PERSONA=learner pnpm --filter @lymi/desktop dev
```

`pnpm install` skips Electron's binary download, so `dev` fetches it first. The menu bar icon is `assets/tray.svg`; `pnpm --filter @lymi/desktop tray-icon` renders its template PNGs (needs `rsvg-convert`). The app icon is `assets/icon.svg`, the product's icon on Apple's rounded-square grid; `pnpm --filter @lymi/desktop app-icon` renders `icon.png`, which the Dock shows in development, and `icon.icns` for packaging. Unpackaged, the menu bar's first menu still reads Electron, because macOS takes it from Electron's own bundle; a packaged Lymi.app fixes that.

Without a persona the app starts signed out, and **Sign in…** in the tray menu opens `/desktop/sign-in` in the default browser. Unpackaged, macOS registers the generic Electron.app for `app.lymi.desktop` links, so the browser's hand-back reaches the running copy. A dev profile lives in `~/Library/Application Support/Lymi`; delete its `Partitions/lymi` to start signed out again.

## Drive it from a script

On a loopback URL, `SIGUSR2` to the Electron process opens the panel and prints its window id and the tray's title, or, signed out, starts a sign-in and prints its URL. `LYMI_DEV_BROWSER=off` keeps that URL out of the default browser, so a script can open it in its own, sign in with `/api/dev/sign-in?as=learner&returnTo=…`, press **Open Lymi for Mac**, and pass the hand-back link to `open`. Write a menu command such as `today` or `settings`, or `open`, to `dev-command` in the profile before the signal, and the app runs it as if chosen from the menu bar. Start Electron with `--remote-debugging-port=9333` and Playwright's `chromium.connectOverCDP` reaches the panel's page to type and press Enter.
