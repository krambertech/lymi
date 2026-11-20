import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type ReactNode, useEffect, useState } from "react";
import { loudness, playSound, usePlaying } from "../../lib/learn/player";
import { Playing, PlayMark } from "./Sound";

/** The stage's tray, where anything to play with sits. Nothing on it is marked right or wrong. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx("grid gap-4 rounded-xl bg-(--tray) p-5 max-sm:-mx-1 max-sm:p-4", className)}
    >
      {children}
    </div>
  );
}

export interface KeyItem {
  label: string;
  /** A word under the key, the example it plays. */
  sub?: string | undefined;
  src: string;
  /** A key for something new to the learner, in the stage's hue with a dot. */
  accent?: boolean | undefined;
  /** What the line under the keys says once this key is pressed. */
  detail?: { title: ReactNode; tip: ReactNode } | undefined;
  /** For a screen reader: “õ, as in õun”. */
  label2?: string | undefined;
}

interface KeysProps {
  label: string;
  items: readonly KeyItem[];
  /** Columns on a wide screen and on a phone. */
  columns: number;
  phoneColumns: number;
  /** The detail line before any key is pressed. */
  empty?: { title: ReactNode; tip: ReactNode } | undefined;
}

/** A row of sounds to press, like a small keyboard, with an optional line explaining the last one. */
export function Keys({ label, items, columns, phoneColumns, empty }: KeysProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const detail = picked === null ? empty : items[picked]?.detail;
  const big = picked === null ? "?" : items[picked]?.label;
  return (
    <div className="grid gap-4">
      <fieldset
        className="m-0 grid min-w-0 grid-cols-(--phone) gap-1.5 border-0 p-0 sm:grid-cols-(--wide)"
        style={
          {
            "--wide": `repeat(${columns}, minmax(0, 1fr))`,
            "--phone": `repeat(${phoneColumns}, minmax(0, 1fr))`,
          } as React.CSSProperties
        }
      >
        <legend className="sr-only">{label}</legend>
        {items.map((item, i) => (
          <Key
            key={item.label}
            item={item}
            pressed={items.some((each) => each.detail) ? picked === i : undefined}
            onPress={() => setPicked(i)}
          />
        ))}
      </fieldset>
      {/* The live region stays put; only what is inside it is swapped. */}
      <div aria-live="polite" hidden={!detail}>
        {detail && (
          <div key={picked ?? "empty"} className="learn-swap flex min-h-16 items-center gap-4">
            {/* The letter sits in a tile of its own, so its size never has to line up with the text. */}
            <span
              lang="et"
              aria-hidden={picked === null}
              className="grid size-16 shrink-0 place-items-center rounded-tile bg-plate pb-1 text-4xl font-semibold text-(--form)"
            >
              {big}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-xl font-medium">{detail.title}</span>
              <span className="text-md text-ink-secondary">{detail.tip}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Key({
  item,
  pressed,
  onPress,
}: {
  item: KeyItem;
  pressed: boolean | undefined;
  onPress: () => void;
}) {
  const playing = usePlaying(item.src);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={item.label2}
      data-playing={playing ? "" : undefined}
      onClick={() => {
        onPress();
        void playSound(item.src);
      }}
      className="learn-key relative grid cursor-pointer justify-items-center gap-0.5 rounded-tile bg-plate px-0.5 pt-3 pb-2.5 hoverable:hover:bg-plate-hover"
    >
      <b
        lang="et"
        className={clsx("text-3xl/none font-semibold tabular-nums", item.accent && "text-(--form)")}
      >
        {item.label}
      </b>
      <span className="grid h-4 place-items-center">
        {playing ? (
          <Playing className="h-3 text-(--form)" />
        ) : item.sub ? (
          <small lang="et" className="text-xs text-ink-muted">
            {item.sub}
          </small>
        ) : null}
      </span>
      {item.accent && !playing && (
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-(--form)"
        />
      )}
    </button>
  );
}

interface ChipsProps<V extends string | number> {
  label: string;
  items: readonly { label: ReactNode; value: V; lang?: string }[];
  value: V | null;
  onPick: (value: V) => void;
}

/** Pick one of a few. The chosen chip fills with the stage's hue. */
export function Chips<V extends string | number>({ label, items, value, onPick }: ChipsProps<V>) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          lang={item.lang}
          aria-pressed={value === item.value}
          onClick={() => onPick(item.value)}
          className={clsx(
            "cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium tabular-nums transition-colors duration-150",
            value === item.value
              ? "bg-(--form) text-plate"
              : "bg-plate text-ink ring-1 ring-edge-strong hoverable:hover:bg-plate-hover",
          )}
        >
          {item.label}
        </button>
      ))}
    </fieldset>
  );
}

export interface RowItem {
  /** A short first column, such as a numeral. */
  lead?: ReactNode;
  main: ReactNode;
  sub?: ReactNode;
  /** No clip means a row to read, not to play. */
  src: string | null;
  label: string;
}

/** A list of things to hear on one white plate. A tap anywhere on a row plays it. */
export function ListenRows({
  items,
  lead,
  bare,
}: {
  items: readonly RowItem[];
  lead?: string;
  /** Inside another surface, such as an open disclosure: no plate of its own. */
  bare?: boolean | undefined;
}) {
  return (
    <ul
      className={clsx(
        "m-0 list-none p-0",
        !bare && "overflow-hidden rounded-lg bg-plate ring-1 ring-edge",
      )}
    >
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a lesson's list never reorders
        <Row key={i} item={item} lead={lead} />
      ))}
    </ul>
  );
}

function Row({ item, lead }: { item: RowItem; lead: string | undefined }) {
  const { i18n } = useLingui();
  const playing = usePlaying(item.src ?? "");
  const body = (
    <>
      {lead && <span className="text-xl font-semibold tabular-nums">{item.lead}</span>}
      <span lang="et" className="min-w-0 text-xl font-medium tracking-tight max-sm:text-lg">
        {item.main}
        {item.sub && (
          <span
            lang={i18n.locale}
            className="block text-sm font-normal tracking-normal text-ink-muted"
          >
            {item.sub}
          </span>
        )}
      </span>
      {item.src && <PlayMark playing={playing} />}
    </>
  );
  const grid = { gridTemplateColumns: lead ? `${lead} minmax(0,1fr) auto` : "minmax(0,1fr) auto" };
  return (
    <li className="border-b border-edge last:border-b-0">
      {item.src ? (
        <button
          type="button"
          aria-label={item.label}
          onClick={() => void playSound(item.src as string)}
          style={grid}
          className="grid w-full cursor-pointer items-center gap-x-3.5 py-3 ps-4 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover"
        >
          {body}
        </button>
      ) : (
        <div style={grid} className="grid items-center gap-x-3.5 py-3 ps-4 pe-3">
          {body}
        </div>
      )}
    </li>
  );
}

interface CompareProps {
  pairs: readonly (readonly [string, string])[];
  src: (word: string) => string;
  meaning: (word: string) => string;
  /** The long word with its doubled letters marked. */
  mark: (short: string, long: string) => ReactNode;
}

/** Two words drawn as bars on one time scale, so the longer one takes more room. */
export function Compare({ pairs, src, meaning, mark }: CompareProps) {
  const { t } = useLingui();
  const [pair, setPair] = useState(pairs[0] as readonly [string, string]);
  return (
    <div className="grid gap-3">
      <Chips
        label={t`Word pairs`}
        items={pairs.map(([a, b]) => ({ label: `${a} · ${b}`, value: a, lang: "et" }))}
        value={pair[0]}
        onPick={(value) => {
          const next = pairs.find(([a]) => a === value);
          if (next) {
            setPair(next);
            void playSound(src(next[0]), `compare:${next[0]}`);
          }
        }}
      />
      <CompareRows key={pair[0]} pair={pair} src={src} meaning={meaning} mark={mark} />
    </div>
  );
}

type Loud = Awaited<ReturnType<typeof loudness>>;

function CompareRows({
  pair,
  src,
  meaning,
  mark,
}: { pair: readonly [string, string] } & Omit<CompareProps, "pairs">) {
  const [clips, setClips] = useState<readonly [Loud, Loud] | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loudness(src(pair[0])), loudness(src(pair[1]))])
      .then(([a, b]) => live && setClips([a, b]))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pair, src]);
  const longest = clips ? Math.max(clips[0].seconds, clips[1].seconds) * 1.12 : 1;
  return (
    <div className="grid">
      {pair.map((word, i) => (
        <CompareRow
          key={word}
          word={word}
          src={src(word)}
          meaning={meaning(word)}
          shown={i === 1 ? mark(pair[0], word) : word}
          clip={clips?.[i] ?? null}
          share={clips?.[i] ? (clips[i].seconds / longest) * 82 : 0}
        />
      ))}
    </div>
  );
}

function CompareRow(props: {
  word: string;
  src: string;
  meaning: string;
  shown: ReactNode;
  clip: Loud | null;
  share: number;
}) {
  const { word, src, meaning, shown, clip, share } = props;
  const { t, i18n } = useLingui();
  const key = `compare:${word}`;
  const playing = usePlaying(key);
  const [lit, setLit] = useState(0);
  const seconds = clip
    ? i18n.number(clip.seconds, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    : "";
  return (
    <div className="grid grid-cols-[36px_92px_minmax(0,1fr)] items-center gap-3 py-2.5 not-first:border-t not-first:border-(--form-faint) max-sm:grid-cols-[36px_74px_minmax(0,1fr)]">
      <button
        type="button"
        aria-label={t`Play ${word}`}
        onClick={() => {
          if (!clip) return void playSound(src, key);
          void playSound(src, key, (time) =>
            setLit(Math.min(1, Math.max(0, (time - clip.lead) / clip.seconds))),
          ).then(() => {
            setLit(1);
            setTimeout(() => setLit(0), 900);
          });
        }}
        className={clsx(
          "relative grid size-9 cursor-pointer place-items-center rounded-full transition-colors duration-150",
          playing
            ? "learn-ring bg-(--form) text-plate"
            : "edge-lift bg-plate text-ink hoverable:hover:bg-plate-hover",
        )}
      >
        {playing ? <Playing /> : <PlayMarkTriangle />}
      </button>
      <span lang="et" className="text-2xl/tight font-semibold tracking-tight max-sm:text-xl">
        {shown}
        <small
          lang={i18n.locale}
          className="block text-sm font-normal tracking-normal text-ink-secondary"
        >
          {meaning}
        </small>
      </span>
      <span className="relative h-11">
        <span
          className="learn-bars absolute inset-y-0 start-0 flex items-center gap-0.5 overflow-hidden transition-[width] duration-500"
          style={{ width: `${share}%` }}
          aria-hidden="true"
        >
          {clip?.bars.map((level, i) => (
            <i
              // biome-ignore lint/suspicious/noArrayIndexKey: a bar's place in the clip is its identity
              key={i}
              style={{ height: `${Math.max(10, Math.round(level * 100))}%` }}
              data-lit={(i + 0.5) / clip.bars.length <= lit ? "" : undefined}
            />
          ))}
        </span>
        {clip && (
          <span
            className="absolute top-1/2 -translate-y-1/2 ps-2 text-sm whitespace-nowrap text-ink-secondary tabular-nums transition-[inset-inline-start] duration-500"
            style={{ insetInlineStart: `${share}%` }}
          >
            {t`${seconds} s`}
          </span>
        )}
      </span>
    </div>
  );
}

function PlayMarkTriangle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 fill-current">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}
