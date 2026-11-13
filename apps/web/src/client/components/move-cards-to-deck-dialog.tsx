import { Plural, Trans } from "@lingui/react/macro";
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  /** The learner's other decks of their own. */
  decks: readonly { id: string; name: string }[];
  onPick: (deck: { id: string; name: string }) => void;
}

/** Move to deck for chosen cards: the learner's other decks, and the click is the choice. */
export function MoveCardsToDeckDialog({ open, onOpenChange, count, decks, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Plural value={count} one="Move # card to" other="Move # cards to" />
          </DialogTitle>
          <DialogDescription>
            <Trans>A card keeps its progress and leaves its section.</Trans>
          </DialogDescription>
        </DialogHeader>
        <ul className="grid max-h-[50dvh] gap-1 overflow-y-auto">
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onPick(d);
                }}
                className="edge flex h-12 w-full items-center justify-between gap-3 rounded-md bg-plate px-4 text-start text-base transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-strong hoverable:hover:veil"
              >
                <span dir="auto" className="truncate font-medium">
                  {d.name}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
