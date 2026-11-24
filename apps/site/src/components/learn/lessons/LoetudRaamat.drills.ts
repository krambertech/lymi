import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  PART_FIX_ANSWERS,
  PART_FIXES,
  PART_GAPS,
  PART_HEARD,
  PART_TRANSLATE,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const KINDS = {
  now: msg`It is doing it now`,
  did: msg`It has done it, or it has changed`,
  done: msg`Someone has done it to it`,
} as const;
type Kind = keyof typeof KINDS;

const EXPLAIN: Record<Kind, ChoiceDrill["explain"]> = {
  now: msg`The <et>-v</et> form usually means the noun is doing it now.`,
  did: msg`The <et>-nud</et> form usually means the noun has done it or changed.`,
  done: msg`The <et>-tud</et> form usually means someone has done it to the noun.`,
};

const hear = (item: (typeof PART_HEARD)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${item.id}`,
  rule: "meaning",
  say: item.said,
  answer: { id: item.kind, label: KINDS[item.kind] },
  wrong: (Object.keys(KINDS) as Kind[])
    .filter((each) => each !== item.kind)
    .map((each) => ({ id: each, label: KINDS[each] })),
  explain: EXPLAIN[item.kind],
});

const GLOSS: Record<(typeof PART_GAPS)[number]["id"], FormDrill["gloss"]> = {
  closed: msg`closed`,
  book: msg`read`,
  tired: msg`tired`,
  water: msg`running`,
  child: msg`sleeping`,
  flower: msg`dried out`,
  work: msg`done`,
  letter: msg`written`,
  week: msg`coming`,
  cat: msg`lost`,
};

const FORM_WHY: Record<(typeof PART_GAPS)[number]["id"], FormDrill["explain"]> = {
  closed: msg`Someone closed it: <et>suletud</et>.`,
  book: msg`Someone read it: <et>loetud</et>.`,
  tired: msg`He got tired himself: <et>väsinud</et>.`,
  water: msg`The water is running now, and the form follows its noun: <et>jooksvat</et>.`,
  child: msg`The child is asleep now, and the form follows its noun: <et>magavat</et>.`,
  flower: msg`It dried out by itself: <et>kuivanud</et>.`,
  work: msg`Someone did the work: <et>tehtud</et>.`,
  letter: msg`Someone wrote it: <et>kirjutatud</et>.`,
  week: msg`The week is coming, and the form follows its noun: <et>tulevat</et>.`,
  cat: msg`The cat went missing: <et>kadunud</et>.`,
};

const make = (gap: (typeof PART_GAPS)[number]): FormDrill => {
  const starts = gap.before === "";
  const said = [gap.before, gap.answers[0], gap.after].filter(Boolean).join(" ");
  return {
    kind: "form",
    id: `make-${gap.id}`,
    rule: "form",
    base: gap.base,
    gloss: GLOSS[gap.id],
    cue: { et: starts ? `… ${gap.after}` : `${gap.before} … ${gap.after}` },
    answers: starts ? [gap.answers[0], gap.answers[0].toLowerCase()] : gap.answers,
    say: said,
    explain: FORM_WHY[gap.id],
  };
};

const FIX_WHY: Record<(typeof PART_FIXES)[number]["right"], FixDrill["explain"]> = {
  "Ta ostis kasutatud auto.": msg`Someone used the car before, so it takes <et>-tud</et>.`,
  "Kukkunud leht on maas.": msg`The leaf has fallen: <et>kukkunud</et>.`,
  "Ma nägin voodis magavat last.": msg`The <et>-v</et> form changes with its noun: <et>magavat last</et>.`,
  "Ma ootan tulevat nädalavahetust.": msg`The <et>-v</et> form changes with its noun: <et>tulevat nädalavahetust</et>.`,
  "Me otsime kadunud kassi.": msg`The noun changes, and <et>kadunud</et> usually stays the same.`,
  "Ma kuulen jooksvat vett.": msg`The <et>-v</et> form changes with its noun: <et>jooksvat vett</et>.`,
};

const fix = (item: (typeof PART_FIXES)[number], id: string): FixDrill => ({
  kind: "fix",
  id,
  rule: "case",
  wrong: item.wrong,
  answers: PART_FIX_ANSWERS[item.right] as readonly [string, ...string[]],
  say: item.right,
  explain: FIX_WHY[item.right],
});

const PROMPTS: Record<(typeof PART_TRANSLATE)[number]["id"], MessageDescriptor> = {
  car: msg`I bought a used car.`,
  leaf: msg`The fallen leaf is on the ground.`,
  water: msg`I can hear running water.`,
  man: msg`The tired man sat down on the bench.`,
  door: msg`She opened the closed door.`,
  cat: msg`We are looking for the lost cat.`,
  weekend: msg`I am looking forward to the coming weekend.`,
  work: msg`The finished work is on the table.`,
};

const translate = (id: (typeof PART_TRANSLATE)[number]["id"]): SentenceDrill => {
  const item = PART_TRANSLATE.find((each) => each.id === id) as (typeof PART_TRANSLATE)[number];
  return {
    kind: "translate",
    id: `write-${id}`,
    rule: "case",
    prompt: PROMPTS[id],
    answers: item.answers,
    say: item.said,
    explain: msg`The <et>-v</et> form changes with its noun. The <et>-tud</et> and <et>-nud</et> forms usually stay the same.`,
  };
};

const dictate = (id: string, said: string): SentenceDrill => ({
  kind: "dictation",
  id,
  rule: "meaning",
  answers: [said],
  say: said,
  explain: msg`Listen for the ending: <et>-v</et> now, <et>-nud</et> has done or changed, <et>-tud</et> done to it.`,
});

export const DRILLS: DrillBank = {
  rules: {
    meaning: { label: msg`Which participle, which meaning`, section: "tell" },
    form: { label: msg`Making the participle`, section: "make" },
    case: { label: msg`The noun changes, the form usually doesn’t`, section: "cases" },
  },
  items: [
    ...PART_HEARD.map(hear),
    ...PART_GAPS.map(make),
    ...PART_FIXES.map((item, i) => fix(item, `fix-${i}`)),
    translate("car"),
    translate("leaf"),
    translate("water"),
    translate("man"),
    translate("door"),
    translate("work"),
    dictate("dictate-tired", "Väsinud mees istus pingile."),
    dictate("dictate-leaf", "Kukkunud leht on maas."),
    dictate("dictate-water", "Ma kuulen jooksvat vett."),
  ],
};
