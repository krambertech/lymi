/**
 * The contract between the Mac app (`apps/desktop`) and the product's pages, as types both sides
 * check against: the page's `window.lymiDesktop`, the messages behind it, and the menu's commands.
 *
 * An installed app updates long after the web, so a method is only ever added, never renamed or
 * removed, and one added after version 1 is optional and called with `?.()`.
 */
export interface DesktopBridge {
  version: number;
  hidePanel(): void;
  resizePanel(height: number): void;
  /** A `#rrggbb` the window fills with, so it matches the page's theme. */
  setPanelBackground(color: string): void;
  added(): void;
  openApp(path: string): void;
  /** `selection` is the text selected in the app in front, when the learner lets Lymi read it. */
  onPanelShown(listener: (shown: PanelShown) => void): () => void;
  preferences(): Promise<MacPreferences | null>;
  setPreference<K extends MacSetting>(key: K, value: MacPreferences[K]): Promise<MacSaved | null>;
  /** Asks macOS for Accessibility and opens its page in System Settings. */
  allowAccessibility(): void;
  /** Pauses the quick-add shortcut while This Mac records a new one. */
  setRecordingShortcut(on: boolean): void;
  /** A product path the app asks the page to show, such as after ⌘Enter in quick add. */
  onNavigate(listener: (path: string) => void): () => void;
  /** A command from the Mac's menu bar. */
  onMenuCommand(listener: (command: MenuCommand) => void): () => void;
  /** Signs in through the system browser, straight to the provider's page. Added in version 2. */
  signIn?(provider: SignInProvider): void;
}

/** The providers that refuse an app's window, so the Mac app signs in with them in the browser. */
export type SignInProvider = "apple" | "google";

export interface PanelShown {
  selection: string | null;
}

/** What the learner sets for this Mac, kept on the Mac rather than the account. */
export interface MacPreferences {
  /** An Electron accelerator, such as `Control+Alt+L`. */
  shortcut: string;
  /** Added after version 1 of the bridge, so an older app leaves it out. */
  showInMenuBar?: boolean;
  showDue: boolean;
  fillSelection: boolean;
  openAtLogin: boolean;
  /** Whether macOS lets Lymi read the selection; read only. */
  accessibility: boolean;
  version: string;
}

export type MacSetting = "shortcut" | "showInMenuBar" | "showDue" | "fillSelection" | "openAtLogin";

export type MacSaved =
  | { ok: true; preferences: MacPreferences }
  | { ok: false; reason: "taken" | "invalid"; preferences: MacPreferences };

/** Every command the Mac's menu bar sends; the page answers each one, which its `switch` checks. */
export const MENU_COMMANDS = [
  "add_card",
  "new_deck",
  "smart_add",
  "import",
  "command_menu",
  "theme",
  "today",
  "library",
  "insights",
  "explore",
  "activity",
  "review",
  "round_new",
  "round_forgotten",
  "round_slipping",
  "back",
  "forward",
  "settings",
] as const;
export type MenuCommand = (typeof MENU_COMMANDS)[number];

/**
 * Each message between the two sides, and what it carries: page to app (`send` and `invoke`) and
 * app to page. The app's handlers and the preload are typed by this map, so neither can drift.
 */
export interface ToApp {
  "panel:hide": [];
  "panel:resize": [height: number];
  "panel:background": [color: string];
  "panel:added": [];
  "app:open": [path: string];
  "prefs:accessibility": [];
  "prefs:recording": [on: boolean];
  "app:sign-in": [provider: SignInProvider];
}
export interface AskApp {
  "prefs:get": { args: []; result: MacPreferences | null };
  "prefs:set": { args: [key: MacSetting, value: unknown]; result: MacSaved | null };
}
export interface ToPage {
  "panel:shown": PanelShown;
  "menu:command": MenuCommand;
  "app:navigate": string;
  "window:full-screen": boolean;
}
