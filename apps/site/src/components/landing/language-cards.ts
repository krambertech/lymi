import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { SampleCard } from "./cards";
import { adjective, HAND_CARDS, type HandCard, noun, phrase, verb, word } from "./hand-cards";

/** A card from a language names the language as its source; a field's card names the field. */
export type LanguageCard = HandCard & { source: string };

/** One line of a learner's handwritten lesson notes. */
export interface NoteLine {
  term: string;
  /** What the learner wrote beside it. Without one, the assistant writes the meaning. */
  gloss?: MessageDescriptor;
  /** The meaning the card ends up with when the notes had none. */
  meaning?: MessageDescriptor;
  /** Already in the learner's decks, so adding it is skipped. */
  duplicate?: boolean;
}

export interface LearningLanguage {
  id: "ja" | "es" | "fr" | "de" | "et";
  name: MessageDescriptor;
  /** BCP 47 tag of the language's terms. */
  tag: string;
  hand: LanguageCard[];
  notes: { heading: string; lines: NoteLine[] };
  classDeck: { name: MessageDescriptor; added: SampleCard };
}

const fromLanding = (...ids: string[]) =>
  ids.map((id): LanguageCard => {
    const card = HAND_CARDS.find((c) => c.id === id);
    if (typeof card?.source !== "string") throw new Error(`${id} is not a landing language card`);
    return { ...card, source: card.source };
  });

/**
 * The languages the page can switch between. Each carries what a real week of lessons in it
 * leaves you with: the hand, a page of notes and the card a class gets after the lesson. Hand audio lives at `/audio/hand/<id>.mp3`; run `pnpm --filter @lymi/site
 * hand:audio` after changing a term.
 */
export const LEARNING_LANGUAGES: LearningLanguage[] = [
  {
    id: "es",
    name: msg`Spanish`,
    tag: "es",
    hand: [
      {
        id: "madrugar",
        source: "Español",
        kind: verb,
        language: "es",
        term: "madrugar",
        pronunciation: "/maðɾuˈɣaɾ/",
        meaning: msg`To get up early`,
        note: msg`Al que madruga, Dios lo ayuda: the early bird catches the worm.`,
      },
      {
        id: "embarazada",
        source: "Español",
        kind: adjective,
        language: "es-ES",
        term: "embarazada",
        pronunciation: "/embaɾaˈθaða/",
        meaning: msg`Pregnant`,
        note: msg`A false friend. Embarrassed is avergonzado.`,
      },
      {
        id: "ojala",
        source: "Español",
        kind: word,
        language: "es",
        term: "ojalá",
        pronunciation: "/oxaˈla/",
        meaning: msg`I hope so; if only`,
        note: msg`From Arabic law šāʼ Allāh, “if God wills”.`,
      },
      {
        id: "me-pones-un-cafe",
        source: "Español",
        kind: phrase,
        language: "es-ES",
        term: "¿Me pones un café?",
        pronunciation: "/me ˈpones un kaˈfe/",
        meaning: msg`Can I get a coffee?`,
        note: msg`In a bar in Spain, you ask them to “put” you one.`,
      },
      ...fromLanding("sobremesa"),
    ],
    notes: {
      heading: "Español · martes",
      lines: [
        { term: "madrugar", gloss: msg`get up early` },
        { term: "echar de menos", gloss: msg`to miss (someone)` },
        { term: "¡ojalá!", duplicate: true },
        { term: "quedar", meaning: msg`To meet up; to arrange to meet` },
      ],
    },
    classDeck: {
      name: msg`Spanish B1 · Thursdays`,
      added: {
        label: msg`Español · phrase`,
        term: "tener ganas de",
        language: "es",
        meaning: msg`To feel like; to look forward to`,
      },
    },
  },
  {
    id: "ja",
    name: msg`Japanese`,
    tag: "ja",
    hand: [
      {
        id: "otsukaresama",
        source: "日本語",
        kind: phrase,
        language: "ja",
        term: "お疲れ様です",
        reading: "おつかれさまです · otsukaresama desu",
        pronunciation: "/o.tsɯ.ka.ɾe.sa.ma de.sɯ/",
        meaning: msg`Thanks for your hard work`,
        note: msg`Colleagues say it in the corridor, in emails and at the end of the day.`,
      },
      {
        id: "hashi",
        source: "日本語",
        kind: noun,
        language: "ja",
        term: "箸",
        reading: "はし · hashi",
        pronunciation: "/haꜜɕi/",
        meaning: msg`Chopsticks`,
        note: msg`Bridge, 橋, is also hashi. Only the pitch tells them apart.`,
      },
      ...fromLanding("komorebi", "itadakimasu", "tsundoku"),
    ],
    notes: {
      heading: "日本語 · 9月9日",
      lines: [
        { term: "駅 (えき)", gloss: msg`station` },
        { term: "〜てもいいですか", gloss: msg`may I…?` },
        { term: "お疲れ様です", duplicate: true },
        { term: "大丈夫", meaning: msg`It’s fine; I’m OK` },
      ],
    },
    classDeck: {
      name: msg`Japanese 1 · Mondays`,
      added: {
        label: msg`日本語 · phrase`,
        term: "よろしくお願いします",
        language: "ja",
        meaning: msg`Nice to meet you; thanks in advance`,
      },
    },
  },
  {
    id: "fr",
    name: msg`French`,
    tag: "fr",
    hand: [
      {
        id: "je-veux-bien",
        source: "Français",
        kind: phrase,
        language: "fr",
        term: "je veux bien",
        pronunciation: "/ʒə vø bjɛ̃/",
        meaning: msg`Yes, please; I’d be glad to`,
        note: msg`Not “I want well”. It’s how you accept a coffee.`,
      },
      {
        id: "ca-marche",
        source: "Français",
        kind: phrase,
        language: "fr",
        term: "ça marche",
        pronunciation: "/sa maʁʃ/",
        meaning: msg`Sounds good; that works`,
        note: msg`Literally “that walks”. Waiters say it when they take your order.`,
      },
      {
        id: "bref",
        source: "Français",
        kind: word,
        language: "fr",
        term: "bref",
        pronunciation: "/bʁɛf/",
        meaning: msg`Anyway; long story short`,
        note: msg`Said to cut a rambling story down to its point.`,
      },
      ...fromLanding("avoir-la-flemme"),
    ],
    notes: {
      heading: "Français · mardi",
      lines: [
        { term: "la veille", gloss: msg`the day before` },
        { term: "d’habitude", gloss: msg`usually` },
        { term: "je veux bien", duplicate: true },
        { term: "un truc", meaning: msg`A thing; a whatsit` },
      ],
    },
    classDeck: {
      name: msg`French A2 · Wednesdays`,
      added: {
        label: msg`Français · phrase`,
        term: "ça dépend",
        language: "fr",
        meaning: msg`It depends`,
      },
    },
  },
  {
    id: "de",
    name: msg`German`,
    tag: "de",
    hand: [
      {
        id: "das-maedchen",
        source: "Deutsch",
        kind: noun,
        language: "de",
        term: "das Mädchen",
        pronunciation: "/das ˈmɛːtçən/",
        meaning: msg`The girl`,
        note: msg`Neuter, not feminine: every noun ending in -chen takes das.`,
      },
      {
        id: "aufhoeren",
        source: "Deutsch",
        kind: verb,
        language: "de",
        term: "aufhören",
        pronunciation: "/ˈaʊ̯fˌhøːʁən/",
        meaning: msg`To stop`,
        note: msg`It splits: in “Ich höre jetzt auf”, auf moves to the end.`,
      },
      ...fromLanding("feierabend", "schnapsidee"),
    ],
    notes: {
      heading: "Deutsch · Dienstag",
      lines: [
        { term: "sich freuen auf", gloss: msg`look forward to` },
        { term: "die Sehenswürdigkeit", gloss: msg`sight (to see)` },
        { term: "Feierabend", duplicate: true },
        { term: "doch", meaning: msg`Yes, actually: to contradict a no` },
      ],
    },
    classDeck: {
      name: msg`German A2 · Tuesdays`,
      added: {
        label: msg`Deutsch · word`,
        term: "eigentlich",
        language: "de",
        meaning: msg`Actually; really`,
      },
    },
  },
  {
    id: "et",
    name: msg`Estonian`,
    tag: "et",
    hand: [
      {
        id: "palun",
        source: "Eesti",
        kind: word,
        language: "et",
        term: "palun",
        pronunciation: "/ˈpɑlun/",
        meaning: msg`Please; here you go; you’re welcome`,
        note: msg`One word for asking, handing something over and answering thanks.`,
      },
      {
        id: "head-aega",
        source: "Eesti",
        kind: phrase,
        language: "et",
        term: "head aega",
        meaning: msg`Goodbye`,
        note: msg`Literally “good time”.`,
      },
      {
        id: "isikukood",
        source: "Eesti",
        kind: noun,
        language: "et",
        term: "isikukood",
        meaning: msg`Personal ID code`,
        note: msg`Doctors, banks and the library all ask for it.`,
      },
      ...fromLanding("jaaaar"),
    ],
    notes: {
      heading: "Eesti keel · teisipäev",
      lines: [
        { term: "broneerima", gloss: msg`to book` },
        { term: "ühistransport", gloss: msg`public transport` },
        { term: "palun", duplicate: true },
        { term: "kallis", meaning: msg`Expensive; also dear` },
      ],
    },
    classDeck: {
      name: msg`Estonian A2 · Tuesdays`,
      added: {
        label: msg`Eesti · phrase`,
        term: "Ma ei saa aru",
        language: "et",
        meaning: msg`I don’t understand`,
      },
    },
  },
];

const byId = (id: LearningLanguage["id"]) =>
  LEARNING_LANGUAGES.find((l) => l.id === id) as LearningLanguage;

export const ESTONIAN = byId("et");

/** Every language's hand shuffled together, for the page about all of them. */
export const MIXED_HAND: LanguageCard[] = LEARNING_LANGUAGES.flatMap((l) => l.hand);

/** The Estonian page's hand: the Estonian cards plus the ones a learner meets living there. */
export const ESTONIAN_HAND: LanguageCard[] = [
  ...ESTONIAN.hand,
  {
    id: "tervist",
    source: "Eesti",
    kind: phrase,
    language: "et",
    term: "tervist",
    meaning: msg`Hello; bless you`,
    note: msg`Raise a glass and it becomes terviseks: to your health.`,
  },
  {
    id: "monus",
    source: "Eesti",
    kind: adjective,
    language: "et",
    term: "mõnus",
    meaning: msg`Pleasant; cosy`,
    note: msg`English has no õ. Say “o” without rounding your lips.`,
  },
  {
    id: "linn",
    source: "Eesti",
    kind: noun,
    language: "et",
    term: "linn",
    meaning: msg`City; town`,
    note: msg`Linna can mean “of the city” or “into the city”. Only how long you hold the n tells them apart.`,
  },
  {
    id: "kallis",
    source: "Eesti",
    kind: adjective,
    language: "et",
    term: "kallis",
    meaning: msg`Dear; expensive`,
    note: msg`The same word for someone you love and a price you’d rather not pay.`,
  },
];

/** Recognition reviews of words an Estonian learner meets in their first weeks. */
export const ESTONIAN_REVIEW: SampleCard[] = [
  {
    label: msg`Eesti · adjective`,
    term: "kallis",
    language: "et",
    meaning: msg`Dear; expensive`,
    example: "See kohvik on kallis.",
  },
  {
    label: msg`Eesti · noun`,
    term: "ühistransport",
    language: "et",
    meaning: msg`Public transport`,
    example: "Kasutan iga päev ühistransporti.",
  },
  {
    label: msg`Eesti · word`,
    term: "vabandust",
    language: "et",
    meaning: msg`Sorry; excuse me`,
    example: "Vabandust, kus on bussipeatus?",
  },
  {
    label: msg`Eesti · verb`,
    term: "broneerima",
    language: "et",
    meaning: msg`To book; to reserve`,
    example: "Tahan laua broneerida.",
  },
];
