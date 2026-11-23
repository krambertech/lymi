import { msg } from "@lingui/core/macro";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const TIME_WORD = msg`A time word with the present says what will happen.`;
const HAKKAMA = msg`<et>Hakkama</et> takes the person ending, and the second verb its -ma infinitive.`;
const PLAN = msg`<et>Kavatsen</et> and <et>plaanin</et> take the -da infinitive.`;
const MA = msg`After <et>hakkama</et>, the -ma infinitive.`;

const WHEN = {
  past: { id: "past", label: msg`In the past` },
  now: { id: "now", label: msg`Now` },
  later: { id: "later", label: msg`Later` },
} satisfies Record<string, DrillOption>;

type When = keyof typeof WHEN;

const heard = (
  id: string,
  say: string,
  when: When,
  explain: ChoiceDrill["explain"],
): ChoiceDrill => ({
  kind: "choice",
  id: `when-${id}`,
  rule: "present",
  say,
  answer: WHEN[when],
  wrong: (Object.keys(WHEN) as When[]).filter((each) => each !== when).map((each) => WHEN[each]),
  explain,
});

const LONG: Record<string, string> = {
  Ma: "Mina",
  Sa: "Sina",
  Ta: "Tema",
  Me: "Meie",
  Te: "Teie",
  Nad: "Nemad",
};

const DROPS = new Set(["Ma", "Sa", "Me", "Te"]);

const withPronouns = (said: string): [string, ...string[]] => {
  const [first, next, ...rest] = said.split(" ");
  const long = first && LONG[first];
  if (!long || !next) return [said];
  const dropped = DROPS.has(first)
    ? [[next.charAt(0).toUpperCase() + next.slice(1), ...rest].join(" ")]
    : [];
  return [said, [long, next, ...rest].join(" "), ...dropped];
};

const say = (
  id: string,
  rule: string,
  prompt: SentenceDrill["explain"],
  answers: readonly [string, ...string[]],
  explain: SentenceDrill["explain"],
): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule,
  prompt,
  answers,
  say: answers[0],
  explain,
});

const start = (id: string, from: string, to: string): SentenceDrill => ({
  kind: "rewrite",
  id: `start-${id}`,
  rule: "hakkama",
  from,
  cue: msg`with <et>hakkama</et>`,
  answers: withPronouns(to),
  say: to,
  explain: HAKKAMA,
});

const person = (id: string, cue: string, answer: string, said: string): FormDrill => ({
  kind: "form",
  id: `person-${id}`,
  rule: "hakkama",
  base: "hakkama",
  gloss: msg`to start`,
  cue: { et: cue },
  answers: [answer],
  say: said,
  explain: HAKKAMA,
});

const fix = (
  id: string,
  rule: string,
  wrong: string,
  right: string,
  explain: FixDrill["explain"],
): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule,
  wrong,
  answers: [right],
  say: right,
  explain,
});

const pick = (
  id: string,
  base: string,
  gloss: FormDrill["gloss"],
  cue: string,
  answer: string,
  wrong: readonly string[],
  said: string,
  explain: FormDrill["explain"],
): FormDrill => ({
  kind: "form",
  id: `pick-${id}`,
  rule: "second",
  base,
  gloss,
  cue: { et: cue },
  answers: [answer],
  wrong,
  say: said,
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    present: { label: msg`The present with a time word`, section: "present" },
    hakkama: { label: msg`<et>Hakkama</et> for what will start`, section: "hakkama" },
    plans: { label: msg`<et>Kavatsen</et> and <et>plaanin</et> for plans`, section: "plans" },
    second: { label: msg`The -ma or -da infinitive after the first verb`, section: "build" },
  },
  items: [
    heard("homme", "Homme olen tööl.", "later", msg`<et>Homme</et>, tomorrow: later.`),
    heard("joome", "Me joome kohvi.", "now", msg`The present with no time word: now.`),
    heard("tootasin", "Ma töötasin kodus.", "past", msg`<et>Töötasin</et> is the past.`),
    heard(
      "jargmisel",
      "Järgmisel nädalal sööme kodus.",
      "later",
      msg`<et>Järgmisel nädalal</et>, next week: later.`,
    ),
    say(
      "homme",
      "present",
      msg`Tomorrow I’m working at home.`,
      [
        "Homme töötan kodus.",
        "Homme töötan ma kodus.",
        "Homme ma töötan kodus.",
        "Ma töötan homme kodus.",
        "Homme mina töötan kodus.",
        "Homme töötan mina kodus.",
        "Mina töötan homme kodus.",
        "Töötan homme kodus.",
      ],
      TIME_WORD,
    ),
    say(
      "jargmisel",
      "present",
      msg`Next week we’re going to Tartu.`,
      [
        "Järgmisel nädalal läheme Tartusse.",
        "Järgmisel nädalal me läheme Tartusse.",
        "Me läheme järgmisel nädalal Tartusse.",
        "Järgmisel nädalal läheme me Tartusse.",
        "Me läheme Tartusse järgmisel nädalal.",
        "Järgmisel nädalal meie läheme Tartusse.",
        "Läheme Tartusse järgmisel nädalal.",
        "Läheme järgmisel nädalal Tartusse.",
        "Meie läheme Tartusse järgmisel nädalal.",
        "Meie läheme järgmisel nädalal Tartusse.",
      ],
      TIME_WORD,
    ),

    person("nad", "nad … õppima", "hakkavad", "Nad hakkavad õppima."),
    person("sa", "sa … töötama", "hakkad", "Sa hakkad töötama."),
    person("me", "me … Tartus elama", "hakkame", "Me hakkame Tartus elama."),
    start("loeb", "Ta loeb palju.", "Ta hakkab palju lugema."),
    start("tootame", "Me töötame kodus.", "Me hakkame kodus töötama."),
    start("raagin", "Ma räägin eesti keelt.", "Ma hakkan eesti keelt rääkima."),

    say(
      "kavatsen",
      "plans",
      msg`I’m planning to go to Tallinn.`,
      [
        "Ma kavatsen Tallinnasse minna.",
        "Ma plaanin Tallinnasse minna.",
        "Mina kavatsen Tallinnasse minna.",
        "Kavatsen Tallinnasse minna.",
        "Plaanin Tallinnasse minna.",
        "Ma kavatsen minna Tallinnasse.",
        "Ma plaanin minna Tallinnasse.",
        "Kavatsen minna Tallinnasse.",
        "Plaanin minna Tallinnasse.",
        "Mina plaanin Tallinnasse minna.",
        "Mina kavatsen minna Tallinnasse.",
        "Mina plaanin minna Tallinnasse.",
      ],
      PLAN,
    ),
    say(
      "plaanid",
      "plans",
      msg`What are you planning to do tomorrow?`,
      [
        "Mida sa plaanid homme teha?",
        "Mida sa kavatsed homme teha?",
        "Mida sa homme plaanid teha?",
        "Mida sa homme kavatsed teha?",
        "Mida plaanid homme teha?",
        "Mida kavatsed homme teha?",
        "Mida sina kavatsed homme teha?",
        "Mida sina plaanid homme teha?",
      ],
      PLAN,
    ),
    say(
      "kavatseme",
      "plans",
      msg`We intend to study Estonian.`,
      [
        "Me kavatseme eesti keelt õppida.",
        "Meie kavatseme eesti keelt õppida.",
        "Kavatseme eesti keelt õppida.",
      ],
      PLAN,
    ),
    fix(
      "minema",
      "plans",
      "Ma kavatsen Tallinnasse minema.",
      "Ma kavatsen Tallinnasse minna.",
      PLAN,
    ),
    fix("tulema", "plans", "Ta plaanib homme tulema.", "Ta plaanib homme tulla.", PLAN),
    fix(
      "oppima",
      "plans",
      "Me kavatseme eesti keelt õppima.",
      "Me kavatseme eesti keelt õppida.",
      PLAN,
    ),

    fix("tootada", "second", "Ma hakkan kodus töötada.", "Ma hakkan kodus töötama.", MA),
    fix("elada", "second", "Nad hakkavad Tartus elada.", "Nad hakkavad Tartus elama.", MA),
    fix("lugeda", "second", "Ta hakkab palju lugeda.", "Ta hakkab palju lugema.", MA),
    pick(
      "minna",
      "minema",
      msg`to go`,
      "Ma kavatsen Tartusse …",
      "minna",
      ["minema", "lähen", "läheb"],
      "Ma kavatsen Tartusse minna.",
      PLAN,
    ),
    pick(
      "elama",
      "elama",
      msg`to live`,
      "Ma hakkan Tartus …",
      "elama",
      ["elada", "elan", "elab"],
      "Ma hakkan Tartus elama.",
      MA,
    ),
    pick(
      "tulla",
      "tulema",
      msg`to come`,
      "Ta plaanib homme …",
      "tulla",
      ["tulema", "tuleb", "tulen"],
      "Ta plaanib homme tulla.",
      PLAN,
    ),
  ],
};
