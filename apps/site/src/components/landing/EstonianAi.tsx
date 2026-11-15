import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { motion, useInView } from "motion/react";
import { useMemo, useRef } from "react";
import { Field, HintField } from "./JapaneseAi";
import { type NotebookRow, NotebookToCards } from "./NotebookToCards";
import { appear, usePlayback, useStill } from "./playback";

const BEATS = { typed: 1000, meaning: 1700, forms: 2400, example: 3100, draft: 4000, hint: 4500 };

/** A word typed after a lesson; the AI fills each empty field, starting with its three forms. */
export function EnrichEstonian() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => BEATS, []);
  const { at } = usePlayback(beats, inView, still);

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-nested p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <span lang="et" className="min-h-[1.4em] text-2xl font-medium text-ink">
          {at("typed") ? "sõber" : "sõb"}
        </span>
      </Field>
      <Field label={<Trans>Meaning</Trans>} wrote={at("meaning")}>
        <motion.span
          initial={false}
          animate={appear(at("meaning"))}
          className="min-h-[1.5em] text-md text-ink"
        >
          <Trans>Friend</Trans>
        </motion.span>
      </Field>
      <Field label={<Trans>Notes</Trans>} wrote={at("forms")}>
        <motion.span
          lang="et"
          initial={false}
          animate={appear(at("forms"))}
          className="min-h-[1.5em] text-md text-ink"
        >
          sõber · sõbra · sõpra
        </motion.span>
      </Field>
      <Field label={<Trans>Example</Trans>} wrote={at("example")}>
        <motion.span
          lang="et"
          initial={false}
          animate={appear(at("example"))}
          className="min-h-[1.5em] text-md text-ink"
        >
          Ma lähen <span className="text-amber-text">sõbraga</span> kinno.
        </motion.span>
      </Field>
      <HintField pressed={at("draft")} drafted={at("hint")}>
        <Trans>
          <span lang="et">Sõber</span> sounds like “sober”: the friend who gets you home.
        </Trans>
      </HintField>
    </div>
  );
}

const NOTE_ROWS: NotebookRow[] = [
  { term: "broneerima", gloss: msg`to book`, card: 0 },
  { term: "ühistransport", gloss: msg`public transport`, card: 1 },
  { term: "palun" },
  { term: "kallis", gloss: msg`expensive`, card: 2 },
];

/** A photographed page of class notes; its new words land as cards, and the one already kept is skipped. */
export function NotesToCardsEstonian() {
  return (
    <NotebookToCards
      lang="et"
      heading={["Eesti keel · teisipäev", "A2"]}
      rows={NOTE_ROWS}
      cards={[
        { term: "broneerima", meaning: msg`To book; to reserve` },
        { term: "ühistransport", meaning: msg`Public transport` },
        { term: "kallis", meaning: msg`Expensive; dear` },
      ]}
      skipped="palun"
    />
  );
}
