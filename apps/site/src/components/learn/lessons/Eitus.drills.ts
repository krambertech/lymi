import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  clipId,
  endingOf,
  NEGATION_FIXES,
  NEGATION_TURNED,
  NO_ANSWERS,
  OLEMA_ROWS,
  olemaSentence,
  type Person,
  verbSentence,
} from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const MEANS: Record<string, MessageDescriptor> = {
  loe: msg`to read`,
  räägi: msg`to speak`,
  tööta: msg`to work`,
  söö: msg`to eat`,
  ela: msg`to live`,
  õpi: msg`to learn, to study`,
  oota: msg`to wait`,
  joo: msg`to drink`,
};

const NO_ENDING = msg`After <et>ei</et>, the verb drops its ending.`;
const OLE = msg`After <et>ei</et>, <et>olema</et> is always <et>ole</et>; <et>pole</et> says the same.`;

const typed = (stem: string, person: Person): FormDrill => ({
  kind: "form",
  id: `after-ei-${clipId(stem)}-${person}`,
  rule: "ei",
  base: `${stem}${endingOf(person)}`,
  gloss: MEANS[stem] as MessageDescriptor,
  cue: { et: "ei …" },
  answers: [stem, `ei ${stem}`],
  say: verbSentence(person, stem, true),
  explain: NO_ENDING,
});

const turned = ({ yes, no }: (typeof NEGATION_TURNED)[number]): SentenceDrill => ({
  kind: "rewrite",
  id: `no-${clipId(no)}`,
  rule: "ei",
  from: yes,
  cue: msg`make it no`,
  say: no,
  answers: [no],
  explain: NO_ENDING,
});

const fixed = ({ wrong, said, kind }: (typeof NEGATION_FIXES)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${clipId(wrong)}`,
  rule: kind === "verb" ? "ei" : "olema",
  wrong,
  say: said,
  answers: [said],
  explain: kind === "verb" ? NO_ENDING : OLE,
});

const olema = (row: (typeof OLEMA_ROWS)[number]): SentenceDrill => {
  const no = olemaSentence(row, "ei ole");
  return {
    kind: "rewrite",
    id: `ole-${clipId(no)}`,
    rule: "olema",
    from: olemaSentence(row, "yes"),
    cue: msg`make it no`,
    say: no,
    answers: [no, olemaSentence(row, "pole")],
    explain: OLE,
  };
};

const ANSWERER: Record<string, string> = { sa: "ma", te: "me", ta: "ta", nad: "nad" };

const answered = ({ ask, answer }: (typeof NO_ANSWERS)[number]): SentenceDrill => {
  const [, asked = "", ...rest] = ask.replace(/\?$/, "").split(" ");
  const who = ANSWERER[asked] ?? "ma";
  const verb = answer.replace(/^Ei /, "").replace(/\.$/, "");
  const tail = rest.slice(1).join(" ");
  const full = (form: string) => [
    `Ei, ${who} ${form}.`,
    `${who.charAt(0).toUpperCase()}${who.slice(1)} ${form}.`,
    ...(tail
      ? [
          `Ei, ${who} ${form} ${tail}.`,
          `${who.charAt(0).toUpperCase()}${who.slice(1)} ${form} ${tail}.`,
        ]
      : []),
  ];
  return {
    kind: "rewrite",
    id: `answer-${clipId(ask)}`,
    rule: "answer",
    from: ask,
    cue: msg`answer no`,
    say: answer,
    answers:
      verb === "ole"
        ? [answer, "Pole.", "Ei.", ...full("ei ole"), ...full("pole")]
        : [answer, "Ei.", ...full(`ei ${verb}`)],
    explain: msg`<et>Ei</et>, then the verb from the question without its ending.`,
  };
};

const YES_NO: readonly {
  id: string;
  prompt: MessageDescriptor;
  stem: string;
  person: Person;
  no: boolean;
  answers: readonly [string, ...string[]];
}[] = [
  {
    id: "yes-loete",
    prompt: msg`You all read.`,
    stem: "loe",
    person: "te",
    no: false,
    answers: ["Te loete.", "Teie loete.", "Loete."],
  },
  {
    id: "no-loete",
    prompt: msg`You all don’t read.`,
    stem: "loe",
    person: "te",
    no: true,
    answers: ["Te ei loe.", "Teie ei loe."],
  },
  {
    id: "yes-raagib",
    prompt: msg`He speaks.`,
    stem: "räägi",
    person: "ta",
    no: false,
    answers: ["Ta räägib.", "Tema räägib."],
  },
  {
    id: "no-raagib",
    prompt: msg`He doesn’t speak.`,
    stem: "räägi",
    person: "ta",
    no: true,
    answers: ["Ta ei räägi.", "Tema ei räägi."],
  },
];

const yesNo = (item: (typeof YES_NO)[number]): SentenceDrill => ({
  kind: "translate",
  id: item.id,
  rule: "yesno",
  prompt: item.prompt,
  say: verbSentence(item.person, item.stem, item.no),
  answers: item.answers,
  explain: item.no ? NO_ENDING : msg`A yes keeps the verb’s ending.`,
});

export const DRILLS: DrillBank = {
  rules: {
    ei: { label: msg`<et>Ei</et> and the verb without its ending`, section: "make-no" },
    olema: { label: msg`<et>Ei ole</et> and <et>pole</et>`, section: "ole" },
    answer: { label: msg`Answering no`, section: "answer-no" },
    yesno: { label: msg`Yes or no`, section: "yes-or-no" },
  },
  items: [
    typed("loe", "sa"),
    typed("räägi", "nad"),
    typed("tööta", "me"),
    typed("söö", "ta"),
    typed("räägi", "te"),
    typed("tööta", "ma"),
    ...NEGATION_TURNED.slice(6).map(turned),
    ...NEGATION_FIXES.map(fixed),
    ...OLEMA_ROWS.map(olema),
    ...NO_ANSWERS.slice(0, 6).map(answered),
    ...YES_NO.map(yesNo),
  ],
};
