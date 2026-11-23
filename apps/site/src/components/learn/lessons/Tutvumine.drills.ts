import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  clipId,
  TUTVUMINE_ASKED,
  TUTVUMINE_FIXES,
  TUTVUMINE_TRANSLATED,
} from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, SentenceDrill } from "../../../lib/learn/drill";

const WHY: Record<string, MessageDescriptor> = {
  ei: msg`After <et>ei</et> the verb usually has no ending; <et>olema</et> is <et>ole</et>.`,
  place: msg`In a town or a building, usually <et>-s</et>; at work, <et>-l</et>.`,
  ask: msg`A yes-or-no question usually starts with <et>kas</et>; the verb takes the ending for its person, as without <et>kas</et>.`,
  kas: msg`A yes-or-no question usually starts with <et>kas</et>.`,
  kus: msg`<et>Kus</et> asks where, and the verb takes its person’s ending: <et>Kus sa õpid? Kus ta õpib?</et>`,
  mis: msg`<et>Mis</et> asks what; when the answer says <et>ma</et> or <et>minu</et>, ask with <et>sa</et> or <et>su</et>, or polite <et>te</et>.`,
  olema: msg`<et>Mina</et> takes <et>olen</et>: <et>Mina olen Andres</et>.`,
};

const RULE: Record<string, string> = {
  ei: "ei",
  place: "place",
  ask: "ask",
  kas: "ask",
  kus: "ask",
  mis: "ask",
  olema: "ei",
};

const MEANS = [
  msg`We don’t work, we study.`,
  msg`I’m not at home.`,
  msg`We live in Tallinn.`,
  msg`They’re at work.`,
  msg`Do you live in Tallinn?`,
  msg`Where does he work?`,
] as const;

const asked = ({ kind, reply, answers }: (typeof TUTVUMINE_ASKED)[number]): SentenceDrill => ({
  kind: "ask",
  id: `ask-${clipId(reply)}`,
  rule: "ask",
  reply,
  say: answers[0],
  answers,
  explain: WHY[kind] as MessageDescriptor,
});

const translated = (each: (typeof TUTVUMINE_TRANSLATED)[number], i: number): SentenceDrill => ({
  kind: "translate",
  id: `translate-${clipId(each.answers[0])}`,
  rule: RULE[each.kind] as string,
  prompt: MEANS[i] as MessageDescriptor,
  say: each.answers[0],
  answers: each.answers,
  ...("confusable" in each ? { confusable: each.confusable } : {}),
  explain: WHY[each.kind] as MessageDescriptor,
});

const FIX_MEANS: Record<string, MessageDescriptor> = {
  "Kas ta räägid eesti keelt?": msg`Does he or she speak Estonian?`,
  "Kus Mari elad?": msg`Where does Mari live?`,
  "Mina on Andres.": msg`I’m Andres.`,
  "Ma ei töötan kontoris.": msg`I don’t work at the office.`,
  "Nad on töös.": msg`They’re at work.`,
  "Ta elab Tartul.": msg`She lives in Tartu.`,
};

const fixed = (each: (typeof TUTVUMINE_FIXES)[number]): FixDrill => {
  const { wrong, said, kind } = each;
  return {
    kind: "fix",
    id: `fix-${clipId(wrong)}`,
    rule: RULE[kind] as string,
    ...(FIX_MEANS[wrong] ? { prompt: FIX_MEANS[wrong] } : {}),
    wrong,
    say: said,
    answers: [said],
    ...("confusable" in each ? { confusable: each.confusable } : {}),
    explain: WHY[kind] as MessageDescriptor,
  };
};

const written = (said: string, kind: string, confusable?: readonly string[]): SentenceDrill => ({
  kind: "dictation",
  id: `write-${clipId(said)}`,
  rule: RULE[kind] as string,
  say: said,
  answers: [said],
  ...(confusable ? { confusable } : {}),
  explain: WHY[kind] as MessageDescriptor,
});

export const DRILLS: DrillBank = {
  rules: {
    ei: { label: msg`Verb forms: after <et>ei</et>, and <et>olema</et>`, section: "answering" },
    place: { label: msg`Places with <et>-s</et> and <et>-l</et>`, section: "translate" },
    ask: { label: msg`Asking questions`, section: "ask" },
  },
  items: [
    ...TUTVUMINE_ASKED.map(asked),
    ...TUTVUMINE_TRANSLATED.map(translated),
    ...TUTVUMINE_FIXES.map(fixed),
    written("Ma ei ela Tallinnas.", "ei"),
    written("Kati õpib Tallinnas.", "place"),
    written("Me töötame kohvikus.", "place"),
    written("Sa oled kodus.", "olema"),
    written("Kus te õpite?", "kus"),
    written("Kas te olete kodus?", "ask"),
  ],
};
