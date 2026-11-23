import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { LETTER_ANSWERS, LETTER_FIX_ANSWERS, LETTER_POLITE_SEND } from "../../../lib/learn/clips";
import type { DrillBank, WrittenDrill } from "../../../lib/learn/drill";

const ASK = msg`A polite request: <et>te</et> and the would form, <et>kas te saaksite …?</et>`;
const POSSIBLE = msg`<et>Kas oleks võimalik …?</et> asks politely without naming anyone.`;
const OPEN = msg`Open with the reason, close with thanks: <et>Kirjutan teile, sest …</et>, <et>Aitäh ette!</et>`;

const translate = (
  id: string,
  rule: string,
  prompt: MessageDescriptor,
  answer: string,
  explain: WrittenDrill["explain"],
): WrittenDrill => ({
  kind: "translate",
  id,
  rule,
  prompt,
  answers: LETTER_ANSWERS[answer] ?? [answer],
  say: answer,
  explain,
});

const fix = (
  id: string,
  wrong: string,
  right: string,
  explain: WrittenDrill["explain"],
  prompt?: MessageDescriptor,
): WrittenDrill => ({
  kind: "fix",
  id,
  rule: "form",
  wrong,
  ...(prompt ? { prompt } : {}),
  answers: LETTER_FIX_ANSWERS[right] ?? [right],
  say: right,
  explain,
});

const dictation = (
  id: string,
  rule: string,
  said: string,
  explain: WrittenDrill["explain"],
): WrittenDrill => ({
  kind: "dictation",
  id,
  rule,
  answers: [said],
  say: said,
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    ask: { label: msg`Asking politely`, section: "phrases" },
    form: { label: msg`The right form in a message`, section: "fix" },
    open: { label: msg`Opening and closing`, section: "phrases" },
  },
  items: [
    translate(
      "ask-send",
      "ask",
      msg`Could you send a repair person?`,
      "Kas te saaksite meistri saata?",
      ASK,
    ),
    translate(
      "ask-phone",
      "ask",
      msg`Please phone me in the evening.`,
      "Palun helistage mulle õhtul.",
      msg`A polite request can also be <et>palun</et> with the <et>te</et> command: <et>helistage</et>.`,
    ),
    translate(
      "ask-possible",
      "ask",
      msg`Would it be possible to come tomorrow?`,
      "Kas oleks võimalik homme tulla?",
      POSSIBLE,
    ),
    dictation("dictate-send", "ask", "Kas te saaksite meistri saata?", ASK),
    dictation("dictate-possible", "ask", "Kas oleks võimalik homme tulla?", POSSIBLE),
    {
      kind: "rewrite",
      id: "politely-send",
      rule: "ask",
      from: "Saatke meister!",
      cue: msg`politely`,
      answers: LETTER_POLITE_SEND,
      say: "Kas te saaksite meistri saata?",
      explain: ASK,
    },
    fix(
      "fix-saaksite",
      "Kas te saaksid meistri saata?",
      "Kas te saaksite meistri saata?",
      msg`For <et>te</et>, the would form ends in <et>-te</et>: <et>saaksite</et>.`,
      msg`Could you send a repair person? (to Mrs Tamm)`,
    ),

    translate(
      "form-broken",
      "form",
      msg`Our kitchen tap is broken.`,
      "Meie köögis on kraan katki.",
      msg`Where it is broken: <et>meie köögis</et>.`,
    ),
    translate(
      "form-home",
      "form",
      msg`I’m at home on Monday after five.`,
      "Ma olen esmaspäeval pärast kella viit kodus.",
      msg`On a day is usually <et>-l</et>: <et>esmaspäeval</et>.`,
    ),
    translate(
      "form-after-five",
      "form",
      msg`I’m at home after five.`,
      "Ma olen kodus pärast kella viit.",
      msg`<et>Pärast</et> before a word takes the partitive: <et>pärast kella viit</et>.`,
    ),
    translate(
      "form-dripping",
      "form",
      msg`The water has been dripping for three days.`,
      "Vesi tilgub juba kolm päeva.",
      msg`Estonian can say it in the present, with <et>juba</et>.`,
    ),
    fix(
      "fix-teile",
      "Ma helistan teid homme.",
      "Ma helistan teile homme.",
      msg`<et>Helistama</et> asks <et>kellele?</et>, to whom: <et>teile</et>.`,
    ),
    fix(
      "fix-lainud",
      "Kraan on katki minnud.",
      "Kraan on katki läinud.",
      msg`The <et>-nud</et> form of <et>minema</et> is <et>läinud</et>.`,
    ),
    fix(
      "fix-paeva",
      "Vesi tilgub juba kolm päevad.",
      "Vesi tilgub juba kolm päeva.",
      msg`After <et>kolm</et>, the partitive singular: <et>kolm päeva</et>.`,
    ),
    fix(
      "fix-esmaspaeval",
      "Ma olen kodus esmaspäevas.",
      "Ma olen kodus esmaspäeval.",
      msg`On a day is usually <et>-l</et>: <et>esmaspäeval</et>.`,
      msg`I’m at home on Monday.`,
    ),
    fix(
      "fix-vastust",
      "Ma ootan teie vastus.",
      "Ma ootan teie vastust.",
      msg`<et>Ootama</et> usually takes the partitive: <et>vastust</et>.`,
    ),
    fix(
      "fix-tanulik",
      "Ma olen teile väga tänulikud.",
      "Ma olen teile väga tänulik.",
      msg`One person, so the singular: <et>tänulik</et>.`,
    ),
    dictation(
      "dictate-home",
      "form",
      "Ma olen kodus pärast kella viit.",
      msg`<et>Pärast</et> before a word takes the partitive: <et>pärast kella viit</et>.`,
    ),

    translate(
      "open-reason",
      "open",
      msg`I’m writing to you because the kitchen tap is broken.`,
      "Kirjutan teile, sest köögis on kraan katki.",
      OPEN,
    ),
    translate("open-thanks", "open", msg`Thank you in advance!`, "Aitäh ette!", OPEN),
    translate("open-regards", "open", msg`Yours sincerely`, "Lugupidamisega", OPEN),
    dictation("dictate-reason", "open", "Kirjutan teile, sest köögis on kraan katki.", OPEN),
    dictation("dictate-thanks", "open", "Aitäh ette!", OPEN),
    dictation("dictate-regards", "open", "Lugupidamisega", OPEN),
  ],
};
