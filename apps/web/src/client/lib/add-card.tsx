import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

interface AddCard {
  /** Open the capture sheet, optionally targeting one deck. */
  openCard: (deckId?: string, opts?: { sectionId?: string | undefined }) => void;
  /** Open the new-deck field, optionally making the deck inside one series. */
  openDeck: (opts?: { seriesId?: string | undefined }) => void;
  /** Open Smart add, optionally for one deck. */
  openSmart: (deckId?: string) => void;
  close: (expected?: "card" | "deck" | "smart") => void;
  /** What is open: nothing, the capture sheet, the new-deck field, or Smart add. */
  open: "card" | "deck" | "smart" | null;
  deckId: string | undefined;
  /** The section the capture sheet was opened for, from a section's menu. */
  sectionId: string | undefined;
  /** The series the new-deck field was opened for, from a series' menu. */
  seriesId: string | undefined;
}

const Ctx = createContext<AddCard | null>(null);

/**
 * Capture is reachable from every screen: `N`, the sidebar's plus and each page header's
 * plus all open the same sheet, so the shell owns it rather than each route.
 */
export function AddCardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<"card" | "deck" | "smart" | null>(null);
  const [deckId, setDeckId] = useState<string | undefined>(undefined);
  const [sectionId, setSectionId] = useState<string | undefined>(undefined);
  const [seriesId, setSeriesId] = useState<string | undefined>(undefined);

  const value = useMemo<AddCard>(
    () => ({
      open,
      deckId,
      sectionId,
      seriesId,
      openCard: (id, opts) => {
        setDeckId(id);
        setSectionId(opts?.sectionId);
        setOpen("card");
      },
      openDeck: (opts) => {
        setDeckId(undefined);
        setSectionId(undefined);
        // Read off an object, so a click handler passing its event opens a deck in no series.
        setSeriesId(typeof opts?.seriesId === "string" ? opts.seriesId : undefined);
        setOpen("deck");
      },
      openSmart: (id) => {
        setDeckId(id);
        setSectionId(undefined);
        setOpen("smart");
      },
      close: (expected) =>
        setOpen((current) => (expected && current !== expected ? current : null)),
    }),
    [open, deckId, sectionId, seriesId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAddCard(): AddCard {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAddCard outside AddCardProvider");
  return ctx;
}
