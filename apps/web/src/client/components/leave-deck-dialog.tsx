import { Trans, useLingui } from "@lingui/react/macro";
import { useRef } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckName: string;
  onLeave: () => void;
  leaving?: boolean | undefined;
}

/**
 * Leaving asks first, because it is the one archive-shaped move with nothing to undo: the way
 * back is the join link or the deck's public page, and the owner may have closed both.
 */
export function LeaveDeckDialog({ open, onOpenChange, deckName, onLeave, leaving }: Props) {
  const { t } = useLingui();
  // The name keeps showing while the dialog slides away.
  const last = useRef(deckName);
  if (deckName) last.current = deckName;
  const name = deckName || last.current;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,440px)]">
        <DialogHeader>
          <DialogTitle>{t`Leave ${name}?`}</DialogTitle>
          <DialogDescription>
            <Trans>
              The deck leaves Library and its cards stop coming up. Your reviews are kept, so
              joining again picks up where you left off.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Keep studying</Trans>
          </Button>
          <Button variant="danger" onClick={onLeave} loading={leaving} aria-disabled={leaving}>
            <Trans>Leave deck</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
