import { msg } from "@lingui/core/macro";
import type {
  ChoiceDrill,
  DrillBank,
  DrillOption,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const AMOUNT = msg`After an amount or a number from two up, the partitive.`;
const DA = msg`After <et>tahan</et>, <et>saan</et> or <et>mul on vaja</et>, the -da infinitive.`;
const MA = msg`After <et>pean</et> or <et>lähen</et>, the -ma infinitive.`;
const ONE = msg`Liking one thing takes <et>meeldib</et>.`;
const MANY = msg`Liking more than one thing takes <et>meeldivad</et>.`;

const amount = (
  id: string,
  base: string,
  gloss: FormDrill["gloss"],
  cue: string,
  answer: string,
  say: string,
): FormDrill => ({
  kind: "form",
  id: `amount-${id}`,
  rule: "amount",
  base,
  gloss,
  cue: { et: cue },
  answers: [answer],
  say,
  explain: AMOUNT,
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

const like = (id: string, before: string, after: string, many: boolean): FormDrill => ({
  kind: "form",
  id: `like-${id}`,
  rule: "like",
  base: "meeldima",
  gloss: msg`to be liked`,
  cue: { et: `${before} … ${after}` },
  answers: [many ? "meeldivad" : "meeldib"],
  wrong: [many ? "meeldib" : "meeldivad"],
  say: `${before} ${many ? "meeldivad" : "meeldib"} ${after}`,
  explain: many ? MANY : ONE,
});

const PLACES = {
  to: { id: "to", label: msg`going to the market` },
  at: { id: "at", label: msg`at the market` },
  from: { id: "from", label: msg`coming from the market` },
} satisfies Record<string, DrillOption>;

type Place = keyof typeof PLACES;

const heard = (place: Place, say: string, explain: ChoiceDrill["explain"]): ChoiceDrill => ({
  kind: "choice",
  id: `place-${place}`,
  rule: "place",
  say,
  answer: PLACES[place],
  wrong: (Object.keys(PLACES) as Place[])
    .filter((each) => each !== place)
    .map((each) => PLACES[each]),
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    amount: { label: msg`The partitive after an amount or a number`, section: "say-it" },
    infinitive: { label: msg`The -da or -ma infinitive after another verb`, section: "which-verb" },
    like: { label: msg`<et>Meeldib</et> or <et>meeldivad</et>`, section: "reply" },
    place: { label: msg`<et>Turule</et>, <et>turul</et> or <et>turult</et>`, section: "fix" },
  },
  items: [
    amount("juust", "juust", msg`cheese`, "kilo …", "juustu", "kilo juustu"),
    amount("kohv", "kohv", msg`coffee`, "Mul on vaja kilo …", "kohvi", "Mul on vaja kilo kohvi."),
    amount("euro", "euro", msg`euro`, "kolm …", "eurot", "kolm eurot"),
    say(
      "kaheksa",
      "amount",
      msg`Cheese costs eight euros.`,
      ["Juust maksab kaheksa eurot."],
      AMOUNT,
    ),
    say(
      "kilo",
      "amount",
      msg`I need a kilo of coffee.`,
      ["Mul on vaja kilo kohvi.", "Mul on kilo kohvi vaja."],
      AMOUNT,
    ),
    fix("eurot", "amount", "Kohv maksab kolm euro.", "Kohv maksab kolm eurot.", AMOUNT),

    fix("minna", "infinitive", "Ma tahan turule minema.", "Ma tahan turule minna.", DA),
    fix("olema", "infinitive", "Ma pean kodus olla.", "Ma pean kodus olema.", MA),
    fix("poodi", "infinitive", "Mul on vaja poodi minema.", "Mul on vaja poodi minna.", DA),
    say(
      "juua",
      "infinitive",
      msg`I want to drink coffee.`,
      [
        "Ma tahan kohvi juua.",
        "Ma tahan juua kohvi.",
        "Mina tahan kohvi juua.",
        "Mina tahan juua kohvi.",
        "Tahan kohvi juua.",
        "Tahan juua kohvi.",
      ],
      DA,
    ),
    say(
      "koju",
      "infinitive",
      msg`I have to go home.`,
      ["Ma pean koju minema.", "Mina pean koju minema.", "Pean koju minema."],
      MA,
    ),
    say(
      "suua",
      "infinitive",
      msg`We can eat at the café.`,
      [
        "Me saame kohvikus süüa.",
        "Meie saame kohvikus süüa.",
        "Me saame süüa kohvikus.",
        "Meie saame süüa kohvikus.",
        "Saame kohvikus süüa.",
        "Saame süüa kohvikus.",
        "Me võime kohvikus süüa.",
        "Me võime süüa kohvikus.",
        "Meie võime kohvikus süüa.",
        "Meie võime süüa kohvikus.",
        "Võime kohvikus süüa.",
        "Võime süüa kohvikus.",
      ],
      msg`After <et>saame</et> or <et>võime</et>, the -da infinitive: <et>süüa</et>.`,
    ),

    like("ounad", "Mulle", "õunad.", true),
    like("turg", "Mulle", "turg.", false),
    like("kohv", "Talle", "kohv.", false),
    like("kassid", "Mulle", "kassid.", true),
    say("turg", "like", msg`I like the market.`, ["Mulle meeldib turg."], ONE),
    say("ounad", "like", msg`He or she likes apples.`, ["Talle meeldivad õunad."], MANY),

    heard("to", "Ma lähen turule.", msg`<et>Turule</et>: where you are going.`),
    heard("at", "Ma olen turul.", msg`<et>Turul</et>: where you are.`),
    heard("from", "Ma tulen turult.", msg`<et>Turult</et>: where you come from.`),
    fix(
      "turule",
      "place",
      "Ma lähen turul.",
      "Ma lähen turule.",
      msg`Going there takes <et>turule</et>.`,
    ),
    fix(
      "turul",
      "place",
      "Ma olen täna turule.",
      "Ma olen täna turul.",
      msg`Being there takes <et>turul</et>.`,
    ),
    fix(
      "turult",
      "place",
      "Ma tulen turul koju.",
      "Ma tulen turult koju.",
      msg`Coming from there takes <et>turult</et>.`,
    ),
  ],
};
