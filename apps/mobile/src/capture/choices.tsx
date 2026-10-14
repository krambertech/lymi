import type { ReviewModeKey } from "@lymi/core";
import { useLocalSearchParams } from "expo-router";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CAPTURE_KEYS, captureStore } from "../data/kept";
import type { Picture } from "./model";

interface Choices {
  deckId: string | null;
  chooseDeck: (id: string) => void;
  sectionId: string | null;
  setSectionId: Dispatch<SetStateAction<string | null>>;
  picture: Picture | null;
  setPicture: Dispatch<SetStateAction<Picture | null>>;
  modes: ReviewModeKey[] | null;
  setModes: Dispatch<SetStateAction<ReviewModeKey[] | null>>;
}

const ChoicesContext = createContext<Choices | null>(null);

/** What Add a word's choices set, shared by the card and the sheet each opens over it. */
export function ChoicesProvider({ children }: { children: ReactNode }) {
  const params = useLocalSearchParams<{ deck?: string }>();
  const [deckId, setDeckId] = useState(
    () => params.deck ?? captureStore.getString(CAPTURE_KEYS.deck) ?? null,
  );
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [modes, setModes] = useState<ReviewModeKey[] | null>(null);
  const chooseDeck = useCallback((id: string) => {
    setDeckId(id);
    // A section and modes belong to a deck, so a new deck starts without them.
    setSectionId(null);
    setModes(null);
    captureStore.set(CAPTURE_KEYS.deck, id);
  }, []);
  const value = useMemo(
    () => ({ deckId, chooseDeck, sectionId, setSectionId, picture, setPicture, modes, setModes }),
    [deckId, chooseDeck, sectionId, picture, modes],
  );
  return <ChoicesContext.Provider value={value}>{children}</ChoicesContext.Provider>;
}

export function useChoices() {
  const choices = useContext(ChoicesContext);
  if (!choices) throw new Error("useChoices needs ChoicesProvider");
  return choices;
}
