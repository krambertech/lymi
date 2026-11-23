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
  ei: msg`After <et>ei</et> the verb has no ending; <et>olema</et> is <et>ole</et>.`,
  place: msg`In a town or a building, <et>-s</et>; at work, <et>-l</et>.`,
  ask: msg`A yes-or-no question starts with <et>kas</et>; the verb takes the ending for its person, as without <et>kas</et>.`,
  kas: msg`A yes-or-no question starts with <et>kas</et>.`,
  kus: msg`<et>Kus</et> asks where; when the answer says <et>ma</et>, ask with <et>sa</et>.`,
  mis: msg`<et>Mis</et> asks what; when the answer says <et>ma</et> or <et>minu</et>, ask with <et>sa</et> or <et>su</et>.`,
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
  msg`I don’t work, I study.`,
  msg`She isn’t at home.`,
  msg`We live in Tallinn.`,
  msg`They’re at work.`,
  msg`Do you speak Estonian?`,
  msg`Where do you work?`,
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

const translated = (
  { kind, answers }: (typeof TUTVUMINE_TRANSLATED)[number],
  i: number,
): SentenceDrill => ({
  kind: "translate",
  id: `translate-${clipId(answers[0])}`,
  rule: RULE[kind] as string,
  prompt: MEANS[i] as MessageDescriptor,
  say: answers[0],
  answers,
  explain: WHY[kind] as MessageDescriptor,
});

const fixed = ({ wrong, said, kind }: (typeof TUTVUMINE_FIXES)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${clipId(wrong)}`,
  rule: RULE[kind] as string,
  wrong,
  say: said,
  answers: [said],
  explain: WHY[kind] as MessageDescriptor,
});

const written = (said: string, kind: string): SentenceDrill => ({
  kind: "dictation",
  id: `write-${clipId(said)}`,
  rule: RULE[kind] as string,
  say: said,
  answers: [said],
  explain: WHY[kind] as MessageDescriptor,
});

export const DRILLS: DrillBank = {
  rules: {
    ei: { label: msg`Verb forms: after <et>ei</et>, and <et>olema</et>`, section: "translate" },
    place: { label: msg`Places with <et>-s</et> and <et>-l</et>`, section: "translate" },
    ask: { label: msg`Asking questions`, section: "ask" },
  },
  items: [
    ...TUTVUMINE_ASKED.map(asked),
    ...TUTVUMINE_TRANSLATED.map(translated),
    ...TUTVUMINE_FIXES.map(fixed),
    written("Ma ei tööta kontoris.", "ei"),
    written("Ta elab Tartus.", "place"),
    written("Nad on tööl.", "place"),
    written("Mina olen Andres.", "olema"),
    written("Kus sa elad?", "kus"),
    written("Kas sa räägid eesti keelt?", "ask"),
  ],
};
