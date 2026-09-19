import { createContext, type ReactNode, useContext } from "react";
import { AddMenu } from "../add-menu";
import { LearnerMenu } from "../learner-menu";
import type { StaticNav } from "../nav-link";

export interface ShellChromeValue {
  streak?: ReactNode | undefined;
  name: string | undefined;
  email?: string | undefined;
  docsUrl: string;
  onAddCard: () => void;
  onCreateDeck?: (() => void) | undefined;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  /** The design page has no router, so every link under it is a plain anchor. */
  static?: StaticNav;
}

const ShellChromeContext = createContext<ShellChromeValue | null>(null);

/** What every tab's bar shows, set once at the root so a view never threads it through. */
export const ShellChrome = ShellChromeContext.Provider;

export function useShellChrome() {
  return useContext(ShellChromeContext);
}

/** The end of a tab's bar: streak, capture, avatar. */
export function TabActions() {
  const chrome = useShellChrome();
  if (!chrome) return null;
  return (
    <>
      {chrome.streak}
      <AddMenu onAddCard={chrome.onAddCard} onCreateDeck={chrome.onCreateDeck} align="end" />
      <LearnerMenu
        variant="phone"
        name={chrome.name}
        email={chrome.email}
        docsUrl={chrome.docsUrl}
        onSignOut={chrome.onSignOut}
        signingOut={chrome.signingOut}
        static={chrome.static}
      />
    </>
  );
}
