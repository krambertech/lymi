import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { HandCard } from "./hand-cards";
import { adjective, noun, phrase, verb } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";

/**
 * The Estonian page's words. Terms and their forms are Estonian and never translated; meanings
 * follow the page. The clips in `/audio/estonian/` are the published Estonian decks' own, in the
 * native voice every Estonian card gets.
 */

const card = (
  id: string,
  term: string,
  forms: string | undefined,
  kind: MessageDescriptor,
  meaning: MessageDescriptor,
  note: MessageDescriptor,
  state: HandCard["state"],
  mode?: HandCard["mode"],
): HandCard => ({
  id,
  source: "Eesti",
  kind,
  language: "et",
  term,
  ...(forms ? { forms } : {}),
  meaning,
  note,
  state,
  audio: `/audio/estonian/${id}.mp3`,
  ...(mode ? { mode } : {}),
});

/** Dealt in this order: words still being learned first, then the Known ones. Half ask from the meaning, as review does. */
export const ESTONIAN_PAGE_HAND: HandCard[] = [
  card(
    "kallis",
    "kallis",
    "kallis · kalli · kallist",
    adjective,
    msg`Dear; expensive`,
    msg`The same word for someone you love and a price you’d rather not pay.`,
    "new",
  ),
  card(
    "vesi",
    "vesi",
    "vesi · vee · vett",
    noun,
    msg`Water`,
    msg`Its forms barely look alike, which is why the card keeps all three.`,
    "learning",
    "meaning_to_term",
  ),
  card(
    "tulema",
    "tulema",
    "tulema · tulla · tulen",
    verb,
    msg`To come`,
    msg`Ma tulen kohe! I’m coming right away!`,
    "new",
    "meaning_to_term",
  ),
  card(
    "monus",
    "mõnus",
    "mõnus · mõnusa · mõnusat",
    adjective,
    msg`Pleasant; cosy`,
    msg`English has no õ. Say “o” without rounding your lips.`,
    "learning",
  ),
  card(
    "linn",
    "linn",
    "linn · linna · linna",
    noun,
    msg`Town; city`,
    msg`Linna can mean “of the town” or “into the town”. Only how long you hold the n tells them apart.`,
    "new",
  ),
  card(
    "aitah",
    "Aitäh!",
    undefined,
    phrase,
    msg`Thank you!`,
    msg`The everyday thanks. Suur aitäh is a big one.`,
    "known",
  ),
  card(
    "sober",
    "sõber",
    "sõber · sõbra · sõpra",
    noun,
    msg`Friend`,
    msg`The b becomes a p in sõpra: ma ootan sõpra, I’m waiting for a friend.`,
    "known",
    "meaning_to_term",
  ),
  card(
    "oo",
    "öö",
    "öö · öö · ööd",
    noun,
    msg`Night`,
    msg`Head ööd! Good night.`,
    "known",
    "meaning_to_term",
  ),
];

/**
 * Sentences that use the front card's word, drawn faintly behind the hand. The marked run, between
 * asterisks, is the word in the form the sentence needs: kallist in “Ma ei osta nii kallist telefoni”.
 * A card that asks from the meaning has none, since they would give its answer away.
 */
export const ESTONIAN_EXAMPLES: Record<string, string[]> = {
  kallis: [
    "See kohvik on *kallis*.",
    "*Kallis* sõber!",
    "Ma ei osta nii *kallist* telefoni.",
    "Tallinnas on korterid *kallid*.",
  ],
  monus: [
    "Täna on *mõnus* ilm.",
    "See oli väga *mõnus* õhtu.",
    "Saunas on *mõnus*.",
    "*Mõnusat* nädalavahetust!",
  ],
  linn: [
    "Ma elan *linnas*.",
    "Lähme *linna*!",
    "Tartu on ilus *linn*.",
    "Ta tuli *linnast* tagasi.",
  ],
  aitah: ["*Aitäh*, väga maitsev!", "Suur *aitäh*!", "*Aitäh* abi eest!", "Ei, *aitäh*."],
};

export type FormKind = "noun" | "verb";

/** A word and the three forms a learner keeps with it, as Estonian courses teach them. */
export interface FormWord {
  term: string;
  kind: FormKind;
  meaning: MessageDescriptor;
  forms: [string, string, string];
}

export const FORM_WORDS: FormWord[] = [
  { term: "vesi", kind: "noun", meaning: msg`Water`, forms: ["vesi", "vee", "vett"] },
  { term: "sõber", kind: "noun", meaning: msg`Friend`, forms: ["sõber", "sõbra", "sõpra"] },
  { term: "käsi", kind: "noun", meaning: msg`Hand`, forms: ["käsi", "käe", "kätt"] },
  { term: "tuba", kind: "noun", meaning: msg`Room`, forms: ["tuba", "toa", "tuba"] },
  { term: "süda", kind: "noun", meaning: msg`Heart`, forms: ["süda", "südame", "südant"] },
  { term: "tulema", kind: "verb", meaning: msg`To come`, forms: ["tulema", "tulla", "tulen"] },
  { term: "sööma", kind: "verb", meaning: msg`To eat`, forms: ["sööma", "süüa", "söön"] },
  { term: "minema", kind: "verb", meaning: msg`To go`, forms: ["minema", "minna", "lähen"] },
];

/** The order to take the published decks in: phrases for the first weeks, then the words underneath. */
export const ESTONIAN_PATH: PathStep[] = [
  {
    slug: "everyday-estonian",
    about: msg`Phrases for your first weeks: hello and thanks, the shop, the bus and the doctor.`,
    words: [
      { term: "Tere!", answer: msg`Hello!` },
      { term: "Aitäh!", answer: msg`Thank you!` },
      { term: "Head isu!", answer: msg`Enjoy your meal!` },
      { term: "Selge.", answer: msg`Got it.` },
    ],
  },
  {
    slug: "estonian-top-100-verbs",
    about: msg`The verbs you’ll use most, each with its three forms and an example.`,
    words: [
      { term: "olema", answer: msg`To be` },
      { term: "tulema", answer: msg`To come` },
      { term: "minema", answer: msg`To go` },
      { term: "tegema", answer: msg`To do; to make` },
    ],
  },
  {
    slug: "estonian-top-1000-words",
    about: msg`The thousand most common Estonian words, fifty at a time.`,
    words: [
      { term: "linn", answer: msg`Town; city` },
      { term: "sõber", answer: msg`Friend` },
      { term: "õhtu", answer: msg`Evening` },
      { term: "kallis", answer: msg`Dear; expensive` },
    ],
  },
];

/** Words whose sounds English doesn't have: õ, ä, ö, ü, and the long vowels. */
export const ESTONIAN_VOICE_WORDS: VoiceWord[] = [
  { id: "ohtu", term: "õhtu", meaning: msg`Evening` },
  { id: "oo", term: "öö", meaning: msg`Night` },
  { id: "suda", term: "süda", meaning: msg`Heart` },
  { id: "aitah", term: "Aitäh!", meaning: msg`Thank you!` },
  { id: "kool", term: "kool", meaning: msg`School` },
  { id: "monus", term: "mõnus", meaning: msg`Pleasant; cosy` },
];

/** A course group's newest cards, as the teacher added them after a lesson. */
export const ESTONIAN_CLASS_CARDS = [
  { term: "Ma ei saa aru.", meaning: msg`I don’t understand.` },
  { term: "broneerima", meaning: msg`To book; to reserve` },
  { term: "ühistransport", meaning: msg`Public transport` },
];
