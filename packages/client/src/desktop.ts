interface FirstBridge {
  version: number;
  hidePanel(): void;
  resizePanel(height: number): void;
  setPanelBackground(color: string): void;
  added(): void;
  openApp(path: string): void;
  onPanelShown(listener: (shown: PanelShown) => void): () => void;
  preferences(): Promise<MacPreferences | null>;
  setPreference<K extends MacSetting>(key: K, value: MacPreferences[K]): Promise<MacSaved | null>;
  allowAccessibility(): void;
  setRecordingShortcut(on: boolean): void;
  onNavigate(listener: (path: string) => void): () => void;
  onMenuCommand(listener: (command: MenuCommand) => void): () => void;
}

interface AddedInVersion2 {
  signIn(provider: SignInProvider): void;
}

interface AddedInVersion3 {
  restartToUpdate(): void;
  onUpdate(listener: (update: MacUpdate | undefined) => void): () => void;
}

interface AddedInVersion4 {
  setTheme(theme: ThemeChoice): void;
}

export interface DesktopBridge
  extends FirstBridge, Partial<AddedInVersion2 & AddedInVersion3 & AddedInVersion4> {}

export type ThemeChoice = "light" | "dark" | "system";

export type SignInProvider = "apple" | "google";

export interface PanelShown {
  selection: string | null;
}

export interface MacPreferences {
  shortcut: string;
  showInMenuBar?: boolean;
  showDue: boolean;
  fillSelection: boolean;
  openAtLogin: boolean;
  accessibility: boolean;
  version: string;
  update?: MacUpdate | undefined;
}

export type MacUpdate = "checking" | "current" | "downloading" | "ready";

export type MacSetting = "shortcut" | "showInMenuBar" | "showDue" | "fillSelection" | "openAtLogin";

export type MacSaved =
  | { ok: true; preferences: MacPreferences }
  | { ok: false; reason: "taken" | "invalid"; preferences: MacPreferences };

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

export interface ToApp {
  "panel:hide": [];
  "panel:resize": [height: number];
  "panel:background": [color: string];
  "panel:added": [];
  "app:open": [path: string];
  "prefs:accessibility": [];
  "prefs:recording": [on: boolean];
  "app:sign-in": [provider: SignInProvider];
  "app:restart-to-update": [];
  "app:theme": [theme: ThemeChoice];
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
  "app:update": MacUpdate | undefined;
}
