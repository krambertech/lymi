import { Trans, useLingui } from "@lingui/react/macro";
import { ConfirmDialog } from "./confirm-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckName: string;
  onLeave: () => void;
  pending?: boolean | undefined;
}

/**
 * Leaving asks first, because it is the one archive-shaped move with nothing to undo: the way
 * back is the join link or the deck's public page, and the owner may have closed both.
 */
export function LeaveDeckDialog({ open, onOpenChange, deckName, onLeave, pending }: Props) {
  const { t } = useLingui();
  return (
    <ConfirmDialog
      subject={open ? deckName : null}
      onOpenChange={onOpenChange}
      title={(name) => t`Leave ${name}?`}
      description={
        <Trans>
          The deck leaves Library and its cards stop coming up in review. If you join again, your
          reviews are still there.
        </Trans>
      }
      dismiss={<Trans>Keep studying</Trans>}
      confirm={<Trans>Leave deck</Trans>}
      onConfirm={onLeave}
      pending={pending}
    />
  );
}
