import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { formText, timelinePlaces } from "../../lib/learn/forms";
import { playSound, usePlaying } from "../../lib/learn/player";
import { Lit } from "./Paradigm";
import { PlayButton } from "./Sound";

/** A piece of a tense's form: written with `|` before what to light, with what it is. */
export interface TimelinePiece {
  form: string;
  note: string;
}

export interface TimelineExample {
  sentence: string;
  meaning: string;
  src: string;
  /** How the verb is built, piece by piece: ole|n + söö|nud. Its words are lit in the sentence. */
  build: readonly TimelinePiece[];
}

export interface TimelinePoint {
  id: string;
  /** The tense in the reader's language: Past. */
  label: string;
  /** Its Estonian name, small under the label: täisminevik. */
  et?: string | undefined;
  /** Where it sits: 0 is now, below 0 the past, above it the future. */
  at: number;
  /** A place on the line it reaches to, drawn as a band: the perfect reaches now. */
  reach?: number | undefined;
  /** One or two sentences to hear. The first plays when the point is pressed. */
  examples: readonly TimelineExample[];
}

interface TimelineProps {
  /** What the line shows, for a screen reader: “Tenses of sööma”. */
  label: string;
  points: readonly TimelinePoint[];
  /** The line under the timeline before any point is pressed. */
  empty: { title: ReactNode; tip: ReactNode };
}

/**
 * Tenses on a line, past to future, on the stage's tray. Each point plays an example and shows how
 * its form is built. A band shows what a tense reaches to, such as the perfect reaching now. On a
 * narrow screen the line stands upright, past at the top.
 */
export function Timeline({ label, points, empty }: TimelineProps) {
  const { t } = useLingui();
  const [picked, setPicked] = useState<number | null>(null);
  const places = timelinePlaces([
    ...points.map((point) => point.at),
    ...points.flatMap((point) => (point.reach === undefined ? [] : [point.reach])),
    0,
  ]);
  const place = (at: number) => {
    const all = [...points.map((p) => p.at), ...points.flatMap((p) => p.reach ?? []), 0];
    return places[all.indexOf(at)] ?? 50;
  };
  // Upright, a band runs from its point's row to the row nearest the place it reaches.
  const rowOf = (at: number) =>
    points.reduce(
      (best, point, i) =>
        Math.abs(point.at - at) < Math.abs((points[best]?.at ?? 0) - at) ? i : best,
      0,
    );
  const press = (i: number) => {
    setPicked(i);
    const first = points[i]?.examples[0];
    if (first) void playSound(first.src);
  };
  const point = picked === null ? undefined : points[picked];

  return (
    <div className="@container grid gap-5">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{label}</legend>
        {/* Across, for a wide tray. */}
        <div className="relative hidden h-32 @xl:block">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-9 h-0.5 rounded-full bg-(--form-faint)"
          />
          <span
            aria-hidden="true"
            className="absolute top-3 grid -translate-x-1/2 justify-items-center gap-0.5 text-xs font-medium text-ink-secondary rtl:translate-x-1/2"
            style={{ insetInlineStart: `${place(0)}%` }}
          >
            {t`Now`}
            <i className="block h-4 w-0.5 rounded-full bg-ink-muted" />
          </span>
          {points.map((each, i) =>
            each.reach === undefined ? null : (
              <span
                key={each.id}
                aria-hidden="true"
                className={clsx(
                  "absolute top-[2.0625rem] h-2 rounded-full transition-colors duration-200",
                  picked === i ? "bg-(--form)" : "bg-(--form-faint)",
                )}
                style={{
                  insetInlineStart: `${Math.min(place(each.at), place(each.reach))}%`,
                  width: `${Math.abs(place(each.reach) - place(each.at))}%`,
                }}
              />
            ),
          )}
          {points.map((each, i) => (
            <PointKey
              key={each.id}
              point={each}
              pressed={picked === i}
              onPress={() => press(i)}
              className="absolute top-6 w-max max-w-28 -translate-x-1/2 justify-items-center text-center rtl:translate-x-1/2"
              style={{ insetInlineStart: `${place(each.at)}%` }}
            />
          ))}
        </div>
        {/* Upright, for a narrow one: past at the top. */}
        <div className="relative @xl:hidden">
          <span
            aria-hidden="true"
            className="absolute inset-y-7 start-[0.9375rem] w-0.5 rounded-full bg-(--form-faint)"
          />
          {points.map((each, i) => {
            if (each.reach === undefined) return null;
            const to = rowOf(each.reach);
            const top = Math.min(i, to);
            return (
              <span
                key={each.id}
                aria-hidden="true"
                className={clsx(
                  "absolute start-3 w-2 rounded-full transition-colors duration-200",
                  picked === i ? "bg-(--form)" : "bg-(--form-faint)",
                )}
                style={{
                  top: `${top * 3.5 + 1.75}rem`,
                  height: `${Math.abs(to - i) * 3.5}rem`,
                }}
              />
            );
          })}
          <ol className="relative m-0 grid list-none p-0">
            {points.map((each, i) => (
              <li key={each.id} className="h-14">
                <PointKey
                  point={each}
                  pressed={picked === i}
                  onPress={() => press(i)}
                  now={each.at === 0 ? t`Now` : undefined}
                  className="h-full w-full grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 text-start"
                  upright
                />
              </li>
            ))}
          </ol>
        </div>
      </fieldset>
      <div aria-live="polite">
        {point ? (
          <div key={point.id} className="learn-swap grid gap-5">
            {point.examples.map((example) => (
              <Example key={example.src} example={example} />
            ))}
          </div>
        ) : (
          <div className="learn-swap flex min-h-16 items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-16 shrink-0 place-items-center rounded-tile bg-plate pb-1 text-3xl font-semibold text-(--form)"
            >
              ?
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-xl font-medium">{empty.title}</span>
              <span className="text-md text-ink-secondary">{empty.tip}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function PointKey(props: {
  point: TimelinePoint;
  pressed: boolean;
  onPress: () => void;
  className: string;
  style?: React.CSSProperties;
  upright?: boolean;
  now?: string | undefined;
}) {
  const { point, pressed, onPress, className, style, upright, now } = props;
  const playing = usePlaying(point.examples[0]?.src ?? "");
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      style={style}
      className={clsx(
        "group grid cursor-pointer gap-1.5 rounded-tile p-1 focus-visible:outline-2 focus-visible:outline-(--ring)",
        className,
      )}
    >
      <span className="grid place-items-center" aria-hidden="true">
        <span
          className={clsx(
            "grid size-6 place-items-center rounded-full border-2 border-(--form) transition-[background-color,scale] duration-150 group-active:scale-90",
            pressed || playing ? "bg-(--form)" : "bg-plate hoverable:group-hover:bg-(--form-soft)",
            playing && "learn-ring relative",
          )}
        >
          {pressed && <i className="size-2 rounded-full bg-plate" />}
        </span>
      </span>
      <span className={clsx("grid min-w-0 leading-tight", upright && "gap-0.5")}>
        <span
          className={clsx(
            "text-sm font-medium text-balance",
            pressed ? "text-(--form)" : "text-ink",
            upright && "flex items-center gap-2 text-md",
          )}
        >
          {point.label}
          {now && (
            <span className="rounded-full bg-plate px-2 py-0.5 text-xs font-medium text-ink-secondary">
              {now}
            </span>
          )}
        </span>
        {point.et && (
          <small lang="et" className="text-xs text-ink-muted">
            {point.et}
          </small>
        )}
      </span>
    </button>
  );
}

function Example({ example }: { example: TimelineExample }) {
  const built = new Set(example.build.map((piece) => formText(piece.form).toLowerCase()));
  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3">
        <PlayButton
          src={example.src}
          label={
            <Trans>
              Play <span lang="et">{example.sentence}</span>
            </Trans>
          }
          className="mt-0.5"
        />
        <p className="grid min-w-0 gap-0.5">
          <span
            lang="et"
            className="text-2xl/tight font-semibold tracking-tight max-sm:text-xl/tight"
          >
            {example.sentence.split(" ").map((word, i) => {
              const bare = word.replace(/[.,!?]/g, "").toLowerCase();
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: a sentence's words never reorder
                <span key={i}>
                  {i > 0 && " "}
                  <span className={built.has(bare) ? "text-(--form)" : undefined}>{word}</span>
                </span>
              );
            })}
          </span>
          <span className="text-md text-ink-secondary">{example.meaning}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 ps-12 max-sm:ps-0">
        {example.build.map((piece, i) => (
          <span key={piece.form} className="flex items-center gap-2">
            {i > 0 && <Plus aria-hidden="true" className="size-4 text-ink-muted" />}
            <span className="grid rounded-tile bg-plate px-3 pt-1.5 pb-2 ring-1 ring-edge">
              <b lang="et" className="text-lg font-semibold tracking-tight">
                <Lit form={piece.form} />
              </b>
              <small className="text-xs text-ink-secondary">{piece.note}</small>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
