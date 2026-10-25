import { useLingui } from "@lingui/react/macro";
import { Archive, ChartNoAxesColumn, Ellipsis, Flag, SquarePen, Star } from "lucide-react";
import { IconButton } from "./button";
import { HintIcon } from "./hint-icon";
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
  hasHint: boolean;
  /** The learner's own mark, so a member of a shared deck sets it too. */
  important: boolean;
  onImportantChange: (important: boolean) => void;
  /** Only the deck's owner changes its cards, so a member can only view the card. */
  canEdit: boolean;
  onHint: () => void;
  onEdit: () => void;
  /** Opens the card as a place over review: its fields, schedule and history. */
  onView: () => void;
  onArchive: () => void;
  /** Someone else's card: the learner can report it to Lymi. */
  onReport?: (() => void) | undefined;
  /** Where focus goes as the menu closes; see `DropdownMenuContent`. */
  finalFocus?: ((closeType: unknown) => boolean | HTMLElement | null | undefined) | undefined;
}

/**
 * What can be done with the card on screen once its answer shows. It is never a primary action of
 * review, so it is a faint ⋯ beside the card with a mouse, and a tap on the card on touch.
 */
export function CardMenu({
  open,
  onOpenChange,
  visible,
  hasHint,
  important,
  onImportantChange,
  canEdit,
  onHint,
  onEdit,
  onView,
  onArchive,
  onReport,
  finalFocus,
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
                ? // Muted, not faint: a control needs 3:1 against the canvas, which faint misses.
                  "text-muted hoverable:hover:text-text-2"
                : "sr-only focus-visible:not-sr-only"
            }
          >
            <Ellipsis />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label={t`Card options`} align="end" finalFocus={finalFocus}>
        {canEdit && (
          <DropdownMenuItem onClick={onHint}>
            <HintIcon aria-hidden="true" />
            {hasHint ? t`Edit hint` : t`Add hint`}
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <SquarePen aria-hidden="true" />
            {t`Edit card`}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onImportantChange(!important)}>
          <Star aria-hidden="true" className={important ? "fill-current" : undefined} />
          {important ? t`Unmark important` : t`Mark important`}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onView}>
          <ChartNoAxesColumn aria-hidden="true" />
          {t`View card`}
        </DropdownMenuItem>
        {onReport && <DropdownMenuSeparator />}
        {onReport && (
          <DropdownMenuItem onClick={onReport}>
            <Flag aria-hidden="true" />
            {t`Report card`}
          </DropdownMenuItem>
        )}
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
