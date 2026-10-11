import type { ComponentProps, ReactNode } from "react";
import { Dialog, DialogContent } from "./ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The word view's heading, which names the place and takes focus as it opens. */
  titleId: string;
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"];
  /** The `WordView` for the card. */
  children: ReactNode;
}

/**
 * A card as a place over the screen that opened it: full screen with back on touch, a side sheet
 * at the end edge on a desktop. Its open state lives in that screen's URL. overlays.md#places.
 */
export function CardPlace({ open, onClose, titleId, finalFocus, children }: Props) {
  return (
    <Dialog
      kind="place"
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        // A field being edited saves on blur, which removing the sheet would skip.
        (document.activeElement as HTMLElement | null)?.blur();
        onClose();
      }}
    >
      <DialogContent
        placement="end"
        aria-labelledby={titleId}
        initialFocus={() => document.getElementById(titleId)}
        finalFocus={finalFocus}
        className="px-7 pt-6 pb-10"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
