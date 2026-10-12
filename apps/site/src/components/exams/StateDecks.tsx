import { Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ChevronDown, MapPin } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { deckPath } from "../../lib/deck-page";
import type { Locale } from "../../lib/routes";
import { SectionTitle } from "../landing/FeatureSection";
import { DeckShowcase } from "./DeckShowcase";

export interface StateDeck {
  slug: string;
  name: string;
  deck: PublicDeckSummary;
}

interface Props {
  locale: Locale;
  general: PublicDeckSummary | undefined;
  states: StateDeck[];
}

/** Germany's two decks: the general questions for everyone, and the state the visitor picks. */
export function StateDecks({ locale, general, states }: Props) {
  const { t } = useLingui();
  const still = useReducedMotion();
  const field = useId();
  const [slug, setSlug] = useState("");
  const chosen = states.find((state) => state.slug === slug);

  return (
    <section
      id="decks"
      aria-labelledby="decks-title"
      className="scroll-mt-6 border-t border-edge px-5 py-16 @2xl:px-10 @4xl:py-24"
    >
      <div className="mx-auto max-w-[1040px]">
        <SectionTitle>
          <span id="decks-title">
            <Trans>Everything the test can ask.</Trans>
          </span>
        </SectionTitle>
        <p className="mt-4 max-w-[56ch] text-md text-pretty text-text-2">
          <Trans>
            Everyone learns the 300 general questions. Three of the 33 come from the 10 about your
            state, so add the deck for the state where you’re registered too.
          </Trans>
        </p>

        <div className="mt-10 grid items-start gap-5 @4xl:grid-cols-2">
          {general && (
            <DeckShowcase
              deck={general}
              locale={locale}
              layout="tall"
              eyebrow={<Trans>For everyone</Trans>}
            />
          )}

          <div id="states" className="grid scroll-mt-6 gap-3">
            <label htmlFor={field} className="text-sm font-medium text-text-2">
              <Trans>Your state</Trans>
            </label>
            <div className="relative">
              <select
                id={field}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className="h-12 w-full appearance-none rounded-md bg-plate ps-4 pe-10 text-md text-text edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <option value="">{t`Choose your state`}</option>
                {states.map((state) => (
                  <option key={state.slug} value={state.slug} lang="de">
                    {state.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {chosen ? (
                <motion.div
                  key={chosen.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: still ? 0 : 0.25 }}
                >
                  <DeckShowcase
                    deck={chosen.deck}
                    locale={locale}
                    layout="tall"
                    eyebrow={<Trans>For {chosen.name}</Trans>}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: still ? 0 : 0.2 }}
                  className="grid min-h-[360px] place-content-center justify-items-center gap-3 rounded-2xl border border-edge-2 border-dashed px-8 text-center"
                >
                  <MapPin aria-hidden="true" strokeWidth={1.5} className="size-7 text-muted" />
                  <p className="max-w-[28ch] text-md text-pretty text-text-2">
                    <Trans>Choose your state to see the deck with its 10 questions.</Trans>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav aria-labelledby="all-states" className="mt-10">
          <h3 id="all-states" className="text-sm text-muted">
            <Trans>Every state’s deck</Trans>
          </h3>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {states.map((state) => (
              <li key={state.slug}>
                <a
                  href={deckPath(state.slug, locale)}
                  lang="de"
                  className="rounded-xs text-text-2 underline decoration-edge-2 underline-offset-2 hoverable:hover:text-text"
                >
                  {state.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
