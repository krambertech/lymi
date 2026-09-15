import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
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

/** A deck with more sections than this shows one fewer, and a last tile for the rest. */
const MAX_TILES = 8;
const HASH = "#cards";

type Open = (event: MouseEvent<HTMLButtonElement>) => void;

/**
 * The deck's sections as tiles in the order a learner meets them, and every card in a view of its
 * own. The view is a modal dialog in this page's HTML, so search reads every card and a link ending
 * in #cards opens it.
 */
function Sections(props: Omit<Props, "locale">) {
  const { cardCount, inOrder, steps } = props;
  const dialog = useRef<HTMLDialogElement>(null);

  const open = useCallback<Open>(() => {
    const view = dialog.current;
    if (!view) return;
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

  return (
    <section
      id="sections"
      aria-labelledby="sections-title"
      className="scroll-mt-6 px-5 pt-10 pb-16 @2xl:px-10 @4xl:pt-14 @4xl:pb-24"
    >
      <div className="mx-auto max-w-[1040px]">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="min-w-0 max-w-[52ch]">
            <h2
              id="sections-title"
              className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
            >
              {inOrder ? (
                <Plural value={named.length} one="One section" other="# sections, in order" />
              ) : (
                <Trans>Every card in the deck</Trans>
              )}
            </h2>
            {inOrder && (
              <p className="mt-4 text-md text-pretty text-text-2">
                <Trans>
                  You start with <span lang={props.meaningLanguage}>{first}</span>. Once every card
                  in a section has come up and you know 80% of them, the next one opens by itself.
                </Trans>
              </p>
            )}
          </div>
          <button type="button" onClick={open} className={buttonClass("secondary", "lg")}>
            <Plural value={cardCount} one="See the card" other="See all # cards" />
            <span aria-hidden="true">
              <ChevronRight className="rtl:rotate-180" />
            </span>
          </button>
        </div>
        {inOrder && <Tiles {...props} onOpen={open} />}
      </div>
      <CardsView {...props} dialogRef={dialog} />
    </section>
  );
}

function Tiles({ steps, meaningLanguage, onOpen }: Omit<Props, "locale"> & { onOpen: Open }) {
  const shown = steps.length > MAX_TILES ? steps.slice(0, MAX_TILES - 1) : steps;
  const rest = steps.slice(shown.length);
  return (
    <ol className="mt-9 grid grid-cols-2 gap-2.5 @4xl:mt-12 @4xl:grid-cols-4 @4xl:gap-3">
      {shown.map((step, index) => {
        const start = index === 0;
        const position = step.position;
        return (
          <li
            key={`${position ?? "rest"}-${step.name ?? ""}`}
            className="flex min-w-0 flex-col rounded-lg bg-plate p-4 edge @4xl:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                aria-hidden="true"
                className={clsx(
                  "grid size-9 shrink-0 place-items-center rounded-full text-md font-semibold tabular-nums",
                  start ? "bg-text text-canvas" : "bg-plate-2 text-text-2",
                )}
              >
                {position ?? "·"}
              </span>
              {start && (
                <span className="text-sm font-medium text-good">
                  <Trans>Start here</Trans>
                </span>
              )}
            </div>
            <h3 className="mt-5 text-lg leading-tight font-medium tracking-[-0.012em] break-words text-text">
              {position !== null && (
                <span className="sr-only">
                  <Trans>Section {position}:</Trans>{" "}
                </span>
              )}
              <span lang={step.name === null ? undefined : meaningLanguage}>
                {step.name ?? <Trans>Cards outside a section</Trans>}
              </span>
            </h3>
            <p className="mt-1 text-sm text-muted tabular-nums">
              <Plural value={step.cards.length} one="# card" other="# cards" />
            </p>
          </li>
        );
      })}
      {rest.length > 0 && (
        <li className="flex min-w-0 flex-col rounded-lg p-4 outline-1 -outline-offset-1 outline-edge-2 outline-dashed @4xl:p-5">
          <p className="text-lg leading-tight font-medium tracking-[-0.012em] text-text">
            <Plural value={rest.length} one="# more section" other="# more sections" />
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-auto inline-flex items-center gap-0.5 self-start rounded-xs pt-5 text-md font-medium text-text hoverable:hover:underline hoverable:hover:underline-offset-4"
          >
            <Trans>See every section</Trans>
            <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </button>
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
    nav.scrollTo({ left: chip.offsetLeft - 20, behavior: "smooth" });
  }, [active]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, i: number) => {
    event.preventDefault();
    const target = dialogRef.current?.querySelector<HTMLElement>(`[data-section="${i}"]`);
    if (!target) return;
    setActive(i);
    jumping.current = Date.now() + 700;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
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
      className="deck-cards"
    >
      <div className="@container min-h-full">
        <div className="sticky top-0 z-10 border-b border-edge bg-canvas">
          <div className="mx-auto flex h-16 max-w-[1040px] items-center justify-between gap-3 px-5 @2xl:px-10">
            <button
              type="button"
              aria-label={t`Back to ${name}`}
              onClick={() => dialogRef.current?.close()}
              className="-ms-1.5 inline-flex h-10 min-w-0 items-center gap-1.5 rounded-sm ps-1 pe-3 text-md text-text-2 transition-colors duration-150 hoverable:hover:bg-plate-2 hoverable:hover:text-text"
            >
              <ChevronLeft aria-hidden="true" className="size-[22px] shrink-0 rtl:rotate-180" />
              <span lang={meaningLanguage} className="truncate">
                {name}
              </span>
            </button>
            <a href={addUrl} className={buttonClass("primary", "md")}>
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
                    className="relative @4xl:before:absolute @4xl:before:start-[15px] @4xl:before:top-9 @4xl:before:-bottom-1 @4xl:before:w-px @4xl:before:bg-edge-2 @4xl:last:before:hidden"
                  >
                    <a
                      href={`#${sectionId(i)}`}
                      onClick={(event) => jump(event, i)}
                      aria-current={active === i ? "true" : undefined}
                      className="group inline-flex h-8 items-center rounded-full bg-plate-2 px-3 text-sm whitespace-nowrap text-text-2 transition-colors duration-150 aria-[current=true]:bg-text aria-[current=true]:text-canvas @4xl:grid @4xl:h-auto @4xl:grid-cols-[2rem_minmax(0,1fr)] @4xl:gap-3 @4xl:rounded-none @4xl:bg-transparent @4xl:px-0 @4xl:pb-3 @4xl:whitespace-normal @4xl:aria-[current=true]:bg-transparent @4xl:aria-[current=true]:text-text hoverable:@4xl:hover:text-text"
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
            {steps.map((step, i) => (
              <section
                key={sectionId(i)}
                id={sectionId(i)}
                data-section={i}
                aria-labelledby={`${sectionId(i)}-title`}
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
                  {step.cards.map((card, cardIndex) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: terms can repeat across sections; order is fixed.
                      key={cardIndex}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5 border-t border-edge py-2.5 text-md"
                    >
                      <dt
                        lang={termLanguage ?? undefined}
                        className="font-medium break-words text-text"
                      >
                        {card.term}
                      </dt>
                      <dd lang={meaningLanguage} className="break-words text-text-2">
                        {card.meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
