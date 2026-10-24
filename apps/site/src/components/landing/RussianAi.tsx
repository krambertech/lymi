import { Trans } from "@lingui/react/macro";
import { motion, useInView } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import { Field } from "./JapaneseAi";
import { appear, usePlayback, useStill } from "./playback";

const Ru = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span lang="ru" className={className}>
    {children}
  </span>
);

const ENRICH_BEATS = { typed: 900, stress: 1600, example: 2400, notes: 3200 };

/** A word typed after a lesson; AI marks the stress its meaning calls for, writes a stressed example, and names its twin. */
export function EnrichRussian() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => ENRICH_BEATS, []);
  const { at } = usePlayback(beats, inView, still);

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-2 p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <Ru className="min-h-[1.4em] text-2xl font-medium text-text">
          {at("typed") ? "замок" : "зам"}
        </Ru>
      </Field>
      <Field label={<Trans>Stress</Trans>} wrote={at("stress")}>
        <motion.span
          initial={false}
          animate={appear(at("stress"))}
          className="min-h-[1.5em] text-md text-text"
        >
          <Ru>замо́к</Ru>
        </motion.span>
      </Field>
      <Field label={<Trans>Meaning</Trans>}>
        <span className="min-h-[1.5em] text-md text-text">
          <Trans>Lock</Trans>
        </span>
        <span className="text-xs text-muted">
          <Trans>From your lesson</Trans>
        </span>
      </Field>
      <Field label={<Trans>Example</Trans>} wrote={at("example")}>
        <motion.span
          initial={false}
          animate={appear(at("example"))}
          className="min-h-[1.5em] text-lg text-text"
        >
          <Ru>Ключ не подхо́дит к замку́.</Ru>
        </motion.span>
      </Field>
      <Field label={<Trans>Notes</Trans>} wrote={at("notes")}>
        <motion.span
          initial={false}
          animate={appear(at("notes"))}
          className="min-h-[1.5em] text-md text-text"
        >
          <Trans>
            <Ru>за́мок</Ru> is a castle.
          </Trans>
        </motion.span>
      </Field>
    </div>
  );
}
