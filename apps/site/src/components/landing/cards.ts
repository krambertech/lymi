/**
 * The cards the landing page shows. Real content on purpose: a stranger should learn
 * something from the page, and the spread is the argument that Lymi holds more than
 * vocabulary. Keep the meanings short enough to read in two lines at 280 px.
 */
export interface SampleCard {
  /** The language or field, shown as the card's label. */
  label: string;
  term: string;
  meaning: string;
  /** A sentence the term appears in. Only the review demo uses it. */
  example?: string;
  /** How the term is said. Only the enrich demo uses it. */
  say?: string;
}

export const SAMPLE_CARDS: SampleCard[] = [
  {
    label: "Suomi · verb",
    term: "kuulua",
    meaning: "To belong; to be heard",
    example: "Haluan kuulua tähän joukkoon.",
    say: "KOO-loo-ah",
  },
  {
    label: "日本語 · noun",
    term: "木漏れ日",
    meaning: "Sunlight coming through leaves",
    example: "木漏れ日がきれいだった。",
    say: "ko-mo-re-bi",
  },
  {
    label: "Physics",
    term: "hysteresis",
    meaning: "The output depends on the history of the input",
    example: "The material shows hysteresis under load.",
  },
  {
    label: "Chess",
    term: "zugzwang",
    meaning: "Any move you make makes your position worse",
    example: "Black is in zugzwang and has to give up the pawn.",
  },
  {
    label: "Cooking",
    term: "mise en place",
    meaning: "Everything prepped and to hand before you start",
    example: "Do your mise en place before the pan goes on.",
  },
  {
    label: "Español",
    term: "de bajón",
    meaning: "Feeling low; in a slump",
    example: "Llevo toda la semana de bajón.",
  },
  {
    label: "Signals",
    term: "Nyquist rate",
    meaning: "Sample twice as fast as the highest frequency",
    example: "Below the Nyquist rate the signal aliases.",
  },
  {
    label: "Suomi · noun",
    term: "sisu",
    meaning: "Stubborn grit; carrying on anyway",
    example: "Se vaatii sisua.",
  },
];
