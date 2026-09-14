import { Archive, Download, MoreHorizontal, Pencil, Volume2 } from "lucide-react";
import { useRef } from "react";
import { Button, IconButton } from "../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Popover, PopoverContent } from "../../components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { DeviceFrames } from "../device-frame";
import { Variants } from "../frame";
import type { Group } from "./types";

const OVERLAY_MOTION =
  "Turn on Reduce motion in the side rail, then press the button in either frame to open it again: the dialog fades in place without its rise, and the drawer crossfades instead of rising.";

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
          stack
          items={[
            {
              label: "Open",
              note: "Rows lead with an icon and may show a shortcut, which the drawer leaves out. A label names a group of rows. A disabled row stays in the list and is read out. A destructive row goes last, under a rule, in the danger tone.",
              render: () => <DeviceFrames specimen="menu" />,
            },
            {
              label: "Default",
              note: "The trigger is any button, composed through render. This one opens the shape this window gets.",
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
                      Deck settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download />
                      Export as CSV
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
            {
              label: "Reduced motion",
              note: "On a desktop the list fades in place without growing, and the hover fill fades in on the row under the pointer instead of sliding to it. The drawer crossfades. Turn on Reduce motion in the side rail to try it.",
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
  lede: "Things that sit over the page. A tooltip names a control and a popover explains one; both stay anchored on every device. A dialog holds a moment, a form or a question, or a place such as the streak, and takes the machine’s shape: centred on a desktop, a drawer on a touch device.",
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
              label: "Open",
              note: "Ink on the room, under the control, 6 px from it. It flips above when there is no room below.",
              render: () => (
                <div className="pb-8">
                  <Tooltip open>
                    <TooltipTrigger
                      render={
                        <Button variant="secondary" aria-label="Play pronunciation">
                          <Volume2 aria-hidden="true" />
                        </Button>
                      }
                    />
                    <TooltipContent>Play pronunciation</TooltipContent>
                  </Tooltip>
                </div>
              ),
            },
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
            {
              label: "Reduced motion",
              note: "The name fades in place without growing. Turn on Reduce motion in the side rail and point at a control to try it.",
            },
          ]}
        />
      ),
    },
    {
      slug: "popover",
      name: "Popover",
      source: "components/ui/popover.tsx",
      note: "A note about a control, anchored to it on every device. It has no drawer shape, so it never holds controls of its own. The error tip on the Feedback page is the one in use.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Open",
              note: "A plate with the strong edge, over the control, flipping below when there is no room. It grows out of the side nearest the control over 180 ms and shrinks back in 100.",
              render: () => <PopoverOpen />,
            },
            {
              label: "Reduced motion",
              note: "It fades in place without growing.",
            },
          ]}
        />
      ),
    },
    {
      slug: "form",
      name: "Form",
      source: "components/ui/dialog.tsx",
      note: "A form the learner asked for, in a Dialog: a centred dialog on a desktop, a drawer on a touch device, held while open. The form knows nothing about either shape.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Open",
              note: "On touch the drawer keeps the focused field above the software keyboard, and swipes away.",
              render: () => <DeviceFrames specimen="form" />,
            },
            { label: "Reduced motion", note: OVERLAY_MOTION },
          ]}
        />
      ),
    },
    {
      slug: "confirmation",
      name: "Confirmation",
      source: "components/ui/dialog.tsx",
      note: "For the one action that cannot be undone. Everywhere else, act and offer Undo.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Open",
              note: "On a desktop the actions sit in a row, the primary last. On touch they stack full width, the primary on top. The safe action names what stays.",
              render: () => <DeviceFrames specimen="confirmation" />,
            },
            { label: "Reduced motion", note: OVERLAY_MOTION },
          ]}
        />
      ),
    },
    {
      slug: "place",
      name: "Place",
      source: "components/ui/dialog.tsx",
      note: "Something the learner goes to and reads, such as the streak. Its open state is a search parameter, so Back closes it and a link opens it. It is a Dialog with kind place.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Open",
              note: "Centred on a desktop. On touch a drawer over the whole screen with square corners and a close button; a swipe down closes it too.",
              render: () => <DeviceFrames specimen="place" />,
            },
            { label: "Reduced motion", note: OVERLAY_MOTION },
          ]}
        />
      ),
    },
    {
      slug: "drawer",
      name: "Drawer",
      source: "components/ui/drawer.tsx",
      note: "The touch shape of Dialog, DropdownMenu, Select and Combobox. No screen uses it directly: a call site uses those four and never picks a shape. It rises from the bottom edge over 450 ms, follows the finger, and leaves faster the harder it was flicked.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Nested",
              note: "A list opened from a form rises over it. The form keeps its height and steps back, and its handle hides until the list is swiped away.",
              render: () => <DeviceFrames specimen="nested" />,
            },
          ]}
        />
      ),
    },
  ],
};

function PopoverOpen() {
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex w-full justify-center pt-16">
      <IconButton ref={anchor} label="Play pronunciation" variant="danger" round>
        <Volume2 aria-hidden="true" />
      </IconButton>
      <Popover open>
        <PopoverContent anchor={anchor} initialFocus={false} finalFocus={false}>
          Couldn’t play the pronunciation. Try again.
        </PopoverContent>
      </Popover>
    </div>
  );
}
