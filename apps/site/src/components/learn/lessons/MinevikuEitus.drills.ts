import { msg } from "@lingui/core/macro";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const NUD = msg`Take off the ending of the -da infinitive and add <et>-nud</et>.`;
const NO_ENDING = msg`After <et>ei</et>, the <et>-nud</et> form, with no person ending.`;

const made = (id: string, base: string, gloss: FormDrill["gloss"], nud: string): FormDrill => ({
  kind: "form",
  id: `nud-${id}`,
  rule: "nud",
  base,
  gloss,
  cue: msg`its -nud form`,
  answers: [nud, `ei ${nud}`],
  say: nud,
  explain: NUD,
});

const LONG: Record<string, string> = {
  Ma: "Mina",
  Sa: "Sina",
  Ta: "Tema",
  Me: "Meie",
  Te: "Teie",
  Nad: "Nemad",
};

const withLong = (said: string): [string, ...string[]] => {
  const [first, ...rest] = said.split(" ");
  return first && LONG[first] ? [said, [LONG[first], ...rest].join(" ")] : [said];
};

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
  answers: withLong(to),
  say: to,
  explain,
});

const translate = (
  id: string,
  prompt: SentenceDrill["explain"],
  said: string,
  explain: SentenceDrill["explain"],
): SentenceDrill => ({
  kind: "translate",
  id: `say-${id}`,
  rule: "whole",
  prompt,
  answers: withLong(said),
  say: said,
  explain,
});

const fix = (id: string, wrong: string, right: string): FixDrill => ({
  kind: "fix",
  id: `fix-${id}`,
  rule: "person",
  wrong,
  answers: [right],
  say: right,
  explain: NO_ENDING,
});

const OPTIONS = {
  now: { id: "now-no", label: msg`No, now` },
  past: { id: "past-no", label: msg`No, in the past` },
  yes: { id: "past-yes", label: msg`Yes, in the past` },
} satisfies Record<string, DrillOption>;

type When = keyof typeof OPTIONS;

const heard = (
  id: string,
  say: string,
  when: When,
  explain: ChoiceDrill["explain"],
): ChoiceDrill => ({
  kind: "choice",
  id: `when-${id}`,
  rule: "when",
  say,
  answer: OPTIONS[when],
  wrong: (Object.keys(OPTIONS) as When[])
    .filter((each) => each !== when)
    .map((each) => OPTIONS[each]),
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    nud: { label: msg`The <et>-nud</et> form from the -da infinitive`, section: "from-da" },
    whole: { label: msg`The five <et>-nud</et> forms to learn by heart`, section: "whole" },
    person: { label: msg`One form for every person`, section: "persons" },
    when: { label: msg`No, now and in the past`, section: "when" },
  },
  items: [
    made("raakida", "rääkida", msg`to speak, to talk`, "rääkinud"),
    made("oppida", "õppida", msg`to learn, to study`, "õppinud"),
    made("kuulata", "kuulata", msg`to listen`, "kuulanud"),
    made("tulla", "tulla", msg`to come`, "tulnud"),
    rewrite("elasin", "nud", "Ma elasin Tartus.", "Ma ei elanud Tartus.", NUD),
    rewrite("raakis", "nud", "Ta rääkis eesti keelt.", "Ta ei rääkinud eesti keelt.", NUD),
    rewrite("ootasime", "nud", "Me ootasime.", "Me ei oodanud.", NUD),

    translate(
      "laks",
      msg`He or she didn’t go home.`,
      "Ta ei läinud koju.",
      msg`<et>Minema</et> gives <et>läinud</et>. Learn it by heart.`,
    ),
    translate(
      "teinud",
      msg`We didn’t do the work.`,
      "Me ei teinud tööd.",
      msg`<et>Tegema</et> gives <et>teinud</et>: the g becomes i.`,
    ),
    translate(
      "nainud",
      msg`You didn’t see the cat.`,
      "Sa ei näinud kassi.",
      msg`<et>Nägema</et> gives <et>näinud</et>, as <et>tegema</et> gives <et>teinud</et>.`,
    ),
    translate(
      "soonud",
      msg`They didn’t eat any bread.`,
      "Nad ei söönud leiba.",
      msg`<et>Sööma</et> gives <et>söönud</et>: the stem <et>söö-</et>, then <et>-nud</et>.`,
    ),
    translate(
      "joonud",
      msg`I didn’t drink any water.`,
      "Ma ei joonud vett.",
      msg`<et>Jooma</et> gives <et>joonud</et>, as <et>sööma</et> gives <et>söönud</et>.`,
    ),
    rewrite(
      "tahtsin",
      "whole",
      "Ma tahtsin tulla.",
      "Ma ei tahtnud tulla.",
      msg`<et>Tahtma</et> keeps its t: <et>tahtnud</et>.`,
    ),
    rewrite(
      "kaisite",
      "whole",
      "Te käisite poes.",
      "Te ei käinud poes.",
      msg`<et>Käima</et> gives <et>käinud</et>, as in <et>Kas sa käisid poes? Ei käinud.</et>`,
    ),

    fix("olid", "Nad ei olid kodus.", "Nad ei olnud kodus."),
    fix("tootasid", "Sa ei töötasid eile.", "Sa ei töötanud eile."),
    fix("tuli", "Ta ei tuli tööle.", "Ta ei tulnud tööle."),
    fix("oppisime", "Me ei õppisime eile.", "Me ei õppinud eile."),
    fix("kuulasid", "Nad ei kuulasid.", "Nad ei kuulanud."),

    heard(
      "loe",
      "Ta ei loe raamatut.",
      "now",
      msg`<et>Ei loe</et>: the present without its ending, so now.`,
    ),
    heard(
      "lugenud",
      "Ta ei lugenud raamatut.",
      "past",
      msg`<et>Ei lugenud</et>: the <et>-nud</et> form, so the past.`,
    ),
    heard(
      "luges",
      "Ta luges raamatut.",
      "yes",
      msg`<et>Luges</et>, without <et>ei</et>: yes, in the past.`,
    ),
    heard(
      "oodanud",
      "Me ei oodanud.",
      "past",
      msg`<et>Ei oodanud</et>: the <et>-nud</et> form, so the past.`,
    ),
    heard("pole", "Ta pole kodus.", "now", msg`<et>Pole</et> is <et>ei ole</et>, now.`),
    heard(
      "polnud",
      "Ta polnud kodus.",
      "past",
      msg`<et>Polnud</et> is <et>ei olnud</et>, in the past.`,
    ),
  ],
};
