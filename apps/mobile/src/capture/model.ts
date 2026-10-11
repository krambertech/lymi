import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { cardLimits } from "@lymi/core";
import type { IconName } from "../ui/icons";

/** The fields a card can carry beyond its term and meaning, offered as chips over the keyboard. */
export type Extra = "example" | "pronunciation" | "hook" | "source";

export const EXTRAS: {
  key: Extra;
  icon: IconName;
  label: MessageDescriptor;
  /** What goes in it, as the empty line's placeholder. */
  hint: MessageDescriptor;
  limit: number | null;
}[] = [
  {
    key: "example",
    icon: "example",
    label: msg`Example`,
    hint: msg`A sentence that uses it`,
    limit: cardLimits.example,
  },
  {
    key: "pronunciation",
    icon: "pronunciation",
    label: msg`Pronunciation`,
    hint: msg`How it sounds`,
    limit: cardLimits.pronunciation,
  },
  {
    key: "hook",
    icon: "hook",
    label: msg`Memory hook`,
    hint: msg`A short phrase that helps you remember it.`,
    limit: cardLimits.hook,
  },
  {
    key: "source",
    icon: "source",
    label: msg`Source`,
    hint: msg`Where you met it, such as a lesson`,
    limit: cardLimits.source,
  },
];

/** What the last add did, said under the fields until the next one. */
export type Outcome =
  | {
      kind: "added";
      id: string;
      term: string;
      deckName: string;
      queued: boolean;
      /** Why the card went in without its picture. */
      pictureError?: string | undefined;
      /** The picture that did not reach the card, held for Try again. */
      picture?: Picture | undefined;
    }
  | { kind: "skipped"; term: string; deckName: string };

export const UNDO_FOR = 5000;

/** A picture chosen for the card, uploaded once the card exists. */
export type Picture = { uri: string; name: string; type: string; description: string };
