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
import { canCopySelection, selectedText } from "./selection.js";
import { completeSignIn, requestSignIn, SCHEME } from "./sign-in.js";

const PRODUCT_URL = new URL(process.env.LYMI_URL ?? "https://my.lymi.app").origin;
const LOOPBACK = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(PRODUCT_URL);
// A local persona instead of a sign-in, never against production. docs/local-dev.md.
const DEV_PERSONA = LOOPBACK ? process.env.LYMI_DEV_PERSONA : undefined;
const SHORTCUT = "Control+Alt+L";
const PANEL_WIDTH = 640;
const DUE_EVERY_MS = 15 * 60_000;
const assets = join(app.getAppPath(), "assets");
const preload = join(app.getAppPath(), "dist", "preload.cjs");

let ses: Session;
let tray: Tray | null = null;
let panel: BrowserWindow | null = null;
let main: BrowserWindow | null = null;
let showDue = true;
let fillSelection = true;
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
    show: false,
    webPreferences: webPreferences(),
  });
  keepToProduct(main);
  main.once("ready-to-show", () => main?.show());
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
    // The page draws Lymi's plate; the window around it is clear and shadows the plate's shape.
    transparent: true,
    backgroundColor: "#00000000",
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
  panel.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "Escape") {
      event.preventDefault();
      panel?.hide();
    }
  });
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
  const selection = fillSelection && canCopySelection() ? await selectedText() : null;
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
  tray.setTitle(showDue && due ? String(due) : "", { fontType: "monospacedDigit" });
  tray.setToolTip(due ? `Lymi · ${due} due` : "Lymi");
  const login = app.getLoginItemSettings();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...(signedIn
        ? []
        : [
            { label: "Sign in…", click: () => void requestSignIn(PRODUCT_URL) },
            { type: "separator" as const },
          ]),
      { label: "Add a card", accelerator: SHORTCUT, click: () => void showPanel() },
      { label: "Review", click: () => openMain("/review") },
      { label: "Open Lymi", click: () => openMain() },
      { type: "separator" },
      {
        label: "Show due count",
        type: "checkbox",
        checked: showDue,
        click: () => {
          showDue = !showDue;
          renderTray();
        },
      },
      {
        label: "Fill in selected text",
        type: "checkbox",
        checked: fillSelection,
        click: () => {
          fillSelection = !fillSelection;
          renderTray();
        },
      },
      {
        label: "Open at login",
        type: "checkbox",
        checked: login.openAtLogin,
        click: () => {
          app.setLoginItemSettings({ openAtLogin: !login.openAtLogin });
          renderTray();
        },
      },
      { type: "separator" },
      { label: "Quit Lymi", role: "quit" },
    ]),
  );
}

ipcMain.on("panel:hide", () => panel?.hide());
ipcMain.on("panel:resize", (_event, height: unknown) => {
  if (!panel || typeof height !== "number" || !Number.isFinite(height)) return;
  panel.setContentSize(PANEL_WIDTH, Math.min(Math.max(Math.ceil(height), 56), 480));
  panel.invalidateShadow();
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
  ses = session.fromPartition("persist:lymi");
  if (DEV_PERSONA) {
    // Signs the window session in as a seeded persona; the route sets the cookie and redirects.
    await ses.fetch(productUrl(`/api/dev/sign-in?as=${encodeURIComponent(DEV_PERSONA)}`), {
      credentials: "include",
    });
  }
  const icon = nativeImage.createFromPath(join(assets, "trayTemplate.png"));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  renderTray();
  createPanel();
  globalShortcut.register(SHORTCUT, () => void showPanel());
  void refreshDue();
  setInterval(() => void refreshDue(), DUE_EVERY_MS);
  powerMonitor.on("resume", () => void refreshDue());
  if (LOOPBACK) {
    // Lets a script open the panel and find its window without pressing the shortcut. README.md.
    process.on("SIGUSR2", () => {
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
