import type { Persona, PersonaCard } from "./personas";

/**
 * Accounts that share decks. Noor owns a deck that Kateryna, Tomás, Ana and Pedro belong to. A deck's `people` is the one place a membership is
 * written down: seeding the owner joins the members, and seeding a member finds its owner's deck.
 * Tomás joined before getting set up, so he lands on the Welcome that such an arrival opens.
 */

type Row = [term: string, meaning: string, example?: string];

const at = (section: string, rows: Row[]): PersonaCard[] =>
  rows.map(([term, meaning, example]) => ({
    term,
    meaning,
    section,
    meaningSource: "lesson",
    ...(example && { example }),
  }));

const LISBOA: PersonaCard[] = [
  ...at("No café", [
    ["um galão", "a milky coffee in a glass", "Um galão e um pastel de nata, por favor."],
    ["a bica", "an espresso (Lisbon)"],
    ["o pastel de nata", "a custard tart"],
    ["a conta", "the bill", "A conta, por favor."],
    ["a esplanada", "a café terrace"],
    ["o sumo", "juice"],
    ["a torrada", "toast"],
    ["sem açúcar", "without sugar"],
    ["para levar", "to take away"],
    ["está ocupado?", "is this seat taken?"],
    ["a gorjeta", "the tip"],
    ["o empregado", "the waiter"],
  ]),
  ...at("Na rua", [
    ["o elétrico", "the tram", "O elétrico 28 sobe até ao castelo."],
    ["a calçada", "the cobbled pavement"],
    ["o miradouro", "the viewpoint"],
    ["a ladeira", "the steep street"],
    ["à esquerda", "on the left"],
    ["à direita", "on the right"],
    ["em frente", "straight ahead"],
    ["a paragem", "the bus stop"],
    ["o bairro", "the neighbourhood"],
    ["a praça", "the square"],
    ["perto", "near"],
    ["longe", "far"],
    ["o rio", "the river"],
    ["a ponte", "the bridge"],
  ]),
  ...at("Em casa", [
    ["a chave", "the key"],
    ["a varanda", "the balcony"],
    ["o senhorio", "the landlord"],
    ["a renda", "the rent", "A renda vence no dia um."],
    ["a vizinha", "the neighbour (woman)"],
    ["a máquina de lavar", "the washing machine"],
    ["o estendal", "the clothes line"],
    ["a casa de banho", "the bathroom"],
    ["arrumar", "to tidy up"],
    ["a mudança", "the move (house)"],
  ]),
];

const VERBOS: PersonaCard[] = (
  [
    ["fazer", "to do; to make"],
    ["dizer", "to say"],
    ["trazer", "to bring"],
    ["pôr", "to put"],
    ["saber", "to know (a fact)"],
    ["poder", "to be able to"],
    ["querer", "to want"],
    ["ver", "to see"],
    ["vir", "to come"],
    ["dar", "to give"],
    ["ir", "to go"],
    ["ter", "to have"],
  ] as const
).map(([term, meaning]) => ({ term, meaning, tags: ["verb"], meaningSource: "lesson" as const }));

export const SHARED: Persona = {
  id: "shared",
  name: "Noor",
  group: "Together",
  description:
    "Owns a shared deck with four learners, a waiting invitation and its join link on. A learner in Ana's deck, with Everyday Estonian added from Explore in Ukrainian.",
  appLanguage: "en",
  reviewDays: [30, 29, 27, 26, 24, 23, 22, 20, 19, 17, 15, 14, 12, 10, 9, 8, 6, 5, 3, 2, 1],
  dueNow: 8,
  decks: [
    {
      name: "Lisboa a dois",
      description: "Words for a year in Lisbon, shared with friends.",
      defaultLanguage: "pt",
      introducedDaysAgo: 32,
      sections: ["No café", "Na rua", "Em casa"],
      cards: LISBOA,
      people: {
        members: ["learner", "joining", "ana", "pedro"],
        invitations: ["mira@example.com"],
        joinLink: true,
      },
    },
  ],
  explore: [{ slug: "everyday-estonian", meaningLanguage: "uk" }],
};

export const JOINING: Persona = {
  id: "joining",
  name: "Tomás",
  group: "Start",
  description:
    "Joined Noor's deck through its link and has not got set up. Signing in opens Welcome with her deck, as arriving from a join link does.",
  appLanguage: "en",
  reviewDays: [],
  dueNow: 0,
  decks: [],
  landing: { welcomeWith: { owner: "shared", deck: "Lisboa a dois" } },
};

/** Accounts that only fill a people list. They are not offered in the palette. */
export const COMPANIONS: Persona[] = [
  {
    id: "ana",
    name: "Ana",
    group: "Together",
    description: "Owns a small deck Noor learns from.",
    appLanguage: "en",
    reviewDays: [5, 3, 1],
    dueNow: 0,
    decks: [
      {
        name: "Verbos irregulares",
        defaultLanguage: "pt",
        introducedDaysAgo: 10,
        cards: VERBOS,
        people: { members: ["shared"] },
      },
    ],
  },
  {
    id: "pedro",
    name: "Pedro",
    group: "Together",
    description: "A learner in Noor's deck.",
    appLanguage: "en",
    reviewDays: [],
    dueNow: 0,
    decks: [],
  },
];
