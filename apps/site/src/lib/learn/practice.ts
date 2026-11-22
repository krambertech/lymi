/**
 * The marking behind the practice parts that are not one answer per round: sorting words into bins,
 * matching pairs, building a sentence from tiles and typing a form. Each is a small reducer or a pure
 * function, so the components stay drawing and the rules stay tested.
 */

/* Sort: words into two or three bins, one Check for all. */

export interface SortState {
  /** Every item's id, in the order shown. */
  items: readonly string[];
  /** Which bin each placed item is in. */
  places: Readonly<Record<string, string>>;
  /** The item picked to place next, by tap or keyboard. */
  picked: string | null;
  checked: boolean;
}

export type SortEvent =
  | { type: "picked"; item: string }
  /** `bin: null` takes the item back out of its bin. */
  | { type: "placed"; item: string; bin: string | null }
  | { type: "checked" }
  | { type: "restarted"; items?: readonly string[] };

export function startSort(items: readonly string[]): SortState {
  return { items, places: {}, picked: null, checked: false };
}

export const sortedAll = (state: SortState): boolean =>
  state.items.every((item) => state.places[item] !== undefined);

export function sortReducer(state: SortState, event: SortEvent): SortState {
  switch (event.type) {
    case "picked":
      if (state.checked) return state;
      // Picking the picked item again puts it down.
      return { ...state, picked: state.picked === event.item ? null : event.item };
    case "placed": {
      if (state.checked) return state;
      const places = { ...state.places };
      if (event.bin === null) delete places[event.item];
      else places[event.item] = event.bin;
      return { ...state, places, picked: null };
    }
    case "checked":
      return state.checked || !sortedAll(state) ? state : { ...state, checked: true, picked: null };
    case "restarted":
      return startSort(event.items ?? state.items);
  }
}

/** Right or wrong for each item, in the order shown. */
export function sortResults(state: SortState, bins: Readonly<Record<string, string>>): boolean[] {
  return state.items.map((item) => state.places[item] === bins[item]);
}

/* Match: pairs across two columns. Tap one side, then the other. */

export type Side = "left" | "right";

export interface MatchState {
  pairs: number;
  chosen: { side: Side; id: string } | null;
  /** Pair ids, in the order they were matched. */
  matched: readonly string[];
  /** Pairs the learner got wrong at least once before matching them. */
  missed: readonly string[];
  mistakes: number;
  /** The last wrong try, shown for a moment, then cleared. */
  wrong: { left: string; right: string } | null;
}

export type MatchEvent =
  | { type: "chose"; side: Side; id: string }
  | { type: "cleared" }
  | { type: "restarted" };

export function startMatch(pairs: number): MatchState {
  return { pairs, chosen: null, matched: [], missed: [], mistakes: 0, wrong: null };
}

export const matchDone = (state: MatchState): boolean => state.matched.length === state.pairs;

export function matchReducer(state: MatchState, event: MatchEvent): MatchState {
  switch (event.type) {
    case "chose": {
      if (state.matched.includes(event.id)) return state;
      const { chosen } = state;
      if (!chosen || chosen.side === event.side) {
        // A second tap on the chosen one lets it go; a tap on its own side swaps it.
        const same = chosen?.side === event.side && chosen.id === event.id;
        return { ...state, chosen: same ? null : { side: event.side, id: event.id }, wrong: null };
      }
      if (chosen.id === event.id)
        return { ...state, chosen: null, wrong: null, matched: [...state.matched, event.id] };
      // A wrong try counts against the pair the learner started from: the one they were answering.
      const left = event.side === "left" ? event.id : chosen.id;
      const right = event.side === "right" ? event.id : chosen.id;
      return {
        ...state,
        chosen: null,
        mistakes: state.mistakes + 1,
        missed: state.missed.includes(chosen.id) ? state.missed : [...state.missed, chosen.id],
        wrong: { left, right },
      };
    }
    case "cleared":
      return state.wrong ? { ...state, wrong: null } : state;
    case "restarted":
      return startMatch(state.pairs);
  }
}

/** For each pair, in the order given: matched without a wrong try. */
export const matchResults = (state: MatchState, ids: readonly string[]): (boolean | undefined)[] =>
  ids.map((id) => (state.matched.includes(id) ? !state.missed.includes(id) : undefined));

/* Order: build a sentence from word tiles. */

const END = /[.?!…]+$/;

/** A sentence's words, without the commas and the mark at its end. */
export function sentenceWords(sentence: string): string[] {
  return sentence
    .trim()
    .replace(END, "")
    .split(/\s+/)
    .map((word) => word.replace(/[,;:]+$/, ""))
    .filter(Boolean);
}

/** The mark that ends a sentence, a full stop when it has none. */
export const sentenceEnd = (sentence: string): string => sentence.trim().match(END)?.[0] ?? ".";

/**
 * The tiles for a sentence: its words as the first answer writes them, the first one lowercased
 * unless another answer writes it with a capital inside the sentence, as a name would be.
 */
export function orderTiles(answers: readonly string[], spare: readonly string[] = []): string[] {
  const [first = "", ...others] = answers.map(sentenceWords);
  const head = first[0];
  const isName =
    head !== undefined && others.some((words) => words.slice(1).some((word) => word === head));
  const words =
    head === undefined || isName
      ? first
      : [head.charAt(0).toLowerCase() + head.slice(1), ...first.slice(1)];
  return [...words, ...spare];
}

const fold = (words: readonly string[]) => words.map((word) => word.toLowerCase()).join(" ");

/** Whether the words in order are one of the sentence's right orders. Case doesn't count. */
export function orderMatches(words: readonly string[], answers: readonly string[]): boolean {
  const built = fold(words);
  return built !== "" && answers.some((answer) => fold(sentenceWords(answer)) === built);
}

/** The sentence line: which tiles, by index, stand in it and in what order. */
export type OrderEvent =
  | { type: "added"; tile: number; at?: number }
  | { type: "removed"; tile: number }
  | { type: "moved"; tile: number; to: number }
  | { type: "cleared" };

export function lineReducer(line: readonly number[], event: OrderEvent): readonly number[] {
  switch (event.type) {
    case "added": {
      if (line.includes(event.tile)) return line;
      const at = Math.max(0, Math.min(event.at ?? line.length, line.length));
      return [...line.slice(0, at), event.tile, ...line.slice(at)];
    }
    case "removed":
      return line.includes(event.tile) ? line.filter((tile) => tile !== event.tile) : line;
    case "moved": {
      if (!line.includes(event.tile)) return line;
      const rest = line.filter((tile) => tile !== event.tile);
      const to = Math.max(0, Math.min(event.to, rest.length));
      return [...rest.slice(0, to), event.tile, ...rest.slice(to)];
    }
    case "cleared":
      return [];
  }
}

/* Form: type or pick the form a cue asks for. */

/** A typed form, read the way a learner means it: case, spaces and a full stop don't count. */
export function normalizeForm(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[“”"«»„]/g, "")
    .trim()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formMatches(value: string, answers: readonly string[]): boolean {
  const typed = normalizeForm(value);
  return typed !== "" && answers.some((answer) => normalizeForm(answer) === typed);
}

const bare = (value: string) => normalizeForm(value).normalize("NFD").replace(/\p{M}/gu, "");

/** Wrong only in its marks, such as a for ä or o for õ: worth saying so. */
export function onlyMarksDiffer(value: string, answers: readonly string[]): boolean {
  return !formMatches(value, answers) && answers.some((answer) => bare(answer) === bare(value));
}

/** The letters a learner can't always type, offered as keys under a field. */
export const ESTONIAN_LETTERS = ["õ", "ä", "ö", "ü", "š", "ž"] as const;

/** A letter put into a field at its caret, replacing any selection: the new value and caret. */
export function insertAt(
  value: string,
  letter: string,
  start: number | null,
  end: number | null,
): { value: string; caret: number } {
  const from = start ?? value.length;
  const to = end ?? from;
  return { value: value.slice(0, from) + letter + value.slice(to), caret: from + letter.length };
}
