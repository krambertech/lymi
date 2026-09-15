import { useNavigate } from "@tanstack/react-router";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

interface AddCard {
  /** Open the capture sheet, optionally targeting one deck. */
  openCard: (deckId?: string, opts?: { sectionId?: string | undefined }) => void;
  /** Open the new-deck field. */
  openDeck: () => void;
  /** Go to the import screen, the third thing the plus adds. */
  openImport: () => void;
  close: (expected?: "card" | "deck") => void;
  /** What is open: nothing, the capture sheet, or the new-deck field. */
  open: "card" | "deck" | null;
  deckId: string | undefined;
  /** The section the capture sheet was opened for, from a section's menu. */
  sectionId: string | undefined;
}

const Ctx = createContext<AddCard | null>(null);

/**
 * Capture is reachable from every screen: `N`, the sidebar's plus and each page header's
 * plus all open the same sheet, so the shell owns it rather than each route.
 */
export function AddCardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<"card" | "deck" | null>(null);
  const [deckId, setDeckId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const [sectionId, setSectionId] = useState<string | undefined>(undefined);

  const value = useMemo<AddCard>(
    () => ({
      open,
      deckId,
      sectionId,
      openCard: (id, opts) => {
        setDeckId(id);
        setSectionId(opts?.sectionId);
        setOpen("card");
      },
      openDeck: () => {
        setDeckId(undefined);
        setSectionId(undefined);
        setOpen("deck");
      },
      openImport: () => {
        setOpen(null);
        void navigate({ to: "/import" });
      },
      close: (expected) =>
        setOpen((current) => (expected && current !== expected ? current : null)),
    }),
    [open, deckId, sectionId, navigate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAddCard(): AddCard {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAddCard outside AddCardProvider");
  return ctx;
}
