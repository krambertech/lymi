import { Archive, Download, MoreHorizontal, Pencil, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { Menu, MenuItem, MenuList, MenuSeparator, MenuTrigger } from "../../components/Menu";
import { NewDeckForm } from "../../components/NewDeckSheet";
import { Sheet, SheetPanel } from "../../components/Sheet";
import { Variants } from "../Frame";
import { type Group, noop } from "./types";

export const menu: Group = {
  slug: "menu",
  title: "Menu",
  lede: "A few actions behind one button. It grows out of the corner nearest the button, scale 0.94 to 1 over 140 ms, and the hover is one fill that slides between rows without crossing a separator.",
  entries: [
    {
      slug: "menu",
      name: "Menu",
      source: "components/Menu.tsx",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Deck options",
              note: "Items lead with an icon and may show a shortcut. A destructive item goes last, under a rule, in the danger tone.",
              render: () => (
                <Menu>
                  <MenuTrigger>
                    {(p) => (
                      <Button size="sm" {...p}>
                        Deck options
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                    )}
                  </MenuTrigger>
                  <MenuList align="start">
                    <MenuItem icon={<Pencil />}>Rename</MenuItem>
                    <MenuItem icon={<Download />} kbd="⌘E">
                      Export as CSV
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={<Archive />} tone="danger">
                      Archive deck
                    </MenuItem>
                  </MenuList>
                </Menu>
              ),
            },
          ]}
        />
      ),
    },
  ],
};

export const overlays: Group = {
  slug: "overlays",
  title: "Overlays",
  lede: "Things that sit over the page. A tooltip names a control. A sheet is a form the learner asked for. A dialog is a question, and Lymi asks one only when there is no way back.",
  entries: [
    {
      slug: "tooltip",
      name: "Tooltip",
      source: "components/Tooltip.tsx",
      note: "Every icon button shows its label as a tooltip. It is never a native title, and it never appears on touch.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "On hover",
              note: "Waits 500 ms under a still pointer, then grows from the side nearest the control.",
              render: () => (
                <IconButton label="Play pronunciation" variant="secondary" round>
                  <Volume2 />
                </IconButton>
              ),
            },
            {
              label: "Along a row",
              note: "Once one is open, the next opens at once, with no fade.",
              render: () => (
                <div className="flex gap-1">
                  <IconButton label="Rename" size="sm">
                    <Pencil />
                  </IconButton>
                  <IconButton label="Export as CSV" size="sm">
                    <Download />
                  </IconButton>
                  <IconButton label="Archive deck" size="sm">
                    <Archive />
                  </IconButton>
                </div>
              ),
            },
            {
              label: "On keyboard focus",
              note: "Tab to a control and its name shows without the wait.",
              render: () => (
                <IconButton label="Deck options" size="sm">
                  <MoreHorizontal />
                </IconButton>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "sheet",
      name: "Sheet",
      source: "components/Sheet.tsx",
      note: "Takes the shape of the machine it is on. One SheetPanel is the inside of both shapes, and the form knows nothing about either.",
      Demo: function SheetDemo() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Variants
              stack
              items={[
                {
                  label: "Live",
                  note: "Opens the shape this window gets.",
                  render: () => (
                    <Button size="sm" onClick={() => setOpen(true)}>
                      Open sheet
                    </Button>
                  ),
                },
                {
                  label: "Drawer",
                  note: "On the phone. Rises from the bottom edge, under the thumb, and swipes away.",
                  render: () => (
                    <div className="edge-2 mx-auto w-full max-w-md rounded-t-xl bg-plate">
                      <SheetPanel variant="drawer" title="New deck">
                        <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                      </SheetPanel>
                    </div>
                  ),
                },
                {
                  label: "Modal",
                  note: "On a desktop with a fine pointer. Centred, with the card’s 6 px rise.",
                  render: () => (
                    <div className="edge-2 mx-auto w-full max-w-[440px] rounded-xl bg-plate">
                      <SheetPanel variant="modal" title="New deck">
                        <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                      </SheetPanel>
                    </div>
                  ),
                },
              ]}
            />
            <Sheet open={open} onOpenChange={setOpen} title="New deck">
              <NewDeckForm onCancel={() => setOpen(false)} onSubmit={() => undefined} static />
            </Sheet>
          </>
        );
      },
    },
    {
      slug: "dialog",
      name: "Dialog",
      source: "components/Dialog.tsx",
      note: "For the one action that cannot be undone. Everywhere else, act and offer Undo.",
      Demo: function DialogDemo() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Variants
              items={[
                {
                  label: "Delete account",
                  note: "The safe choice is a ghost button and comes first.",
                  render: () => (
                    <Button size="sm" onClick={() => setOpen(true)}>
                      Open dialog
                    </Button>
                  ),
                },
              ]}
            />
            <Dialog
              open={open}
              onClose={() => setOpen(false)}
              title="Delete this account?"
              actions={
                <>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Keep it
                  </Button>
                  <Button variant="danger" onClick={() => setOpen(false)}>
                    Delete account
                  </Button>
                </>
              }
            >
              Every deck, card and review goes with it. This is the one action in Lymi that cannot
              be undone.
            </Dialog>
          </>
        );
      },
    },
  ],
};
