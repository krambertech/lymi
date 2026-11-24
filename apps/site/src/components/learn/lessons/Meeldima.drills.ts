import { msg } from "@lingui/core/macro";
import { MEELDIMA_FIX, MEELDIMA_SAY } from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const FULL: Readonly<Record<string, string>> = {
  Mulle: "Minule",
  Sulle: "Sinule",
  Talle: "Temale",
  Neile: "Nendele",
  Mul: "Minul",
  Sul: "Sinul",
  Tal: "Temal",
  Neil: "Nendel",
};

const withFull = (said: string): [string, ...string[]] => {
  const [first = "", ...rest] = said.split(" ");
  const full = FULL[first];
  return full ? [said, [full, ...rest].join(" ")] : [said];
};

const LE = msg`Who likes it takes the <et>-le</et> form: <et>mulle</et>, <et>sulle</et>, <et>talle</et>, <et>meile</et>, <et>teile</et>, <et>neile</et>.`;
const MANY = msg`More than one thing usually takes <et>meeldivad</et>.`;
const ONE = msg`One thing, or a verb, usually takes <et>meeldib</et>.`;
const DA = msg`After <et>meeldib</et> or <et>tahan</et>, a verb takes its <et>-da</et> form.`;
const NO = msg`<et>Ei meeldi</et> is the same for one thing or more than one.`;
const FEEL = msg`A feeling takes the <et>-l</et> form, as having does: <et>mul on</et>, <et>tal on</et>.`;

const person = (
  id: string,
  base: string,
  gloss: FormDrill["gloss"],
  mulle: string,
  full: string,
): FormDrill => ({
  kind: "form",
  id: `le-${id}`,
  rule: "le",
  base,
  gloss,
  cue: msg`the form for who likes it`,
  answers: [mulle, full],
  say: mulle,
  explain: LE,
});

const WHO = {
  ma: { id: "ma", label: msg`I` },
  sa: { id: "sa", label: msg`You, to one person` },
  ta: { id: "ta", label: msg`He or she` },
  me: { id: "me", label: msg`We` },
  nad: { id: "nad", label: msg`They` },
} satisfies Record<string, DrillOption>;

type Who = keyof typeof WHO;

const whoLikes = (
  id: string,
  say: string,
  who: Who,
  wrong: readonly Who[],
): ChoiceDrill => ({
  kind: "choice",
  id: `who-${id}`,
  rule: "le",
  say,
  answer: WHO[who],
  wrong: wrong.map((each) => WHO[each]),
  explain: LE,
});

const COUNT = {
  one: { id: "one", label: msg`One thing` },
  many: { id: "many", label: msg`More than one thing` },
} satisfies Record<string, DrillOption>;

const howMany = (
  id: string,
  say: string,
  count: keyof typeof COUNT,
  explain: ChoiceDrill["explain"],
): ChoiceDrill => ({
  kind: "choice",
  id: `count-${id}`,
  rule: "plural",
  say,
  answer: COUNT[count],
  wrong: [COUNT[count === "one" ? "many" : "one"]],
  explain,
});

const FEELS = {
  cold: { id: "cold", label: msg`I’m cold.` },
  hot: { id: "hot", label: msg`I’m hot.` },
  bored: { id: "bored", label: msg`I’m bored.` },
  glad: { id: "glad", label: msg`I’m glad.` },
  sorry: { id: "sorry", label: msg`I’m sorry.` },
} satisfies Record<string, DrillOption>;

type Feel = keyof typeof FEELS;

const feeling = (
  id: string,
  say: string,
  feel: Feel,
  wrong: readonly Feel[],
): ChoiceDrill => ({
  kind: "choice",
  id: `feel-${id}`,
  rule: "feel",
  say,
  answer: FEELS[feel],
  wrong: wrong.map((each) => FEELS[each]),
  explain: FEEL,
});

const daForm = (id: string, base: string, gloss: FormDrill["gloss"], da: string): FormDrill => ({
  kind: "form",
  id: `da-${id}`,
  rule: "da",
  base,
  gloss,
  cue: msg`its -da form`,
  answers: [da],
  say: da,
  explain: DA,
});

const rewrite = (
  id: string,
  rule: string,
  from: string,
  to: string,
  explain: SentenceDrill["explain"],
): SentenceDrill => ({
  kind: "rewrite",
  id: `no-${id}`,
  rule,
  from,
  cue: msg`say no`,
  answers: withFull(to),
  say: to,
  explain,
});

const translate = (
  id: string,
  rule: string,
  prompt: SentenceDrill["explain"],
  said: string,
  also: readonly string[],
  explain: SentenceDrill["explain"],
): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule,
  prompt,
  answers: [said, ...also],
  say: said,
  explain,
});

const sayOf = (id: (typeof MEELDIMA_SAY)[number]["id"]) =>
  MEELDIMA_SAY.find((each) => each.id === id) as (typeof MEELDIMA_SAY)[number];

const fixOf = (id: (typeof MEELDIMA_FIX)[number]["id"]) =>
  MEELDIMA_FIX.find((each) => each.id === id) as (typeof MEELDIMA_FIX)[number];

const fix = (
  id: (typeof MEELDIMA_FIX)[number]["id"],
  rule: string,
  explain: FixDrill["explain"],
): FixDrill => {
  const each = fixOf(id);
  return {
    kind: "fix",
    id: `fix-${id}`,
    rule,
    wrong: each.wrong,
    answers: [each.right, ...each.also],
    say: each.right,
    explain,
  };
};

const OPTIONS = {
  like: { id: "like", label: msg`I like it` },
  want: { id: "want", label: msg`I want to` },
} satisfies Record<string, DrillOption>;

type Kind = keyof typeof OPTIONS;

const heard = (
  id: string,
  say: string,
  kind: Kind,
  explain: ChoiceDrill["explain"],
): ChoiceDrill => ({
  kind: "choice",
  id: `kind-${id}`,
  rule: "want",
  say,
  answer: OPTIONS[kind],
  wrong: [OPTIONS[kind === "like" ? "want" : "like"]],
  explain,
});

const LIKES = msg`<et>Mulle meeldib</et>: the thing or the action pleases me.`;
const WANTS = msg`<et>Ma tahan</et>: I choose to do it.`;

export const DRILLS: DrillBank = {
  rules: {
    le: { label: msg`The <et>-le</et> form for who likes it`, section: "likes" },
    plural: { label: msg`<et>Meeldib</et> or <et>meeldivad</et>`, section: "more" },
    da: { label: msg`A verb after <et>meeldib</et> and <et>tahan</et>`, section: "doing" },
    no: { label: msg`Not liking: <et>ei meeldi</et>`, section: "no" },
    want: { label: msg`Liking or wanting`, section: "want" },
    feel: { label: msg`Feelings with the <et>-l</et> form`, section: "feelings" },
  },
  items: [
    person("mulle", "mina", msg`I`, "mulle", "minule"),
    whoLikes("tartu", "Mulle meeldib Tartu.", "ma", ["sa", "ta", "me", "nad"]),
    whoLikes("kohv", "Sulle meeldib kohv.", "sa", ["ma", "ta", "me", "nad"]),
    whoLikes("meile", "Meile meeldib eesti keel.", "me", ["ma", "sa", "ta", "nad"]),
    whoLikes("neile", "Neile meeldib kool.", "nad", ["ma", "sa", "ta", "me"]),
    translate(
      "tallinn",
      "le",
      msg`Do you like Tallinn? You ask one friend.`,
      sayOf("tallinn").said,
      sayOf("tallinn").also,
      msg`<et>Sulle</et>, the <et>-le</et> form of <et>sina</et>, and <et>meeldib</et> for one place.`,
    ),

    howMany("koerad", "Talle meeldivad koerad.", "many", MANY),
    howMany("raamat", "Meile meeldib raamat.", "one", ONE),
    howMany("ounad", "Neile meeldivad õunad.", "many", MANY),
    translate(
      "kassid",
      "plural",
      msg`I like cats.`,
      sayOf("kassid").said,
      sayOf("kassid").also,
      MANY,
    ),
    fix("kassid", "plural", MANY),

    daForm("lugema", "lugema", msg`to read`, "lugeda"),
    daForm("raakima", "rääkima", msg`to speak, to talk`, "rääkida"),
    fix("lugema", "da", DA),
    translate(
      "tahan",
      "da",
      msg`I want to read.`,
      sayOf("tahan").said,
      sayOf("tahan").also,
      DA,
    ),

    rewrite("kohv", "no", "Mulle meeldib kohv.", "Mulle ei meeldi kohv.", NO),
    rewrite("koerad", "no", "Talle meeldivad koerad.", "Talle ei meeldi koerad.", NO),
    rewrite("ujuda", "no", "Neile meeldib ujuda.", "Neile ei meeldi ujuda.", NO),
    fix("ei", "no", NO),

    heard("lugeda-like", "Mulle meeldib lugeda.", "like", LIKES),
    heard("lugeda-want", "Ma tahan lugeda.", "want", WANTS),
    heard("ujuda-want", "Ta tahab ujuda.", "want", WANTS),
    heard("raakida-like", "Neile meeldib rääkida.", "like", LIKES),
    translate(
      "tahaksin",
      "want",
      msg`I’d like coffee. You are ordering politely.`,
      "Ma tahaksin kohvi.",
      ["Mina tahaksin kohvi.", "Tahaksin kohvi."],
      msg`<et>Ma tahaksin</et> is a polite way to say <et>ma tahan</et>.`,
    ),

    feeling("meel", "Mul on hea meel.", "glad", ["cold", "bored", "hot", "sorry"]),
    feeling("igav", "Tal on igav.", "bored", ["cold", "hot", "glad", "sorry"]),
    translate("palav", "feel", msg`I’m hot.`, "Mul on palav.", ["Minul on palav."], FEEL),
    fix("kulm", "feel", FEEL),
  ],
};
