import type { MessageDescriptor } from "@lingui/core";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { motion, useInView } from "motion/react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { EASE, usePlayback, useStill } from "./playback";

/** One beat per term: it lights in the material, then its card lands in the deck. */
const STEP_MS = 900;
const LAND_MS = 450;
const START_MS = 400;

export interface MaterialCard {
  /** A string when the term is in the language being learned; a message when it follows the page. */
  term: string | MessageDescriptor;
  meaning: MessageDescriptor;
  /** Already in the learner's decks, so the assistant skips it. */
  duplicate?: boolean;
}

export interface Material {
  id: string;
  /** The switcher's label: what kind of material it is. */
  name: MessageDescriptor;
  deck: MessageDescriptor;
  /** BCP 47 tag of the terms, when they are in a language being learned. */
  lang?: string;
  cards: MaterialCard[];
  /** Draws the material; `lit(i)` is true once the assistant has picked card `i` out of it. */
  render: (lit: (i: number) => boolean) => ReactNode;
}

/** The term the assistant picked, highlighted once it has been read. */
export function Pick({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <mark
      data-on={on}
      className="rounded-xs bg-transparent bg-[linear-gradient(var(--color-amber-soft),var(--color-amber-soft))] bg-no-repeat px-0.5 text-inherit transition-[background-size] duration-500 ease-out [background-size:0%_100%] [box-decoration-break:clone] data-[on=true]:[background-size:100%_100%] motion-reduce:transition-none"
    >
      {children}
    </mark>
  );
}

function Row({ card, lang }: { card: MaterialCard; lang: string | undefined }) {
  const { i18n } = useLingui();
  const term = typeof card.term === "string" ? card.term : i18n._(card.term);
  const termLang = typeof card.term === "string" ? lang : undefined;

  return (
    <div className="flex items-start gap-3 py-3">
      {card.duplicate ? (
        <Copy aria-hidden="true" className="mt-1 size-4 shrink-0 text-ink-muted" />
      ) : (
        <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" />
      )}
      <div className="min-w-0 flex-1">
        <p
          lang={termLang}
          className={clsx("text-md font-medium", card.duplicate ? "text-ink-muted" : "text-ink")}
        >
          {term}
        </p>
        <p className="mt-0.5 text-sm text-pretty text-ink-secondary">
          {card.duplicate ? (
            <span className="text-ink-muted">
              <Trans>Already in your deck, so it’s skipped</Trans>
            </span>
          ) : (
            i18n._(card.meaning)
          )}
        </p>
      </div>
    </div>
  );
}

/** One material read into cards; keyed by material, so switching starts the reading over. */
function Reading({ material, inView }: { material: Material; inView: boolean }) {
  const { i18n } = useLingui();
  const still = useStill();
  const beats = useMemo(() => {
    const entries: [string, number][] = material.cards.flatMap((_, i) => [
      [`lit${i}`, START_MS + i * STEP_MS],
      [`card${i}`, START_MS + i * STEP_MS + LAND_MS],
    ]);
    return Object.fromEntries(entries) as Record<string, number>;
  }, [material]);
  const { at } = usePlayback(beats, inView, still);
  const lit = (i: number) => at(`lit${i}`);
  const landed = material.cards.filter((_, i) => at(`card${i}`));
  const done = landed.length === material.cards.length;
  const added = material.cards.filter((c) => !c.duplicate).length;

  return (
    <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @4xl:gap-10">
      <div className="grid min-h-[300px] place-items-center rounded-2xl bg-plate-nested px-4 py-8 @2xl:px-8 @4xl:min-h-[420px]">
        {material.render(lit)}
      </div>

      <div className="min-w-0 rounded-2xl bg-plate p-5 edge @2xl:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-lg font-medium tracking-[-0.02em] text-ink">{i18n._(material.deck)}</p>
          <p className="shrink-0 text-xs text-ink-muted tabular-nums">
            {done ? (
              <Plural value={added} one="# card added" other="# cards added" />
            ) : (
              <Trans>Reading…</Trans>
            )}
          </p>
        </div>
        <div className="mt-3 divide-y divide-edge border-t border-edge @4xl:min-h-[300px]">
          {material.cards.map((card, i) =>
            at(`card${i}`) ? (
              <motion.div
                key={typeof card.term === "string" ? card.term : card.term.id}
                initial={still ? false : { opacity: 0, y: -8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <Row card={card} lang={material.lang} />
              </motion.div>
            ) : null,
          )}
          {landed.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-muted">
              <Trans>New cards land here.</Trans>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * What a lesson or a class leaves behind, read by the learner's assistant into cards. It plays on
 * its own once in view; the switcher shows the same reading for another kind of material.
 */
export function MaterialToCards({ materials }: { materials: Material[] }) {
  const { t, i18n } = useLingui();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [chosen, setChosen] = useState(materials[0]?.id);
  const material = materials.find((m) => m.id === chosen) ?? (materials[0] as Material);

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {materials.length > 1 && (
        <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
          <legend className="sr-only">{t`What you send`}</legend>
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === material.id}
              onClick={() => setChosen(m.id)}
              className={clsx(
                "h-9 rounded-full px-3.5 text-sm transition-colors duration-150",
                m.id === material.id
                  ? "bg-ink font-medium text-canvas"
                  : "bg-plate text-ink-secondary edge hoverable:hover:bg-plate-hover hoverable:hover:text-ink",
              )}
            >
              {i18n._(m.name)}
            </button>
          ))}
        </fieldset>
      )}
      <Reading key={material.id} material={material} inView={inView} />
    </div>
  );
}
