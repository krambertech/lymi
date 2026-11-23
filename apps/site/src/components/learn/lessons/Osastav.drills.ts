import { msg } from "@lingui/core/macro";
import {
  counted,
  OSASTAV_FIX,
  OSASTAV_SAY,
  PARTITIVE_NOUNS,
  type PartitiveNoun,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  FixDrill,
  FormDrill,
  GapDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const MEANS = {
  kass: msg`cat`,
  raamat: msg`book`,
  laps: msg`child`,
  auto: msg`car`,
  maja: msg`house`,
  euro: msg`euro`,
  kool: msg`school`,
  laud: msg`table`,
  kohv: msg`coffee`,
  vesi: msg`water`,
  juust: msg`cheese`,
  leib: msg`bread`,
  piim: msg`milk`,
  raha: msg`money`,
  aeg: msg`time`,
} satisfies Partial<Record<PartitiveNoun, ReturnType<typeof msg>>>;

type Noun = keyof typeof MEANS;

const FROM_TWO = msg`After a number from two up, or <et>mitu</et>, the partitive.`;
const ONE = msg`After <et>üks</et> on its own, the nominative.`;
const AMOUNT = msg`After an amount, the partitive.`;
const NOT_THERE = msg`After <et>pole</et> or <et>ei ole</et>, what isn’t there takes the partitive.`;
const SAID_FIRST = msg`The sentence starts with it, so it keeps its nominative.`;
const SOME = msg`Someone eats, drinks or wants some of it, uncounted, so the partitive.`;

interface Made {
  id: string;
  noun: Noun;
  cue: string;
  say: string;
  first?: true;
}

const made = (
  rule: string,
  { id, noun, cue, say, first }: Made,
  explain: FormDrill["explain"],
): FormDrill => ({
  kind: "form",
  id,
  rule,
  base: noun,
  gloss: MEANS[noun],
  cue: { et: cue },
  answers: [first ? noun : PARTITIVE_NOUNS[noun]],
  say,
  explain,
});

const countGap = (number: string, noun: Noun): GapDrill => {
  const one = number === "üks";
  return {
    kind: "gap",
    id: `pick-${one ? "uks" : "many"}-${noun}`,
    rule: "number",
    before: `${number} `,
    after: "",
    answer: one ? noun : PARTITIVE_NOUNS[noun],
    wrong: [one ? PARTITIVE_NOUNS[noun] : noun],
    listen: "after",
    say: counted(number, noun),
    explain: one ? ONE : FROM_TWO,
  };
};

const HEARD = {
  hasChild: {
    say: "Tal on laps.",
    option: { id: "has-child", label: msg`He or she has a child.` },
  },
  noChild: {
    say: "Tal pole last.",
    option: { id: "no-child", label: msg`He or she doesn’t have a child.` },
  },
  hasCar: { say: "Sul on auto.", option: { id: "has-car", label: msg`You have a car.` } },
  noCar: { say: "Sul pole autot.", option: { id: "no-car", label: msg`You don’t have a car.` } },
};

const heard = (key: keyof typeof HEARD, explain: ChoiceDrill["explain"]): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${HEARD[key].option.id}`,
  rule: "pole",
  say: HEARD[key].say,
  answer: HEARD[key].option,
  wrong: Object.values(HEARD).flatMap(({ option }) =>
    option.id === HEARD[key].option.id ? [] : [option],
  ),
  explain,
});

const SAY_MEANS = {
  kassi: msg`I have two cats.`,
  tass: msg`A cup of coffee, please.`,
  leiba: msg`There’s no bread on the table.`,
  last: msg`How many children do you have?`,
  vett: msg`He or she drinks water.`,
  eurot: msg`Bread costs three euros.`,
} satisfies Record<(typeof OSASTAV_SAY)[number]["id"], ReturnType<typeof msg>>;

const SAY_RULE = {
  kassi: "number",
  tass: "amount",
  leiba: "pole",
  last: "number",
  vett: "food",
  eurot: "number",
} as const satisfies Record<(typeof OSASTAV_SAY)[number]["id"], string>;

const FIX_RULE = {
  kassi: "number",
  kohvi: "food",
  leiba: "pole",
  tass: "amount",
  kass: "number",
  last: "number",
} as const satisfies Record<(typeof OSASTAV_FIX)[number]["id"], string>;

const RULE_WHY = { number: FROM_TWO, amount: AMOUNT, pole: NOT_THERE, food: SOME };

const said = ({ id, said, also }: (typeof OSASTAV_SAY)[number]): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: SAY_RULE[id],
  prompt: SAY_MEANS[id],
  answers: [said, ...also],
  say: said,
  explain: RULE_WHY[SAY_RULE[id]],
});

const FIX_MEANS: Record<(typeof OSASTAV_FIX)[number]["id"], ReturnType<typeof msg>> = {
  kassi: msg`I have two cats.`,
  kohvi: msg`I drink coffee.`,
  leiba: msg`There’s no bread on the table.`,
  tass: msg`A cup of coffee, please.`,
  kass: msg`We have one cat.`,
  last: msg`How many children do you have?`,
};

const fixed = ({ id, wrong, right }: (typeof OSASTAV_FIX)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: FIX_RULE[id],
  wrong,
  prompt: FIX_MEANS[id],
  answers: [right],
  say: right,
  explain: id === "kass" ? ONE : RULE_WHY[FIX_RULE[id]],
});

export const DRILLS: DrillBank = {
  rules: {
    number: { label: msg`The form after a number`, section: "numbers" },
    amount: { label: msg`The partitive after an amount`, section: "amounts" },
    pole: { label: msg`The form with <et>pole</et>`, section: "no" },
    food: { label: msg`The partitive for food and drink`, section: "food" },
  },
  items: [
    ...(
      [
        { id: "kaks-raamat", noun: "raamat", cue: "kaks …", say: "kaks raamatut" },
        { id: "viis-laps", noun: "laps", cue: "viis …", say: "viis last" },
        { id: "viis-auto", noun: "auto", cue: "viis …", say: "viis autot" },
        { id: "kumme-euro", noun: "euro", cue: "kümme …", say: "kümme eurot" },
        { id: "kaks-maja", noun: "maja", cue: "kaks …", say: "kaks maja" },
        { id: "mitu-laps", noun: "laps", cue: "Mitu … sul on?", say: "Mitu last sul on?" },
        { id: "mitu-kass", noun: "kass", cue: "Mitu … teil on?", say: "Mitu kassi teil on?" },
      ] satisfies Made[]
    ).map((item) => made("number", item, FROM_TWO)),
    ...(
      [
        { id: "uks-raamat", noun: "raamat", cue: "üks …", say: "üks raamat", first: true },
        {
          id: "uks-kass",
          noun: "kass",
          cue: "Meil on üks …",
          say: "Meil on üks kass.",
          first: true,
        },
      ] satisfies Made[]
    ).map((item) => made("number", item, ONE)),
    countGap("kolm", "kass"),
    countGap("üks", "kass"),
    countGap("viis", "laud"),
    countGap("üks", "laud"),
    countGap("neli", "kool"),
    countGap("üks", "kool"),

    ...(
      [
        { id: "tass-kohv", noun: "kohv", cue: "tass …", say: "tass kohvi" },
        { id: "klaas-vesi", noun: "vesi", cue: "klaas …", say: "klaas vett" },
        { id: "kilo-juust", noun: "juust", cue: "kilo …", say: "kilo juustu" },
        { id: "natuke-piim", noun: "piim", cue: "natuke …", say: "natuke piima" },
        { id: "palju-raha", noun: "raha", cue: "palju …", say: "palju raha" },
        { id: "vahe-aeg", noun: "aeg", cue: "vähe …", say: "vähe aega" },
      ] satisfies Made[]
    ).map((item) => made("amount", item, AMOUNT)),

    ...(
      [
        { id: "pole-kass", noun: "kass", cue: "Mul pole …", say: "Mul pole kassi." },
        { id: "pole-auto", noun: "auto", cue: "Sul pole …", say: "Sul pole autot." },
        { id: "pole-laps", noun: "laps", cue: "Tal pole …", say: "Tal pole last." },
        { id: "pole-maja", noun: "maja", cue: "Neil pole …", say: "Neil pole maja." },
        { id: "pole-leib", noun: "leib", cue: "Laual pole …", say: "Laual pole leiba." },
        { id: "pole-laud", noun: "laud", cue: "Toas pole …", say: "Toas pole lauda." },
        { id: "ei-ole-kass", noun: "kass", cue: "Mul ei ole …", say: "Mul ei ole kassi." },
      ] satisfies Made[]
    ).map((item) => made("pole", item, NOT_THERE)),
    ...(
      [
        {
          id: "kass-pole",
          noun: "kass",
          cue: "… pole laual",
          say: "Kass pole laual.",
          first: true,
        },
        {
          id: "auto-pole",
          noun: "auto",
          cue: "… pole Tallinnas",
          say: "Auto pole Tallinnas.",
          first: true,
        },
        {
          id: "leib-pole",
          noun: "leib",
          cue: "… pole laual",
          say: "Leib pole laual.",
          first: true,
        },
        { id: "laud-pole", noun: "laud", cue: "… pole toas", say: "Laud pole toas.", first: true },
      ] satisfies Made[]
    ).map((item) => made("pole", item, SAID_FIRST)),
    heard(
      "hasChild",
      msg`<et>Tal on laps</et>: one child, counted, with <et>on</et>, so the nominative.`,
    ),
    heard("noChild", msg`<et>Tal pole last</et>: with <et>pole</et>, the partitive.`),
    heard(
      "hasCar",
      msg`<et>Sul on auto</et>: one car, counted, with <et>on</et>, so the nominative.`,
    ),
    heard("noCar", msg`<et>Sul pole autot</et>: with <et>pole</et>, the partitive.`),

    ...(
      [
        { id: "joon-kohv", noun: "kohv", cue: "Ma joon …", say: "Ma joon kohvi." },
        { id: "joob-vesi", noun: "vesi", cue: "Ta joob …", say: "Ta joob vett." },
        { id: "soome-leib", noun: "leib", cue: "Me sööme …", say: "Me sööme leiba." },
        { id: "soovad-juust", noun: "juust", cue: "Nad söövad …", say: "Nad söövad juustu." },
        { id: "tahan-piim", noun: "piim", cue: "Ma tahan …", say: "Ma tahan piima." },
      ] satisfies Made[]
    ).map((item) => made("food", item, SOME)),
    ...(
      [
        {
          id: "piim-maksab",
          noun: "piim",
          cue: "… maksab kaks eurot",
          say: "Piim maksab kaks eurot.",
          first: true,
        },
        { id: "leib-on", noun: "leib", cue: "… on laual", say: "Leib on laual.", first: true },
      ] satisfies Made[]
    ).map((item) => made("food", item, SAID_FIRST)),
    ...OSASTAV_SAY.map(said),
    ...OSASTAV_FIX.map(fixed),
  ],
};
