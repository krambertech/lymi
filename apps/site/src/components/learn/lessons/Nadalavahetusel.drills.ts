import { msg } from "@lingui/core/macro";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const PAST = msg`Yes in the past takes the person ending.`;
const PAST_NO = msg`No in the past is <et>ei</et> and the -nud form, the same for every person.`;
const FUTURE = msg`The future is the present with a time word, <et>hakkama</et> or <et>kavatsema</et>.`;

const WHEN = {
  past: { id: "past", label: msg`In the past` },
  later: { id: "later", label: msg`Later` },
  now: { id: "now", label: msg`Now, as a habit` },
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
  rule: "when",
  say,
  answer: WHEN[when],
  wrong: (Object.keys(WHEN) as When[]).filter((each) => each !== when).map((each) => WHEN[each]),
  explain,
});

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

export const DRILLS: DrillBank = {
  rules: {
    past: { label: msg`Yes in the past`, section: "message" },
    "past-no": { label: msg`No in the past`, section: "fix" },
    future: { label: msg`The future`, section: "say-it" },
    when: { label: msg`Which time a sentence is about`, section: "when-sort" },
  },
  items: [
    say(
      "olin",
      "past",
      msg`Yesterday I was at home.`,
      ["Eile olin kodus.", "Eile olin ma kodus.", "Ma olin eile kodus.", "Eile ma olin kodus."],
      PAST,
    ),
    say(
      "kaisin",
      "past",
      msg`On Saturday I went to the market.`,
      [
        "Laupäeval käisin turul.",
        "Laupäeval käisin ma turul.",
        "Ma käisin laupäeval turul.",
        "Laupäeval ma käisin turul.",
        "Laupäeval läksin turule.",
        "Laupäeval läksin ma turule.",
        "Laupäeval ma läksin turule.",
        "Ma läksin laupäeval turule.",
      ],
      PAST,
    ),
    say(
      "soime",
      "past",
      msg`We ate at the café.`,
      ["Me sõime kohvikus.", "Meie sõime kohvikus.", "Sõime kohvikus."],
      PAST,
    ),
    fix(
      "olen",
      "past",
      "Eile ma olen kodus.",
      "Eile ma olin kodus.",
      msg`<et>Eile</et> is yesterday, so the past: <et>olin</et>.`,
    ),
    fix(
      "loeb",
      "past",
      "Eile ta loeb raamatut.",
      "Eile ta luges raamatut.",
      msg`<et>Eile</et> is yesterday, so the past: <et>luges</et>.`,
    ),
    fix(
      "kaime",
      "past",
      "Eelmisel laupäeval me käime turul.",
      "Eelmisel laupäeval me käisime turul.",
      msg`<et>Eelmisel laupäeval</et> is last Saturday, so the past: <et>käisime</et>.`,
    ),

    say(
      "toole",
      "past-no",
      msg`Yesterday I didn’t go to work.`,
      [
        "Eile ma ei läinud tööle.",
        "Ma ei läinud eile tööle.",
        "Eile ei läinud ma tööle.",
        "Eile ma ei käinud tööl.",
      ],
      PAST_NO,
    ),
    say(
      "turul",
      "past-no",
      msg`We didn’t go to the market.`,
      ["Me ei käinud turul.", "Meie ei käinud turul.", "Me ei läinud turule."],
      PAST_NO,
    ),
    fix("olid", "past-no", "Nad ei olid kodus.", "Nad ei olnud kodus.", PAST_NO),
    fix("soid", "past-no", "Sa ei sõid kodus.", "Sa ei söönud kodus.", PAST_NO),
    fix("lugesin", "past-no", "Ma ei lugesin raamatut.", "Ma ei lugenud raamatut.", PAST_NO),
    fix("kainud", "past-no", "Me ei käisime turul.", "Me ei käinud turul.", PAST_NO),

    say(
      "homme",
      "future",
      msg`Tomorrow I’m going to Tartu.`,
      [
        "Homme lähen Tartusse.",
        "Homme lähen ma Tartusse.",
        "Homme ma lähen Tartusse.",
        "Ma lähen homme Tartusse.",
      ],
      FUTURE,
    ),
    say(
      "oppima",
      "future",
      msg`Next week I’m starting to study.`,
      [
        "Järgmisel nädalal hakkan õppima.",
        "Järgmisel nädalal hakkan ma õppima.",
        "Järgmisel nädalal ma hakkan õppima.",
        "Ma hakkan järgmisel nädalal õppima.",
      ],
      FUTURE,
    ),
    say(
      "tulla",
      "future",
      msg`I’m planning to come.`,
      [
        "Ma kavatsen tulla.",
        "Mina kavatsen tulla.",
        "Kavatsen tulla.",
        "Ma plaanin tulla.",
        "Mina plaanin tulla.",
        "Plaanin tulla.",
      ],
      FUTURE,
    ),
    say(
      "elama",
      "future",
      msg`We’re going to live in Tallinn.`,
      [
        "Me hakkame Tallinnas elama.",
        "Meie hakkame Tallinnas elama.",
        "Hakkame Tallinnas elama.",
        "Me kavatseme Tallinnas elada.",
      ],
      FUTURE,
    ),
    fix(
      "laksin",
      "future",
      "Homme ma läksin tööle.",
      "Homme ma lähen tööle.",
      msg`<et>Homme</et> is tomorrow, so the present: <et>lähen</et>.`,
    ),
    fix(
      "tootada",
      "future",
      "Järgmisel nädalal hakkan ma töötada.",
      "Järgmisel nädalal hakkan ma töötama.",
      msg`After <et>hakkan</et>, the -ma infinitive.`,
    ),

    heard("olin", "Eile olin kodus.", "past", msg`<et>Olin</et> is the past.`),
    heard("lainud", "Eile ma ei läinud tööle.", "past", msg`<et>Ei läinud</et> is no in the past.`),
    heard("lahen", "Homme lähen Tartusse.", "later", msg`<et>Homme</et> with the present: later.`),
    heard(
      "hakkan",
      "Järgmisel nädalal hakkan õppima.",
      "later",
      msg`<et>Hakkan</et> with the -ma infinitive: something will start.`,
    ),
    heard("kavatsen", "Ma kavatsen tulla.", "later", msg`<et>Kavatsen</et>: a plan.`),
    heard("kaisin", "Laupäeval käisin turul.", "past", msg`<et>Käisin</et> is the past.`),
  ],
};
