import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { clipId, dayAnswers, dayTranslations, WEEK } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, SentenceDrill } from "../../../lib/learn/drill";

type Day = (typeof WEEK)[number];

const MEANS: Record<Day, MessageDescriptor> = {
  esmaspäev: msg`Monday`,
  teisipäev: msg`Tuesday`,
  kolmapäev: msg`Wednesday`,
  neljapäev: msg`Thursday`,
  reede: msg`Friday`,
  laupäev: msg`Saturday`,
  pühapäev: msg`Sunday`,
};

const COUNT = msg`The first four count: <et>esmaspäev</et> is the first day, <et>neljapäev</et> the fourth.`;
const OWN = msg`<et>Reede</et> is the one day without <et>päev</et>; <et>laupäev</et> and <et>pühapäev</et> have names of their own.`;
const NEXT = msg`<et>Homme</et> is tomorrow: the day after today.`;

const next = (each: Day) => WEEK[(WEEK.indexOf(each) + 1) % WEEK.length] as Day;

const heard = (each: Day, near: Day): ChoiceDrill => {
  const option = (d: Day) => ({ id: d, label: { et: d }, sub: MEANS[d] });
  return {
    kind: "choice",
    id: `hear-${clipId(each)}`,
    rule: "names",
    say: each,
    answer: option(each),
    slip: option(near),
    wrong: WEEK.filter((d) => d !== each && d !== near).map(option),
    explain: ["reede", "laupäev", "pühapäev"].includes(each) ? OWN : COUNT,
  };
};

const tomorrow = (today: Day): ChoiceDrill => {
  const option = (d: Day) => ({ id: d, label: { et: d }, sub: MEANS[d] });
  return {
    kind: "choice",
    id: `after-${clipId(today)}`,
    rule: "tomorrow",
    say: `Täna on ${today}.`,
    answer: option(next(today)),
    slip: option(today),
    wrong: WEEK.filter((d) => d !== today && d !== next(today)).map(option),
    explain: NEXT,
  };
};

const PROMPTS: Record<string, MessageDescriptor> = {
  "Täna on teisipäev.": msg`Today is Tuesday.`,
  "Täna on pühapäev.": msg`Today is Sunday.`,
  "Homme on esmaspäev.": msg`Tomorrow is Monday.`,
  "Homme on laupäev.": msg`Tomorrow is Saturday.`,
};

const translated = (said: string): SentenceDrill => ({
  kind: "translate",
  id: `translate-${clipId(said)}`,
  rule: "sentence",
  prompt: PROMPTS[said] as MessageDescriptor,
  say: said,
  answers: dayTranslations(said),
  explain: msg`<et>Täna on</et> says what day it is today, <et>homme on</et> what day it is tomorrow; the day’s name usually comes after.`,
});

const written = (said: string): SentenceDrill => ({
  kind: "dictation",
  id: `write-${clipId(said)}`,
  rule: "sentence",
  say: said,
  answers: dayAnswers(said),
  explain: said.includes("reede")
    ? OWN
    : msg`Six days end in <et>päev</et>, so listen to how each one starts.`,
});

export const DRILLS: DrillBank = {
  rules: {
    names: { label: msg`The days by ear`, section: "hear" },
    tomorrow: { label: msg`The day after`, section: "tomorrow" },
    sentence: { label: msg`What day it is`, section: "today" },
  },
  items: [
    heard("teisipäev", "neljapäev"),
    heard("neljapäev", "teisipäev"),
    heard("kolmapäev", "esmaspäev"),
    heard("esmaspäev", "kolmapäev"),
    heard("laupäev", "pühapäev"),
    heard("pühapäev", "laupäev"),
    heard("reede", "esmaspäev"),
    ...WEEK.map(tomorrow),
    ...Object.keys(PROMPTS).map(translated),
    written("Täna on kolmapäev."),
    written("Täna on reede."),
    written("Homme on neljapäev."),
    written("Homme on pühapäev."),
    written("Homme on teisipäev."),
    written("Täna on laupäev."),
  ],
};
