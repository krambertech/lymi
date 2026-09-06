import { BookMarked, PenLine, Plus } from "lucide-react";
import { IconButton } from "./Button";
import { Menu, MenuItem, MenuList, MenuTrigger } from "./Menu";

/**
 * One plus for both things a learner adds. It sits in the rail beside the mark on desktop and
 * in the page header on the phone, so capture is one tap from every screen. Round and amber:
 * capture is the app's standing action, and the only one that is on every screen.
 */
export function AddMenu({
  onAddCard,
  onCreateDeck,
  size = "md",
  align = "start",
  variant = "primary",
}: {
  onAddCard: () => void;
  onCreateDeck?: (() => void) | undefined;
  size?: "sm" | "md" | undefined;
  align?: "start" | "end" | undefined;
  variant?: "primary" | "secondary" | undefined;
}) {
  return (
    <Menu>
      <MenuTrigger>
        {(p) => (
          <IconButton label="Add" variant={variant} round size={size} {...p}>
            <Plus />
          </IconButton>
        )}
      </MenuTrigger>
      <MenuList align={align}>
        <MenuItem kbd="N" icon={<PenLine aria-hidden="true" />} onSelect={onAddCard}>
          New word
        </MenuItem>
        <MenuItem
          icon={<BookMarked aria-hidden="true" />}
          onSelect={onCreateDeck}
          disabled={!onCreateDeck}
        >
          New deck
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
