import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { CircleCheck, FileArchive } from "lucide-react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

export interface Collection {
  app: string;
  fileName: string;
  megabytes: number;
  cards: number;
  reviews: number;
  decks: number;
  pictures: number;
}

const COLLECTION: Collection = {
  app: "Anki",
  fileName: "Spanish.apkg",
  megabytes: 14,
  cards: 1240,
  reviews: 16402,
  decks: 4,
  pictures: 180,
};

/** A number that counts up from zero once the preview is on screen. */
function Count({ value, run }: { value: number; run: boolean }) {
  const { i18n } = useLingui();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!run) return;
    const format = new Intl.NumberFormat(i18n.locale);
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (ref.current) ref.current.textContent = format.format(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [run, value, i18n.locale]);

  return <span ref={ref}>{new Intl.NumberFormat(i18n.locale).format(value)}</span>;
}

/** The app's import preview for a made-up Anki collection. */
export function ImportDemo({ collection = COLLECTION }: { collection?: Collection } = {}) {
  const { t, i18n } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const visible = useInView(root, { once: true, amount: 0.6 });
  const still = useReducedMotion();
  const run = visible && !still;

  const { app, cards, reviews, decks, pictures } = collection;
  const size = new Intl.NumberFormat(i18n.locale, {
    style: "unit",
    unit: "megabyte",
    unitDisplay: "short",
  }).format(collection.megabytes);
  const figures = [
    { id: "cards", value: cards, label: t`${plural(cards, { one: "card", other: "cards" })}` },
    {
      id: "reviews",
      value: reviews,
      label: t`${plural(reviews, { one: "past review", other: "past reviews" })}`,
    },
    { id: "decks", value: decks, label: t`${plural(decks, { one: "deck", other: "decks" })}` },
  ];

  return (
    <div ref={root} className="mx-auto w-full max-w-[440px] rounded-2xl bg-plate p-4 edge @2xl:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-plate-nested text-ink-secondary">
          <FileArchive aria-hidden="true" strokeWidth={1.75} className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-md font-medium text-ink">
            <Trans>Import</Trans>
          </p>
          <p className="truncate text-sm text-ink-muted">
            {collection.fileName} · {size}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-ink">
        <Trans>What comes across</Trans>
      </p>
      <div className="mt-2 grid grid-cols-3 rounded-xl bg-plate-nested">
        {figures.map((figure) => (
          <div
            key={figure.id}
            className="grid min-w-0 content-start gap-0.5 px-3 py-3 [&:not(:first-child)]:border-s [&:not(:first-child)]:border-edge @2xl:px-4"
          >
            <span className="text-xl font-semibold leading-tight text-ink tabular-nums @2xl:text-2xl">
              <Count value={figure.value} run={run} />
            </span>
            <span className="text-xs text-ink-muted @2xl:text-sm">{figure.label}</span>
          </div>
        ))}
      </div>

      <ul className="mt-4 grid gap-2.5">
        <li className="flex gap-2.5 text-sm text-ink-secondary">
          <CircleCheck aria-hidden="true" className="mt-px size-4 shrink-0 text-success" />
          <span className="min-w-0 text-pretty">
            <Trans>Cards keep the due dates they had in {app}.</Trans>
          </span>
        </li>
        <li className="flex gap-2.5 text-sm text-ink-secondary">
          <CircleCheck aria-hidden="true" className="mt-px size-4 shrink-0 text-success" />
          <span className="min-w-0 text-pretty">
            {t`${plural(pictures, {
              one: "# card brings its picture.",
              other: "# cards bring their pictures.",
            })}`}
          </span>
        </li>
      </ul>
    </div>
  );
}
