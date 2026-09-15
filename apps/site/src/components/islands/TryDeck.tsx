import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useId, useRef, useState } from "react";
import type { TryCard } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { buttonClass } from "../Button";

interface Props {
  locale: string;
  cards: TryCard[];
  /** The section the cards come from, in the deck's own language. */
  section: string | null;
  termLanguage: string | null;
  meaningLanguage: string;
  total: number;
  addUrl: string;
}

export default function TryDeck({ locale, ...props }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <TryDeckCards {...props} />
    </I18nProvider>
  );
}

/**
 * A few of the deck's first cards to recall one at a time. Nothing is saved. The meaning sits in
 * a `<details>`, so revealing works before the island hydrates and without JavaScript.
 */
function TryDeckCards({
  cards,
  section,
  termLanguage,
  meaningLanguage,
  total,
  addUrl,
}: Omit<Props, "locale">) {
  const { t } = useLingui();
  const titleId = useId();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Focus follows the visitor's own presses only, never the first render.
  const pressed = useRef(false);
  const summary = useRef<HTMLElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const endTitle = useRef<HTMLHeadingElement>(null);

  const count = cards.length;
  const done = index >= count;
  const card = cards[index];

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!pressed.current) return;
    if (done) endTitle.current?.focus();
    else if (revealed) next.current?.focus();
    else summary.current?.focus();
  }, [done, revealed]);

  if (count === 0) return null;

  const advance = () => {
    pressed.current = true;
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const restart = () => {
    pressed.current = true;
    setRevealed(false);
    setIndex(0);
  };

  const position = Math.min(index + 1, count);
  const term = card?.term ?? "";
  const status = done
    ? ""
    : revealed && card
      ? `${term}: ${card.meaning}`
      : index > 0
        ? t`Card ${position} of ${count}: ${term}`
        : "";

  return (
    <section aria-labelledby={titleId} className="w-full min-w-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={titleId} className="text-md font-medium text-text">
          <Plural value={count} one="Try the first card" other="Try the first # cards" />
        </h2>
        {!done && (
          <span className="text-sm text-muted tabular-nums">
            <Trans>
              {position} of {count}
            </Trans>
          </span>
        )}
      </div>

      <div className="mt-3 grid min-h-[340px] rounded-xl bg-plate p-6 edge @2xl:min-h-[360px] @2xl:p-8">
        {done ? (
          <div key="done" className="enter-card flex flex-col justify-center">
            <h3
              ref={endTitle}
              tabIndex={-1}
              className="text-2xl font-medium tracking-[-0.02em] text-balance text-text outline-none"
            >
              <Plural
                value={count}
                one="That was the first card."
                other="That was the first # cards."
              />
            </h3>
            <p className="mt-3 text-md text-pretty text-text-2">
              <Plural
                value={total}
                one="Add the deck to keep it. Lymi brings it back right before you’d forget it."
                other="Add the deck to learn all # cards. Lymi brings each one back right before you’d forget it."
              />
            </p>
            <div className="mt-8 grid gap-2">
              {/* Secondary: the header's Add to Lymi stays the page's one primary action. */}
              <a href={addUrl} className={buttonClass("secondary", "lg", "w-full")}>
                <Trans>Add to Lymi</Trans>
              </a>
              <button
                type="button"
                onClick={restart}
                className={buttonClass("ghost", "lg", "w-full")}
              >
                <Trans>Start again</Trans>
              </button>
            </div>
          </div>
        ) : (
          card && (
            <div key={index} className="enter-card flex min-w-0 flex-col">
              {section && (
                <p lang={meaningLanguage} className="truncate text-sm text-muted">
                  {section}
                </p>
              )}
              <p
                lang={termLanguage ?? undefined}
                className="my-auto py-8 text-center text-4xl font-medium tracking-[-0.03em] text-balance break-words text-text @2xl:text-5xl"
              >
                {card.term}
              </p>
              <details
                open={revealed}
                onToggle={(event) => {
                  if (!event.currentTarget.open || revealed) return;
                  pressed.current = true;
                  setRevealed(true);
                }}
                className="group"
              >
                <summary
                  ref={summary}
                  className="flex h-12 cursor-pointer list-none items-center justify-center rounded-md border border-edge-2 border-dashed text-md text-text-2 transition-colors duration-150 select-none group-open:hidden hoverable:hover:border-text-2 hoverable:hover:text-text [&::-webkit-details-marker]:hidden"
                >
                  <Trans>Show the meaning</Trans>
                </summary>
                <div className="answer-enter border-t border-edge pt-4 text-center">
                  <p lang={meaningLanguage} className="text-xl text-pretty break-words text-text-2">
                    {card.meaning}
                  </p>
                  {hydrated && (
                    <button
                      ref={next}
                      type="button"
                      onClick={advance}
                      className={buttonClass("secondary", "lg", "mt-5 w-full")}
                    >
                      {index + 1 < count ? <Trans>Next card</Trans> : <Trans>Done</Trans>}
                    </button>
                  )}
                </div>
              </details>
            </div>
          )
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
