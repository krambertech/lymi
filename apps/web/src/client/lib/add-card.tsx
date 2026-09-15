import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from "react";

interface AddCard {
  /** Open the capture sheet, optionally targeting one deck. */
  openCard: (deckId?: string) => void;
  /** Open the new-deck field. `resumeCard` comes back to the capture sheet afterwards. */
  openDeck: (options?: { resumeCard?: boolean }) => void;
  /** The deck exists now, so a capture sheet waiting on it reopens with it chosen. */
  deckCreated: (deckId: string) => void;
  close: (expected?: "card" | "deck") => void;
  /** What is open: nothing, the capture sheet, or the new-deck field. */
  open: "card" | "deck" | null;
  deckId: string | undefined;
}

const Ctx = createContext<AddCard | null>(null);

/**
 * Capture is reachable from every screen: `N`, the sidebar's plus and each page header's
 * plus all open the same sheet, so the shell owns it rather than each route.
 */
export function AddCardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<"card" | "deck" | null>(null);
  const [deckId, setDeckId] = useState<string | undefined>(undefined);
  // A deck made from inside the capture sheet belongs to the card being typed, so finishing or
  // leaving the deck form goes back to that card rather than dropping it.
  const resuming = useRef(false);

  const value = useMemo<AddCard>(
    () => ({
      open,
      deckId,
      openCard: (id) => {
        resuming.current = false;
        setDeckId(id);
        setOpen("card");
      },
      openDeck: (options) => {
        resuming.current = !!options?.resumeCard;
        setDeckId(undefined);
        setOpen("deck");
      },
      deckCreated: (id) => {
        if (!resuming.current) return;
        resuming.current = false;
        setDeckId(id);
        setOpen("card");
      },
      close: (expected) =>
        setOpen((current) => {
          if (expected && current !== expected) return current;
          return current === "deck" && resuming.current ? "card" : null;
        }),
    }),
    [open, deckId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAddCard(): AddCard {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAddCard outside AddCardProvider");
  return ctx;
}
