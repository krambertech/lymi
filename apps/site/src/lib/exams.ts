import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { PublicDeckSummary, ShelfRoute } from "@lymi/core/catalog";
import type { Locale } from "./routes";

/**
 * The exams the exam pages list, each with the published decks that cover it and the source
 * those decks follow. A deck missing from the catalogue drops out, and an exam with none left
 * is not shown, so the pages never link to a deck that is gone. Every fact here was checked
 * against the authority's own page; one that could not be checked is left out.
 */
export interface Exam {
  id: string;
  /** The exam page's address under `/exams`. */
  slug: string;
  group: "citizenship" | "driving";
  name: MessageDescriptor;
  country: MessageDescriptor;
  /** The exam page's heading: the exam by its own name, then what the page offers. */
  heading: MessageDescriptor;
  lede: MessageDescriptor;
  /** One line for the exam's tile on the hub. */
  summary: MessageDescriptor;
  decks: readonly string[];
  source: ExamSource;
  /** Who sets the exam, for "Lymi isn't affiliated with …". */
  authority: string;
  facts?: readonly ExamFact[];
  /** A condition the facts hold under, such as the date an application was filed. */
  factsNote?: MessageDescriptor;
  /** What the decks are when they are not the exam's own published questions. */
  note?: MessageDescriptor;
  /** A real card from the exam's first deck, for its tile and the hub's review. */
  sample: ExamSample;
}

export interface ExamSource {
  /** The source's own title, in its own language, as the publisher names it. */
  title: string;
  url: string;
  edition?: MessageDescriptor;
  /** An attribution the source's licence asks for. */
  licence?: MessageDescriptor;
}

export interface ExamFact {
  value: string;
  label: MessageDescriptor;
}

export interface ExamSample {
  /** BCP 47 tag of the question, as the exam writes it. */
  language: string;
  question: string;
  options?: readonly string[];
  answer: string;
  /** The question and answer in the reader's language; absent when the exam is in English. */
  translation?: { question: MessageDescriptor; answer: MessageDescriptor };
}

/** Germany's 16 states in the catalogue's order, each with its own deck of 10 questions. */
export const GERMAN_STATES = [
  { slug: "einbuergerungstest-baden-wuerttemberg", name: "Baden-Württemberg" },
  { slug: "einbuergerungstest-bayern", name: "Bayern" },
  { slug: "einbuergerungstest-berlin", name: "Berlin" },
  { slug: "einbuergerungstest-brandenburg", name: "Brandenburg" },
  { slug: "einbuergerungstest-bremen", name: "Bremen" },
  { slug: "einbuergerungstest-hamburg", name: "Hamburg" },
  { slug: "einbuergerungstest-hessen", name: "Hessen" },
  { slug: "einbuergerungstest-mecklenburg-vorpommern", name: "Mecklenburg-Vorpommern" },
  { slug: "einbuergerungstest-niedersachsen", name: "Niedersachsen" },
  { slug: "einbuergerungstest-nordrhein-westfalen", name: "Nordrhein-Westfalen" },
  { slug: "einbuergerungstest-rheinland-pfalz", name: "Rheinland-Pfalz" },
  { slug: "einbuergerungstest-saarland", name: "Saarland" },
  { slug: "einbuergerungstest-sachsen", name: "Sachsen" },
  { slug: "einbuergerungstest-sachsen-anhalt", name: "Sachsen-Anhalt" },
  { slug: "einbuergerungstest-schleswig-holstein", name: "Schleswig-Holstein" },
  { slug: "einbuergerungstest-thueringen", name: "Thüringen" },
] as const;

export const GERMAN_GENERAL_DECK = "leben-in-deutschland-test";

export const BAMF_CATALOGUE: ExamSource = {
  title: "BAMF: Gesamtfragenkatalog zum Test „Leben in Deutschland“ und zum Einbürgerungstest",
  url: "https://www.bamf.de/SharedDocs/Anlagen/DE/Integration/Einbuergerung/gesamtfragenkatalog-lebenindeutschland.html",
  edition: msg`Version of 7 May 2025`,
};

/** Germany's exam has a page of its own with a state picker; every other exam uses the template. */
export const EINBUERGERUNGSTEST = "einbuergerungstest";

export const EXAMS: readonly Exam[] = [
  {
    id: "germany",
    slug: EINBUERGERUNGSTEST,
    group: "citizenship",
    name: msg`Einbürgerungstest and Leben in Deutschland`,
    country: msg`Germany`,
    heading: msg`Einbürgerungstest and Leben in Deutschland: every question in English`,
    lede: msg`The full BAMF catalogue: the 300 general questions and the 10 for your state, in German as they appear on the test, with English next to each.`,
    summary: msg`33 questions, 17 to pass. 300 general questions and 10 for your state to learn.`,
    decks: [GERMAN_GENERAL_DECK, ...GERMAN_STATES.map((state) => state.slug)],
    source: BAMF_CATALOGUE,
    authority: "BAMF",
    facts: [
      { value: "33", label: msg`questions: 30 general and 3 about your state` },
      { value: "17", label: msg`correct answers to pass` },
      { value: "60", label: msg`minutes to answer them` },
      { value: "310", label: msg`questions to learn: 300 general and 10 for your state` },
    ],
    sample: {
      language: "de",
      question: "Deutschland ist …",
      options: [
        "ein sozialistischer Staat.",
        "ein Bundesstaat.",
        "eine Diktatur.",
        "eine Monarchie.",
      ],
      answer: "ein Bundesstaat.",
      translation: { question: msg`Germany is …`, answer: msg`a federal state.` },
    },
  },
  {
    id: "united-states",
    slug: "us-citizenship-test",
    group: "citizenship",
    name: msg`US citizenship test`,
    country: msg`United States`,
    heading: msg`US citizenship test: all 128 civics questions`,
    lede: msg`Every question of the 2025 civics test with its accepted answers, and the words of the reading and writing test.`,
    summary: msg`20 questions asked aloud, 12 to pass. 128 to learn.`,
    decks: ["us-citizenship-test", "us-citizenship-reading-writing-vocabulary"],
    source: {
      title: "USCIS: 128 Civics Questions and Answers (2025 version)",
      url: "https://www.uscis.gov/citizenship-resource-center/naturalization-test-and-study-resources/2025-civics-test",
      edition: msg`2025 version`,
    },
    authority: "USCIS",
    facts: [
      { value: "20", label: msg`questions an officer asks aloud` },
      { value: "12", label: msg`correct answers to pass` },
      { value: "128", label: msg`questions to learn` },
    ],
    factsNote: msg`For applications filed on or after 20 October 2025. The officer stops once you have 12 right, or 9 wrong.`,
    sample: {
      language: "en",
      question:
        "Who can vote in federal elections, run for federal office, and serve on a jury in the United States?",
      answer: "U.S. citizens",
      translation: {
        question: msg`Who can vote in federal elections, run for federal office, and serve on a jury in the United States?`,
        answer: msg`U.S. citizens`,
      },
    },
  },
  {
    id: "canada",
    slug: "canadian-citizenship-test",
    group: "citizenship",
    name: msg`Canadian citizenship test`,
    country: msg`Canada`,
    heading: msg`Canadian citizenship test: practice questions on every chapter`,
    lede: msg`Questions on every chapter of Discover Canada, the official study guide, with the answer and a short note on each.`,
    summary: msg`20 questions, 15 to pass, 45 minutes.`,
    decks: ["canadian-citizenship-test"],
    source: {
      title: "IRCC: Discover Canada, the official study guide",
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online.html",
    },
    authority: "IRCC",
    facts: [
      { value: "20", label: msg`questions, multiple choice or true or false` },
      { value: "15", label: msg`correct answers to pass` },
      { value: "45", label: msg`minutes to answer them` },
    ],
    note: msg`IRCC doesn’t publish its questions. These are practice questions written from every chapter of the official study guide.`,
    sample: {
      language: "en",
      question: "Who were the first Europeans to reach Canada?",
      answer: "The Vikings",
      translation: {
        question: msg`Who were the first Europeans to reach Canada?`,
        answer: msg`The Vikings`,
      },
    },
  },
  {
    id: "czechia",
    slug: "czech-citizenship-test",
    group: "citizenship",
    name: msg`Czech citizenship test`,
    country: msg`Czechia`,
    heading: msg`Czech citizenship test: all 300 questions`,
    lede: msg`The whole official bank for the test of Czech life and institutions, in Czech as on the test, with a translation next to each.`,
    summary: msg`30 questions, 18 to pass. 300 to learn.`,
    decks: ["czech-citizenship-test"],
    source: {
      title: "NPI ČR: Databanka testových úloh z českých reálií",
      url: "https://cestina-pro-cizince.cz/obcanstvi/",
      edition: msg`Version of 5 January 2026`,
    },
    authority: "NPI ČR",
    facts: [
      { value: "30", label: msg`questions, each with four answers` },
      { value: "18", label: msg`correct answers to pass` },
      { value: "30", label: msg`minutes to answer them` },
      { value: "300", label: msg`questions in the official bank` },
    ],
    sample: {
      language: "cs",
      question: "Která dvojice krajů se nachází ve východních Čechách?",
      options: [
        "Liberecký kraj a Ústecký kraj.",
        "Ústecký kraj a Karlovarský kraj.",
        "Plzeňský kraj a Karlovarský kraj.",
        "Královéhradecký kraj a Pardubický kraj.",
      ],
      answer: "Královéhradecký kraj a Pardubický kraj.",
      translation: {
        question: msg`Which pair of regions is in East Bohemia?`,
        answer: msg`The Hradec Králové and Pardubice regions.`,
      },
    },
  },
  {
    id: "spain",
    slug: "ccse-spanish-nationality-test",
    group: "citizenship",
    name: msg`CCSE Spanish nationality test`,
    country: msg`Spain`,
    heading: msg`CCSE Spanish nationality test: all 300 questions`,
    lede: msg`Every question in the Instituto Cervantes manual, in Spanish as on the test, with a translation next to each.`,
    summary: msg`25 questions, 15 to pass. 300 to learn.`,
    decks: ["ccse-spanish-nationality-test"],
    source: {
      title: "Instituto Cervantes: Manual de preparación de la prueba CCSE",
      url: "https://examenes.cervantes.es/es/ccse/preparar-prueba",
      edition: msg`2026 edition`,
    },
    authority: "Instituto Cervantes",
    facts: [
      { value: "25", label: msg`questions, multiple choice or true or false` },
      { value: "15", label: msg`correct answers to pass` },
      { value: "45", label: msg`minutes to answer them` },
      { value: "300", label: msg`questions in the manual` },
    ],
    sample: {
      language: "es",
      question: "¿Cuántas comunidades autónomas hay en España?",
      options: ["8.", "17.", "25."],
      answer: "17.",
      translation: {
        question: msg`How many autonomous communities does Spain have?`,
        answer: msg`17.`,
      },
    },
  },
  {
    id: "germany-driving",
    slug: "german-road-signs",
    group: "driving",
    name: msg`German road signs for the theory test`,
    country: msg`Germany`,
    heading: msg`German road signs: every sign of the StVO`,
    lede: msg`Every sign by its picture, with its German name and number, for the theory test and the road.`,
    summary: msg`Every sign by its picture and German name.`,
    decks: ["german-road-signs"],
    source: {
      title: "Straßenverkehrs-Ordnung (StVO), Anlagen 1–3",
      url: "https://www.gesetze-im-internet.de/stvo_2013/",
      edition: msg`As amended on 30 January 2026`,
    },
    authority: "Bundesministerium für Verkehr",
    sample: {
      language: "de",
      question: "Fußgängerüberweg",
      answer: "Fußgängerüberweg",
      translation: { question: msg`Pedestrian crossing`, answer: msg`Pedestrian crossing` },
    },
  },
  {
    id: "poland-driving",
    slug: "polish-road-signs",
    group: "driving",
    name: msg`Polish road signs for the theory test`,
    country: msg`Poland`,
    heading: msg`Polish road signs: every sign, by its picture`,
    lede: msg`Every sign of the Polish regulation by its picture, with its Polish name and code.`,
    summary: msg`Every sign by its picture and Polish name.`,
    decks: ["polish-road-signs"],
    source: {
      title: "Rozporządzenie w sprawie znaków i sygnałów drogowych, Dz.U. 2019 poz. 2310",
      url: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20190002310",
      edition: msg`As amended on 19 February 2026`,
      licence: msg`Sign drawings from Wikimedia Commons: public domain, and C-18 and C-19 by Harry-C under CC BY 3.0.`,
    },
    authority: "Ministerstwo Infrastruktury",
    sample: {
      language: "pl",
      question: "droga dla pieszych",
      answer: "droga dla pieszych",
      translation: { question: msg`Footpath`, answer: msg`Footpath` },
    },
  },
  {
    id: "ukraine-driving",
    slug: "ukrainian-driving-theory",
    group: "driving",
    name: msg`Ukrainian driving theory (ПДР)`,
    country: msg`Ukraine`,
    heading: msg`Ukrainian driving theory: the rules and every sign`,
    lede: msg`The rules the theory test asks about, and every sign of the ПДР by its picture.`,
    summary: msg`The rules, and every sign by its picture.`,
    decks: ["ukrainian-driving-theory", "ukrainian-road-signs"],
    source: {
      title: "Правила дорожнього руху України, постанова КМУ № 1306",
      url: "https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF",
      edition: msg`As amended on 1 April 2026`,
    },
    authority: "Кабінет Міністрів України",
    sample: {
      language: "en",
      question: "Give way",
      answer: "Slow or stop so others can pass without you forcing them to change speed or path.",
      translation: {
        question: msg`Give way`,
        answer: msg`Slow or stop so others can pass without you forcing them to change speed or path.`,
      },
    },
  },
  {
    id: "california-driving",
    slug: "california-dmv-test",
    group: "driving",
    name: msg`California DMV knowledge test`,
    country: msg`United States`,
    heading: msg`California DMV knowledge test: the rules of the road`,
    lede: msg`Practice questions on the California Driver’s Handbook, one rule to a card.`,
    summary: msg`80% to pass. Questions from the official handbook.`,
    decks: ["dmv-california-knowledge-test"],
    source: {
      title: "California DMV: California Driver’s Handbook (DL 600)",
      url: "https://www.dmv.ca.gov/portal/handbook/california-driver-handbook/",
      edition: msg`Revised June 2025`,
      licence: msg`California Driver’s Handbook © California DMV, licensed CC BY-NC 4.0.`,
    },
    authority: "California DMV",
    facts: [{ value: "80%", label: msg`correct answers to pass` }],
    note: msg`The DMV doesn’t publish its questions. These are practice questions written from the official handbook.`,
    sample: {
      language: "en",
      question: "Can you make a U-turn on a one-way street?",
      answer: "No",
      translation: {
        question: msg`Can you make a U-turn on a one-way street?`,
        answer: msg`No`,
      },
    },
  },
  {
    id: "new-york-driving",
    slug: "new-york-dmv-test",
    group: "driving",
    name: msg`New York DMV written test`,
    country: msg`United States`,
    heading: msg`New York DMV written test: the rules of the road`,
    lede: msg`Practice questions on the New York State Driver’s Manual, one rule to a card.`,
    summary: msg`20 questions, 14 to pass.`,
    decks: ["dmv-new-york-knowledge-test"],
    source: {
      title: "NY DMV: New York State Driver’s Manual (MV-21)",
      url: "https://dmv.ny.gov/new-york-state-drivers-manual-practice-tests",
    },
    authority: "New York DMV",
    facts: [
      { value: "20", label: msg`multiple-choice questions` },
      { value: "14", label: msg`correct answers to pass, with 2 of the 4 on road signs` },
    ],
    note: msg`The DMV doesn’t publish its questions. These are practice questions written from the official manual.`,
    sample: {
      language: "en",
      question: "How far must other drivers be able to see you for a legal U-turn?",
      answer: "500 feet in either direction",
      translation: {
        question: msg`How far must other drivers be able to see you for a legal U-turn?`,
        answer: msg`500 feet in either direction`,
      },
    },
  },
];

/** Every deck the exam pages show, for the sitemap's dates and the deck pages' links back. */
export const EXAM_DECKS: readonly string[] = EXAMS.flatMap((exam) => exam.decks);

export function examById(id: string): Exam | undefined {
  return EXAMS.find((exam) => exam.id === id);
}

export function examBySlug(slug: string): Exam | undefined {
  return EXAMS.find((exam) => exam.slug === slug);
}

/** The exam hub, in a locale. */
export function examsPath(locale: Locale | string): string {
  return locale === "en" ? "/exams" : `/${locale}/exams`;
}

/** An exam's own page, in a locale. */
export function examPath(exam: Pick<Exam, "slug">, locale: Locale | string): string {
  return `${examsPath(locale)}/${exam.slug}`;
}

/** The exam a deck belongs to, for the deck page's link to the exam's page. */
export function examOfDeck(slug: string): Exam | undefined {
  return EXAMS.find((exam) => exam.decks.includes(slug));
}

/** Explore's shelves whose decks are exam decks, which lead to the exam hub. */
export function isExamShelf(route: ShelfRoute | null | undefined): boolean {
  return route?.kind === "subjects" && (route.name === "citizenship" || route.name === "driving");
}

export interface ListedExam {
  exam: Exam;
  decks: PublicDeckSummary[];
}

/** The exams with the decks this locale's catalogue has for each, in the exam's own order. */
export function listedExams(catalogue: readonly PublicDeckSummary[]): ListedExam[] {
  const bySlug = new Map(catalogue.map((deck) => [deck.slug, deck]));
  return EXAMS.flatMap((exam) => {
    const decks = exam.decks.flatMap((slug) => bySlug.get(slug) ?? []);
    return decks.length > 0 ? [{ exam, decks }] : [];
  });
}
