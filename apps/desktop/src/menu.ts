import type { MenuCommand } from "@lymi/client/desktop";
import { Menu, type MenuItemConstructorOptions, shell } from "electron";

interface Actions {
  run: (command: MenuCommand) => void;
  quickAdd: () => void;
  shortcut: string;
}

/**
 * The Mac's menu bar while a Lymi window is open: the standard menus, with the product's commands
 * from the command menu. The Edit menu also makes ⌘C and ⌘V work in the product's text fields.
 */
export function setAppMenu({ run, quickAdd, shortcut }: Actions) {
  const item = (label: string, command: MenuCommand, accelerator?: string) =>
    ({
      label,
      ...(accelerator ? { accelerator } : {}),
      click: () => run(command),
    }) satisfies MenuItemConstructorOptions;
  const template: MenuItemConstructorOptions[] = [
    {
      label: "Lymi",
      submenu: [
        { role: "about", label: "About Lymi" },
        { type: "separator" },
        item("Settings…", "settings", "CommandOrControl+,"),
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide", label: "Hide Lymi" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit", label: "Quit Lymi" },
      ],
    },
    {
      label: "File",
      submenu: [
        item("New Card…", "add_card", "CommandOrControl+N"),
        item("New Deck…", "new_deck", "Shift+CommandOrControl+N"),
        item("Smart Add…", "smart_add"),
        { type: "separator" },
        item("Import…", "import"),
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "selectAll" },
        { type: "separator" },
        item("Find…", "command_menu", "CommandOrControl+F"),
      ],
    },
    {
      label: "View",
      submenu: [
        item("Command Menu", "command_menu", "CommandOrControl+K"),
        item("Switch Light and Dark", "theme"),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Go",
      submenu: [
        item("Today", "today", "CommandOrControl+1"),
        item("Library", "library", "CommandOrControl+2"),
        item("Insights", "insights", "CommandOrControl+3"),
        item("Explore", "explore", "CommandOrControl+4"),
        item("Activity", "activity", "CommandOrControl+5"),
        { type: "separator" },
        item("Back", "back", "CommandOrControl+["),
        item("Forward", "forward", "CommandOrControl+]"),
      ],
    },
    {
      label: "Review",
      submenu: [
        item("Start Review", "review", "CommandOrControl+R"),
        { type: "separator" },
        item("New Cards", "round_new"),
        item("Forgotten Today", "round_forgotten"),
        item("Often Forgotten", "round_slipping"),
      ],
    },
    {
      role: "window",
      submenu: [
        { label: "Quick Add", accelerator: shortcut, click: quickAdd },
        { type: "separator" },
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
    {
      role: "help",
      submenu: [
        { label: "Lymi Docs", click: () => void shell.openExternal("https://lymi.app/docs") },
        { label: "What’s New", click: () => void shell.openExternal("https://lymi.app/changelog") },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
