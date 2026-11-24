import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { CONJ_ANSWERS, CONJ_DRILL, CONJ_FIX_ANSWERS, CONJ_FIXES } from "../../../lib/learn/clips";
import type {
  ChoiceDrill,
  DrillBank,
  FixDrill,
  FormDrill,
  SentenceDrill,
} from "../../../lib/learn/drill";

const MEANS = {
  say: msg`what someone said or thought`,
  reason: msg`why something happened`,
  result: msg`what happened because of it`,
  when: msg`when, or on what condition`,
} as const;
type Means = keyof typeof MEANS;

const WHY: Record<Means, FormDrill["explain"]> = {
  say: msg`<et>Et</et> says what someone knows, thinks or says.`,
  reason: msg`<et>Sest</et> and <et>kuna</et> give the reason.`,
  result: msg`<et>Nii et</et> gives the result of what came before.`,
  when: msg`<et>Kui</et> gives a time or a condition.`,
};

const hear = (id: string, say: string, answer: Means): ChoiceDrill => ({
  kind: "choice",
  id: `hear-${id}`,
  rule: answer === "reason" || answer === "result" ? "cause" : "link",
  say,
  answer: { id: answer, label: MEANS[answer] },
  wrong: (Object.keys(MEANS) as Means[])
    .filter((each) => each !== answer)
    .map((each) => ({ id: each, label: MEANS[each] })),
  explain: WHY[answer],
});

const GAP_MEANS = {
  back: msg`He says he’ll be right back.`,
  gift: msg`I’m buying a present because it’s her birthday tomorrow.`,
  stay: msg`It’s raining today, so we’re staying home.`,
  call: msg`I’ll call you when I get home.`,
} as const;

const GAP_WHY = {
  back: msg`<et>Et</et> says what he says.`,
  gift: msg`<et>Sest</et> gives the reason. <et>Kuna</et> fits here too.`,
  stay: msg`<et>Nii et</et> gives the result.`,
  call: msg`<et>Kui</et> gives the time: when I get home.`,
} as const;

const pick = (gap: (typeof CONJ_DRILL.gaps)[number]): FormDrill => ({
  kind: "form",
  id: `pick-${gap.id}`,
  rule: "link",
  base: "…",
  gloss: GAP_MEANS[gap.id],
  cue: { et: `${gap.before} … ${gap.after}` },
  answers: gap.id === "gift" ? [gap.answer, "kuna"] : [gap.answer],
  wrong: gap.wrong,
  say: `${gap.before} ${gap.answer} ${gap.after}`,
  explain: GAP_WHY[gap.id],
});

const REWRITE_CUES = {
  "nii et": msg`with nii et`,
  reason: msg`give the reason`,
  kui: msg`start with kui`,
  tule: msg`start with tule`,
} as const;

const REWRITE_WHY = [
  msg`<et>Nii et</et> gives the result, so the cause comes first.`,
  msg`The reason clause with <et>sest</et> usually comes second. <et>Kuna</et> can also come first.`,
  msg`After a first <et>kui</et> clause, the main clause usually starts with its verb.`,
  msg`With the <et>kui</et> clause second, the main clause keeps its usual order.`,
] as const;

const translate = (
  id: string,
  prompt: MessageDescriptor,
  said: string,
  explain: MessageDescriptor,
): SentenceDrill => ({
  kind: "translate",
  id,
  rule: "link",
  prompt,
  answers: CONJ_ANSWERS[said] as readonly [string, ...string[]],
  say: said,
  explain,
});

const FIX_PROMPTS = {
  stay: msg`I stayed home because I was ill.`,
  call: msg`Call me when you get home.`,
  said: msg`She said she is coming tomorrow.`,
  time: msg`I didn’t come because I had no time.`,
} as const;

const FIX_WHY = {
  stay: msg`A reason needs <et>sest</et> or <et>kuna</et>, not <et>et</et>.`,
  call: msg`A time needs <et>kui</et>: when you get home.`,
  said: msg`What someone said follows <et>et</et>, not <et>kui</et>.`,
  time: msg`A reason needs <et>sest</et> or <et>kuna</et>, not <et>kui</et>.`,
} as const;

const fix = (id: keyof typeof FIX_PROMPTS): FixDrill => {
  const item = CONJ_FIXES.find((each) => each.id === id) as (typeof CONJ_FIXES)[number];
  return {
    kind: "fix",
    id: `fix-${id}`,
    rule: "link",
    wrong: item.wrong,
    prompt: FIX_PROMPTS[id],
    answers: CONJ_FIX_ANSWERS[item.right] as readonly [string, ...string[]],
    say: item.right,
    explain: FIX_WHY[id],
  };
};

const ORDER = msg`After a linking word, the subject usually comes next, then the verb. Other orders are possible.`;

export const DRILLS: DrillBank = {
  rules: {
    link: { label: msg`Which linking word`, section: "pick" },
    cause: { label: msg`Reason or result`, section: "cause" },
    order: { label: msg`Where the verb goes`, section: "order" },
  },
  items: [
    ...CONJ_DRILL.heard.map(({ id, said, means }) => hear(id, said, means as Means)),
    ...CONJ_DRILL.gaps.map(pick),
    translate(
      "write-think",
      msg`I think it’s a good idea.`,
      "Ma arvan, et see on hea mõte.",
      msg`<et>Et</et> says what someone thinks.`,
    ),
    translate(
      "write-ill",
      msg`I stayed home because I was ill.`,
      "Ma jäin koju, sest ma olin haige.",
      msg`<et>Sest</et> and <et>kuna</et> both give the reason.`,
    ),
    translate(
      "write-cold",
      msg`It was cold, so we went home.`,
      "Oli külm, nii et läksime koju.",
      msg`<et>Nii et</et> gives the result, after the cause.`,
    ),
    translate(
      "write-home",
      msg`When I get home, I’ll call you.`,
      "Kui ma koju jõuan, helistan sulle.",
      msg`After a first <et>kui</et> clause, the main clause usually starts with its verb.`,
    ),
    translate(
      "write-work",
      msg`I’m learning Estonian so that I can find work here.`,
      "Ma õpin eesti keelt, et siin tööd leida.",
      msg`<et>Et</et> gives a purpose, with the <et>-da</et> infinitive or with <et>saaksin</et>.`,
    ),
    ...CONJ_DRILL.rewrites.map(({ from, cue, answers }, i): DrillBank["items"][number] => ({
      kind: "rewrite",
      id: `rewrite-${i + 1}`,
      rule: i < 2 ? "cause" : "order",
      from,
      cue: REWRITE_CUES[cue],
      answers: answers as readonly [string, ...string[]],
      say: answers[0] as string,
      explain: REWRITE_WHY[i] as FormDrill["explain"],
    })),
    fix("stay"),
    fix("call"),
    fix("said"),
    fix("time"),
    ...CONJ_DRILL.dictation.map((said, i): DrillBank["items"][number] => ({
      kind: "dictation",
      id: `dictate-${i + 1}`,
      rule: i === 2 ? "cause" : "order",
      answers: [said],
      say: said,
      explain: ORDER,
    })),
  ],
};
