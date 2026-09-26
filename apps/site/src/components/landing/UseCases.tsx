import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { SampleCard } from "./cards";

export interface UseCase {
  id: string;
  title: ReactNode;
  body: ReactNode;
  card: SampleCard;
  /** The use case's own page, once it exists. */
  link?: { href: string; label: ReactNode } | null | undefined;
}

interface Props {
  title: ReactNode;
  items: readonly UseCase[];
}

type Shape = "lead" | "wide" | "small";

/** The bento reads in list order: a tall lead, a wide second, then squares. */
const SHAPES: readonly Shape[] = ["lead", "wide", "small", "small"];
/** Explore's tray hues, skipping violet so no tile reads as AI's colour. */
const HUES = [4, 2, 0, 1, 3, 7];

const TILE: Record<Shape, string> = {
  lead: "@xl:col-span-2 @xl:grid @xl:grid-cols-2 @xl:gap-x-8 @4xl:col-span-1 @4xl:row-span-2 @4xl:flex",
  wide: "pb-0 @xl:col-span-2 @xl:grid @xl:grid-cols-2 @xl:gap-x-8 @2xl:pb-0",
  small: "pb-0 @2xl:pb-0",
};

/** The lead shows its whole card at a card's proportions; the others run off the tray's foot. */
const STACK: Record<Shape, { outer: string; inner: string; card: string }> = {
  lead: {
    outer: "my-auto flex justify-center px-2 py-3",
    inner: "aspect-square w-full max-w-80 @4xl:aspect-[4/5]",
    card: "p-6",
  },
  wide: {
    outer: "mt-auto -mb-(--bleed) flex flex-1 flex-col min-h-48",
    inner: "flex-1",
    card: "p-5 pb-[calc(1.25rem+var(--bleed))] @2xl:p-6 @2xl:pb-[calc(1.5rem+var(--bleed))]",
  },
  small: {
    outer: "mt-auto -mb-(--bleed) flex flex-1 flex-col min-h-48",
    inner: "flex-1",
    card: "p-5 pb-[calc(1.25rem+var(--bleed))] @2xl:p-6 @2xl:pb-[calc(1.5rem+var(--bleed))]",
  },
};

const TERM: Record<Shape, string> = {
  lead: "text-4xl @5xl:text-5xl",
  wide: "text-3xl",
  small: "text-2xl @5xl:text-3xl",
};

function CardStack({ card, shape }: { card: SampleCard; shape: Shape }) {
  const { i18n } = useLingui();
  const paper = shape === "lead" ? [1, 2] : [1];
  const stack = STACK[shape];
  return (
    <div className={clsx("relative", stack.outer)}>
      <div className={clsx("relative flex flex-col", stack.inner)}>
        {paper.map((at) => (
          <span key={at} className="use-case-paper" data-at={at} aria-hidden="true" />
        ))}
        <div
          className={clsx(
            "use-case-card relative flex flex-1 flex-col rounded-xl bg-plate edge",
            stack.card,
          )}
        >
          <p className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
            {i18n._(card.label)}
          </p>
          <p
            lang={card.language}
            className={clsx(
              "mt-2.5 mb-5 leading-[1.05] font-medium tracking-[-0.03em] text-balance text-text [overflow-wrap:anywhere]",
              TERM[shape],
            )}
          >
            {card.term}
          </p>
          <p
            className={clsx(
              "mt-auto border-t border-edge-2 pt-3 text-pretty text-text-2",
              shape === "lead" ? "text-md" : "text-sm",
            )}
          >
            {i18n._(card.meaning)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** What people keep in Lymi as a bento of trays, each with a real card and, where one exists, a page of its own. */
export function UseCases({ title, items }: Props) {
  return (
    <section
      aria-labelledby="use-cases-title"
      className="border-t border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto max-w-[1040px]">
        <h2
          id="use-cases-title"
          className="max-w-[20ch] text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl @4xl:max-w-none"
        >
          {title}
        </h2>

        <ul className="mt-12 grid gap-3 @xl:grid-cols-2 @2xl:gap-4 @4xl:grid-cols-3">
          {items.map((item, index) => {
            const shape = SHAPES[index] ?? "small";
            return (
              <li
                id={`use-case-${item.id}`}
                key={item.id}
                data-hue={HUES[index % HUES.length]}
                className={clsx(
                  "use-case-tile relative flex flex-col overflow-hidden rounded-2xl p-6 @2xl:p-7 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring",
                  TILE[shape],
                )}
              >
                <div className="pb-7 @2xl:pb-8">
                  <h3 className="text-xl font-medium tracking-[-0.02em] text-text">{item.title}</h3>
                  <p className="mt-2 max-w-[34ch] text-sm text-pretty text-text-2">{item.body}</p>
                  {item.link && (
                    <a
                      href={item.link.href}
                      className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-text after:absolute after:inset-0 after:z-10 focus-visible:outline-none"
                    >
                      {item.link.label}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform duration-200 ease-out hoverable:group-hover:translate-x-0.5"
                      />
                    </a>
                  )}
                </div>
                <CardStack card={item.card} shape={shape} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
