import { Trans, useLingui } from "@lingui/react/macro";
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
  const { t } = useLingui();
  return (
    <Menu>
      <MenuTrigger>
        {(p) => (
          <IconButton label={t`Add`} variant={variant} round size={size} {...p}>
            <Plus />
          </IconButton>
        )}
      </MenuTrigger>
      <MenuList align={align}>
        <MenuItem kbd="N" icon={<PenLine aria-hidden="true" />} onSelect={onAddCard}>
          <Trans>New word</Trans>
        </MenuItem>
        <MenuItem
          icon={<BookMarked aria-hidden="true" />}
          onSelect={onCreateDeck}
          disabled={!onCreateDeck}
        >
          <Trans>New deck</Trans>
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
