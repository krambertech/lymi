import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { KELL_DRILLED } from "../../../lib/learn/clips";
import type { ChoiceDrill, DrillBank, FormDrill, SentenceDrill } from "../../../lib/learn/drill";
import {
  type ClockTime,
  type Minute,
  timeClip,
  timeDigits,
  timeSentence,
  timeWords,
} from "../../../lib/learn/estonian-time";

const HOUR = msg`On the hour, say the hour alone: <et>kell on kolm</et>.`;
const HALF = msg`<et>Pool</et>, <et>veerand</et> and <et>kolmveerand</et> name the hour that’s coming.`;
const PAST = msg`<et>Läbi</et> counts on from the hour that has struck.`;
const TO = msg`<et>Pärast</et> counts down to the hour that’s coming.`;

const ruleOf = ({ minute }: ClockTime) =>
  minute === 0 ? "hour" : minute % 15 === 0 ? "quarter" : minute < 30 ? "past" : "to";

const WHY: Record<string, MessageDescriptor> = { hour: HOUR, quarter: HALF, past: PAST, to: TO };

const hourBy = (hour: number, by: number) => ((hour - 1 + by + 12) % 12) + 1;

const typed = (time: ClockTime): FormDrill => ({
  kind: "form",
  id: `words-${timeClip(time)}`,
  rule: ruleOf(time),
  base: timeDigits(time),
  gloss: msg`a time`,
  cue: msg`in words`,
  answers: [timeWords(time), `kell on ${timeWords(time)}`],
  say: timeSentence(time),
  explain: WHY[ruleOf(time)] as MessageDescriptor,
});

const written = (time: ClockTime): SentenceDrill => ({
  kind: "dictation",
  id: `write-${timeClip(time)}`,
  rule: ruleOf(time),
  say: timeSentence(time),
  answers: [timeSentence(time)],
  explain: WHY[ruleOf(time)] as MessageDescriptor,
});

const heard = (time: ClockTime): ChoiceDrill => {
  const { hour, minute } = time;
  const option = (each: ClockTime) => ({ id: timeClip(each), label: { et: timeDigits(each) } });
  const slip =
    minute === 0
      ? { hour: hourBy(hour, 1), minute }
      : minute < 30 && minute % 15
        ? { hour: hourBy(hour, -1), minute: (60 - minute) as Minute }
        : { hour: hourBy(hour, 1), minute };
  return {
    kind: "choice",
    id: `hear-${timeClip(time)}`,
    rule: ruleOf(time),
    say: timeSentence(time),
    answer: option(time),
    slip: option(slip),
    wrong: [option({ hour: hourBy(hour, -1), minute }), option({ hour: hourBy(hour, 2), minute })],
    explain: WHY[ruleOf(time)] as MessageDescriptor,
  };
};

export const DRILLS: DrillBank = {
  rules: {
    hour: { label: msg`On the hour`, section: "hours" },
    quarter: { label: msg`Halves and quarters`, section: "pool" },
    past: { label: msg`Minutes past: <et>läbi</et>`, section: "past" },
    to: { label: msg`Minutes to: <et>pärast</et>`, section: "to" },
  },
  items: [...KELL_DRILLED.map(typed), ...KELL_DRILLED.map(written), ...KELL_DRILLED.map(heard)],
};
