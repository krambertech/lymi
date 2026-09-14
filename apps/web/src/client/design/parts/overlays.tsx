import { Archive, Download, MoreHorizontal, Pencil, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "../../components/button";
import { NewDeckForm } from "../../components/new-deck-sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Variants } from "../frame";
import { SheetPreview } from "../sheet-preview";
import { type Group, noop } from "./types";

export const menu: Group = {
  slug: "menu",
  title: "Menu",
  lede: "A few actions behind one button. On a desktop it grows out of the corner nearest the button, scale 0.94 to 1 over 140 ms, and the hover is one fill that slides between rows without crossing a separator. On a touch device the same rows rise in a drawer.",
  entries: [
    {
      slug: "menu",
      name: "Menu",
      source: "components/ui/dropdown-menu.tsx",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Deck options",
              note: "Items lead with an icon and may show a shortcut. A destructive item goes last, under a rule, in the danger tone.",
              render: () => (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button size="sm">
                        Deck options
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent aria-label="Deck options" align="start">
                    <DropdownMenuItem>
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download />
                      Export as CSV
                      <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      <Archive />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
      source: "components/ui/tooltip.tsx",
      note: "Every icon button shows its label as a tooltip. It is never a native title, it never appears on touch, and it repeats the accessible name rather than standing in for it.",
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
            {
              label: "On a menu button",
              note: "Pressing the button is the answer to what it does, so the name leaves as the menu opens and stays quiet until it closes.",
              render: () => (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <IconButton label="Card options" size="sm">
                        <MoreHorizontal />
                      </IconButton>
                    }
                  />
                  <DropdownMenuContent aria-label="Card options" align="start">
                    <DropdownMenuItem>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      <Archive />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "sheet",
      name: "Sheet",
      source: "components/Dialog.tsx",
      note: "A form the learner asked for, in a Dialog: a drawer on a touch device, a centred dialog on a desktop, held while open. The form knows nothing about either shape.",
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
                  note: "On a touch device. Rises from the bottom edge, under the thumb, and swipes away.",
                  render: () => (
                    <SheetPreview shape="drawer" title="New deck">
                      <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                    </SheetPreview>
                  ),
                },
                {
                  label: "Modal",
                  note: "On a desktop with a fine pointer. Centred, with the card’s 6 px rise.",
                  render: () => (
                    <SheetPreview
                      shape="dialog"
                      title="New deck"
                      className="mx-auto w-full max-w-[440px]"
                    >
                      <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                    </SheetPreview>
                  ),
                },
              ]}
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="w-[min(92vw,440px)]">
                <DialogTitle>New deck</DialogTitle>
                <NewDeckForm onCancel={() => setOpen(false)} onSubmit={() => undefined} static />
              </DialogContent>
            </Dialog>
          </>
        );
      },
    },
    {
      slug: "dialog",
      name: "Dialog",
      source: "components/ui/dialog.tsx",
      note: "For the one action that cannot be undone. Everywhere else, act and offer Undo. Centred on a desktop; on a touch device a drawer with the actions stacked, the primary on top.",
      Demo: function DialogDemo() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Variants
              items={[
                {
                  label: "Delete account",
                  note: "The safe choice is a ghost button: first in the row on a desktop, under the primary on a touch device.",
                  render: () => (
                    <Button size="sm" onClick={() => setOpen(true)}>
                      Open dialog
                    </Button>
                  ),
                },
              ]}
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this account?</DialogTitle>
                  <DialogDescription>
                    Every deck, card and review goes with it. This is the one action in Lymi that
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Keep it
                  </Button>
                  <Button variant="danger" onClick={() => setOpen(false)}>
                    Delete account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        );
      },
    },
  ],
};
