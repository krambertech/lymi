import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { WORK_ANSWERS, WORK_FIXES, WORK_TELL, WORK_TRANSLATE } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const PLACE_RULE = msg`Work places follow the regular place endings: <et>kontoris</et>, <et>tööle</et>, <et>puhkusele</et>.`;
const DEADLINE_RULE = msg`A deadline with “by” usually takes <et>-ks</et>: <et>reedeks</et>.`;
const WITH_RULE = msg`<et>Rääkima</et> and <et>kohtuma</et> with someone usually take <et>-ga</et>.`;
const VOCAB_RULE = msg`Core workplace nouns used in schedules, contracts and leave requests.`;

const TELL_LABELS = {
  now: { id: "now", label: msg`Routine or fact` },
  plan: { id: "plan", label: msg`Request, deadline or plan` },
} as const;

const TRANS_PROMPTS: Record<(typeof WORK_TRANSLATE)[number], MessageDescriptor> = {
  "Ma töötan kontoris.": msg`I work in an office.`,
  "Koosolek algab kell kümme.": msg`The meeting starts at ten.`,
  "Kas te saaksite selle reedeks saata?": msg`Could you send this by Friday?`,
  "Ma lähen juulis puhkusele.": msg`I am going on holiday in July.`,
  "Ma pean selle aruande täna valmis saama.": msg`I have to finish this report today.`,
  "Ma rääkisin täna oma ülemusega.": msg`I spoke with my manager today.`,
};

const FIX_PROMPTS: Record<(typeof WORK_FIXES)[number]["id"], MessageDescriptor> = {
  kontoris: msg`I am in the office today.`,
  toole: msg`They are going to work tomorrow.`,
  reedeks: msg`The report must be ready by Friday.`,
  kolleegiga: msg`I met a new colleague yesterday.`,
  tooga: msg`Can you help me with this work?`,
  "kell-kuus": msg`I went home from work at six yesterday.`,
};

const toAsciiId = (text: string) =>
  text
    .toLowerCase()
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("õ", "o")
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");

const formItem = (
  id: string,
  rule: "place" | "deadline" | "with" | "vocab",
  base: string,
  gloss: MessageDescriptor,
  cue: string,
  answer: string,
  say: string,
): FormDrill => ({
  kind: "form",
  id: `form-${id}`,
  rule,
  base,
  gloss,
  cue: { et: cue },
  answers: [answer],
  say,
  explain:
    rule === "place"
      ? PLACE_RULE
      : rule === "deadline"
        ? DEADLINE_RULE
        : rule === "with"
          ? WITH_RULE
          : VOCAB_RULE,
});

const tellItem = (index: number): ChoiceDrill => {
  const item = WORK_TELL[index] as (typeof WORK_TELL)[number];
  return {
    kind: "choice",
    id: `tell-${item.id}`,
    rule: "vocab",
    say: item.said,
    answer: TELL_LABELS[item.kind],
    wrong: [TELL_LABELS[item.kind === "now" ? "plan" : "now"]],
    explain: VOCAB_RULE,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    place: { label: msg`Work places: <et>kontoris, tööle, puhkusele</et>`, section: "words" },
    deadline: { label: msg`Deadlines: <et>reedeks</et>`, section: "write" },
    with: {
      label: msg`With people and tasks: <et>kolleegiga, ülemusega, tööga</et>`,
      section: "fix",
    },
    vocab: {
      label: msg`Office terms: <et>koosolek, leping, tähtaeg, palk</et>`,
      section: "words",
    },
  },
  items: [
    formItem(
      "kontoris",
      "place",
      "kontor",
      msg`office`,
      "Ma töötan ___.",
      "kontoris",
      "Ma töötan kontoris.",
    ),
    formItem(
      "toole",
      "place",
      "töö",
      msg`to work`,
      "Ta läheb homme ___.",
      "tööle",
      "Ta läheb homme tööle.",
    ),
    formItem(
      "puhkusele",
      "place",
      "puhkus",
      msg`holiday, leave`,
      "Ma lähen juulis ___.",
      "puhkusele",
      "Ma lähen juulis puhkusele.",
    ),
    formItem(
      "reedeks",
      "deadline",
      "reede",
      msg`by Friday`,
      "Aruanne peab valmis olema ___.",
      "reedeks",
      "Aruanne peab valmis olema reedeks.",
    ),
    formItem(
      "kolmapaevaks",
      "deadline",
      "kolmapäev",
      msg`by Wednesday`,
      "Palun saatke aruanne mulle ___.",
      "kolmapäevaks",
      "Palun saatke aruanne mulle kolmapäevaks.",
    ),
    formItem(
      "kolleegiga",
      "with",
      "kolleeg",
      msg`colleague`,
      "Ma kohtusin eile uue ___.",
      "kolleegiga",
      "Ma kohtusin eile uue kolleegiga.",
    ),
    formItem(
      "ulemusega",
      "with",
      "ülemus",
      msg`manager, boss`,
      "Ma rääkisin täna oma ___.",
      "ülemusega",
      "Ma rääkisin täna oma ülemusega.",
    ),
    formItem(
      "lepingu",
      "vocab",
      "leping",
      msg`contract`,
      "Me allkirjastame uue ___.",
      "lepingu",
      "Me allkirjastame uue lepingu.",
    ),
    tellItem(0),
    tellItem(1),
    tellItem(2),
    tellItem(3),
    tellItem(4),
    tellItem(5),
    tellItem(6),
    tellItem(7),
    ...WORK_TRANSLATE.map((said) => {
      const rule =
        said.includes("kontoris") || said.includes("puhkusele")
          ? "place"
          : said.includes("reedeks")
            ? "deadline"
            : said.includes("ülemusega")
              ? "with"
              : "vocab";
      return {
        kind: "translate" as const,
        id: `write-${toAsciiId(said)}`,
        rule: rule as "place" | "deadline" | "with" | "vocab",
        prompt: TRANS_PROMPTS[said],
        answers: WORK_ANSWERS[said],
        say: said,
        explain:
          rule === "place"
            ? PLACE_RULE
            : rule === "deadline"
              ? DEADLINE_RULE
              : rule === "with"
                ? WITH_RULE
                : VOCAB_RULE,
      };
    }),
    ...WORK_FIXES.map((item) => {
      const rule =
        item.id === "kontoris" || item.id === "toole"
          ? "place"
          : item.id === "reedeks"
            ? "deadline"
            : item.id === "kell-kuus"
              ? "vocab"
              : "with";
      return {
        kind: "fix" as const,
        id: `fix-${item.id}`,
        rule: rule as "place" | "deadline" | "with" | "vocab",
        wrong: item.wrong,
        prompt: FIX_PROMPTS[item.id],
        answers: [item.right] as readonly [string, ...string[]],
        say: item.right,
        explain:
          rule === "place"
            ? PLACE_RULE
            : rule === "deadline"
              ? DEADLINE_RULE
              : rule === "vocab"
                ? VOCAB_RULE
                : WITH_RULE,
      };
    }),
  ],
};
