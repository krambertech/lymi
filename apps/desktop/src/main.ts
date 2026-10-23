import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  app,
  BrowserWindow,
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
import { type MenuCommand, setAppMenu } from "./menu.js";
import {
  DEFAULT_SHORTCUT,
  type Preferences,
  readPreferences,
  usableShortcut,
  writePreferences,
} from "./preferences.js";
import { canCopySelection, selectedText } from "./selection.js";
import { completeSignIn, requestSignIn, SCHEME, SESSION_COOKIE } from "./sign-in.js";

// A packaged build always talks to production; only a development run may point elsewhere.
const PRODUCT_URL = new URL((!app.isPackaged && process.env.LYMI_URL) || "https://my.lymi.app")
  .origin;
const DEV = !app.isPackaged && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(PRODUCT_URL);
// A local persona instead of a sign-in, never against production. docs/local-dev.md.
const DEV_PERSONA = DEV ? process.env.LYMI_DEV_PERSONA : undefined;
const PANEL_WIDTH = 480;
const DUE_EVERY_MS = 15 * 60_000;
const assets = join(app.getAppPath(), "assets");
const preload = join(app.getAppPath(), "dist", "preload.cjs");
// Google refuses sign-in inside an app's window, and the browser holds the passkeys, so these go there.
const SIGN_IN_HOSTS = new Set(["accounts.google.com", "appleid.apple.com"]);
const EXTERNAL_SCHEMES = new Set(["https:", "http:", "mailto:"]);
// What the product asks the browser for; everything else is refused.
const PERMISSIONS = new Set(["clipboard-sanitized-write", "notifications", "fullscreen"]);

let ses: Session;
let tray: Tray | null = null;
let panel: BrowserWindow | null = null;
let panelBroken = false;
let main: BrowserWindow | null = null;
let prefs: Preferences;
let due: number | null = null;
let signedIn = true;
let copying: Promise<void> | null = null;

/** The window's only trust boundary: a page, a redirect or a caller is the product's or nothing. */
const isProduct = (url: string | undefined) => URL.parse(url ?? "")?.origin === PRODUCT_URL;
const fromProduct = (event: IpcMainEvent | IpcMainInvokeEvent) => isProduct(event.senderFrame?.url);
/** A product path as a full URL, or null when it would leave the product, such as `//elsewhere`. */
function productUrl(path: string) {
  const url = URL.parse(path, PRODUCT_URL);
  return url && url.origin === PRODUCT_URL ? url.toString() : null;
}

function openExternal(url: string) {
  if (EXTERNAL_SCHEMES.has(URL.parse(url)?.protocol ?? "")) void shell.openExternal(url);
}

/** Only the product loads inside Lymi's windows; every other link or redirect opens in the browser. */
function keepToProduct(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  const leave = (event: { preventDefault: () => void }, url: string) => {
    if (isProduct(url)) return;
    event.preventDefault();
    if (SIGN_IN_HOSTS.has(URL.parse(url)?.hostname ?? "")) void requestSignIn(PRODUCT_URL);
    else openExternal(url);
  };
  win.webContents.on("will-navigate", leave);
  win.webContents.on("will-redirect", leave);
}

const webPreferences = () => ({ session: ses, preload, sandbox: true, contextIsolation: true });

/** Shows the main window, at `path` when one is asked for; an open window moves without reloading. */
function openMain(path?: string) {
  const url = productUrl(path ?? "/today");
  if (!url) return;
  if (main && !main.isDestroyed()) {
    if (path) main.webContents.send("app:navigate", path);
    main.show();
    main.focus();
    return;
  }
  main = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 380,
    // No title bar: the traffic lights stand where the product's Lymi tile was, centred 40 px down.
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 20, y: 33 },
    show: false,
    webPreferences: webPreferences(),
  });
  keepToProduct(main);
  main.once("ready-to-show", () => main?.show());
  // Full screen hides the traffic lights, so the page shows its Lymi tile again.
  const fullScreen = () => main?.webContents.send("window:full-screen", main.isFullScreen());
  main.on("enter-full-screen", fullScreen);
  main.on("leave-full-screen", fullScreen);
  main.webContents.on("did-finish-load", fullScreen);
  main.on("closed", () => {
    main = null;
    // Back to living in the menu bar once no window is open.
    if (process.platform === "darwin") app.setActivationPolicy("accessory");
  });
  if (process.platform === "darwin") app.setActivationPolicy("regular");
  void main.loadURL(url);
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
  panelBroken = false;
  panel.webContents.on("did-fail-load", (_event, _code, _description, _url, mainFrame) => {
    if (mainFrame) panelBroken = true;
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
  if (panelBroken) {
    panelBroken = false;
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
  panel.webContents.send("panel:shown", { selection });
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

function renderTray() {
  if (!tray) return;
  tray.setTitle(prefs.showDue && due ? String(due) : "", { fontType: "monospacedDigit" });
  tray.setToolTip(due ? `Lymi · ${due} due` : "Lymi");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...(signedIn
        ? []
        : [
            { label: "Sign in…", click: () => void requestSignIn(PRODUCT_URL) },
            { type: "separator" as const },
          ]),
      { label: "Add a card", accelerator: prefs.shortcut, click: () => void showPanel() },
      { label: "Review", click: () => runCommand("review") },
      { label: "Open Lymi", click: () => openMain() },
      { type: "separator" },
      { label: "Settings…", click: () => runCommand("settings") },
      { type: "separator" },
      { label: "Quit Lymi", role: "quit" },
    ]),
  );
}

/** A menu command goes to the product's page, which owns what each one does. */
function runCommand(command: MenuCommand) {
  if (main && !main.isDestroyed()) {
    main.show();
    main.focus();
    main.webContents.send("menu:command", command);
    return;
  }
  openMain();
  main?.webContents.once("did-finish-load", () => main?.webContents.send("menu:command", command));
}

function refreshMenus() {
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

ipcMain.handle("prefs:get", (event) => (fromProduct(event) ? preferencesOut() : null));
ipcMain.handle("prefs:set", (event, key: unknown, value: unknown) => {
  if (!fromProduct(event)) return null;
  if (key === "shortcut" && typeof value === "string") {
    const refused = moveShortcut(value);
    if (refused) return { ok: false, reason: refused, preferences: preferencesOut() };
  } else if (key === "showDue" && typeof value === "boolean") prefs = { ...prefs, showDue: value };
  else if (key === "fillSelection" && typeof value === "boolean") {
    prefs = { ...prefs, fillSelection: value };
  } else if (key === "openAtLogin" && typeof value === "boolean") {
    app.setLoginItemSettings({ openAtLogin: value });
  } else return { ok: false, reason: "invalid", preferences: preferencesOut() };
  writePreferences(prefs);
  refreshMenus();
  return { ok: true, preferences: preferencesOut() };
});
// While This Mac records a new shortcut, the current one must not open the panel instead.
ipcMain.on("prefs:recording", (event, on: unknown) => {
  if (!fromProduct(event)) return;
  if (on === true) globalShortcut.unregister(prefs.shortcut);
  else if (!globalShortcut.isRegistered(prefs.shortcut)) registerShortcut(prefs.shortcut);
});
// The one place Lymi asks macOS for Accessibility: This Mac's button, never the shortcut.
ipcMain.on("prefs:accessibility", (event) => {
  if (!fromProduct(event)) return;
  systemPreferences.isTrustedAccessibilityClient(true);
  void shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  );
});

ipcMain.on("panel:hide", (event) => {
  if (fromProduct(event)) panel?.hide();
});
// The page's plate colour, so the window matches the learner's theme rather than the system's.
ipcMain.on("panel:background", (event, color: unknown) => {
  if (!fromProduct(event) || typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return;
  panel?.setBackgroundColor(color);
});
ipcMain.on("panel:resize", (event, height: unknown) => {
  if (!fromProduct(event) || !panel || typeof height !== "number" || !Number.isFinite(height))
    return;
  panel.setContentSize(PANEL_WIDTH, Math.min(Math.max(Math.ceil(height), 56), 480));
});
ipcMain.on("panel:added", (event) => {
  if (fromProduct(event)) void refreshDue();
});
ipcMain.on("app:open", (event, path: unknown) => {
  if (!fromProduct(event) || typeof path !== "string" || !productUrl(path)) return;
  panel?.hide();
  if (path === "/login") void requestSignIn(PRODUCT_URL);
  else openMain(path);
});

/** The browser's hand-back after sign-in; the windows share the session it lands in. */
async function onLink(link: string) {
  await app.whenReady();
  const done = await completeSignIn(link, PRODUCT_URL, ses).catch(() => false);
  if (DEV) console.log(`signed in ${done}`);
  if (done) openMain();
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
  app.on("second-instance", () => openMain());
  app.on("activate", () => openMain());
  app.whenReady().then(start);
  // A menu bar app stays running with no window open.
  app.on("window-all-closed", () => {});
  app.on("will-quit", () => globalShortcut.unregisterAll());
}

async function start() {
  if (process.platform === "darwin") app.setActivationPolicy("accessory");
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
  const icon = nativeImage.createFromPath(join(assets, "trayTemplate.png"));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  if (!registerShortcut(prefs.shortcut) && prefs.shortcut !== DEFAULT_SHORTCUT) {
    prefs = { ...prefs, shortcut: DEFAULT_SHORTCUT };
    registerShortcut(prefs.shortcut);
  }
  refreshMenus();
  createPanel();
  void refreshDue();
  setInterval(() => void refreshDue(), DUE_EVERY_MS);
  powerMonitor.on("resume", () => void refreshDue());
  // Signing in or out in a window changes the session cookie; the tray and the panel follow it.
  let settle: ReturnType<typeof setTimeout> | undefined;
  ses.cookies.on("changed", (_event, cookie) => {
    if (!cookie.name.endsWith(SESSION_COOKIE)) return;
    clearTimeout(settle);
    settle = setTimeout(() => {
      void refreshDue();
      panel?.webContents.reload();
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
        return command === "open" ? openMain() : runCommand(command as MenuCommand);
      }
      if (!signedIn) return void requestSignIn(PRODUCT_URL);
      void showPanel();
      console.log(
        `panel ${panel?.getMediaSourceId()} tray "${tray?.getTitle()}" accessibility ${systemPreferences.isTrustedAccessibilityClient(false)}`,
      );
    });
  }
}
