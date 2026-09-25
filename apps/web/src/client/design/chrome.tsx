import type { ShellChromeValue } from "../components/layout/shell-chrome";
import { StreakButton, type StreakButtonProps } from "../components/streak";
import { me, streak } from "./mock";

/** The learner's bar controls with sample data, for every tab drawn on the design pages. */
export function designChrome(summary: StreakButtonProps["summary"] = streak): ShellChromeValue {
  return {
    streak: <StreakButton variant="phone" summary={summary} />,
    name: me.name,
    email: me.email,
    docsUrl: "https://lymi.app/docs",
    onAddCard: () => {},
    onCreateDeck: () => {},
  };
}
