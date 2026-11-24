import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  DES_ANSWERS,
  DES_DRILL_ANSWERS,
  DES_FIX_ANSWERS,
  DES_REWRITE_ANSWERS,
  DES_VERBS,
  MATA_VERBS,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill } from "../../../lib/learn/drill";

const DES = msg`<et>-des</et> usually means at the same time. Change the last <et>-a</et> of the <et>-da</et> form to <et>-es</et>.`;
const MATA = msg`<et>-mata</et> means without doing it. Change <et>-ma</et> to <et>-mata</et> on the <et>-ma</et> form.`;
const APART = msg`<et>-des</et> usually means at the same time, and <et>-mata</et> means without doing it.`;

const MEANS: Record<string, MessageDescriptor> = {
  lugeda: msg`to read`,
  õppida: msg`to study`,
  oodata: msg`to wait for`,
  sõita: msg`to drive, to ride`,
  süüa: msg`to eat`,
  juua: msg`to drink`,
  minna: msg`to go`,
  tulla: msg`to come`,
  ütlema: msg`to say`,
  küsima: msg`to ask`,
  helistama: msg`to phone`,
  maksma: msg`to pay`,
  jooma: msg`to drink`,
  minema: msg`to go`,
  tulema: msg`to come`,
  magama: msg`to sleep`,
};

const ASCII: Record<string, string> = {
  õppida: "oppida",
  sõita: "soita",
  süüa: "suua",
  ütlema: "utlema",
  küsima: "kusima",
};
const ascii = (inf: string) => ASCII[inf] ?? inf;

const desEntries = Object.values(DES_VERBS).flat();
const mataEntries = Object.values(MATA_VERBS).flat();

const des = (inf: string): FormDrill => {
  const each = desEntries.find((entry) => entry.inf === inf) as (typeof desEntries)[number];
  return {
    kind: "form",
    id: `des-${ascii(each.inf)}`,
    rule: "des",
    base: each.inf,
    gloss: MEANS[each.inf] as MessageDescriptor,
    cue: msg`the -des form`,
    answers: [each.form],
    say: each.said,
    explain: DES,
  };
};

const mata = (inf: string): FormDrill => {
  const each = mataEntries.find((entry) => entry.inf === inf) as (typeof mataEntries)[number];
  return {
    kind: "form",
    id: `mata-${ascii(each.inf)}`,
    rule: "mata",
    base: each.inf,
    gloss: MEANS[each.inf] as MessageDescriptor,
    cue: msg`the -mata form`,
    answers: [each.form],
    say: each.said,
    explain: MATA,
  };
};

const hear = (id: string, say: string, answer: "des" | "mata"): ChoiceDrill => {
  const labels = {
    des: { id: "des", label: msg`while doing it` },
    mata: { id: "mata", label: msg`without doing it` },
  } as const;
  return {
    kind: "choice",
    id,
    rule: "apart",
    say,
    answer: labels[answer],
    wrong: [labels[answer === "des" ? "mata" : "des"]],
    explain: APART,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    des: { label: msg`The <et>-des</et> form`, section: "des" },
    mata: { label: msg`The <et>-mata</et> form`, section: "mata" },
    apart: { label: msg`While or without`, section: "apart" },
  },
  items: [
    des("lugeda"),
    des("õppida"),
    des("minna"),
    mata("ütlema"),
    mata("küsima"),
    mata("helistama"),
    mata("minema"),
    hear("hear-smile-des", "Ta lahkus naeratades.", "des"),
    hear("hear-smile-mata", "Ta lahkus naeratamata.", "mata"),
    hear("hear-film-des", "Ta vaatas filmi teed juues.", "des"),
    hear("hear-book-mata", "Ta võttis mu raamatu küsimata.", "mata"),
    {
      kind: "rewrite",
      id: "join-coffee",
      rule: "apart",
      from: "Ta joob kohvi ja loeb ajalehte.",
      cue: msg`at the same time`,
      answers: DES_REWRITE_ANSWERS["Ta joob kohvi ajalehte lugedes."] as readonly [
        string,
        ...string[],
      ],
      say: "Ta joob kohvi ajalehte lugedes.",
      explain: APART,
    },
    {
      kind: "rewrite",
      id: "join-leave",
      rule: "apart",
      from: "Ta lahkus ja ei öelnud midagi.",
      cue: msg`without`,
      answers: DES_REWRITE_ANSWERS["Ta lahkus midagi ütlemata."] as readonly [string, ...string[]],
      say: "Ta lahkus midagi ütlemata.",
      explain: APART,
    },
    {
      kind: "rewrite",
      id: "join-bread",
      rule: "apart",
      from: "Ma lähen koju ja ostan leiba.",
      cue: msg`on the way`,
      answers: DES_REWRITE_ANSWERS["Ma ostan leiba koju minnes."] as readonly [string, ...string[]],
      say: "Ma ostan leiba koju minnes.",
      explain: APART,
    },
    {
      kind: "rewrite",
      id: "join-book",
      rule: "apart",
      from: "Ta võttis mu raamatu ega küsinud.",
      cue: msg`without`,
      answers: DES_REWRITE_ANSWERS["Ta võttis mu raamatu küsimata."] as readonly [
        string,
        ...string[],
      ],
      say: "Ta võttis mu raamatu küsimata.",
      explain: APART,
    },
    {
      kind: "translate",
      id: "write-music",
      rule: "apart",
      prompt: msg`I listen to music while studying. (use -des or -mata)`,
      answers: DES_ANSWERS["Ma kuulan muusikat õppides."] as readonly [string, ...string[]],
      say: "Ma kuulan muusikat õppides.",
      explain: APART,
    },
    {
      kind: "translate",
      id: "write-visit",
      rule: "apart",
      prompt: msg`Don’t come to visit without calling. (use -des or -mata)`,
      answers: DES_ANSWERS["Ära tule külla helistamata."] as readonly [string, ...string[]],
      say: "Ära tule külla helistamata.",
      explain: APART,
    },
    {
      kind: "translate",
      id: "write-sing",
      rule: "apart",
      prompt: msg`She sings while cooking. (use -des or -mata)`,
      answers: DES_ANSWERS["Ta laulab süüa tehes."] as readonly [string, ...string[]],
      say: "Ta laulab süüa tehes.",
      explain: APART,
    },
    {
      kind: "translate",
      id: "write-bus",
      rule: "des",
      prompt: msg`I read a book while waiting for the bus. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.wait as readonly [string, ...string[]],
      say: "Ma loen raamatut bussi oodates.",
      explain: DES,
    },
    {
      kind: "translate",
      id: "write-eating",
      rule: "des",
      prompt: msg`Don’t talk while eating. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.eat as readonly [string, ...string[]],
      say: "Ära räägi süües.",
      explain: DES,
    },
    {
      kind: "translate",
      id: "write-tea",
      rule: "des",
      prompt: msg`He watched a film while drinking tea. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.tea as readonly [string, ...string[]],
      say: "Ta vaatas filmi teed juues.",
      explain: DES,
    },
    {
      kind: "translate",
      id: "write-phone",
      rule: "des",
      prompt: msg`Don’t use the phone while driving. (use -des or -mata)`,
      answers: DES_ANSWERS["Ära kasuta telefoni sõites."] as readonly [string, ...string[]],
      say: "Ära kasuta telefoni sõites.",
      explain: DES,
    },
    {
      kind: "translate",
      id: "write-radio",
      rule: "des",
      prompt: msg`I listen to the radio on my way to work. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.radio as readonly [string, ...string[]],
      say: "Ma kuulan raadiot tööle tulles.",
      explain: DES,
    },
    {
      kind: "translate",
      id: "write-pay",
      rule: "mata",
      prompt: msg`She left the café without paying. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.pay as readonly [string, ...string[]],
      say: "Ta lahkus kohvikust maksmata.",
      explain: MATA,
    },
    {
      kind: "translate",
      id: "write-no-coffee",
      rule: "mata",
      prompt: msg`I went to work without drinking coffee. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.coffee as readonly [string, ...string[]],
      say: "Ma läksin tööle kohvi joomata.",
      explain: MATA,
    },
    {
      kind: "translate",
      id: "write-no-come",
      rule: "mata",
      prompt: msg`He didn’t come yesterday. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.come as readonly [string, ...string[]],
      say: "Ta jäi eile tulemata.",
      explain: MATA,
    },
    {
      kind: "translate",
      id: "write-no-sleep",
      rule: "mata",
      prompt: msg`I spent the whole night without sleep. (use -des or -mata)`,
      answers: DES_DRILL_ANSWERS.sleep as readonly [string, ...string[]],
      say: "Ma olin terve öö magamata.",
      explain: MATA,
    },
    {
      kind: "fix",
      id: "fix-eating",
      rule: "apart",
      wrong: "Ta luges kirja söömata.",
      prompt: msg`She read the letter while eating.`,
      answers: DES_FIX_ANSWERS["Ta luges kirja süües."] as readonly [string, ...string[]],
      say: "Ta luges kirja süües.",
      explain: msg`At the same time as eating is <et>süües</et>. <et>Söömata</et> is without eating.`,
    },
    {
      kind: "fix",
      id: "fix-calling",
      rule: "apart",
      wrong: "Ma ei tule kunagi helistades.",
      prompt: msg`I never come without calling.`,
      answers: DES_FIX_ANSWERS["Ma ei tule kunagi helistamata."] as readonly [string, ...string[]],
      say: "Ma ei tule kunagi helistamata.",
      explain: msg`Without calling is <et>helistamata</et>. <et>Helistades</et> is while calling.`,
    },
    {
      kind: "fix",
      id: "fix-home",
      rule: "apart",
      wrong: "Ma ostan leiba koju minedes.",
      prompt: msg`I’ll buy bread on my way home.`,
      answers: DES_FIX_ANSWERS["Ma ostan leiba koju minnes."] as readonly [string, ...string[]],
      say: "Ma ostan leiba koju minnes.",
      explain: msg`<et>-des</et> goes on the <et>-da</et> form, which is <et>minna</et>, so <et>minnes</et>.`,
    },
    {
      kind: "dictation",
      id: "dictate-phone",
      rule: "apart",
      answers: ["Ära kasuta telefoni sõites."],
      say: "Ära kasuta telefoni sõites.",
      explain: APART,
    },
    {
      kind: "dictation",
      id: "dictate-meeting",
      rule: "apart",
      answers: ["Ta jäi koosolekule minemata."],
      say: "Ta jäi koosolekule minemata.",
      explain: APART,
    },
  ],
};
