import { useLingui } from "@lingui/react/macro";
import type { DeckPurpose } from "@lymi/core";

/** What a deck can be for, with the web's labels and lines, so a deck reads the same on either. deck-fields.tsx. */
export function usePurposes(): { value: DeckPurpose; label: string; detail: string }[] {
  const { t } = useLingui();
  return [
    {
      value: "language",
      label: t({ message: "A language", context: "deck purpose" }),
      detail: t`Words and phrases in a language you’re learning.`,
    },
    {
      value: "subject",
      label: t`A subject or exam`,
      detail: t`Terms with short explanations, like for a citizenship test.`,
    },
    { value: "other", label: t`Something else`, detail: t`Anything else you want to remember.` },
  ];
}
