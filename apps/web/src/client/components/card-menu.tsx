import { useLingui } from "@lingui/react/macro";
import { Anchor, Archive, ChartNoAxesColumn, Ellipsis, SquarePen } from "lucide-react";
import { IconButton } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A ⋯ beside the card with a mouse; on touch the trigger is for a screen reader alone. */
  visible: boolean;
  hasHook: boolean;
  /** Only the deck's owner changes its cards, so a member sees the stats alone. */
  canEdit: boolean;
  onHook: () => void;
  onEdit: () => void;
  onStats: () => void;
  onArchive: () => void;
}

/**
 * What can be done with the card on screen once its answer shows. It is never a primary action of
 * review, so it is a faint ⋯ beside the card with a mouse, and a tap on the card on touch.
 */
export function CardMenu({
  open,
  onOpenChange,
  visible,
  hasHook,
  canEdit,
  onHook,
  onEdit,
  onStats,
  onArchive,
}: Props) {
  const { t } = useLingui();
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <IconButton
            label={t`Card options`}
            size="sm"
            round
            className={
              visible
                ? "text-faint hoverable:hover:text-text-2"
                : "sr-only focus-visible:not-sr-only"
            }
          >
            <Ellipsis />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label={t`Card options`} align="end">
        {canEdit && (
          <DropdownMenuItem onClick={onHook}>
            <Anchor aria-hidden="true" />
            {hasHook ? t`Edit hook` : t`Add hook`}
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <SquarePen aria-hidden="true" />
            {t`Edit card`}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onStats}>
          <ChartNoAxesColumn aria-hidden="true" />
          {t`See stats`}
        </DropdownMenuItem>
        {canEdit && <DropdownMenuSeparator />}
        {canEdit && (
          <DropdownMenuItem variant="danger" onClick={onArchive}>
            <Archive aria-hidden="true" />
            {t`Archive card`}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
