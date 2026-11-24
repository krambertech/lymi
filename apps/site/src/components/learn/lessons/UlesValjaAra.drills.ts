import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { PV_TRANSLATE } from "../../../lib/learn/clips";
import {
  PV_ANSWERS,
  PV_FIX_ANSWERS,
  PV_FIXES,
  PV_GAPS,
  PV_PARTICLES,
  PV_TELL,
} from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const GAP_MEANS: Record<(typeof PV_GAPS)[number]["id"], MessageDescriptor> = {
  rise: msg`I get up at seven.`,
  in: msg`Please come in, it’s warm here.`,
  out: msg`We’re going out in the evening.`,
  close: msg`Please close the door.`,
  open: msg`Open the window, it’s hot here.`,
  back: msg`I’m coming back tomorrow.`,
  eat: msg`He ate up the whole cake.`,
  down: msg`We’re taking the boxes down.`,
};

const GAP_WHY: Record<(typeof PV_GAPS)[number]["id"], FormDrill["explain"]> = {
  rise: msg`<et>Üles tõusma</et> is to get up.`,
  in: msg`<et>Sisse tulema</et> is to come in.`,
  out: msg`<et>Välja minema</et> is to go out.`,
  close: msg`<et>Kinni panema</et> is to close.`,
  open: msg`<et>Lahti tegema</et> is to open.`,
  back: msg`<et>Tagasi tulema</et> is to come back.`,
  eat: msg`<et>Ära sööma</et> is to eat something all up.`,
  down: msg`<et>Alla viima</et> is to take down.`,
};

const gapSaid = (gap: { before: string; answer: string; after: string }) =>
  `${gap.before} ${gap.answer}${/^[.,!?]/.test(gap.after) ? "" : " "}${gap.after}`;

const pick = (gap: (typeof PV_GAPS)[number]): FormDrill => ({
  kind: "form",
  id: `pick-${gap.id}`,
  rule: "meaning",
  base: "…",
  gloss: GAP_MEANS[gap.id],
  cue: { et: `${gap.before} …${/^[.,!?]/.test(gap.after) ? "" : " "}${gap.after}` },
  answers: [gap.answer],
  wrong: PV_PARTICLES.filter((p) => p !== gap.answer),
  say: gapSaid(gap),
  explain: GAP_WHY[gap.id],
});

const TELL_LABELS = {
  particle: msg`Away or finished`,
  dont: msg`Don’t do it`,
} as const;

const TELL_WHY = {
  particle: msg`After the verb, <et>ära</et> usually means away or finished.`,
  dont: msg`Before a command, <et>ära</et> says don’t.`,
} as const;

const tell = (item: (typeof PV_TELL)[number]): ChoiceDrill => {
  const other = item.kind === "particle" ? "dont" : "particle";
  return {
    kind: "choice",
    id: `ara-${item.id}`,
    rule: "ara",
    say: item.said,
    answer: { id: item.kind, label: TELL_LABELS[item.kind] },
    wrong: [{ id: other, label: TELL_LABELS[other] }],
    explain: TELL_WHY[item.kind],
  };
};

const TRANSLATE_PROMPTS: Record<(typeof PV_TRANSLATE)[number], MessageDescriptor> = {
  "Ma tõusen kell seitse üles.": msg`I get up at seven.`,
  "Pane palun uks kinni.": msg`Please close the door.`,
  "Ma tegin akna lahti.": msg`I opened the window.`,
  "Ta läks juba ära.": msg`He or she already left.`,
  "Ma tulen kell kuus tagasi.": msg`I’ll come back at six.`,
  "Ma kirjutan numbri üles.": msg`I’ll write the number down.`,
  "Ma pean vara üles tõusma.": msg`I have to get up early.`,
  "Me läheme õhtul välja.": msg`We’re going out in the evening.`,
};

const TRANSLATE_WHY: Record<(typeof PV_TRANSLATE)[number], MessageDescriptor> = {
  "Ma tõusen kell seitse üles.": msg`With one verb, <et>üles</et> usually goes to the end.`,
  "Pane palun uks kinni.": msg`<et>Kinni panema</et> is to close, with <et>kinni</et> at the end.`,
  "Ma tegin akna lahti.": msg`<et>Lahti tegema</et> is to open.`,
  "Ta läks juba ära.": msg`<et>Ära minema</et> is to leave.`,
  "Ma tulen kell kuus tagasi.": msg`<et>Tagasi tulema</et> is to come back.`,
  "Ma kirjutan numbri üles.": msg`<et>Üles kirjutama</et> is to write down.`,
  "Ma pean vara üles tõusma.": msg`With <et>pean</et>, <et>üles</et> usually stays before <et>tõusma</et>.`,
  "Me läheme õhtul välja.": msg`<et>Välja minema</et> is to go out.`,
};

const translate = (id: string, said: (typeof PV_TRANSLATE)[number]): SentenceDrill => ({
  kind: "translate",
  id,
  rule: "order",
  prompt: TRANSLATE_PROMPTS[said],
  answers: PV_ANSWERS[said],
  say: said,
  explain: TRANSLATE_WHY[said],
});

const FIX_PROMPTS: Record<(typeof PV_FIXES)[number]["id"], MessageDescriptor> = {
  open: msg`I opened the window.`,
  close: msg`Please close the door.`,
  "come-in": msg`Come in, it’s warm here!`,
  rise: msg`I get up at seven.`,
  back: msg`I’m coming back tomorrow.`,
  write: msg`I’ll write the number down.`,
};

const FIX_WHY: Record<(typeof PV_FIXES)[number]["id"], FixDrill["explain"]> = {
  open: msg`To open is <et>lahti tegema</et>, not <et>kinni</et>.`,
  close: msg`To close is <et>kinni panema</et>, not <et>lahti</et>.`,
  "come-in": msg`To come in is <et>sisse tulema</et>, not <et>välja</et>.`,
  rise: msg`To get up is <et>üles tõusma</et>, not <et>alla</et>.`,
  back: msg`To come back is <et>tagasi tulema</et>, not <et>ära</et>.`,
  write: msg`To write down is <et>üles kirjutama</et>.`,
};

const fix = (item: (typeof PV_FIXES)[number]): FixDrill => ({
  kind: "fix",
  id: `fix-${item.id}`,
  rule: "meaning",
  wrong: item.wrong,
  prompt: FIX_PROMPTS[item.id],
  answers: PV_FIX_ANSWERS[item.right] as readonly [string, ...string[]],
  say: item.right,
  explain: FIX_WHY[item.id],
});

export const DRILLS: DrillBank = {
  rules: {
    meaning: { label: msg`Which particle`, section: "pick" },
    ara: { label: msg`Two jobs of ära`, section: "ara" },
    order: { label: msg`Where the particle usually goes`, section: "order" },
  },
  items: [
    ...PV_GAPS.map(pick),
    ...PV_TELL.map(tell),
    translate("write-rise", "Ma tõusen kell seitse üles."),
    translate("write-close", "Pane palun uks kinni."),
    translate("write-open", "Ma tegin akna lahti."),
    translate("write-left", "Ta läks juba ära."),
    translate("write-back", "Ma tulen kell kuus tagasi."),
    translate("write-num", "Ma kirjutan numbri üles."),
    translate("write-must", "Ma pean vara üles tõusma."),
    translate("write-out", "Me läheme õhtul välja."),
    ...PV_FIXES.map(fix),
  ],
};
