import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

interface AddCard {
  /** Open the capture sheet, optionally targeting one deck. */
  openCard: (deckId?: string) => void;
  /** Open the new-deck field. */
  openDeck: () => void;
  close: () => void;
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
  const value = useMemo<AddCard>(
    () => ({
      open,
      deckId,
      openCard: (id) => {
        setDeckId(id);
        setOpen("card");
      },
      openDeck: () => {
        setDeckId(undefined);
        setOpen("deck");
      },
      close: () => setOpen(null),
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
