import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AskApp, MenuCommand, ToApp, ToPage } from "@lymi/client/desktop";
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
  type Session,
  screen,
  session,
  shell,
  systemPreferences,
  Tray,
} from "electron";
import { SCHEME, sessionChange } from "./callback.js";
import { setAppMenu } from "./menu.js";
import {
  isLoopback,
  isProduct as isProductOf,
  leaving,
  productOrigin,
  productUrl as productUrlOf,
  signInProvider,
} from "./origin.js";
import { readPreferences, writePreferences } from "./preferences.js";
import { canCopySelection, selectedText } from "./selection.js";
import { DEFAULT_SHORTCUT, type Preferences, usableShortcut } from "./settings.js";
import { completeSignIn, requestSignIn } from "./sign-in.js";
import { restartToUpdate, watchForUpdates } from "./updates.js";

// A packaged build always talks to production; only a development run may point elsewhere.
const PRODUCT_URL = productOrigin(app.isPackaged, process.env.LYMI_URL);
const DEV = !app.isPackaged && isLoopback(PRODUCT_URL);
// A local persona instead of a sign-in, never against production. docs/local-dev.md.
const DEV_PERSONA = DEV ? process.env.LYMI_DEV_PERSONA : undefined;
const PANEL_WIDTH = 480;
// Signed out, the window is the size of the sign-in form; signed in, the size of the app.
const SIGN_IN_SIZE = { width: 440, height: 720 };
const APP_SIZE = { width: 1280, height: 840 };
// Pages a signed-out window shows; signing in moves the window on from them.
const SIGNED_OUT_PATHS = new Set(["/login", "/reset-password"]);
const DUE_EVERY_MS = 15 * 60_000;
const assets = join(app.getAppPath(), "assets");
const preload = join(app.getAppPath(), "dist", "preload.cjs");
// What the product asks the browser for; everything else is refused.
const PERMISSIONS = new Set(["clipboard-sanitized-write", "notifications", "fullscreen"]);

let ses: Session;
let tray: Tray | null = null;
let panel: BrowserWindow | null = null;
// Loads again on the next press: it failed to load, or the learner signed in or out meanwhile.
let panelStale = false;
let main: BrowserWindow | null = null;
let prefs: Preferences;
let due: number | null = null;
let signedIn = true;
// Whether the window session holds a session cookie, which decides the window's size.
let hasSession = false;
let sessionRead = () => {};
const sessionKnown = new Promise<void>((resolve) => {
  sessionRead = resolve;
});
let copying: Promise<void> | null = null;
let updateReady = false;

const isProduct = (url: string | undefined) => isProductOf(url, PRODUCT_URL);
const fromProduct = (event: IpcMainEvent | IpcMainInvokeEvent) => isProduct(event.senderFrame?.url);
const productUrl = (path: string) => productUrlOf(path, PRODUCT_URL);

function openExternal(url: string) {
  if (leaving(url, PRODUCT_URL) === "browser") void shell.openExternal(url);
}

/** Only the product loads inside Lymi's windows; every other link or redirect opens in the browser. */
function keepToProduct(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  const leave = (event: { preventDefault: () => void }, url: string) => {
    const where = leaving(url, PRODUCT_URL);
    if (where === "stay") return;
    event.preventDefault();
    if (where === "sign-in") void requestSignIn(PRODUCT_URL, signInProvider(url));
    else openExternal(url);
  };
  win.webContents.on("will-navigate", leave);
  win.webContents.on("will-redirect", leave);
}

const webPreferences = () => ({ session: ses, preload, sandbox: true, contextIsolation: true });

/**
 * Shows the main window, at `path` when one is asked for; an open window moves without reloading.
 * Signed out, it opens as the sign-in window.
 */
async function openMain(path?: string) {
  await sessionKnown;
  if (main && !main.isDestroyed()) {
    if (path) toPage(main, "app:navigate", path);
    main.show();
    main.focus();
    return;
  }
  const url = productUrl(hasSession ? (path ?? "/today") : "/login");
  if (!url) return;
  main = new BrowserWindow({
    ...(hasSession ? APP_SIZE : SIGN_IN_SIZE),
    minWidth: 380,
    // The page draws a 40 px title bar on every screen; the traffic lights sit centred in it.
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 20, y: 13 },
    show: false,
    webPreferences: webPreferences(),
  });
  fitMain(hasSession, false);
  keepToProduct(main);
  main.once("ready-to-show", () => main?.show());
  // Full screen hides the traffic lights, so the page shows its Lymi tile again.
  const fullScreen = () => toPage(main, "window:full-screen", !!main?.isFullScreen());
  main.on("enter-full-screen", fullScreen);
  main.on("leave-full-screen", fullScreen);
  main.webContents.on("did-finish-load", fullScreen);
  main.on("closed", () => {
    main = null;
    // Closed while This Mac recorded a shortcut, the page never said it stopped.
    if (!globalShortcut.isRegistered(prefs.shortcut)) registerShortcut(prefs.shortcut);
    placeApp();
  });
  placeApp();
  void main.loadURL(url);
}

/**
 * Sizes the main window for who is using it: a fixed sign-in window while signed out, the app's
 * own size once signed in, centred where the window already is.
 */
function fitMain(signedInNow: boolean, animate: boolean) {
  if (!main || main.isDestroyed()) return;
  if (!signedInNow && main.isFullScreen()) main.setFullScreen(false);
  main.setResizable(signedInNow);
  main.setMaximizable(signedInNow);
  main.setFullScreenable(signedInNow);
  const { workArea } = screen.getDisplayMatching(main.getBounds());
  const size = signedInNow ? APP_SIZE : SIGN_IN_SIZE;
  const width = Math.min(size.width, workArea.width);
  const height = Math.min(size.height, workArea.height);
  const now = main.getBounds();
  if (now.width === width && now.height === height) return;
  main.setBounds(
    {
      x: Math.round(workArea.x + (workArea.width - width) / 2),
      y: Math.round(workArea.y + (workArea.height - height) / 2),
      width,
      height,
    },
    animate,
  );
}

/**
 * Signing in or out, in a window or through the browser: the window changes size, and a window
 * still on the sign-in form goes on to where the learner was headed.
 */
function sessionChanged(now: boolean) {
  if (now === hasSession) return;
  hasSession = now;
  signedIn = now;
  renderTray();
  if (!main || main.isDestroyed()) return;
  fitMain(now, main.isVisible());
  if (!now) return;
  const current = URL.parse(main.webContents.getURL());
  // The page's own redirect after an email sign-in is already under way.
  if (!current || !SIGNED_OUT_PATHS.has(current.pathname) || main.webContents.isLoading()) return;
  const returnTo = current.searchParams.get("returnTo");
  const url = (returnTo && productUrl(returnTo)) || productUrl("/today");
  if (url) void main.loadURL(url);
}

function createPanel() {
  panel = new BrowserWindow({
    type: "panel",
    width: PANEL_WIDTH,
    height: 112,
    frame: false,
    // An opaque window, so text renders as crisply as in any app; macOS rounds and shadows it.
    roundedCorners: true,
    hasShadow: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: webPreferences(),
  });
  keepToProduct(panel);
  panel.on("blur", () => panel?.hide());
  // Opened at login before the network is up, or crashed: the next press loads it again.
  panelStale = false;
  panel.webContents.on("did-fail-load", (_event, _code, _description, _url, mainFrame) => {
    if (mainFrame) panelStale = true;
  });
  panel.webContents.on("render-process-gone", () => {
    panel?.destroy();
    panel = null;
  });
  const url = productUrl("/desktop/add");
  if (url) void panel.loadURL(url);
}

/** Like Spotlight: centred on the screen under the pointer, a fifth of the way down. */
async function showPanel() {
  if (!panel || panel.isDestroyed()) createPanel();
  if (!panel) return;
  if (panel.isVisible()) {
    panel.hide();
    return;
  }
  if (copying) return;
  if (panelStale) {
    panelStale = false;
    panel.webContents.reload();
  }
  let selection: string | null = null;
  // Copied before the panel shows, while the app the learner was reading still has the selection.
  // A second press while that runs is ignored, so two copies never trade the learner's clipboard.
  if (prefs.fillSelection && canCopySelection()) {
    copying = selectedText().then((text) => {
      selection = text;
    });
    await copying.finally(() => {
      copying = null;
    });
  }
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  panel.setPosition(
    Math.round(workArea.x + (workArea.width - PANEL_WIDTH) / 2),
    Math.round(workArea.y + workArea.height * 0.2),
  );
  panel.show();
  panel.focus();
  toPage(panel, "panel:shown", { selection });
}

async function refreshDue() {
  const url = productUrl("/api/decks");
  if (!url) return;
  try {
    const res = await ses.fetch(url, { credentials: "include" });
    signedIn = res.status !== 401;
    if (!res.ok) throw new Error(String(res.status));
    const decks = (await res.json()) as { due: number }[];
    due = decks.reduce((sum, d) => sum + d.due, 0);
  } catch {
    due = null;
  }
  renderTray();
}

/**
 * Where Lymi lives: in the menu bar alone while no window is open, or in the Dock whenever a
 * window is open or the learner hid the lantern, so it can always be reached.
 */
function placeApp() {
  if (process.platform !== "darwin") return;
  const windowOpen = !!main && !main.isDestroyed();
  app.setActivationPolicy(windowOpen || !prefs.showInMenuBar ? "regular" : "accessory");
  if (prefs.showInMenuBar && !tray) {
    const icon = nativeImage.createFromPath(join(assets, "trayTemplate.png"));
    icon.setTemplateImage(true);
    tray = new Tray(icon);
  } else if (!prefs.showInMenuBar && tray) {
    tray.destroy();
    tray = null;
  }
}

function renderTray() {
  if (!tray) return;
  tray.setTitle(prefs.showDue && due ? String(due) : "", { fontType: "monospacedDigit" });
  tray.setToolTip(due ? `Lymi · ${due} due` : "Lymi");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...(signedIn
        ? []
        : [{ label: "Sign in…", click: () => void openMain() }, { type: "separator" as const }]),
      { label: "Add a card", accelerator: prefs.shortcut, click: () => void showPanel() },
      { label: "Review", click: () => runCommand("review") },
      { label: "Open Lymi", click: () => void openMain() },
      { type: "separator" },
      { label: "Settings…", click: () => runCommand("settings") },
      { type: "separator" },
      ...(updateReady ? [{ label: "Restart to update", click: restartToUpdate }] : []),
      { label: "Quit Lymi", role: "quit" },
    ]),
  );
}

/** A menu command goes to the product's page, which owns what each one does. */
function runCommand(command: MenuCommand) {
  if (main && !main.isDestroyed()) {
    main.show();
    main.focus();
    toPage(main, "menu:command", command);
    return;
  }
  // The preload holds it until the page listens.
  void openMain().then(() =>
    main?.webContents.once("did-finish-load", () => toPage(main, "menu:command", command)),
  );
}

function refreshMenus() {
  placeApp();
  renderTray();
  setAppMenu({ run: runCommand, quickAdd: () => void showPanel(), shortcut: prefs.shortcut });
}

function registerShortcut(accelerator: string) {
  try {
    return globalShortcut.register(accelerator, () => void showPanel());
  } catch {
    return false;
  }
}

/** Moves the quick-add shortcut, keeping the old one when another app already holds the new. */
function moveShortcut(next: string) {
  if (!usableShortcut(next)) return "invalid";
  globalShortcut.unregister(prefs.shortcut);
  if (!registerShortcut(next)) {
    registerShortcut(prefs.shortcut);
    return "taken";
  }
  prefs = { ...prefs, shortcut: next };
  return null;
}

const preferencesOut = () => ({
  ...prefs,
  openAtLogin: app.getLoginItemSettings().openAtLogin,
  accessibility: systemPreferences.isTrustedAccessibilityClient(false),
  version: app.getVersion(),
});

/** What the page sends: the contract's shape, but untrusted, so every value is checked here. */
type Untrusted<T extends unknown[]> = { [I in keyof T]: unknown };

// One handler for each message in the shared contract, which is what makes a missing one fail to
// compile. Each runs only for a message from the product's own page.
const toApp: { [C in keyof ToApp]: (...args: Untrusted<ToApp[C]>) => void } = {
  "panel:hide": () => panel?.hide(),
  "panel:resize": (height) => {
    if (!panel || typeof height !== "number" || !Number.isFinite(height)) return;
    panel.setContentSize(PANEL_WIDTH, Math.min(Math.max(Math.ceil(height), 56), 480));
  },
  // The page's plate colour, so the window matches the learner's theme rather than the system's.
  "panel:background": (color) => {
    if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color))
      panel?.setBackgroundColor(color);
  },
  "panel:added": () => void refreshDue(),
  "app:open": (path) => {
    if (typeof path !== "string" || !productUrl(path)) return;
    panel?.hide();
    void openMain(path === "/login" ? undefined : path);
  },
  "app:sign-in": (provider) => {
    if (provider === "apple" || provider === "google") void requestSignIn(PRODUCT_URL, provider);
  },
  // The one place Lymi asks macOS for Accessibility: This Mac's button, never the shortcut.
  "prefs:accessibility": () => {
    systemPreferences.isTrustedAccessibilityClient(true);
    void shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    );
  },
  // While This Mac records a new shortcut, the current one must not open the panel instead.
  "prefs:recording": (on) => {
    if (on === true) globalShortcut.unregister(prefs.shortcut);
    else if (!globalShortcut.isRegistered(prefs.shortcut)) registerShortcut(prefs.shortcut);
  },
};

const askApp: {
  [C in keyof AskApp]: (...args: Untrusted<AskApp[C]["args"]>) => AskApp[C]["result"];
} = {
  "prefs:get": () => preferencesOut(),
  "prefs:set": (key, value) => {
    if (key === "shortcut" && typeof value === "string") {
      const refused = moveShortcut(value);
      if (refused) return { ok: false, reason: refused, preferences: preferencesOut() };
    } else if (key === "showDue" && typeof value === "boolean")
      prefs = { ...prefs, showDue: value };
    else if (key === "showInMenuBar" && typeof value === "boolean") {
      prefs = { ...prefs, showInMenuBar: value };
    } else if (key === "fillSelection" && typeof value === "boolean") {
      prefs = { ...prefs, fillSelection: value };
    } else if (key === "openAtLogin" && typeof value === "boolean") {
      app.setLoginItemSettings({ openAtLogin: value });
    } else return { ok: false, reason: "invalid", preferences: preferencesOut() };
    writePreferences(prefs);
    refreshMenus();
    return { ok: true, preferences: preferencesOut() };
  },
};

for (const [channel, handler] of Object.entries(toApp)) {
  ipcMain.on(channel, (event, ...args: unknown[]) => {
    if (fromProduct(event)) (handler as (...values: unknown[]) => void)(...args);
  });
}
for (const [channel, handler] of Object.entries(askApp)) {
  ipcMain.handle(channel, (event, ...args: unknown[]) =>
    fromProduct(event) ? (handler as (...values: unknown[]) => unknown)(...args) : null,
  );
}

/** A message to a page, typed by the contract. */
function toPage<C extends keyof ToPage>(win: BrowserWindow | null, channel: C, value: ToPage[C]) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, value);
}

/** The browser's hand-back after sign-in; the windows share the session it lands in. */
async function onLink(link: string) {
  await app.whenReady();
  const done = await completeSignIn(link, PRODUCT_URL, ses).catch(() => false);
  if (DEV) console.log(`signed in ${done}`);
  if (!done) return;
  // The browser is in front; Lymi comes forward with the learner signed in.
  sessionChanged(true);
  await openMain();
  app.focus({ steal: true });
}

// A packaged build takes its name and icon from its bundle; unpackaged, this is Electron's own.
app.setName("Lymi");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Unpackaged, macOS registers Electron.app itself, so a link reaches this running copy.
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(SCHEME, process.execPath, [resolve(process.argv[1] ?? ".")]);
  } else {
    app.setAsDefaultProtocolClient(SCHEME);
  }
  app.on("open-url", (event, link) => {
    event.preventDefault();
    void onLink(link);
  });
  // Opening Lymi again, from Applications, Spotlight or the Dock, shows its window.
  app.on("second-instance", () => void openMain());
  app.on("activate", () => void openMain());
  app.whenReady().then(start);
  // A menu bar app stays running with no window open.
  app.on("window-all-closed", () => {});
  app.on("will-quit", () => globalShortcut.unregisterAll());
}

/**
 * Lymi opened from the disk image or Downloads asks once per launch to move itself: only in
 * Applications does it update itself and keep the sign-in link pointing at it.
 */
async function offerToMove() {
  if (!app.isPackaged || process.platform !== "darwin" || app.isInApplicationsFolder()) return;
  const { response } = await dialog.showMessageBox({
    message: "Move Lymi to Applications?",
    detail:
      "From Applications, Lymi keeps itself up to date and opens when you sign in from your browser.",
    buttons: ["Move to Applications", "Not Now"],
    defaultId: 0,
    cancelId: 1,
    icon: join(assets, "icon.png"),
  });
  // Moving quits and relaunches from Applications; cancelling the password prompt throws.
  if (response === 0) app.moveToApplicationsFolder();
}

async function start() {
  await offerToMove().catch(() => {});
  if (process.defaultApp) app.dock?.setIcon(join(assets, "icon.png"));
  app.setAboutPanelOptions({ applicationName: "Lymi", iconPath: join(assets, "icon.png") });
  ses = session.fromPartition("persist:lymi");
  const allowed = (permission: string, origin: string) =>
    PERMISSIONS.has(permission) && isProduct(origin);
  ses.setPermissionRequestHandler((contents, permission, grant, details) =>
    grant(allowed(permission, details.requestingUrl ?? contents.getURL())),
  );
  ses.setPermissionCheckHandler((_contents, permission, origin) => allowed(permission, origin));
  prefs = readPreferences();
  if (DEV_PERSONA) {
    // Signs the window session in as a seeded persona; the route sets the cookie and redirects.
    const url = productUrl(`/api/dev/sign-in?as=${encodeURIComponent(DEV_PERSONA)}`);
    if (url) await ses.fetch(url, { credentials: "include" });
  }
  if (!registerShortcut(prefs.shortcut) && prefs.shortcut !== DEFAULT_SHORTCUT) {
    prefs = { ...prefs, shortcut: DEFAULT_SHORTCUT };
    registerShortcut(prefs.shortcut);
  }
  refreshMenus();
  createPanel();
  void refreshDue();
  setInterval(() => void refreshDue(), DUE_EVERY_MS);
  powerMonitor.on("resume", () => void refreshDue());
  watchForUpdates(() => {
    updateReady = true;
    renderTray();
  });
  // Signing in or out in a window adds or removes the session cookie, and the window, the tray and
  // the panel follow. The daily refresh rewrites it in place, an overwrite then an insert, and
  // changes nothing.
  hasSession = (await ses.cookies.get({ url: PRODUCT_URL })).some(
    (cookie) =>
      sessionChange(false, { name: cookie.name, cause: "inserted", removed: false }) === true,
  );
  signedIn = hasSession;
  sessionRead();
  let settle: ReturnType<typeof setTimeout> | undefined;
  ses.cookies.on("changed", (_event, cookie, cause, removed) => {
    const next = sessionChange(hasSession, { name: cookie.name, cause, removed });
    if (next === null) return;
    sessionChanged(next);
    clearTimeout(settle);
    settle = setTimeout(() => {
      void refreshDue();
      // Never under the learner's typing: an open panel reloads on its next press instead.
      if (panel?.isVisible()) panelStale = true;
      else panel?.webContents.reload();
    }, 500);
  });
  if (DEV) {
    // Lets a script open the panel and find its window without pressing the shortcut. README.md.
    process.on("SIGUSR2", () => {
      // A menu command written to `dev-command` in the profile runs as if chosen from the menu bar.
      const file = join(app.getPath("userData"), "dev-command");
      if (existsSync(file)) {
        const command = readFileSync(file, "utf8").trim();
        rmSync(file);
        return command === "open" ? void openMain() : runCommand(command as MenuCommand);
      }
      if (!signedIn) return void requestSignIn(PRODUCT_URL);
      void showPanel();
      console.log(
        `panel ${panel?.getMediaSourceId()} tray "${tray?.getTitle()}" accessibility ${systemPreferences.isTrustedAccessibilityClient(false)}`,
      );
    });
  }
}
