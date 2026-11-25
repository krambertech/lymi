import { msg } from "@lingui/core/macro";
import { FLAT_FIX, FLAT_SAY } from "../../../lib/learn/clips";
import type { DrillBank } from "../../../lib/learn/drill";
import { withPronouns } from "../../../lib/learn/pronouns";

const sayAnswers = (id: (typeof FLAT_SAY)[number]["id"]) =>
  (FLAT_SAY.find((item) => item.id === id) as (typeof FLAT_SAY)[number]).answers;
const fixAnswers = (id: (typeof FLAT_FIX)[number]["id"]) =>
  (FLAT_FIX.find((item) => item.id === id) as (typeof FLAT_FIX)[number]).answers;

const WHERE = msg`Where something is usually takes <et>-s</et>, or <et>-l</et> on a balcony: <et>köögis</et>, <et>rõdul</et>.`;
const WHERE_TO = msg`Where something goes usually takes <et>-sse</et> or a short form, or <et>-le</et> onto a balcony: <et>korterisse</et>, <et>kööki</et>, <et>rõdule</et>.`;
const NONE = msg`When something isn’t there or you don’t have it, <et>ei ole</et> takes the partitive: <et>Majas ei ole lifti</et>.`;
const FLOOR = msg`On a floor, the ordinal usually takes <et>-l</et> with the noun: <et>kolmandal korrusel</et>.`;
const DATE = msg`From a date usually takes <et>-st</et> on both words: <et>esimesest detsembrist</et>.`;
const WITH = msg`With is <et>-ga</et>: <et>sõbraga</et>.`;
const WITHOUT = msg`Without is <et>ilma</et> and <et>-ta</et>: <et>ilma mööblita</et>.`;
const AS = msg`Working as is usually <et>-na</et>: <et>õpetajana</et>.`;
const FOR = msg`For a length of time, <et>-ks</et> on the genitive: <et>üheks aastaks</et>.`;
const AGREE = msg`An adjective usually takes its noun’s ending: <et>suures toas</et>, <et>suurt akent</et>.`;
const COMPARE = msg`Smaller than is <et>väiksem kui</et>, or the thing compared with takes <et>-st</et>: <et>toast väiksem</et>.`;
const MOST = msg`The most is <et>kõige</et> and the comparative: <et>kõige vaiksem</et>.`;
const NOBODY = msg`After <et>ei</et>, nobody is <et>keegi</et>, or <et>mitte keegi</et>: <et>Korteris ei ela keegi</et>.`;
const ME = msg`To me is <et>mulle</et>, with me <et>minuga</et>: <et>helistage mulle</et>, <et>tule minuga</et>.`;
const PARTICLE = msg`Moving in is <et>sisse kolima</et>, with the <et>-da</et> infinitive after <et>tahan</et>: <et>tahan sisse kolida</et>.`;
const MA = msg`Coming to do something takes the <et>-ma</et> infinitive: <et>vaatama tulla</et>.`;

export const DRILLS: DrillBank = {
  rules: {
    place: { label: msg`Where or where to: <et>köögis</et>, <et>kööki</et>`, section: "where" },
    none: { label: msg`None there: <et>ei ole lifti</et>`, section: "reply" },
    floor: {
      label: msg`Floors and dates: <et>kolmandal korrusel</et>, <et>esimesest detsembrist</et>`,
      section: "say-it",
    },
    ends: {
      label: msg`With, without, as, for: <et>-ga</et>, <et>-ta</et>, <et>-na</et>, <et>-ks</et>`,
      section: "reply",
    },
    adjectives: {
      label: msg`Adjectives and comparing: <et>suures toas</et>, <et>kõige vaiksem</et>`,
      section: "fix",
    },
    people: {
      label: msg`People and particles: <et>mulle</et>, <et>keegi</et>, <et>sisse kolima</et>`,
      section: "advert",
    },
  },
  items: [
    {
      kind: "dictation",
      id: "place-rodul",
      rule: "place",
      answers: ["Kass on rõdul."],
      say: "Kass on rõdul.",
      explain: WHERE,
    },
    {
      kind: "translate",
      id: "place-koogis",
      rule: "place",
      prompt: msg`I’m in the kitchen.`,
      answers: withPronouns(["Ma olen köögis.", "Köögis olen ma.", "Köögis ma olen."]),
      say: "Ma olen köögis.",
      explain: WHERE,
    },
    {
      kind: "translate",
      id: "place-kooki",
      rule: "place",
      prompt: msg`Come into the kitchen!`,
      answers: ["Tule kööki!", "Tulge kööki!", "Tule köögisse!", "Tulge köögisse!"],
      say: "Tule kööki!",
      explain: WHERE_TO,
    },
    {
      kind: "fix",
      id: "place-fix-korterisse",
      rule: "place",
      wrong: "Ma lähen korteris.",
      prompt: msg`I’m going into the flat.`,
      answers: fixAnswers("korterisse"),
      say: "Ma lähen korterisse.",
      explain: WHERE_TO,
    },

    {
      kind: "fix",
      id: "none-fix-lifti",
      rule: "none",
      wrong: "Majas ei ole lift.",
      prompt: msg`There is no lift in the building.`,
      answers: fixAnswers("lifti"),
      say: "Majas ei ole lifti.",
      explain: NONE,
    },
    {
      kind: "dictation",
      id: "none-kassi",
      rule: "none",
      answers: ["Mul ei ole kassi."],
      say: "Mul ei ole kassi.",
      explain: NONE,
    },
    {
      kind: "translate",
      id: "none-lifti",
      rule: "none",
      prompt: msg`There is no lift in the building.`,
      answers: [
        "Majas ei ole lifti.",
        "Majas pole lifti.",
        "Lifti majas ei ole.",
        "Lifti majas pole.",
      ],
      say: "Majas ei ole lifti.",
      explain: NONE,
    },
    {
      kind: "translate",
      id: "none-rodu",
      rule: "none",
      prompt: msg`The flat has no balcony.`,
      answers: [
        "Korteris ei ole rõdu.",
        "Korteris pole rõdu.",
        "Rõdu korteris ei ole.",
        "Rõdu korteris pole.",
        "Korteril ei ole rõdu.",
        "Korteril pole rõdu.",
        "Korteris rõdu ei ole.",
        "Korteris rõdu pole.",
        "Korteril rõdu ei ole.",
        "Korteril rõdu pole.",
      ],
      say: "Korteris ei ole rõdu.",
      explain: NONE,
    },

    {
      kind: "fix",
      id: "floor-fix-kolmandal",
      rule: "floor",
      wrong: "Korter on kolmas korrusel.",
      prompt: msg`The flat is on the third floor.`,
      answers: fixAnswers("kolmandal"),
      say: "Korter on kolmandal korrusel.",
      explain: FLOOR,
    },
    {
      kind: "dictation",
      id: "floor-teisel",
      rule: "floor",
      answers: ["Mari elab teisel korrusel."],
      say: "Mari elab teisel korrusel.",
      explain: FLOOR,
    },
    {
      kind: "translate",
      id: "floor-neljandal",
      rule: "floor",
      prompt: msg`I live on the fourth floor.`,
      answers: withPronouns([
        "Ma elan neljandal korrusel.",
        "Neljandal korrusel elan ma.",
        "Neljandal korrusel ma elan.",
        "Ma elan 4. korrusel.",
      ]),
      say: "Ma elan neljandal korrusel.",
      explain: FLOOR,
    },
    {
      kind: "form",
      id: "floor-viiendal",
      rule: "floor",
      base: "viies",
      gloss: msg`fifth`,
      cue: { et: "Korter on … korrusel." },
      answers: ["viiendal"],
      say: "Korter on viiendal korrusel.",
      explain: FLOOR,
    },
    {
      kind: "fix",
      id: "floor-fix-esimesest",
      rule: "floor",
      wrong: "Korter on vaba esimene detsembrist.",
      prompt: msg`The flat is free from the first of December.`,
      answers: fixAnswers("esimesest"),
      say: "Korter on vaba esimesest detsembrist.",
      explain: DATE,
    },

    {
      kind: "dictation",
      id: "ends-sobraga",
      rule: "ends",
      answers: ["Ma tulen koos sõbraga."],
      say: "Ma tulen koos sõbraga.",
      explain: WITH,
    },
    {
      kind: "translate",
      id: "ends-mooblita",
      rule: "ends",
      prompt: msg`The flat has no furniture.`,
      answers: [
        "Korter on ilma mööblita.",
        "Korter on mööblita.",
        "Korteris ei ole mööblit.",
        "Korteris pole mööblit.",
      ],
      say: "Korter on ilma mööblita.",
      explain: WITHOUT,
    },
    {
      kind: "translate",
      id: "ends-opetajana",
      rule: "ends",
      prompt: msg`I work as a teacher in Tartu.`,
      answers: withPronouns([
        "Ma töötan Tartus õpetajana.",
        "Ma töötan õpetajana Tartus.",
        "Tartus töötan ma õpetajana.",
        "Tartus ma töötan õpetajana.",
        "Ma töötan Tartus õpetajaks.",
        "Ma töötan õpetajaks Tartus.",
        "Tartus töötan ma õpetajaks.",
        "Tartus ma töötan õpetajaks.",
        "Ma olen Tartus õpetaja.",
        "Ma olen õpetaja Tartus.",
        "Tartus olen ma õpetaja.",
        "Tartus ma olen õpetaja.",
      ]),
      say: "Ma töötan Tartus õpetajana.",
      explain: AS,
    },
    {
      kind: "dictation",
      id: "ends-muujana",
      rule: "ends",
      answers: ["Mari töötab poes müüjana."],
      say: "Mari töötab poes müüjana.",
      explain: AS,
    },
    {
      kind: "translate",
      id: "ends-aastaks",
      rule: "ends",
      prompt: msg`I live here for a year.`,
      answers: withPronouns([
        "Ma elan siin üheks aastaks.",
        "Ma elan üheks aastaks siin.",
        "Siin elan ma üheks aastaks.",
        "Siin ma elan üheks aastaks.",
        "Üheks aastaks elan ma siin.",
        "Üheks aastaks ma elan siin.",
      ]),
      say: "Ma elan siin üheks aastaks.",
      explain: FOR,
    },

    {
      kind: "dictation",
      id: "adj-suures-toas",
      rule: "adjectives",
      answers: ["Suures toas on kaks suurt akent."],
      say: "Suures toas on kaks suurt akent.",
      explain: AGREE,
    },
    {
      kind: "fix",
      id: "adj-fix-suures",
      rule: "adjectives",
      wrong: "Korter on suur majas.",
      prompt: msg`The flat is in a big house.`,
      answers: fixAnswers("suures"),
      say: "Korter on suures majas.",
      explain: AGREE,
    },
    {
      kind: "translate",
      id: "adj-vaiksem",
      rule: "adjectives",
      prompt: msg`The kitchen is smaller than the room.`,
      answers: [
        "Köök on väiksem kui tuba.",
        "Köök on väikesem kui tuba.",
        "Köök on toast väiksem.",
        "Köök on toast väikesem.",
      ],
      say: "Köök on väiksem kui tuba.",
      explain: COMPARE,
    },
    {
      kind: "translate",
      id: "adj-kige-vaiksem",
      rule: "adjectives",
      prompt: msg`It is the quietest house.`,
      answers: [
        "See on kõige vaiksem maja.",
        "See on vaikseim maja.",
        "See maja on kõige vaiksem.",
        "See maja on vaikseim.",
        "Maja on kõige vaiksem.",
        "Maja on vaikseim.",
      ],
      say: "See on kõige vaiksem maja.",
      explain: MOST,
    },

    {
      kind: "translate",
      id: "people-helista",
      rule: "people",
      prompt: msg`Please call me in the evening.`,
      answers: sayAnswers("helista"),
      say: "Helistage mulle õhtul.",
      explain: ME,
    },
    {
      kind: "translate",
      id: "people-keegi",
      rule: "people",
      prompt: msg`Nobody lives in the flat.`,
      answers: [
        "Korteris ei ela keegi.",
        "Korteris ei ela kedagi.",
        "Korteris ei ela mitte keegi.",
        "Korteris ei ela mitte kedagi.",
        "Keegi ei ela korteris.",
        "Mitte keegi ei ela korteris.",
        "Kedagi ei ela korteris.",
        "Mitte kedagi ei ela korteris.",
      ],
      say: "Korteris ei ela keegi.",
      explain: NOBODY,
    },
    {
      kind: "dictation",
      id: "people-minuga",
      rule: "people",
      answers: ["Tule minuga korterit vaatama!"],
      say: "Tule minuga korterit vaatama!",
      explain: ME,
    },
    {
      kind: "translate",
      id: "people-kolida",
      rule: "people",
      prompt: msg`I want to move in on Friday.`,
      answers: sayAnswers("kolida"),
      say: "Ma tahan reedel sisse kolida.",
      explain: PARTICLE,
    },
    {
      kind: "fix",
      id: "people-fix-kolida",
      rule: "people",
      wrong: "Ma tahan sisse kolima.",
      prompt: msg`I want to move in.`,
      answers: fixAnswers("kolida"),
      say: "Ma tahan sisse kolida.",
      explain: PARTICLE,
    },
    {
      kind: "translate",
      id: "people-vaatama",
      rule: "people",
      prompt: msg`Can I come and see the flat tomorrow?`,
      answers: sayAnswers("vaatama"),
      say: "Kas ma võin homme korterit vaatama tulla?",
      explain: MA,
    },
  ],
};
