import { Plus } from "lucide-react";
import { IconButton } from "./Button";
import { Menu, MenuItem, MenuList, MenuTrigger } from "./Menu";

/**
 * One plus for both things a learner adds. It sits next to the wordmark on desktop and in
 * the page header on the phone, so capture is one tap from every screen.
 */
export function AddMenu({
  onAddCard,
  onCreateDeck,
  size = "md",
  align = "start",
}: {
  onAddCard: () => void;
  onCreateDeck?: (() => void) | undefined;
  size?: "sm" | "md" | undefined;
  align?: "start" | "end" | undefined;
}) {
  return (
    <Menu>
      <MenuTrigger>
        {(p) => (
          <IconButton label="Add" variant="secondary" size={size} {...p}>
            <Plus />
          </IconButton>
        )}
      </MenuTrigger>
      <MenuList align={align}>
        <MenuItem kbd="N" onSelect={onAddCard}>
          New word
        </MenuItem>
        <MenuItem onSelect={onCreateDeck} disabled={!onCreateDeck}>
          New deck
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
