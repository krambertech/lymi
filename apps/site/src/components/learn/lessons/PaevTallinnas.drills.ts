import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  clipId,
  dictated,
  TALLINN_DRILL_HEARD,
  TALLINN_DRILL_TRANSLATED,
  TALLINN_HEARD,
  TALLINN_SORTED,
  TALLINN_TRANSLATED,
} from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, DrillOption, SentenceDrill } from "../../../lib/learn/drill";

type Kind = "kell" | "hind" | "paev" | "ei";

const WHY: Record<Kind, MessageDescriptor> = {
  kell: msg`A time takes <et>kell</et> and the number: <et>kell kümme</et>, at ten.`,
  hind: msg`To say what something costs, use <et>maksab</et>; after a number from two up, <et>euro</et> becomes <et>eurot</et>.`,
  paev: msg`To say the day, use <et>täna on</et>, <et>homme on</et> or <et>ülehomme on</et> and its name, with a small letter.`,
  ei: msg`<et>Ei</et> comes before the verb, and the verb drops its ending: <et>ei tööta</et>.`,
};

const WHICH: Record<Exclude<Kind, "ei">, MessageDescriptor> = {
  kell: msg`<et>Kell on</et> before the number makes it a time.`,
  hind: msg`<et>Eurot</et> or <et>maksab</et> makes the number a price.`,
  paev: msg`A day’s name, or <et>täna on</et> and <et>homme on</et>, says what day it is.`,
};

const ANSWERS: Record<Exclude<Kind, "ei">, DrillOption> = {
  kell: { id: "kell", label: msg`What time it is` },
  hind: { id: "hind", label: msg`How much it costs` },
  paev: { id: "paev", label: msg`What day it is` },
};

const answers = ({ w, bin }: (typeof TALLINN_SORTED)[number]): ChoiceDrill => ({
  kind: "choice",
  id: `which-${clipId(w)}`,
  rule: "which",
  say: w,
  answer: ANSWERS[bin],
  wrong: (Object.keys(ANSWERS) as (keyof typeof ANSWERS)[])
    .filter((each) => each !== bin)
    .map((each) => ANSWERS[each]),
  explain: WHICH[bin],
});

const SIGN = msg`<et>Avatud</et> is open and <et>suletud</et> closed, as on a door.`;

const explained = (kind: Kind, said: string) => (said.startsWith("Kohvik on") ? SIGN : WHY[kind]);

const written = ({ kind, said }: { kind: Kind; said: string }): SentenceDrill => ({
  kind: "dictation",
  id: `write-${clipId(said)}`,
  rule: kind,
  say: said,
  answers: dictated(said),
  explain: explained(kind, said),
});

const TRANSLATED_MEANS: readonly MessageDescriptor[] = [
  msg`It’s ten o’clock.`,
  msg`It costs two euros.`,
  msg`Today is Saturday.`,
  msg`I don’t work tomorrow.`,
  msg`I’m at the market at twelve.`,
  msg`We drink coffee at eleven.`,
  msg`The café is open.`,
  msg`It costs twelve euros.`,
  msg`Mari doesn’t work today.`,
];

const translated = (
  { kind, answers: accepted }: { kind: Kind; answers: readonly [string, ...string[]] },
  i: number,
): SentenceDrill => ({
  kind: "translate",
  id: `translate-${clipId(accepted[0])}`,
  rule: kind,
  prompt: TRANSLATED_MEANS[i] as MessageDescriptor,
  say: accepted[0],
  answers: accepted,
  explain: explained(kind, accepted[0]),
});

export const DRILLS: DrillBank = {
  rules: {
    which: { label: msg`Time, price or day`, section: "which" },
    kell: { label: msg`Times with <et>kell</et>`, section: "voice" },
    hind: { label: msg`Saying a price`, section: "saturday" },
    paev: { label: msg`Days and signs`, section: "sign" },
    ei: { label: msg`Saying no with <et>ei</et>`, section: "cafe" },
  },
  items: [
    ...TALLINN_SORTED.map(answers),
    ...TALLINN_HEARD.map(written),
    written({ kind: "kell", said: TALLINN_DRILL_HEARD[0] }),
    written({ kind: "ei", said: TALLINN_DRILL_HEARD[1] }),
    written({ kind: "hind", said: TALLINN_DRILL_HEARD[2] }),
    ...[...TALLINN_TRANSLATED, ...TALLINN_DRILL_TRANSLATED].map(translated),
  ],
};
