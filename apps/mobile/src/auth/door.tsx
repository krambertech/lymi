import { createContext, type ReactNode, useContext } from "react";
import { type SignIn, useSignIn } from "./use-sign-in";

const DoorContext = createContext<SignIn | null>(null);

/** One sign-in state for the welcome screen and the email screen it opens. */
export function DoorProvider({ children }: { children: ReactNode }) {
  return <DoorContext.Provider value={useSignIn()}>{children}</DoorContext.Provider>;
}

export function useDoor(): SignIn {
  const door = useContext(DoorContext);
  if (!door) throw new Error("useDoor needs a DoorProvider");
  return door;
}
