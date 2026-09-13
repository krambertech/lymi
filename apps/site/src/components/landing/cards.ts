/**
 * The cards the landing page shows. Real content on purpose: a stranger should learn
 * something from the page, and the spread is the argument that Lymi holds more than
 * vocabulary. Keep the meanings short enough to read in two lines at 280 px.
 */
export interface SampleCard {
  /** The language or field, shown as the card's label. */
  label: MessageDescriptor;
  term: string;
  meaning: MessageDescriptor;
  /** A sentence the term appears in. Only the review demo uses it. */
  example?: string;
  /** How the term is said. Only the enrich demo uses it. */
  say?: string;
}

export const SAMPLE_CARDS: SampleCard[] = [
  {
    label: msg`Suomi · verb`,
    term: "kuulua",
    meaning: msg`To belong; to be heard`,
    example: "Haluan kuulua tähän joukkoon.",
    say: "KOO-loo-ah",
  },
  {
    label: msg`日本語 · noun`,
    term: "木漏れ日",
    meaning: msg`Sunlight coming through leaves`,
    example: "木漏れ日がきれいだった。",
    say: "ko-mo-re-bi",
  },
  {
    label: msg`Physics`,
    term: "hysteresis",
    meaning: msg`The output depends on the history of the input`,
    example: "The material shows hysteresis under load.",
  },
  {
    label: msg`Chess`,
    term: "zugzwang",
    meaning: msg`Any move you make makes your position worse`,
    example: "Black is in zugzwang and has to give up the pawn.",
  },
  {
    label: msg`Cooking`,
    term: "mise en place",
    meaning: msg`Everything prepped and to hand before you start`,
    example: "Do your mise en place before the pan goes on.",
  },
  {
    label: msg`Español`,
    term: "de bajón",
    meaning: msg`Feeling low; in a slump`,
    example: "Llevo toda la semana de bajón.",
  },
  {
    label: msg`Signals`,
    term: "Nyquist rate",
    meaning: msg`Sample twice as fast as the highest frequency`,
    example: "Below the Nyquist rate the signal aliases.",
  },
  {
    label: msg`Suomi · noun`,
    term: "sisu",
    meaning: msg`Stubborn grit; carrying on anyway`,
    example: "Se vaatii sisua.",
  },
];

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
