import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { clipId, KOHAD_ASKED, KOHAD_PLACES, KOHAD_WRITTEN } from "../../../lib/learn/clips";
import type { DrillBank, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

type Place = (typeof KOHAD_PLACES)[number];

const MEANS: Partial<Record<Place["place"], MessageDescriptor>> = {
  Tartu: msg`Tartu, a university town`,
  Soome: msg`Finland`,
  haigla: msg`hospital`,
  Ukraina: msg`Ukraine`,
  Pärnu: msg`Pärnu, a town by the sea`,
  töö: msg`work`,
  Saaremaa: msg`Saaremaa, Estonia’s largest island`,
  Saksamaa: msg`Germany`,
  kool: msg`school`,
  kodu: msg`home`,
  Eesti: msg`Estonia`,
};

const IN = msg`In a town, a country or a building: <et>-s</et>.`;
const ON = msg`On something, at work, at the market, and names ending in <et>-maa</et>: <et>-l</et>.`;

const placeOf = (place: Place["place"]) =>
  KOHAD_PLACES.find((each) => each.place === place) as Place;

const typed = (place: Place["place"]): FormDrill => {
  const { where } = placeOf(place);
  const on = where.endsWith("l");
  return {
    kind: "form",
    id: `kus-${clipId(place)}`,
    rule: on ? "l" : "s",
    base: place,
    gloss: MEANS[place] as MessageDescriptor,
    cue: { et: "kus?" },
    answers: [where],
    say: where,
    explain: on ? ON : IN,
  };
};

const TRANSLATED: readonly {
  index: number;
  prompt: MessageDescriptor;
  also: readonly string[];
}[] = [
  { index: 7, prompt: msg`Jaan lives in Pärnu.`, also: [] },
  { index: 9, prompt: msg`They study in Tartu.`, also: ["Nemad õpivad Tartus."] },
  { index: 8, prompt: msg`The picture is on the wall.`, also: [] },
  { index: 1, prompt: msg`Mum is at the market.`, also: [] },
];

const translated = ({ index, prompt, also }: (typeof TRANSLATED)[number]): SentenceDrill => {
  const sentence = KOHAD_WRITTEN[index] as string;
  const on = /l\.$/.test(sentence);
  return {
    kind: "translate",
    id: `translate-${clipId(sentence)}`,
    rule: on ? "l" : "s",
    prompt,
    say: sentence,
    answers: [sentence, ...also],
    explain: on ? ON : IN,
  };
};

const written = (index: number): SentenceDrill => {
  const sentence = KOHAD_WRITTEN[index] as string;
  const on = /l\.$/.test(sentence);
  return {
    kind: "dictation",
    id: `write-${clipId(sentence)}`,
    rule: on ? "l" : "s",
    say: sentence,
    answers: [sentence],
    explain: on ? ON : IN,
  };
};

const asked = ({ reply, answers }: (typeof KOHAD_ASKED)[number]): SentenceDrill => ({
  kind: "ask",
  id: `ask-${clipId(reply)}`,
  rule: "kus",
  reply,
  say: answers[0],
  answers,
  explain: msg`Ask with <et>kus</et> and leave out the place.`,
});

export const DRILLS: DrillBank = {
  rules: {
    s: { label: msg`<et>-s</et>, in`, section: "in" },
    l: { label: msg`<et>-l</et>, on or at`, section: "on" },
    kus: { label: msg`Asking where with <et>kus</et>`, section: "ask" },
  },
  items: [
    typed("Tartu"),
    typed("Soome"),
    typed("haigla"),
    typed("Ukraina"),
    typed("töö"),
    typed("Saaremaa"),
    typed("Saksamaa"),
    typed("Pärnu"),
    typed("kodu"),
    typed("Eesti"),
    written(5),
    ...TRANSLATED.map(translated),
    written(3),
    written(4),
    written(6),
    ...KOHAD_ASKED.map(asked),
  ],
};
