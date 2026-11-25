import { msg } from "@lingui/core/macro";
import { PHONE_ANSWERS } from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const WITH = msg`<et>Rääkima</et> asks <et>kellega?</et>, so the name takes <et>-ga</et>.`;
const TO = msg`<et>Helistama</et> asks <et>kellele?</et>: <et>mulle</et>, <et>sulle</et>, <et>teile</et>.`;
const POLITE = msg`With <et>te</et>, the conditional ends in <et>-ksite</et> and the command usually ends in <et>-ge</et>.`;
const PAST = msg`The past says what already happened: <et>helistasin</et>, <et>helistas</et>.`;
const FUTURE = msg`The present with a time word such as <et>homme</et> usually says what will happen.`;

const form = (
  id: string,
  rule: string,
  base: string,
  gloss: FormDrill["gloss"],
  cue: string,
  answer: string,
  say: string,
  explain: FormDrill["explain"],
): FormDrill => ({
  kind: "form",
  id,
  rule,
  base,
  gloss,
  cue: { et: cue },
  answers: [answer],
  say,
  explain,
});

const fix = (
  id: string,
  rule: string,
  wrong: string,
  right: string,
  explain: FixDrill["explain"],
): FixDrill => ({
  kind: "fix",
  id,
  rule,
  wrong,
  answers: [right],
  say: right,
  explain,
});

const translate = (
  id: string,
  rule: string,
  prompt: Extract<SentenceDrill, { kind: "translate" }>["prompt"],
  said: string,
  explain: SentenceDrill["explain"],
): SentenceDrill => ({
  kind: "translate",
  id,
  rule,
  prompt,
  answers: PHONE_ANSWERS[said] ?? [said],
  say: said,
  explain,
});

const dictation = (
  id: string,
  rule: string,
  said: string,
  explain: SentenceDrill["explain"],
): SentenceDrill => ({
  kind: "dictation",
  id,
  rule,
  answers: [said],
  say: said,
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    with: { label: msg`Asking for someone with <et>-ga</et>`, section: "ask" },
    to: { label: msg`Phoning to someone with <et>-le</et>`, section: "message" },
    when: { label: msg`The past and the future of a call`, section: "message" },
    polite: { label: msg`Asking politely with <et>te</et>`, section: "again" },
  },
  items: [
    form(
      "form-mardiga",
      "with",
      "Mart",
      msg`a name`,
      "Kas ma saaksin rääkida …?",
      "Mardiga",
      "Kas ma saaksin rääkida Mardiga?",
      WITH,
    ),
    form(
      "form-arstiga",
      "with",
      "arst",
      msg`doctor`,
      "Kas ma saaksin rääkida …?",
      "arstiga",
      "Kas ma saaksin rääkida arstiga?",
      WITH,
    ),
    fix(
      "fix-mart",
      "with",
      "Kas ma saaksin rääkida Mart?",
      "Kas ma saaksin rääkida Mardiga?",
      WITH,
    ),
    translate(
      "say-doctor",
      "with",
      msg`Could I speak with the doctor?`,
      "Kas ma saaksin rääkida arstiga?",
      WITH,
    ),
    translate("say-mart-there", "with", msg`Is Mart there?`, "Kas Mart on seal?", WITH),
    dictation("dictate-mardiga", "with", "Kas ma saaksin rääkida Mardiga?", WITH),
    {
      kind: "rewrite",
      id: "rewrite-doctor",
      rule: "with",
      from: "Kas ma saaksin rääkida Mardiga?",
      cue: msg`with the doctor`,
      answers: PHONE_ANSWERS["Kas ma saaksin rääkida arstiga?"] ?? [
        "Kas ma saaksin rääkida arstiga?",
      ],
      say: "Kas ma saaksin rääkida arstiga?",
      explain: WITH,
    },

    form(
      "form-sulle",
      "to",
      "sina",
      msg`you`,
      "Ma helistan … homme.",
      "sulle",
      "Ma helistan sulle homme.",
      TO,
    ),
    form(
      "form-mulle",
      "to",
      "mina",
      msg`I, me`,
      "Palun helistage … tagasi.",
      "mulle",
      "Palun helistage mulle tagasi.",
      TO,
    ),
    form(
      "form-teile",
      "to",
      "teie",
      msg`you, polite`,
      "Ma helistan … kell kolm tagasi.",
      "teile",
      "Ma helistan teile kell kolm tagasi.",
      TO,
    ),
    fix("fix-mind", "to", "Palun helistage mind tagasi.", "Palun helistage mulle tagasi.", TO),
    translate(
      "say-call-back",
      "to",
      msg`Please call me back. (To a stranger.)`,
      "Palun helistage mulle tagasi.",
      TO,
    ),
    translate(
      "say-at-three",
      "to",
      msg`I’ll call you back at three. (To a stranger.)`,
      "Ma helistan teile kell kolm tagasi.",
      TO,
    ),
    dictation("dictate-soon", "to", "Ma helistan sulle varsti tagasi.", TO),

    form(
      "form-helistasin",
      "when",
      "helistama",
      msg`to phone`,
      "Ma … sulle eile.",
      "helistasin",
      "Ma helistasin sulle eile.",
      PAST,
    ),
    form(
      "form-helistas",
      "when",
      "helistama",
      msg`to phone`,
      "Mart … õhtul.",
      "helistas",
      "Mart helistas õhtul.",
      PAST,
    ),
    fix("fix-yesterday", "when", "Ma helistan sulle eile.", "Ma helistasin sulle eile.", PAST),
    fix("fix-tomorrow", "when", "Ma helistasin sulle homme.", "Ma helistan sulle homme.", FUTURE),
    translate("say-left", "when", msg`I left a message.`, "Ma jätsin sõnumi.", PAST),
    dictation("dictate-morning", "when", "Ta helistas mulle hommikul.", PAST),
    {
      kind: "rewrite",
      id: "rewrite-yesterday",
      rule: "when",
      from: "Ma helistan sulle homme.",
      cue: msg`yesterday`,
      answers: PHONE_ANSWERS["Ma helistasin sulle eile."] ?? ["Ma helistasin sulle eile."],
      say: "Ma helistasin sulle eile.",
      explain: PAST,
    },

    translate(
      "say-cant-hear",
      "polite",
      msg`I can’t hear you well. (To a stranger.)`,
      "Ma ei kuule teid hästi.",
      POLITE,
    ),
    fix("fix-saaksin", "polite", "Kas te saaksin korrata?", "Kas te saaksite korrata?", POLITE),
    fix(
      "fix-slower",
      "polite",
      "Palun rääkige aeglasem.",
      "Palun rääkige aeglasemalt.",
      msg`A command says how to speak with an adverb: <et>aeglasemalt</et>.`,
    ),
    fix(
      "fix-kuulen",
      "polite",
      "Ma ei kuulen teid hästi.",
      "Ma ei kuule teid hästi.",
      msg`After <et>ei</et> the verb loses its ending: <et>kuule</et>.`,
    ),
    dictation("dictate-repeat", "polite", "Kas te saaksite korrata?", POLITE),
    dictation("dictate-slower", "polite", "Palun rääkige aeglasemalt.", POLITE),
    dictation("dictate-bad-line", "polite", "Ühendus on halb.", POLITE),
  ],
};
