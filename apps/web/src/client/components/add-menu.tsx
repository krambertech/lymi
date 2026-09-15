import { Trans, useLingui } from "@lingui/react/macro";
import { BookMarked, FileUp, PenLine, Plus } from "lucide-react";
import { IconButton } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/**
 * One plus for both things a learner adds. It sits in the rail beside the mark on desktop and
 * in the page header on the phone, so capture is one tap from every screen. Round and amber:
 * capture is the app's standing action, and the only one that is on every screen.
 */
export function AddMenu({
  onAddCard,
  onCreateDeck,
  onImport,
  size = "md",
  align = "start",
  variant = "primary",
}: {
  onAddCard: () => void;
  onCreateDeck?: (() => void) | undefined;
  /** Opens the import screen. */
  onImport?: (() => void) | undefined;
  size?: "sm" | "md" | undefined;
  align?: "start" | "end" | undefined;
  variant?: "primary" | "secondary" | undefined;
}) {
  const { t } = useLingui();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t`Add`} variant={variant} round size={size}>
            <Plus />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label={t`Add`} align={align}>
        <DropdownMenuItem onClick={onAddCard}>
          <PenLine aria-hidden="true" />
          <Trans>New card</Trans>
          <DropdownMenuShortcut>N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateDeck} disabled={!onCreateDeck}>
          <BookMarked aria-hidden="true" />
          <Trans>New deck</Trans>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport} disabled={!onImport}>
          <FileUp aria-hidden="true" />
          <Trans>Import from Anki</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
