import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { NEWS_TRANSLATE } from "../../../lib/learn/clips";
import { NEWS_ANSWERS, NEWS_FIX_ANSWERS, NEWS_FIXES, NEWS_FORMS } from "../../../lib/learn/clips";
import type { DrillBank, FixDrill, FormDrill, SentenceDrill } from "../../../lib/learn/drill";

const FORM_GLOSS: Record<(typeof NEWS_FORMS)[number]["id"], MessageDescriptor> = {
  closed: msg`closed`,
  fallen: msg`fallen`,
  coming: msg`coming`,
  walking: msg`while walking`,
  paying: msg`without paying`,
  reading: msg`reading (noun)`,
  rider: msg`passenger, rider`,
  friendly: msg`friendly`,
  opened: msg`open, opened`,
  waiting: msg`while waiting`,
};

const FORM_WHY: Record<(typeof NEWS_FORMS)[number]["id"], FormDrill["explain"]> = {
  closed: msg`Someone closed the street, so the <et>-tud</et> form usually fits: <et>suletud</et>.`,
  fallen: msg`The tree fell itself, so the <et>-nud</et> form usually fits: <et>kukkunud</et>.`,
  coming: msg`The <et>-v</et> form changes with its noun: <et>tulevat nädalat</et>.`,
  walking: msg`Doing something at the same time usually takes <et>-des</et>: <et>jalutades</et>.`,
  paying: msg`Without doing something usually takes <et>-mata</et>: <et>maksmata</et>.`,
  reading: msg`The <et>-mine</et> ending turns a verb into the doing: <et>lugemine</et>.`,
  rider: msg`The <et>-ja</et> ending names the person who does it: <et>sõitja</et>.`,
  friendly: msg`The <et>-lik</et> ending makes an adjective from a noun: <et>sõbralik</et>.`,
  opened: msg`Someone opened the exhibition, so the <et>-tud</et> form usually fits: <et>avatud</et>.`,
  waiting: msg`Doing something at the same time usually takes <et>-des</et>: <et>oodates</et>.`,
};

const form = (item: (typeof NEWS_FORMS)[number]): FormDrill => {
  const said = `${item.before} ${item.answers[0]} ${item.after}`;
  return {
    kind: "form",
    id: `form-${item.id}`,
    rule: "forms",
    base: item.base,
    gloss: FORM_GLOSS[item.id],
    cue: { et: `${item.before} … ${item.after}` },
    answers: item.answers,
    say: said,
    explain: FORM_WHY[item.id],
  };
};

const TRANSLATE_PROMPTS: Record<(typeof NEWS_TRANSLATE)[number], MessageDescriptor> = {
  "Uus raamatukogu avatakse reedel.": msg`The new library opens on Friday.`,
  "Tee on remondi tõttu suletud.": msg`The road is closed for repairs.`,
  "Ma kuulsin, et üritus jääb ära.": msg`I heard that the event is cancelled.`,
  "Me jäime koju, sest sadas.": msg`We stayed home because it was raining.`,
  "Ma loen uudiseid kohvi juues.": msg`I read the news while drinking coffee.`,
  "Kohalikud elanikud ootavad uut bussi.": msg`Local residents are waiting for a new bus.`,
  "Tee läheb läbi pargi.": msg`The path goes through the park.`,
  "Sadas, nii et üritus jäi ära.": msg`It rained, so the event was cancelled.`,
};

const TRANSLATE_WHY: Record<(typeof NEWS_TRANSLATE)[number], MessageDescriptor> = {
  "Uus raamatukogu avatakse reedel.": msg`News often uses the impersonal when no person is named: <et>avatakse</et>.`,
  "Tee on remondi tõttu suletud.": msg`Someone closed the road: <et>suletud</et>.`,
  "Ma kuulsin, et üritus jääb ära.": msg`<et>Et</et> introduces what you heard, and <et>ära jääma</et> means to be cancelled.`,
  "Me jäime koju, sest sadas.": msg`<et>Sest</et> and <et>kuna</et> give the reason.`,
  "Ma loen uudiseid kohvi juues.": msg`Doing two things at once usually uses <et>-des</et>: <et>kohvi juues</et>.`,
  "Kohalikud elanikud ootavad uut bussi.": msg`<et>Ootama</et> usually takes the partitive: <et>uut bussi</et>.`,
  "Tee läheb läbi pargi.": msg`<et>Läbi</et> takes the genitive: <et>läbi pargi</et>.`,
  "Sadas, nii et üritus jäi ära.": msg`<et>Nii et</et> introduces the result.`,
};

const translate = (id: string, said: (typeof NEWS_TRANSLATE)[number]): SentenceDrill => ({
  kind: "translate",
  id,
  rule: "write",
  prompt: TRANSLATE_PROMPTS[said],
  answers: NEWS_ANSWERS[said],
  say: said,
  explain: TRANSLATE_WHY[said],
});

const FIX_PROMPTS: Partial<Record<(typeof NEWS_FIXES)[number]["id"], MessageDescriptor>> = {
  coffee: msg`I read the news while drinking coffee.`,
  library: msg`The new library is opened on Friday.`,
  party: msg`We didn’t go to the party because it rained.`,
};

const FIX_WHY: Record<(typeof NEWS_FIXES)[number]["id"], FixDrill["explain"]> = {
  closed: msg`Someone closed the road, so the <et>-tud</et> form usually fits: <et>suletud</et>.`,
  forest: msg`<et>Läbi</et> takes the genitive: <et>läbi metsa</et>.`,
  coffee: msg`While drinking takes <et>-des</et> (<et>juues</et>), not <et>-mata</et>.`,
  library: msg`With no person named, Estonian uses the impersonal: <et>avatakse</et>.`,
  party: msg`A reason needs <et>sest</et> or <et>kuna</et>, not <et>et</et>.`,
  water: msg`The <et>-v</et> form changes with its noun: <et>jooksvat vett</et>.`,
};

const fix = (item: (typeof NEWS_FIXES)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${item.id}`,
  rule: "fix",
  wrong: item.wrong,
  ...(FIX_PROMPTS[item.id] ? { prompt: FIX_PROMPTS[item.id] } : {}),
  answers: NEWS_FIX_ANSWERS[item.right] as readonly [string, ...string[]],
  say: item.right,
  explain: FIX_WHY[item.id],
});

const dictate = (id: string, said: string, explain: MessageDescriptor): SentenceDrill => ({
  kind: "dictation",
  id,
  rule: "fix",
  answers: [said],
  say: said,
  explain,
});

export const DRILLS: DrillBank = {
  rules: {
    forms: { label: msg`Stage 6 forms in the news`, section: "forms" },
    write: { label: msg`Writing news sentences`, section: "write" },
    fix: { label: msg`Fixing common mistakes`, section: "fix" },
  },
  items: [
    ...NEWS_FORMS.map(form),
    translate("write-library", "Uus raamatukogu avatakse reedel."),
    translate("write-road", "Tee on remondi tõttu suletud."),
    translate("write-cancelled", "Ma kuulsin, et üritus jääb ära."),
    translate("write-rain", "Me jäime koju, sest sadas."),
    translate("write-coffee", "Ma loen uudiseid kohvi juues."),
    translate("write-bus", "Kohalikud elanikud ootavad uut bussi."),
    translate("write-park", "Tee läheb läbi pargi."),
    translate("write-result", "Sadas, nii et üritus jäi ära."),
    ...NEWS_FIXES.map(fix),
    dictate(
      "dictate-weather",
      "Ilmateade lubab nädalavahetusel vihma.",
      msg`Listen for <et>ilmateade</et> (weather forecast) and <et>nädalavahetusel</et>.`,
    ),
    dictate(
      "dictate-wind",
      "Üritus jääb tugeva tuule tõttu ära.",
      msg`<et>Ära jääma</et> means to be cancelled, with <et>ära</et> at the end.`,
    ),
    dictate(
      "dictate-prices",
      "Hinnad on sel aastal tõusnud.",
      msg`The perfect uses <et>on</et> and the <et>-nud</et> form: <et>on tõusnud</et>.`,
    ),
    dictate(
      "dictate-bus",
      "Kohalikud elanikud ootavad uut bussi.",
      msg`<et>Ootama</et> usually takes the partitive: <et>uut bussi</et>.`,
    ),
  ],
};
