import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { LESSONS, lessonBySlug, type PlacedLesson } from "./catalogue";
import { CLIP_ROOT, clipId, clipUrl } from "./clips";

export type MapKind = "verb" | "noun";

export interface MapForm {
  id: FormId;
  kind: MapKind;
  name: MessageDescriptor;
  et: string;
  asks: string;
}

export interface MapExample {
  et: string;
  meaning: MessageDescriptor;
}

type Taught = { slug: string; et?: undefined } | { et: string; slug?: undefined };

interface UseShape {
  id: string;
  form: FormId;
  label: MessageDescriptor;
  tip?: MessageDescriptor;
  taught: Taught;
  examples: readonly MapExample[];
}

type VerbFormId = "ma" | "da" | "present";
type NounFormId = "nominative" | "genitive" | "partitive";
export type FormId = VerbFormId | NounFormId;

export const FORMS: readonly MapForm[] = [
  {
    id: "ma",
    kind: "verb",
    name: msg({ message: "-ma infinitive", context: "a verb's form on the form map" }),
    et: "ma-tegevusnimi",
    asks: "mida tegema?",
  },
  {
    id: "da",
    kind: "verb",
    name: msg({ message: "-da infinitive", context: "a verb's form on the form map" }),
    et: "da-tegevusnimi",
    asks: "mida teha?",
  },
  {
    id: "present",
    kind: "verb",
    name: msg({ message: "Present", context: "a verb's form on the form map" }),
    et: "olevik",
    asks: "mida teen?",
  },
  {
    id: "nominative",
    kind: "noun",
    name: msg({ message: "Nominative", context: "a noun's form on the form map" }),
    et: "nimetav",
    asks: "kes? mis?",
  },
  {
    id: "genitive",
    kind: "noun",
    name: msg({ message: "Genitive", context: "a noun's form on the form map" }),
    et: "omastav",
    asks: "kelle? mille?",
  },
  {
    id: "partitive",
    kind: "noun",
    name: msg({ message: "Partitive", context: "a noun's form on the form map" }),
    et: "osastav",
    asks: "keda? mida?",
  },
];

const VERB_USES = [
  {
    id: "must",
    form: "ma",
    label: msg`After words like “must”`,
    tip: msg`Also after starting, going, staying and learning.`,
    taught: { slug: "tegevusnimed" },
    examples: [
      { et: "Ma pean homme tööle *minema*.", meaning: msg`I have to go to work tomorrow.` },
      { et: "Ma hakkan eesti keelt *õppima*.", meaning: msg`I’m starting to learn Estonian.` },
      { et: "Ma jään koju *lugema*.", meaning: msg`I’m staying at home to read.` },
      { et: "Tule *sööma*!", meaning: msg`Come and eat!` },
    ],
  },
  {
    id: "away",
    form: "ma",
    label: msg`Out doing it`,
    tip: msg`*-mas* is being there, *-mast* is coming back.`,
    taught: { slug: "ujuma-ujumas-ujumast" },
    examples: [
      { et: "Mari on *jooksmas*.", meaning: msg`Mari is out running.` },
      { et: "Ma käin iga päev *ujumas*.", meaning: msg`I go swimming every day.` },
      { et: "Kass tuleb *söömast*.", meaning: msg`The cat is coming back from eating.` },
    ],
  },
  {
    id: "without",
    form: "ma",
    label: msg`Without doing it`,
    tip: msg`Also what isn’t done yet.`,
    taught: { et: "Lugedes, lugemata" },
    examples: [
      { et: "Ta läks *söömata* tööle.", meaning: msg`He or she went to work without eating.` },
      { et: "Raamat on *lugemata*.", meaning: msg`The book is unread.` },
      { et: "Töö on veel *tegemata*.", meaning: msg`The work still isn’t done.` },
    ],
  },
  {
    id: "past",
    form: "ma",
    label: msg`In the past`,
    tip: msg`Usually *-sin* for I, *-sid* for you, *-s* for he or she.`,
    taught: { slug: "lihtminevik" },
    examples: [
      { et: "Eile *õppisin* eesti keelt.", meaning: msg`Yesterday I studied Estonian.` },
      {
        et: "Ma olin kodus ja *lugesin* raamatut.",
        meaning: msg`I was at home, reading a book.`,
      },
      { et: "Ta *läks* tööle.", meaning: msg`He or she went to work.` },
      { et: "Eile *sõin* ma kodus.", meaning: msg`Yesterday I ate at home.` },
    ],
  },
  {
    id: "want",
    form: "da",
    label: msg`After words like “want”`,
    tip: msg`Also after knowing how, being allowed and liking.`,
    taught: { slug: "tegevusnimed" },
    examples: [
      { et: "Ma tahan homme linna *minna*.", meaning: msg`I want to go to town tomorrow.` },
      {
        et: "Ma oskan natuke eesti keelt *rääkida*.",
        meaning: msg`I can speak a little Estonian.`,
      },
      { et: "Siin ei tohi *ujuda*.", meaning: msg`Swimming isn’t allowed here.` },
      { et: "Mulle meeldib kohvi *juua*.", meaning: msg`I like drinking coffee.` },
    ],
  },
  {
    id: "need",
    form: "da",
    label: msg`After phrases like “I need”`,
    tip: msg`Also after “it’s good”, “there’s time” and a question word.`,
    taught: { slug: "modaalverbid" },
    examples: [
      { et: "Mul on vaja *oodata*.", meaning: msg`I need to wait.` },
      { et: "Tore on sind *näha*!", meaning: msg`It’s good to see you!` },
      { et: "Mul ei ole aega *lugeda*.", meaning: msg`I have no time to read.` },
      { et: "Mida *teha*?", meaning: msg`What is there to do?` },
    ],
  },
  {
    id: "didnt",
    form: "da",
    label: msg`“Didn’t”`,
    tip: msg`The same for every person.`,
    taught: { slug: "mineviku-eitus" },
    examples: [
      { et: "Ma ei *teadnud*.", meaning: msg`I didn’t know.` },
      { et: "Ta ei *tulnud* koju.", meaning: msg`He or she didn’t come home.` },
      { et: "Me ei *söönud* kodus.", meaning: msg`We didn’t eat at home.` },
    ],
  },
  {
    id: "have-done",
    form: "da",
    label: msg`“Have done”`,
    tip: msg`With *olen* for have, *olin* for had.`,
    taught: { et: "Olen lugenud, olin lugenud" },
    examples: [
      { et: "Ma olen juba *söönud*.", meaning: msg`I’ve already eaten.` },
      { et: "Kas sa oled Tartus *käinud*?", meaning: msg`Have you been to Tartu?` },
      { et: "Buss oli juba *läinud*.", meaning: msg`The bus had already left.` },
    ],
  },
  {
    id: "tell-many",
    form: "da",
    label: msg`Telling several people`,
    tip: msg`Also one person, politely. Don’t is *ärge*.`,
    taught: { slug: "kaskiv" },
    examples: [
      {
        et: "*Tulge* siia!",
        meaning: msg({ message: "Come here!", context: "said to several people" }),
      },
      {
        et: "*Rääkige* aeglasemalt, palun.",
        meaning: msg({ message: "Speak more slowly, please.", context: "said to several people" }),
      },
      {
        et: "Ärge *oodake*!",
        meaning: msg({ message: "Don’t wait!", context: "said to several people" }),
      },
    ],
  },
  {
    id: "while",
    form: "da",
    label: msg`While doing it`,
    tip: msg`Also says how something is done.`,
    taught: { et: "Lugedes, lugemata" },
    examples: [
      { et: "Koju *jõudes* helistan sulle.", meaning: msg`I’ll call you when I get home.` },
      {
        et: "Muusikat *kuulates* on hea töötada.",
        meaning: msg`It’s good to work while listening to music.`,
      },
      { et: "Ma õpin raamatuid *lugedes*.", meaning: msg`I learn by reading books.` },
    ],
  },
  {
    id: "now",
    form: "present",
    label: msg`Now and in the future`,
    tip: msg`The ending says who: *loen* is I, *loeb* is he or she.`,
    taught: { slug: "olevik" },
    examples: [
      { et: "Ma *loen* raamatut.", meaning: msg`I’m reading a book.` },
      { et: "Nad *elavad* Saksamaal.", meaning: msg`They live in Germany.` },
      { et: "Homme *söön* ma kodus.", meaning: msg`Tomorrow I’ll eat at home.` },
    ],
  },
  {
    id: "dont",
    form: "present",
    label: msg`“Don’t” and “won’t”`,
    tip: msg`The same for every person.`,
    taught: { slug: "eitus" },
    examples: [
      { et: "Ma ei *räägi* eesti keelt.", meaning: msg`I don’t speak Estonian.` },
      { et: "Ta ei *tööta*.", meaning: msg`He or she doesn’t work.` },
      { et: "Nad ei *tule* homme.", meaning: msg`They won’t come tomorrow.` },
    ],
  },
  {
    id: "tell-one",
    form: "present",
    label: msg`Telling one person`,
    tip: msg`Don’t is *ära*.`,
    taught: { slug: "kaskiv" },
    examples: [
      { et: "*Tule* siia!", meaning: msg`Come here!` },
      { et: "*Räägi* aeglasemalt, palun.", meaning: msg`Speak more slowly, please.` },
      { et: "Ära *oota*!", meaning: msg`Don’t wait!` },
    ],
  },
  {
    id: "would",
    form: "present",
    label: msg`“Would”`,
    tip: msg`Also asking politely.`,
    taught: { et: "Läheksin" },
    examples: [
      { et: "Ma *tahaksin* kohvi.", meaning: msg`I’d like some coffee.` },
      { et: "Kas sa *saaksid* mind aidata?", meaning: msg`Could you help me?` },
      {
        et: "Ma *loeksin* rohkem, kui mul oleks aega.",
        meaning: msg`I’d read more if I had time.`,
      },
    ],
  },
] as const satisfies readonly UseShape[];

const NOUN_USES = [
  {
    id: "subject",
    form: "nominative",
    label: msg`Who or what it’s about`,
    tip: msg`Also what someone or something is.`,
    taught: { slug: "mina-sina-tema" },
    examples: [
      { et: "*Raamat* on laual.", meaning: msg`The book is on the table.` },
      { et: "*Sõber* ootab.", meaning: msg`A friend is waiting.` },
      { et: "Mari on *õpetaja*.", meaning: msg`Mari is a teacher.` },
    ],
  },
  {
    id: "have",
    form: "nominative",
    label: msg`What you have`,
    taught: { slug: "mul-on" },
    examples: [
      { et: "Jaanil on *auto*.", meaning: msg`Jaan has a car.` },
      { et: "Meil on *maja*.", meaning: msg`We have a house.` },
      { et: "Kas sul on *raamat*?", meaning: msg`Do you have a book?` },
    ],
  },
  {
    id: "one",
    form: "nominative",
    label: msg`After “one”`,
    tip: msg`From two up, the partitive.`,
    taught: { slug: "osastav" },
    examples: [
      { et: "Üks *kohv*, palun.", meaning: msg`One coffee, please.` },
      { et: "Meil on üks *kass*.", meaning: msg`We have one cat.` },
    ],
  },
  {
    id: "take",
    form: "nominative",
    label: msg`In a command`,
    tip: msg`All of it. Some of it is the partitive: *osta leiba!*`,
    taught: { slug: "raamatut-voi-raamatu" },
    examples: [
      { et: "Too *raamat* siia!", meaning: msg`Bring the book here!` },
      { et: "Pane *uks* kinni!", meaning: msg`Shut the door!` },
      { et: "Võta *vihmavari* kaasa!", meaning: msg`Take an umbrella!` },
    ],
  },
  {
    id: "whose",
    form: "genitive",
    label: msg`Whose it is`,
    tip: msg`The owner comes first.`,
    taught: { slug: "omastav" },
    examples: [
      { et: "See on *Martini* kohv.", meaning: msg`This is Martin’s coffee.` },
      { et: "*Kassi* nimi on Liisu.", meaning: msg`The cat’s name is Liisu.` },
      { et: "*toa* aken", meaning: msg`the window of the room` },
    ],
  },
  {
    id: "endings",
    form: "genitive",
    label: msg`With endings like -s`,
    tip: msg`Usually the ending goes on the genitive.`,
    taught: { slug: "omastav" },
    examples: [
      { et: "Ta on *toas*.", meaning: msg`He or she is in the room.` },
      { et: "Mari tuleb *sõbraga*.", meaning: msg`Mari is coming with a friend.` },
      { et: "Ma lähen *turule*.", meaning: msg`I’m going to the market.` },
      { et: "Kohv *piimata*, palun.", meaning: msg`Coffee without milk, please.` },
    ],
  },
  {
    id: "plural",
    form: "genitive",
    label: msg({ message: "More than one", context: "a use on the form map" }),
    tip: msg`The genitive with *-d*.`,
    taught: { slug: "mitmus" },
    examples: [
      { et: "*Sõbrad* ootavad.", meaning: msg`Friends are waiting.` },
      { et: "*Lapsed* loevad.", meaning: msg`The children are reading.` },
      { et: "Meile meeldivad *raamatud*.", meaning: msg`We like books.` },
    ],
  },
  {
    id: "under",
    form: "genitive",
    label: msg`Before words like “under”`,
    tip: msg`Usually, when such a word stands after the noun.`,
    taught: { et: "Kass ja kast" },
    examples: [
      { et: "Kass on *kasti* all.", meaning: msg`The cat is under the box.` },
      { et: "Auto on *maja* ees.", meaning: msg`The car is in front of the house.` },
      { et: "Ma olen *sõbra* juures.", meaning: msg`I’m at a friend’s.` },
    ],
  },
  {
    id: "whole",
    form: "genitive",
    label: msg`All of it, finished`,
    taught: { slug: "raamatut-voi-raamatu" },
    examples: [
      { et: "Ma ostsin *raamatu*.", meaning: msg`I bought the book.` },
      { et: "Ta sõi *leiva* ära.", meaning: msg`He or she ate all the bread.` },
      { et: "Ma tegin *töö* ära.", meaning: msg`I finished the work.` },
    ],
  },
  {
    id: "count",
    form: "partitive",
    label: msg`After “two” and “how many”`,
    tip: msg`Usually after any number but *üks*.`,
    taught: { slug: "osastav" },
    examples: [
      { et: "Mul on kaks *last*.", meaning: msg`I have two children.` },
      { et: "Piim maksab kaks *eurot*.", meaning: msg`The milk costs two euros.` },
      { et: "Mitu *kassi* teil on?", meaning: msg`How many cats do you have?` },
    ],
  },
  {
    id: "some",
    form: "partitive",
    label: msg`Some of it`,
    tip: msg`Food, drink and amounts.`,
    taught: { slug: "osastav" },
    examples: [
      { et: "Me sööme *leiba*.", meaning: msg`We’re eating bread.` },
      { et: "klaas *vett*", meaning: msg`a glass of water` },
      { et: "kilo *juustu*", meaning: msg`a kilo of cheese` },
    ],
  },
  {
    id: "have-not",
    form: "partitive",
    label: msg`What you don’t have`,
    tip: msg`Also what you don’t eat, see or know.`,
    taught: { slug: "osastav" },
    examples: [
      { et: "Sul pole *autot*.", meaning: msg`You don’t have a car.` },
      { et: "Toas pole *lauda*.", meaning: msg`There’s no table in the room.` },
      { et: "Ma ei söö *liha*.", meaning: msg`I don’t eat meat.` },
    ],
  },
  {
    id: "ongoing",
    form: "partitive",
    label: msg`Still going on`,
    tip: msg`Not finished yet.`,
    taught: { slug: "raamatut-voi-raamatu" },
    examples: [
      { et: "Ta loeb *raamatut*.", meaning: msg`He or she is reading a book.` },
      { et: "Ema teeb *suppi*.", meaning: msg`Mum is making soup.` },
      { et: "Ma teen *tööd*.", meaning: msg`I’m working.` },
    ],
  },
  {
    id: "love",
    form: "partitive",
    label: msg`With words like “love”`,
    tip: msg`Also waiting for, learning and wishing.`,
    taught: { et: "Ootan sind, räägin sinust" },
    examples: [
      { et: "Ma armastan *sind*.", meaning: msg`I love you.` },
      { et: "Me ootame *bussi*.", meaning: msg`We’re waiting for the bus.` },
      { et: "Ma õpin eesti *keelt*.", meaning: msg`I’m learning Estonian.` },
      { et: "Soovin sulle head *päeva*!", meaning: msg`Have a good day!` },
    ],
  },
  {
    id: "before",
    form: "partitive",
    label: msg`After words like “before”`,
    tip: msg`Often, when such a word stands before the noun.`,
    taught: { et: "Esmaspäeval, aasta pärast" },
    examples: [
      { et: "Pese enne *sööki* käed!", meaning: msg`Wash your hands before eating!` },
      { et: "Pärast *tööd* lähen ma koju.", meaning: msg`After work I go home.` },
      { et: "Laud on keset *tuba*.", meaning: msg`The table is in the middle of the room.` },
    ],
  },
] as const satisfies readonly UseShape[];

type VerbUseId = (typeof VERB_USES)[number]["id"];
type NounUseId = (typeof NOUN_USES)[number]["id"];
export type UseId = VerbUseId | NounUseId;

export interface MapUse extends UseShape {
  id: UseId;
}

export const USES: readonly MapUse[] = [...VERB_USES, ...NOUN_USES];

export interface OddForm {
  form: string;
  odd: MessageDescriptor;
}

type Cell = string | OddForm | null;

interface WordEntry<F extends string, U extends string> {
  meaning: MessageDescriptor;
  forms: Record<F, string | OddForm>;
  uses: Record<U, Cell>;
}

const VERBS = {
  lugema: {
    meaning: msg`to read`,
    forms: { ma: "lugema", da: "lugeda", present: "loen" },
    uses: {
      must: "lugema",
      away: "lugema|s",
      without: "lugema|ta",
      past: "luge|sin",
      want: "lugeda",
      need: "lugeda",
      didnt: "ei luge|nud",
      "have-done": "luge|nud",
      "tell-many": "luge|ge!",
      while: "luge|des",
      now: "loe|n",
      dont: "ei loe",
      "tell-one": "loe!",
      would: "loe|ksin",
    },
  },
  ootama: {
    meaning: msg`to wait`,
    forms: { ma: "ootama", da: "oodata", present: "ootan" },
    uses: {
      must: "ootama",
      away: "ootama|s",
      without: "ootama|ta",
      past: "oota|sin",
      want: "oodata",
      need: "oodata",
      didnt: "ei ooda|nud",
      "have-done": "ooda|nud",
      "tell-many": "ooda|ke!",
      while: "ooda|tes",
      now: "oota|n",
      dont: "ei oota",
      "tell-one": "oota!",
      would: "oota|ksin",
    },
  },
  sööma: {
    meaning: msg`to eat`,
    forms: { ma: "sööma", da: "süüa", present: "söön" },
    uses: {
      must: "sööma",
      away: "sööma|s",
      without: "sööma|ta",
      past: { form: "sõi|n", odd: msg`*söö-* becomes *sõi-*` },
      want: "süüa",
      need: "süüa",
      didnt: { form: "ei söö|nud", odd: msg`*söö-*, not *süü-*` },
      "have-done": { form: "söö|nud", odd: msg`*söö-*, not *süü-*` },
      "tell-many": { form: "söö|ge!", odd: msg`*söö-*, not *süü-*` },
      while: "süü|es",
      now: "söö|n",
      dont: "ei söö",
      "tell-one": "söö!",
      would: "söö|ksin",
    },
  },
  tegema: {
    meaning: msg`to do, to make`,
    forms: { ma: "tegema", da: "teha", present: "teen" },
    uses: {
      must: "tegema",
      away: "tegema|s",
      without: "tegema|ta",
      past: { form: "teg|in", odd: msg`*-in*, not *-sin*` },
      want: "teha",
      need: "teha",
      didnt: { form: "ei tei|nud", odd: msg`*tei-*, not *teh-*` },
      "have-done": { form: "tei|nud", odd: msg`*tei-*, not *teh-*` },
      "tell-many": "teh|ke!",
      while: "teh|es",
      now: "tee|n",
      dont: "ei tee",
      "tell-one": "tee!",
      would: "tee|ksin",
    },
  },
  minema: {
    meaning: msg`to go`,
    forms: { ma: "minema", da: "minna", present: "lähen" },
    uses: {
      must: "minema",
      away: "minema|s",
      without: "minema|ta",
      past: { form: "läk|sin", odd: msg`its own stem, *läk-*` },
      want: "minna",
      need: "minna",
      didnt: { form: "ei läi|nud", odd: msg`its own stem, *läi-*` },
      "have-done": { form: "läi|nud", odd: msg`its own stem, *läi-*` },
      "tell-many": "min|ge!",
      while: "minn|es",
      now: "lähe|n",
      dont: "ei lähe",
      "tell-one": { form: "mine!", odd: msg`*mine-*, not *lähe-*` },
      would: "lähe|ksin",
    },
  },
  olema: {
    meaning: msg`to be`,
    forms: { ma: "olema", da: "olla", present: "olen" },
    uses: {
      must: "olema",
      away: { form: "olema|s", odd: msg`*on olemas* means it exists` },
      without: "olema|ta",
      past: { form: "ol|in", odd: msg`*-in*, not *-sin*` },
      want: "olla",
      need: "olla",
      didnt: "ei ol|nud",
      "have-done": "ol|nud",
      "tell-many": "ol|ge!",
      while: "oll|es",
      now: { form: "ole|n", odd: msg`he, she and they: *on*` },
      dont: { form: "ei ole", odd: msg`or *pole*` },
      "tell-one": "ole!",
      would: "ole|ksin",
    },
  },
} satisfies Record<string, WordEntry<VerbFormId, VerbUseId>>;

const PARTITIVE_USES = ["count", "some", "have-not", "ongoing", "love", "before"] as const;
const NOMINATIVE_USES = ["subject", "have", "one", "take"] as const;

const each = <K extends string>(uses: readonly K[], form: string) =>
  Object.fromEntries(uses.map((use) => [use, form])) as Record<K, string>;

const NOUNS = {
  raamat: {
    meaning: msg`a book`,
    forms: { nominative: "raamat", genitive: "raamatu", partitive: "raamatut" },
    uses: {
      ...each(NOMINATIVE_USES, "raamat"),
      whose: "raamatu",
      endings: "raamatu|s",
      plural: "raamatu|d",
      under: "raamatu all",
      whole: "raamatu",
      ...each(PARTITIVE_USES, "raamatu|t"),
    },
  },
  kohvik: {
    meaning: msg`a café`,
    forms: { nominative: "kohvik", genitive: "kohviku", partitive: "kohvikut" },
    uses: {
      ...each(NOMINATIVE_USES, "kohvik"),
      whose: "kohviku",
      endings: "kohviku|s",
      plural: "kohviku|d",
      under: "kohviku ees",
      whole: "kohviku",
      ...each(PARTITIVE_USES, "kohviku|t"),
    },
  },
  tuba: {
    meaning: msg`a room`,
    forms: {
      nominative: "tuba",
      genitive: "toa",
      partitive: { form: "tuba", odd: msg`looks like the nominative` },
    },
    uses: {
      ...each(NOMINATIVE_USES, "tuba"),
      whose: "toa",
      endings: { form: "toa|s", odd: msg`into the room: *tuppa*` },
      plural: "toa|d",
      under: "toa ees",
      whole: "toa",
      ...each(PARTITIVE_USES, "tuba"),
    },
  },
  sõber: {
    meaning: msg`a friend`,
    forms: { nominative: "sõber", genitive: "sõbra", partitive: "sõpra" },
    uses: {
      ...each(NOMINATIVE_USES, "sõber"),
      whose: "sõbra",
      endings: "sõbra|ga",
      plural: "sõbra|d",
      under: "sõbra juures",
      whole: "sõbra",
      ...each(PARTITIVE_USES, "sõpra"),
      some: null,
    },
  },
  maja: {
    meaning: msg`a house`,
    forms: {
      nominative: "maja",
      genitive: { form: "maja", odd: msg`looks like the nominative` },
      partitive: { form: "maja", odd: msg`looks like the nominative` },
    },
    uses: {
      ...each(NOMINATIVE_USES, "maja"),
      whose: "maja",
      endings: { form: "maja|s", odd: msg`into the house: *majja*` },
      plural: "maja|d",
      under: "maja ees",
      whole: "maja",
      ...each(PARTITIVE_USES, "maja"),
    },
  },
  töö: {
    meaning: msg`work`,
    forms: {
      nominative: "töö",
      genitive: { form: "töö", odd: msg`looks like the nominative` },
      partitive: "tööd",
    },
    uses: {
      ...each(NOMINATIVE_USES, "töö"),
      whose: "töö",
      endings: "töö|l",
      plural: { form: "töö|d", odd: msg`looks like the partitive` },
      under: "töö juures",
      whole: "töö",
      ...each(PARTITIVE_USES, "töö|d"),
    },
  },
} satisfies Record<string, WordEntry<NounFormId, NounUseId>>;

export type WordId = keyof typeof VERBS | keyof typeof NOUNS;

export const WORDS: Record<MapKind, readonly WordId[]> = {
  verb: Object.keys(VERBS) as WordId[],
  noun: Object.keys(NOUNS) as WordId[],
};

const ENTRIES = { ...VERBS, ...NOUNS } as unknown as Record<
  WordId,
  WordEntry<string, string> & {
    forms: Partial<Record<string, string | OddForm>>;
    uses: Partial<Record<string, Cell>>;
  }
>;

export const kindOf = (word: WordId): MapKind => (word in VERBS ? "verb" : "noun");
export const meaningOf = (word: WordId): MessageDescriptor => ENTRIES[word].meaning;
export const formsOf = (kind: MapKind): readonly MapForm[] =>
  FORMS.filter((form) => form.kind === kind);
export const usesOf = (form: FormId): readonly MapUse[] => USES.filter((use) => use.form === form);

export function useById(id: UseId): MapUse {
  const use = USES.find((each) => each.id === id);
  if (!use) throw new Error(`No use ${id} on the form map`);
  return use;
}

export function formById(id: FormId): MapForm {
  const form = FORMS.find((each) => each.id === id);
  if (!form) throw new Error(`No form ${id} on the form map`);
  return form;
}

export interface WordForm {
  form: string;
  odd: MessageDescriptor | undefined;
}

const read = (cell: string | OddForm): WordForm =>
  typeof cell === "string" ? { form: cell, odd: undefined } : cell;

export function baseForm(word: WordId, form: FormId): WordForm {
  const cell = ENTRIES[word].forms[form];
  if (!cell) throw new Error(`${word} has no ${form} form on the form map`);
  return read(cell);
}

export function formFor(word: WordId, use: UseId): WordForm | null {
  const cell = ENTRIES[word].uses[use];
  if (cell === undefined) throw new Error(`${word} says nothing about ${use} on the form map`);
  return cell === null ? null : read(cell);
}

export function lessonFor(use: UseId): PlacedLesson {
  const { taught } = useById(use);
  const lesson =
    taught.slug === undefined
      ? LESSONS.find((each) => each.et === taught.et)
      : lessonBySlug(taught.slug);
  if (!lesson) throw new Error(`No lesson teaches ${use}`);
  return lesson;
}

export function usesTaughtBy(slug: string): readonly UseId[] {
  const upTo = lessonBySlug(slug)?.n ?? 0;
  return USES.filter((use) => lessonFor(use.id).n <= upTo).map((use) => use.id);
}

export interface LitPart {
  text: string;
  lit: boolean;
}

export function litParts(text: string): LitPart[] {
  return text
    .split("*")
    .map((part, i) => ({ text: part, lit: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}

export const plainText = (text: string): string => text.replaceAll("*", "");

const HEARD: Readonly<Record<string, string>> = {
  "Eile sõin ma kodus.": "kit/eile-so3in-ma-kodus",
  "Eile õppisin eesti keelt.": "lihtminevik/eile-o3ppisin-eesti-keelt",
  "Homme söön ma kodus.": "kit/homme-so2o2n-ma-kodus",
  "Jaanil on auto.": "mul-on/jaanil-on-auto",
  "Kas sul on raamat?": "mul-on/kas-sul-on-raamat",
  "Kass on kasti all.": "kit/kass-on-kasti-all",
  "Kass tuleb söömast.": "ujuma-ujumas-ujumast/kass-tuleb-so2o2mast",
  "Kassi nimi on Liisu.": "omastav/d-sina-4",
  "kilo juustu": "osastav/kilo-juustu",
  "klaas vett": "osastav/klaas-vett",
  "Kohv piimata, palun.": "sobraga-rahata/kohv-piimata-palun",
  kohvik: "kohad/kohvik",
  kohviku: "omastav/kohviku",
  "Lapsed loevad.": "mitmus/lapsed-loevad",
  loen: "kit/loen",
  lugeda: "kit/lugeda",
  lugema: "kit/lugema",
  lähen: "tegevusnimed/la2hen",
  "Ma armastan sind.": "olevik/s-armastan-sind",
  "Ma ei räägi eesti keelt.": "eitus/ma-ei-ra2a2gi-eesti-keelt",
  "Ma hakkan eesti keelt õppima.": "tegevusnimed/ma-hakkan-eesti-keelt-o3ppima",
  "Ma jään koju lugema.": "tegevusnimed/ma-ja2a2n-koju-lugema",
  "Ma käin iga päev ujumas.": "ujuma-ujumas-ujumast/ma-ka2in-iga-pa2ev-ujumas",
  "Ma loen raamatut.": "olevik/s-loen-raamatut",
  "Ma lähen turule.": "laual-lauale-laualt/a-lahen-turule",
  "Ma olen juba söönud.": "kit/ma-olen-juba-so2o2nud",
  "Ma olin kodus ja lugesin raamatut.": "lihtminevik/d-sina-1",
  "Ma oskan natuke eesti keelt rääkida.": "tegevusnimed/ma-oskan-natuke-eesti-keelt-ra2a2kida",
  "Ma pean homme tööle minema.": "tegevusnimed/ma-pean-homme-to2o2le-minema",
  "Ma tahan homme linna minna.": "tegevusnimed/ma-tahan-homme-linna-minna",
  "Ma tegin töö ära.": "raamatut-voi-raamatu/ma-tegin-to2o2-a2ra",
  "Ma teen tööd.": "raamatut-voi-raamatu/ma-teen-to2o2d",
  "Ma õpin eesti keelt.": "olevik/s-opin-eesti",
  maja: "kit/maja",
  "Mari on jooksmas.": "ujuma-ujumas-ujumast/mari-on-jooksmas",
  "Mari on õpetaja.": "sobraga-rahata/mari-on-o3petaja",
  "Mari tuleb sõbraga.": "sobraga-rahata/mari-tuleb-so3braga",
  "Me ootame bussi.": "olevik/s-ootame-bussi",
  "Me sööme leiba.": "osastav/me-so2o2me-leiba",
  "Meil on maja.": "mul-on/meil-on-maja",
  "Meil on üks kass.": "osastav/meil-on-u2ks-kass",
  "Meile meeldivad raamatud.": "meeldima/meile-meeldivad-raamatud",
  minema: "lihtminevik/minema",
  minna: "verbi-pohivormid/minna",
  "Mitu kassi teil on?": "osastav/mitu-kassi-teil-on",
  "Mul on kaks last.": "osastav/mul-on-kaks-last",
  "Mul on vaja oodata.": "modaalverbid/mul-on-vaja-oodata",
  "Mulle meeldib kohvi juua.": "tegevusnimed/mulle-meeldib-kohvi-juua",
  "Nad elavad Saksamaal.": "kohad/l-saksamaal",
  olema: "lihtminevik/olema",
  olen: "mina-sina-tema/olen",
  olla: "verbi-pohivormid/olla",
  oodata: "verbi-pohivormid/oodata",
  ootama: "lihtminevik/ootama",
  ootan: "paev-tallinnas/ootan",
  "Piim maksab kaks eurot.": "osastav/piim-maksab-kaks-eurot",
  raamat: "mitmus/raamat",
  "Raamat on laual.": "kohad/l-laual",
  raamatu: "mitmus/raamatu",
  raamatut: "osastav/raamatut",
  "Räägi aeglasemalt, palun.": "kaskiv/ra2a2gi-aeglasemalt-palun",
  "Rääkige aeglasemalt, palun.": "kaskiv/ra2a2kige-aeglasemalt-palun",
  "See on Martini kohv.": "omastav/d-sina-2",
  "Siin ei tohi ujuda.": "modaalverbid/siin-ei-tohi-ujuda",
  "Sul pole autot.": "osastav/sul-pole-autot",
  sõber: "mitmus/so3ber",
  "Sõber ootab.": "mitmus/so3ber-ootab",
  sõbra: "mitmus/so3bra",
  "Sõbrad ootavad.": "mitmus/so3brad-ootavad",
  sööma: "lihtminevik/so2o2ma",
  söön: "verbi-pohivormid/so2o2n",
  süüa: "verbi-pohivormid/su2u2a",
  "Ta ei tööta.": "eitus/ta-ei-to2o2ta",
  "Ta loeb raamatut.": "lihtminevik/ta-loeb-raamatut",
  "Ta läks tööle.": "lihtminevik/ta-la2ks-to2o2le",
  "Ta on toas.": "pood-poe/ta-on-toas",
  teen: "verbi-pohivormid/teen",
  tegema: "lihtminevik/tegema",
  teha: "tegevusnimed/teha",
  toa: "kit/toa",
  "toa aken": "omastav/toa-aken",
  "Toas pole lauda.": "osastav/toas-pole-lauda",
  tuba: "kit/tuba",
  "Tule siia!": "kaskiv/tule-siia",
  "Tule sööma!": "tegevusnimed/tule-so2o2ma",
  "Tulge siia!": "kaskiv/tulge-siia",
  töö: "kohad/to2o2",
  tööd: "pohivormid/to2o2d",
  "Ära oota!": "kaskiv/a2ra-oota",
  "Ärge oodake!": "kaskiv/a2rge-oodake",
  "Üks kohv, palun.": "osastav/u2ks-kohv-palun",
};

const SAID: readonly string[] = [
  ...new Set([
    ...USES.flatMap((use) => use.examples.map((example) => plainText(example.et))),
    ...[...WORDS.verb, ...WORDS.noun].flatMap((word) =>
      formsOf(kindOf(word)).map((form) => baseForm(word, form.id).form),
    ),
  ]),
];

export const FORM_MAP_CLIPS: readonly string[] = SAID.filter((text) => !(text in HEARD));
export const FORM_MAP_RECORDED: boolean = false;

export function formMapClip(text: string): string | null {
  const name = HEARD[text];
  if (name) return `${CLIP_ROOT}/${name}.mp3`;
  return FORM_MAP_RECORDED && FORM_MAP_CLIPS.includes(text)
    ? clipUrl("form-map", clipId(text))
    : null;
}
