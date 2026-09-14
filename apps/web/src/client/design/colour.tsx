import { useLayoutEffect, useRef, useState } from "react";
import { contrast } from "./contrast";
import { Doc, Sub } from "./frame";

interface Token {
  name: string;
  role: string;
  /** Measure this token as the foreground on the named background. */
  on?: string;
  /** Measure the named foreground on this token as the background. */
  ink?: string;
  /** Graphics need 3:1 rather than 4.5:1; decorative tokens need nothing. */
  kind?: "graphic" | "decorative";
}

const TOKENS: Token[] = [
  { name: "canvas", role: "The room. Page background." },
  { name: "rail", role: "The navigation rail: one surface off the room, so chrome reads apart." },
  { name: "plate", role: "A thing in the room: cards, rows, inputs, the active nav item." },
  { name: "plate-2", role: "A well inside a plate: segmented tracks, chips, kbd." },
  { name: "hover", role: "Plate on hover." },
  { name: "edge", role: "The one hairline. Alpha, so it sits on any plate." },
  { name: "edge-2", role: "Stronger hairline: focused or hovered edges, dividers that must read." },
  {
    name: "text",
    role: "Words. Also the metal of the lantern in the light room.",
    on: "canvas",
  },
  { name: "text-2", role: "Secondary words: meanings, examples, nav.", on: "canvas" },
  { name: "muted", role: "Labels, counts, hints. Still 4.5:1 on canvas.", on: "canvas" },
  {
    name: "faint",
    role: "Decorative only: dashes, unlit day letters. Never for words.",
    on: "canvas",
    kind: "decorative",
  },
  {
    name: "amber",
    role: "The flame, the primary action and the capture button.",
    ink: "amber-ink",
  },
  { name: "amber-hover", role: "Amber under the pointer.", ink: "amber-ink" },
  { name: "amber-ink", role: "Words and icons on amber." },
  {
    name: "amber-text",
    role: "Amber that has to hold contrast: the Easy grade, the streak tick, unread dots.",
    on: "canvas",
  },
  { name: "amber-tint", role: "Behind a due count." },
  { name: "amber-tint-ink", role: "The number on a due count." },
  { name: "amber-soft", role: "Text selection." },
  {
    name: "toast-action",
    role: "Undo on the toast. The toast is the text colour, so this is the amber that reads on it.",
    on: "text",
  },
  { name: "good", role: "Success and a 2xx. Always with a word or an icon.", on: "canvas" },
  { name: "good-soft", role: "Tint behind success notices." },
  {
    name: "state-new",
    role: "New: its icon and bar segment. Never words.",
    on: "canvas",
    kind: "graphic",
  },
  {
    name: "state-learning",
    role: "Learning: its icon and bar segment. Blue, well away from amber, danger and good.",
    on: "canvas",
    kind: "graphic",
  },
  {
    name: "state-learning-soft",
    role: "Tint behind a Learning tag in the site’s scheduling figures.",
  },
  {
    name: "state-learning-text",
    role: "Words and marks on that tint in the site’s scheduling figures.",
    on: "canvas",
  },
  {
    name: "state-known",
    role: "Known: its icon and bar segment. Lighter than good by day; good at night.",
    on: "canvas",
    kind: "graphic",
  },
  {
    name: "danger",
    role: "Destructive actions and errors. Always with an icon or a word.",
    on: "canvas",
  },
  { name: "danger-soft", role: "The danger button at rest, and error tints." },
  {
    name: "ring",
    role: "The focus outline on every control. Neutral, never amber.",
    on: "canvas",
    kind: "graphic",
  },
  { name: "scrim", role: "Behind a modal or a drawer." },
  { name: "shimmer", role: "The sweep across a loading skeleton." },
];

function verdict(ratio: number, kind: Token["kind"]): string {
  if (kind === "decorative") return " · decorative";
  if (kind === "graphic") return ratio >= 3 ? " · non-text" : " · fails";
  return ratio >= 4.5 ? "" : ratio >= 3 ? " · large only" : " · fails";
}

function Swatch({ name, on, ink, kind }: Token) {
  const ref = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const bg = on ? `var(--${on})` : `var(--${name})`;
  const fg = on ? `var(--${name})` : ink ? `var(--${ink})` : undefined;
  useLayoutEffect(() => {
    if (!fg) return;
    setRatio(contrast(fg, bg, ref.current));
  }, [fg, bg]);
  return (
    <div ref={ref} className="grid gap-1.5">
      <div
        className="edge flex h-14 items-end rounded-sm px-2 pb-1.5 text-2xs font-semibold tabular-nums"
        style={{ background: bg, color: fg }}
      >
        {ratio && (
          <span title="Contrast ratio">
            {ratio.toFixed(1)}:1
            {verdict(ratio, kind)}
          </span>
        )}
      </div>
      <code className="text-2xs text-muted">--{name}</code>
    </div>
  );
}

export function Colour() {
  return (
    <Doc
      title="Colour"
      lede="Two rooms, one flame. Neutrals are warm and nearly grey. Amber is the only saturated colour and appears at most twice per screen. Surfaces are flat: no gradients, no drop shadows, one hairline edge. Ratios are measured live against this page."
    >
      <Sub title="Two rooms">
        <div className="grid gap-3 @3xl:grid-cols-2">
          {(["light", "dark"] as const).map((t) => (
            <div
              key={t}
              data-theme={t}
              className="@container edge rounded-lg bg-canvas p-5 text-text"
            >
              <h3 className="mb-4 text-sm font-medium">
                {t === "light" ? "Light room" : "Dark room"}
              </h3>
              <div className="grid grid-cols-3 gap-3 @xl:grid-cols-5">
                {TOKENS.map((tk) => (
                  <Swatch key={tk.name} {...tk} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sub>

      <Sub title="Roles">
        <dl className="grid gap-x-8 gap-y-2 text-base @3xl:grid-cols-2">
          {TOKENS.map((t) => (
            <div key={t.name} className="flex gap-3 border-b border-edge py-2">
              <dt className="w-28 shrink-0">
                <code className="text-sm text-text-2">--{t.name}</code>
              </dt>
              <dd className="text-text-2">{t.role}</dd>
            </div>
          ))}
        </dl>
      </Sub>

      <Sub title="Rules">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Amber twice per screen at most: the flame and the primary action. A due count, ink on amber-tint, is the third allowed use.",
            "Status is never colour alone. New, Learning and Known carry a label and their icon.",
            "Depth is one edge. Cards, inputs and rows get --edge; on hover or focus it becomes --edge-2. Nothing casts a shadow.",
            "No gradient on any surface. The app icon is the one exception. If something needs to feel lit, it is the lantern, and it uses --glow.",
            "Text on canvas meets 4.5:1 in both rooms, including --muted. --faint is decorative and never carries words.",
            "Dark is not inverted light. The plate is lighter than the canvas in both rooms, so a card always comes forward.",
          ].map((t) => (
            <li key={t} className="edge rounded-md bg-plate px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      </Sub>
    </Doc>
  );
}
