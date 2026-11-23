import { answerWord, markAnswer, sameAnswer, singleChange } from "../answers";
import { fixing, markFix } from "../fix";
import { type MarkedItem, realForms } from "../sentences";
import VERIFIED from "../verified-forms.json";
import { ALLOWED_VARIANTS, type AllowedVariant } from "./allowed-variants";

type Person = "1sg" | "2sg" | "3sg" | "1pl" | "2pl" | "3pl";

interface Pronoun {
  person: Person;
  other: string;
}

const PRONOUNS: Readonly<Record<string, Pronoun>> = {
  ma: { person: "1sg", other: "mina" },
  mina: { person: "1sg", other: "ma" },
  sa: { person: "2sg", other: "sina" },
  sina: { person: "2sg", other: "sa" },
  ta: { person: "3sg", other: "tema" },
  tema: { person: "3sg", other: "ta" },
  me: { person: "1pl", other: "meie" },
  meie: { person: "1pl", other: "me" },
  te: { person: "2pl", other: "teie" },
  teie: { person: "2pl", other: "te" },
  nad: { person: "3pl", other: "nemad" },
  nemad: { person: "3pl", other: "nad" },
};

const DROPPABLE: ReadonlySet<Person> = new Set(["1sg", "2sg", "1pl", "2pl"]);

const ALSO_GENITIVE: ReadonlySet<string> = new Set(["ta", "tema", "me", "meie", "te", "teie"]);

const STRESSING: ReadonlySet<string> = new Set([
  "ja",
  "ning",
  "ega",
  "või",
  "aga",
  "vaid",
  "ka",
  "ainult",
  "isegi",
  "just",
]);

const POINTING: ReadonlySet<string> = new Set(["see", "need"]);

const SENTENCE_END = /[.!?…]$/;

const OPENING_QUOTE = /[„“"«‹‚]/;

const PERSONLESS: ReadonlySet<string> = new Set(["ei", "pole", "polnud"]);

const NOT_VERBS: ReadonlySet<string> = new Set(["ema", "ilma", ...Object.keys(PRONOUNS)]);

const ALLOWED_PATH = "apps/site/src/lib/learn/checks/allowed-variants.ts";

const HEADWORDS: Readonly<Record<string, string>> = VERIFIED;

const isVerbForm = (word: string): boolean => {
  const headwords = HEADWORDS[word];
  if (headwords === undefined || headwords.startsWith("by hand")) return false;
  return headwords
    .split(/,\s*/)
    .some((headword) => headword.endsWith("ma") && !NOT_VERBS.has(headword));
};

const ENDS: Readonly<Record<Person, (word: string) => boolean>> = {
  "1sg": (word) => word.endsWith("n") && word !== "on",
  "2sg": (word) => word.endsWith("d") && !/(ud|vad)$/.test(word),
  "3sg": (word) =>
    word === "on" || (/(b|s|i|ks)$/.test(word) && !/(es|mas|maks|ti|di)$/.test(word)),
  "1pl": (word) => word.endsWith("me"),
  "2pl": (word) => word.endsWith("te"),
  "3pl": (word) => word === "on" || /(vad|id)$/.test(word),
};

const carriesPerson = (word: string, person: Person): boolean =>
  isVerbForm(word) && ENDS[person](word);

interface Token {
  lead: string;
  core: string;
  trail: string;
  word: string;
}

const PARTS = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;

function tokenize(sentence: string): Token[] {
  return sentence
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => {
      const [, lead = "", core = "", trail = ""] = text.match(PARTS) ?? [];
      return { lead, core, trail, word: answerWord(core) };
    });
}

const capitalized = (core: string) => core.charAt(0).toUpperCase() + core.slice(1);

const asWritten = (core: string, like: string) =>
  like.charAt(0) === like.charAt(0).toUpperCase() ? capitalized(core) : core;

const joined = (tokens: readonly Token[]) =>
  tokens.map(({ lead, core, trail }) => `${lead}${core}${trail}`).join(" ");

export function alwaysRightVariants(sentence: string): string[] {
  const tokens = tokenize(sentence);
  const variants: string[] = [];
  tokens.forEach((token, at) => {
    const pronoun = PRONOUNS[token.word];
    if (!pronoun || token.trail || at === tokens.length - 1) return;
    const after = tokens[at + 1];
    const before = at > 0 ? tokens[at - 1] : undefined;
    const twoBefore = at > 1 ? tokens[at - 2] : undefined;
    if (before && !before.trail && STRESSING.has(before.word)) return;
    if (after?.word === "ise") return;
    const verbAfter = after && !after.lead ? after.word : undefined;
    const verbBefore =
      before &&
      !before.trail &&
      !token.lead &&
      !ALSO_GENITIVE.has(token.word) &&
      !(twoBefore && !twoBefore.trail && POINTING.has(twoBefore.word))
        ? before.word
        : undefined;
    const agrees = (word: string | undefined) =>
      word !== undefined && carriesPerson(word, pronoun.person);
    const negated = verbAfter !== undefined && PERSONLESS.has(verbAfter);
    if (!agrees(verbAfter) && !agrees(verbBefore) && !negated) return;
    const swapped = tokens.map((each, i) =>
      i === at ? { ...each, core: asWritten(pronoun.other, each.core) } : each,
    );
    variants.push(joined(swapped));
    if (!DROPPABLE.has(pronoun.person) || !(agrees(verbAfter) || agrees(verbBefore))) return;
    const rest = tokens.filter((_, i) => i !== at);
    const next = rest[at];
    const starts =
      !before ||
      SENTENCE_END.test(before.trail) ||
      before.core === "" ||
      OPENING_QUOTE.test(token.lead);
    if (next)
      rest[at] = {
        ...next,
        lead: token.lead + next.lead,
        core: starts ? asWritten(next.core, token.core) : next.core,
      };
    variants.push(joined(rest));
  });
  return variants;
}

const CHECKED: ReadonlySet<MarkedItem["kind"]> = new Set(["translate", "rewrite", "ask", "fix"]);

function variantsOf(answers: readonly string[]): string[] {
  const out: string[] = [];
  for (const answer of answers)
    for (const sentence of alwaysRightVariants(answer))
      if (!out.some((each) => sameAnswer(each, sentence))) out.push(sentence);
  return out;
}

export function rejectedVariants(item: MarkedItem): string[] {
  if (!CHECKED.has(item.kind)) return [];
  if (item.kind !== "fix")
    return variantsOf(item.answers).filter(
      (variant) => markAnswer(variant, item.answers, realForms(item)).verdict !== "right",
    );
  const { wrong } = item;
  if (wrong === undefined) return [];
  const fixed = { ...item, wrong };
  const { at } = fixing(fixed);
  return variantsOf(item.answers).filter((variant) => {
    const change = item.answers
      .map((answer) => singleChange(answer, variant))
      .find((each) => each !== null && each.at === at);
    return (
      change !== undefined && change !== null && markFix(fixed, change.right).verdict !== "right"
    );
  });
}

export function unlistedVariants(
  lesson: string,
  place: "lesson" | "drills",
  items: readonly MarkedItem[],
  at: (item: MarkedItem) => string,
  list: readonly AllowedVariant[] = ALLOWED_VARIANTS,
): string[] {
  const allowed = list.filter((each) => each.lesson === lesson && each.in === place);
  const found = items.flatMap((item) =>
    rejectedVariants(item).map((variant) => ({ item, variant })),
  );
  const isAllowed = (id: string, variant: string) =>
    allowed.some((each) => each.id === id && sameAnswer(each.variant, variant));
  return [
    ...found
      .filter(({ item, variant }) => !isAllowed(item.id, variant))
      .map(
        ({ item, variant }) =>
          `${at(item)}: ${item.kind} item "${item.id}" marks “${variant}” wrong, though it only swaps a pronoun's long and short form or leaves out a pronoun the verb's ending shows. Fix: add it to the item's answers, or to ${ALLOWED_PATH} with the reason a teacher wouldn't accept it here.`,
      ),
    ...allowed
      .filter(
        (each) =>
          !found.some(
            ({ item, variant }) => item.id === each.id && sameAnswer(variant, each.variant),
          ),
      )
      .map(
        (each) =>
          `${ALLOWED_PATH} lists “${each.variant}” for ${lesson} item "${each.id}", which the item now accepts or no longer asks. Fix: take it off the list.`,
      ),
  ];
}
