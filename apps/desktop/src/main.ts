import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  app,
  BrowserWindow,
  globalShortcut,
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
import { type Preferences, readPreferences, writePreferences } from "./preferences.js";
import { canCopySelection, selectedText } from "./selection.js";
import { completeSignIn, requestSignIn, SCHEME } from "./sign-in.js";

const PRODUCT_URL = new URL(process.env.LYMI_URL ?? "https://my.lymi.app").origin;
const LOOPBACK = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(PRODUCT_URL);
// A local persona instead of a sign-in, never against production. docs/local-dev.md.
const DEV_PERSONA = LOOPBACK ? process.env.LYMI_DEV_PERSONA : undefined;
const PANEL_WIDTH = 480;
const DUE_EVERY_MS = 15 * 60_000;
const assets = join(app.getAppPath(), "assets");
const preload = join(app.getAppPath(), "dist", "preload.cjs");

let ses: Session;
let tray: Tray | null = null;
let panel: BrowserWindow | null = null;
let main: BrowserWindow | null = null;
let prefs: Preferences;
let due: number | null = null;
let signedIn = true;
// Google refuses sign-in inside an app's window, and the browser holds the passkeys, so these go there.
const SIGN_IN_HOSTS = new Set(["accounts.google.com", "appleid.apple.com"]);

const productUrl = (path: string) => new URL(path, PRODUCT_URL).toString();

/** Only the product loads inside Lymi's windows; every other link opens in the browser. */
function keepToProduct(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const target = new URL(url);
    if (target.origin === PRODUCT_URL) return;
    event.preventDefault();
    if (SIGN_IN_HOSTS.has(target.hostname)) void requestSignIn(PRODUCT_URL);
    else void shell.openExternal(url);
  });
}

const webPreferences = () => ({ session: ses, preload, sandbox: true, contextIsolation: true });

function openMain(path = "/today") {
  if (main && !main.isDestroyed()) {
    void main.loadURL(productUrl(path));
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
  void main.loadURL(productUrl(path));
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
  void panel.loadURL(productUrl("/desktop/add"));
}

/** Like Spotlight: centred on the screen under the pointer, a fifth of the way down. */
async function showPanel() {
  if (!panel || panel.isDestroyed()) createPanel();
  if (!panel) return;
  if (panel.isVisible()) {
    panel.hide();
    return;
  }
  // Copied before the panel shows, while the app the learner was reading still has the selection.
  const selection = prefs.fillSelection && canCopySelection() ? await selectedText() : null;
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
  try {
    const res = await ses.fetch(productUrl("/api/decks"), { credentials: "include" });
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

/** Moves the quick-add shortcut, keeping the old one when another app already holds the new. */
function moveShortcut(next: string) {
  globalShortcut.unregister(prefs.shortcut);
  let taken = false;
  try {
    taken = !globalShortcut.register(next, () => void showPanel());
  } catch {
    taken = true;
  }
  if (taken) {
    globalShortcut.register(prefs.shortcut, () => void showPanel());
    return false;
  }
  prefs = { ...prefs, shortcut: next };
  return true;
}

const preferencesOut = () => ({
  ...prefs,
  openAtLogin: app.getLoginItemSettings().openAtLogin,
  accessibility: systemPreferences.isTrustedAccessibilityClient(false),
  version: app.getVersion(),
});

ipcMain.handle("prefs:get", () => preferencesOut());
ipcMain.handle("prefs:set", (_event, key: unknown, value: unknown) => {
  if (key === "shortcut" && typeof value === "string") {
    if (!moveShortcut(value)) return { ok: false, reason: "taken", preferences: preferencesOut() };
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
// macOS shows its own prompt once, then the learner switches Lymi on in System Settings.
ipcMain.on("prefs:accessibility", () => {
  systemPreferences.isTrustedAccessibilityClient(true);
  void shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  );
});

ipcMain.on("panel:hide", () => panel?.hide());
// The page's plate colour, so the window matches the learner's theme rather than the system's.
ipcMain.on("panel:background", (_event, color: unknown) => {
  if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) panel?.setBackgroundColor(color);
});
ipcMain.on("panel:resize", (_event, height: unknown) => {
  if (!panel || typeof height !== "number" || !Number.isFinite(height)) return;
  panel.setContentSize(PANEL_WIDTH, Math.min(Math.max(Math.ceil(height), 56), 480));
});
ipcMain.on("panel:added", () => void refreshDue());
ipcMain.on("app:open", (_event, path: unknown) => {
  if (typeof path !== "string" || !path.startsWith("/")) return;
  panel?.hide();
  if (path === "/login") void requestSignIn(PRODUCT_URL);
  else openMain(path);
});

/** The browser's hand-back after sign-in; the windows share the session it lands in. */
async function onLink(link: string) {
  await app.whenReady();
  const done = await completeSignIn(link, PRODUCT_URL, ses).catch(() => false);
  if (LOOPBACK) console.log(`signed in ${done}`);
  if (!done) return;
  await refreshDue();
  panel?.webContents.reload();
  openMain();
}

// A packaged build takes its name and icon from its bundle; unpackaged, this is Electron's own.
app.setName("Lymi");

// Unpackaged, macOS registers Electron.app itself, so a link reaches this running copy.
if (process.defaultApp) {
  app.setAsDefaultProtocolClient(SCHEME, process.execPath, [resolve(process.argv[1] ?? ".")]);
} else {
  app.setAsDefaultProtocolClient(SCHEME);
}
if (!app.requestSingleInstanceLock()) app.quit();
app.on("open-url", (event, link) => {
  event.preventDefault();
  void onLink(link);
});

app.whenReady().then(async () => {
  if (process.platform === "darwin") app.setActivationPolicy("accessory");
  if (process.defaultApp) app.dock?.setIcon(join(assets, "icon.png"));
  app.setAboutPanelOptions({ applicationName: "Lymi", iconPath: join(assets, "icon.png") });
  ses = session.fromPartition("persist:lymi");
  prefs = readPreferences();
  if (DEV_PERSONA) {
    // Signs the window session in as a seeded persona; the route sets the cookie and redirects.
    await ses.fetch(productUrl(`/api/dev/sign-in?as=${encodeURIComponent(DEV_PERSONA)}`), {
      credentials: "include",
    });
  }
  const icon = nativeImage.createFromPath(join(assets, "trayTemplate.png"));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  refreshMenus();
  createPanel();
  globalShortcut.register(prefs.shortcut, () => void showPanel());
  void refreshDue();
  setInterval(() => void refreshDue(), DUE_EVERY_MS);
  powerMonitor.on("resume", () => void refreshDue());
  if (LOOPBACK) {
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
});

// A menu bar app stays running with no window open.
app.on("window-all-closed", () => {});
app.on("will-quit", () => globalShortcut.unregisterAll());
