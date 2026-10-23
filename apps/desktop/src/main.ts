import { join } from "node:path";
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
  Tray,
} from "electron";

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
let due: number | null = null;

const productUrl = (path: string) => new URL(path, PRODUCT_URL).toString();

/** Only the product loads inside Lymi's windows; every other link opens in the browser. */
function keepToProduct(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin === PRODUCT_URL) return;
    event.preventDefault();
    void shell.openExternal(url);
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
    titleBarStyle: "hiddenInset",
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
    height: 72,
    frame: false,
    transparent: true,
    vibrancy: "popover",
    visualEffectState: "active",
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
  panel.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "Escape") {
      event.preventDefault();
      panel?.hide();
    }
  });
  void panel.loadURL(productUrl("/desktop/add"));
}

/** Like Spotlight: centred on the screen under the pointer, a fifth of the way down. */
function showPanel() {
  if (!panel || panel.isDestroyed()) createPanel();
  if (!panel) return;
  if (panel.isVisible()) {
    panel.hide();
    return;
  }
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  panel.setPosition(
    Math.round(workArea.x + (workArea.width - PANEL_WIDTH) / 2),
    Math.round(workArea.y + workArea.height * 0.2),
  );
  panel.show();
  panel.focus();
  panel.webContents.send("panel:shown");
}

async function refreshDue() {
  try {
    const res = await ses.fetch(productUrl("/api/decks"), { credentials: "include" });
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
      { label: "Add a card", accelerator: SHORTCUT, click: showPanel },
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
});
ipcMain.on("panel:added", () => void refreshDue());
ipcMain.on("app:open", (_event, path: unknown) => {
  if (typeof path !== "string" || !path.startsWith("/")) return;
  panel?.hide();
  openMain(path);
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
  globalShortcut.register(SHORTCUT, showPanel);
  void refreshDue();
  setInterval(() => void refreshDue(), DUE_EVERY_MS);
  powerMonitor.on("resume", () => void refreshDue());
  if (LOOPBACK) {
    // Lets a script open the panel and find its window without pressing the shortcut. README.md.
    process.on("SIGUSR2", () => {
      showPanel();
      console.log(`panel ${panel?.getMediaSourceId()} tray "${tray?.getTitle()}"`);
    });
  }
});

// A menu bar app stays running with no window open.
app.on("window-all-closed", () => {});
app.on("will-quit", () => globalShortcut.unregisterAll());
