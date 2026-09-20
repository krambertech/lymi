import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Square, Volume2 } from "lucide-react";
import {
  type CSSProperties,
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { SectionStep } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { publicMediaUrl } from "../../lib/origins";
import { buttonClass } from "../Button";

interface Props {
  locale: string;
  name: string;
  termLanguage: string | null;
  meaningLanguage: string;
  cardCount: number;
  addUrl: string;
  inOrder: boolean;
  steps: SectionStep[];
}

export default function DeckSections({ locale, ...props }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Sections {...props} />
    </I18nProvider>
  );
}

/** A deck with more sections than this lists one fewer, and a last row for the rest. */
const MAX_ROWS = 16;
/** The view stops listing here, so a catalog-sized deck cannot turn one page into megabytes. */
const MAX_CARDS = 500;
const HASH = "#cards";

type Open = (event: MouseEvent<HTMLElement>) => void;

/**
 * The deck's sections as tiles in the order a learner meets them, and every card in a view of its
 * own. The view is a modal dialog in this page's HTML, so search reads every card and a link ending
 * in #cards opens it.
 */
function Sections(props: Omit<Props, "locale">) {
  const { cardCount, inOrder, steps } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  // Safari does not focus a button on click, so the dialog cannot hand focus back on its own.
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback<Open>((event) => {
    const view = dialog.current;
    if (!view) return;
    opener.current = event.currentTarget;
    if (!view.open) view.showModal();
    if (window.location.hash !== HASH) window.history.pushState({ deckCards: true }, "", HASH);
  }, []);

  // Back closes the view, and closing the view steps back out of #cards.
  useEffect(() => {
    const view = dialog.current;
    if (!view) return;
    const sync = () => {
      const wanted = window.location.hash === HASH;
      if (wanted && !view.open) view.showModal();
      if (!wanted && view.open) view.close();
    };
    const closed = () => {
      opener.current?.focus({ preventScroll: true });
      opener.current = null;
      if (window.location.hash !== HASH) return;
      if (window.history.state?.deckCards) window.history.back();
      else window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    sync();
    window.addEventListener("popstate", sync);
    view.addEventListener("close", closed);
    return () => {
      window.removeEventListener("popstate", sync);
      view.removeEventListener("close", closed);
    };
  }, []);

  const named = steps.filter((step) => step.position !== null);
  const first = named[0]?.name ?? "";

  if (!inOrder) {
    return (
      <section
        id="sections"
        aria-labelledby="sections-title"
        className="scroll-mt-6 border-t border-edge px-5 py-10 text-center @2xl:px-10 @4xl:py-14"
      >
        <h2 id="sections-title" className="sr-only">
          <Trans>Every card in the deck</Trans>
        </h2>
        <a
          href={HASH}
          onClick={(event) => {
            event.preventDefault();
            open(event);
          }}
          className={buttonClass("secondary", "lg")}
        >
          <Plural value={cardCount} one="See the card" other="See all # cards" />
          <span aria-hidden="true">
            <ChevronRight className="rtl:rotate-180" />
          </span>
        </a>
        <CardsView {...props} dialogRef={dialog} />
      </section>
    );
  }

  return (
    <section
      id="sections"
      aria-labelledby="sections-title"
      className="scroll-mt-6 border-t border-edge px-5 pt-14 pb-16 @2xl:px-10 @4xl:pt-20 @4xl:pb-24"
    >
      <div className="mx-auto max-w-[1040px]">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
          <h2
            id="sections-title"
            className="min-w-0 text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
          >
            <Trans>What’s inside</Trans>
          </h2>
          <a
            href={HASH}
            onClick={(event) => {
              event.preventDefault();
              open(event);
            }}
            className={buttonClass("secondary", "lg")}
          >
            <Plural value={cardCount} one="See the card" other="See all # cards" />
            <span aria-hidden="true">
              <ChevronRight className="rtl:rotate-180" />
            </span>
          </a>
        </div>
        {inOrder && (
          <p className="mt-4 max-w-[62ch] text-md text-pretty text-text-2">
            <Trans>
              You start with <span lang={props.meaningLanguage}>{first}</span>, and the next section
              opens as you learn the one before it.
            </Trans>
          </p>
        )}
        {inOrder && <SectionList {...props} onOpen={open} />}
      </div>
      <CardsView {...props} dialogRef={dialog} />
    </section>
  );
}

/** The sections as a contents list in two columns, read down then across. */
function SectionList({ steps, meaningLanguage, onOpen }: Omit<Props, "locale"> & { onOpen: Open }) {
  const shown = steps.length > MAX_ROWS ? steps.slice(0, MAX_ROWS - 1) : steps;
  const rest = steps.slice(shown.length);
  const rows = Math.ceil((shown.length + (rest.length > 0 ? 1 : 0)) / 2);
  return (
    <ol
      className="mt-8 grid border-t border-edge @3xl:grid-flow-col @3xl:grid-cols-2 @3xl:grid-rows-(--rows) @3xl:gap-x-12 @4xl:mt-10"
      style={{ "--rows": `repeat(${rows}, auto)` } as CSSProperties}
    >
      {shown.map((step, index) => {
        const start = index === 0;
        const position = step.position;
        return (
          <li
            key={`${position ?? "rest"}-${step.name ?? ""}`}
            className="flex min-h-16 min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-edge py-3"
          >
            <span
              aria-hidden="true"
              className={clsx(
                "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums",
                start ? "bg-text text-canvas" : "text-text-2 edge-2",
              )}
            >
              {position ?? "·"}
            </span>
            <h3 className="min-w-[8rem] flex-1 text-lg leading-tight font-medium tracking-[-0.012em] text-pretty text-text">
              {position !== null && (
                <span className="sr-only">
                  <Trans>Section {position}:</Trans>{" "}
                </span>
              )}
              <span lang={step.name === null ? undefined : meaningLanguage}>
                {step.name ?? <Trans>Cards outside a section</Trans>}
              </span>
            </h3>
            {start && (
              <span className="shrink-0 text-sm font-medium text-good">
                <Trans>Start here</Trans>
              </span>
            )}
            <span className="shrink-0 text-sm text-muted tabular-nums">
              <Plural value={step.cards.length} one="# card" other="# cards" />
            </span>
          </li>
        );
      })}
      {rest.length > 0 && (
        <li className="flex min-h-16 items-center border-b border-edge py-3">
          <a
            href={HASH}
            onClick={(event) => {
              event.preventDefault();
              onOpen(event);
            }}
            className="inline-flex items-center gap-1 rounded-xs text-lg font-medium tracking-[-0.012em] text-text hoverable:hover:underline hoverable:hover:underline-offset-4"
          >
            <Plural value={rest.length} one="# more section" other="# more sections" />
            <ChevronRight aria-hidden="true" className="size-5 rtl:rotate-180" />
          </a>
        </li>
      )}
    </ol>
  );
}

interface ViewProps extends Omit<Props, "locale"> {
  dialogRef: RefObject<HTMLDialogElement | null>;
}

function CardsView({
  name,
  termLanguage,
  meaningLanguage,
  cardCount,
  addUrl,
  inOrder,
  steps,
  dialogRef,
}: ViewProps) {
  const { t } = useLingui();
  const id = useId();
  const [active, setActive] = useState(0);
  const index = useRef<HTMLElement>(null);
  const jumping = useRef(0);
  const ticking = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [failedAudio, setFailedAudio] = useState<string | null>(null);

  const stopAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
    setFailedAudio(null);
  }, []);

  const toggleAudio = useCallback(
    (id: string) => {
      if (playing === id) {
        stopAudio();
        return;
      }
      audio.current?.pause();
      setFailedAudio(null);
      const clip = new Audio(publicMediaUrl(id, "audio"));
      audio.current = clip;
      setPlaying(id);
      const done = () => {
        if (audio.current !== clip) return;
        audio.current = null;
        setPlaying(null);
      };
      const failed = () => {
        if (audio.current !== clip) return;
        done();
        setFailedAudio(id);
      };
      clip.addEventListener("ended", done);
      clip.addEventListener("error", failed);
      clip.play().catch(failed);
    },
    [playing, stopAudio],
  );

  useEffect(() => {
    const view = dialogRef.current;
    view?.addEventListener("close", stopAudio);
    return () => {
      view?.removeEventListener("close", stopAudio);
      audio.current?.pause();
    };
  }, [dialogRef, stopAudio]);

  // The section under the bar is the current one; the last counts once the list reaches its end.
  const spy = useCallback(() => {
    ticking.current = false;
    const view = dialogRef.current;
    if (!view || Date.now() < jumping.current) return;
    const sections = [...view.querySelectorAll<HTMLElement>("[data-section]")];
    const line = view.scrollTop + view.clientHeight * 0.25;
    const end = view.scrollTop + view.clientHeight >= view.scrollHeight - 4;
    let current = 0;
    sections.forEach((section, i) => {
      if (section.offsetTop <= line) current = i;
    });
    setActive(end ? sections.length - 1 : current);
  }, [dialogRef]);

  // On a phone the sections are a row of chips; keep the current one in sight.
  useEffect(() => {
    const nav = index.current;
    const chip = nav?.querySelectorAll<HTMLElement>("a")[active];
    if (!nav || !chip || nav.scrollWidth <= nav.clientWidth) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({ left: chip.offsetLeft - 20, behavior: still ? "auto" : "smooth" });
  }, [active]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, i: number) => {
    event.preventDefault();
    const target = dialogRef.current?.querySelector<HTMLElement>(`[data-section="${i}"]`);
    if (!target) return;
    setActive(i);
    jumping.current = Date.now() + 700;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    // Reading moves with the view, so a screen reader continues at the section rather than the list.
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  };

  const sectionId = (i: number) => `${id}-section-${i}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      onScroll={() => {
        if (ticking.current) return;
        ticking.current = true;
        requestAnimationFrame(spy);
      }}
      id="cards"
      className="deck-cards"
    >
      <div className="@container min-h-full">
        <div className="sticky top-0 z-10 border-b border-edge bg-canvas">
          <div className="mx-auto flex h-16 max-w-[1040px] items-center justify-between gap-3 px-5 @2xl:px-10">
            <button
              type="button"
              aria-label={t`Back to ${name}`}
              onClick={() => dialogRef.current?.close()}
              className="relative -ms-1.5 inline-flex h-10 min-w-0 items-center gap-1.5 rounded-sm ps-1 pe-3 text-md text-text-2 transition-colors duration-150 before:absolute before:-inset-y-1 before:content-[''] hoverable:hover:bg-plate-2 hoverable:hover:text-text"
            >
              <ChevronLeft aria-hidden="true" className="size-[22px] shrink-0 rtl:rotate-180" />
              <span lang={meaningLanguage} className="truncate">
                {name}
              </span>
            </button>
            <a
              href={addUrl}
              className={buttonClass(
                "primary",
                "md",
                "before:absolute before:-inset-y-1 before:content-['']",
              )}
            >
              <Trans>Add to Lymi</Trans>
            </a>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1040px] px-5 pb-20 @2xl:px-10 @4xl:grid-cols-[220px_minmax(0,620px)] @4xl:justify-between @4xl:gap-x-16 @4xl:pb-32">
          {inOrder && (
            <nav
              ref={index}
              aria-label={t`Sections`}
              className="sticky top-16 z-[5] -mx-5 overflow-x-auto border-b border-edge bg-canvas px-5 py-2.5 [scrollbar-width:none] @2xl:-mx-10 @2xl:px-10 @4xl:mx-0 @4xl:max-h-[calc(100dvh-4rem)] @4xl:self-start @4xl:overflow-x-visible @4xl:overflow-y-auto @4xl:border-0 @4xl:px-0 @4xl:pt-12 @4xl:pb-6"
            >
              <ol className="flex gap-1.5 @4xl:grid @4xl:gap-0">
                {steps.map((step, i) => (
                  <li
                    key={sectionId(i)}
                    className="@4xl:relative @4xl:before:absolute @4xl:before:start-[15px] @4xl:before:top-9 @4xl:before:-bottom-1 @4xl:before:w-px @4xl:before:bg-edge-2 @4xl:last:before:hidden"
                  >
                    <a
                      href={`#${sectionId(i)}`}
                      onClick={(event) => jump(event, i)}
                      aria-current={active === i ? "true" : undefined}
                      className="group relative inline-flex h-8 items-center rounded-full bg-plate-2 px-3 text-sm whitespace-nowrap text-text-2 transition-[background-color,color] duration-150 before:absolute before:-inset-y-1.5 before:content-[''] aria-[current=true]:bg-text aria-[current=true]:text-canvas @4xl:grid @4xl:h-auto @4xl:grid-cols-[2rem_minmax(0,1fr)] @4xl:gap-3 @4xl:rounded-none @4xl:bg-transparent @4xl:px-0 @4xl:pb-3 @4xl:whitespace-normal @4xl:aria-[current=true]:bg-transparent @4xl:aria-[current=true]:text-text hoverable:@4xl:hover:text-text"
                    >
                      <span
                        aria-hidden="true"
                        className="hidden size-8 place-items-center rounded-full bg-plate-2 text-xs font-semibold text-text-2 tabular-nums transition-colors duration-150 group-aria-[current=true]:bg-text group-aria-[current=true]:text-canvas @4xl:relative @4xl:grid"
                      >
                        {step.position ?? "·"}
                      </span>
                      <span className="@4xl:pt-1.5">
                        <span lang={step.name === null ? undefined : meaningLanguage}>
                          {step.name ?? <Trans>Cards outside a section</Trans>}
                        </span>
                        <span className="hidden text-xs text-muted tabular-nums @4xl:block">
                          <Plural value={step.cards.length} one="# card" other="# cards" />
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className={clsx("min-w-0 pt-8 @4xl:pt-12", !inOrder && "@4xl:col-span-2")}>
            <h2
              id={`${id}-title`}
              className="text-4xl font-medium tracking-[-0.03em] text-balance text-text"
            >
              <Plural value={cardCount} one="The one card" other="All # cards" />
            </h2>
            {inOrder && (
              <p className="mt-2 text-md text-text-2">
                <Trans>In the order you learn them, one section at a time.</Trans>
              </p>
            )}
            {steps.map((step, i) => {
              // The view stops listing once the budget is spent, so one page cannot run to megabytes.
              const before = steps
                .slice(0, i)
                .reduce((sum, earlier) => sum + earlier.cards.length, 0);
              const shownCards = step.cards.slice(0, Math.max(MAX_CARDS - before, 0));
              return (
                <section
                  key={sectionId(i)}
                  id={sectionId(i)}
                  data-section={i}
                  aria-labelledby={inOrder ? `${sectionId(i)}-title` : undefined}
                  className="mt-10 scroll-mt-32 @4xl:mt-14 @4xl:scroll-mt-24"
                >
                  {inOrder && (
                    <h3
                      id={`${sectionId(i)}-title`}
                      className="flex items-baseline gap-2.5 pb-3 text-xl font-medium tracking-[-0.02em] text-text"
                    >
                      {step.position !== null && (
                        <span className="text-md text-muted tabular-nums">{step.position}</span>
                      )}
                      <span
                        lang={step.name === null ? undefined : meaningLanguage}
                        className="min-w-0 break-words"
                      >
                        {step.name ?? <Trans>Cards outside a section</Trans>}
                      </span>
                      <span className="ms-auto shrink-0 text-sm font-normal tracking-normal text-muted tabular-nums">
                        <Plural value={step.cards.length} one="# card" other="# cards" />
                      </span>
                    </h3>
                  )}
                  <dl>
                    {shownCards.map((card, cardIndex) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: terms can repeat across sections; order is fixed.
                        key={cardIndex}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5 border-t border-edge py-2.5 text-md"
                      >
                        <dt
                          lang={termLanguage ?? undefined}
                          className="font-medium break-words text-text"
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            {card.term}
                            {card.audio && (
                              <button
                                type="button"
                                aria-label={
                                  playing === card.audio.cardId
                                    ? t`Stop pronunciation`
                                    : t`Play pronunciation`
                                }
                                onClick={() => card.audio && toggleAudio(card.audio.cardId)}
                                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full edge text-text-2 hoverable:hover:bg-hover"
                              >
                                {playing === card.audio.cardId ? (
                                  <Square
                                    aria-hidden="true"
                                    className="size-3"
                                    fill="currentColor"
                                  />
                                ) : (
                                  <Volume2 aria-hidden="true" className="size-4" />
                                )}
                              </button>
                            )}
                          </span>
                          {failedAudio === card.audio?.cardId && (
                            <span
                              role="status"
                              className="mt-1 block text-sm font-normal text-danger"
                            >
                              <Trans>Pronunciation couldn’t play. Try again.</Trans>
                            </span>
                          )}
                          {card.image && (
                            <img
                              src={publicMediaUrl(card.image.cardId, "image")}
                              alt={card.image.description}
                              width={card.image.width}
                              height={card.image.height}
                              loading="lazy"
                              decoding="async"
                              className="mt-2 max-h-32 w-auto max-w-full rounded-sm object-contain"
                            />
                          )}
                        </dt>
                        {card.meaning === null ? (
                          <dd className="text-faint">
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">
                              <Trans>No meaning yet</Trans>
                            </span>
                          </dd>
                        ) : (
                          <dd lang={meaningLanguage} className="break-words text-text-2">
                            {card.meaning}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                  {shownCards.length < step.cards.length && (
                    <p className="border-t border-edge pt-2.5 text-md text-muted">
                      <Plural
                        value={step.cards.length - shownCards.length}
                        one="One more card in this section, in Lymi."
                        other="# more cards in this section, in Lymi."
                      />
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </dialog>
  );
}
