import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "../components/button";
import { StateChip } from "../components/chip";
import { contrast } from "./contrast";
import { Rule, Rules } from "./do-dont";
import { Doc, Sub } from "./frame";
import { ChipLike, Snippet } from "./specimen-parts";

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
  { name: "plate-nested", role: "A well inside a plate: segmented tracks, chips, kbd." },
  { name: "plate-hover", role: "Plate on hover." },
  { name: "edge", role: "The one hairline. Alpha, so it sits on any plate." },
  {
    name: "edge-strong",
    role: "Stronger hairline: focused or hovered edges, dividers that must read.",
  },
  {
    name: "image-edge",
    role: "A photo's edge, inside its bounds: untinted black by day, white at night.",
  },
  {
    name: "ink",
    role: "Words. Also the metal of the lantern in the light room.",
    on: "canvas",
  },
  { name: "ink-secondary", role: "Secondary words: meanings, examples, nav.", on: "canvas" },
  { name: "ink-muted", role: "Labels, counts, hints. Still 4.5:1 on canvas.", on: "canvas" },
  {
    name: "ink-faint",
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
    role: "Amber words that have to hold 4.5:1. Brown by day, so never for an icon.",
    on: "canvas",
  },
  {
    name: "amber-mark",
    role: "Amber icons beside a word: the Easy grade, the streak tick. Amber itself at night.",
    on: "plate-nested",
    kind: "graphic",
  },
  { name: "amber-tint", role: "Behind a due count." },
  { name: "amber-tint-ink", role: "The number on a due count." },
  { name: "amber-soft", role: "Text selection." },
  {
    name: "toast-action",
    role: "Undo on the toast. The toast is ink, so this is the amber that reads on it.",
    on: "ink",
  },
  { name: "success", role: "Success and a 2xx. Always with a word or an icon.", on: "canvas" },
  { name: "success-soft", role: "Tint behind success notices." },
  {
    name: "state-new",
    role: "New: its icon and bar segment. Never words.",
    on: "canvas",
    kind: "graphic",
  },
  {
    name: "state-learning",
    role: "Learning: its icon and bar segment. Blue, well away from amber, danger and success.",
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
    role: "Known: its icon and bar segment. Lighter than success by day; success at night.",
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
    name: "ai",
    role: "What the AI wrote. The badge only, and only the AI carries one.",
    on: "canvas",
  },
  { name: "ai-soft", role: "The source badge's ground." },
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
      <code className="text-2xs text-ink-muted">--{name}</code>
    </div>
  );
}

export function Colour() {
  return (
    <Doc
      title="Colour"
      lede="Warm greys for surfaces, and amber for the main action and a few states. Card states, errors, success and AI each have their own colour. Dark mode has its own colours, not inverted ones. The contrast ratios below are measured live."
    >
      <Sub title="Both themes">
        <div className="grid gap-3 @3xl:grid-cols-2">
          {(["light", "dark"] as const).map((t) => (
            <div
              key={t}
              data-theme={t}
              className="@container edge rounded-lg bg-canvas p-5 text-ink"
            >
              <h3 className="mb-4 text-sm font-medium">{t === "light" ? "Light" : "Dark"}</h3>
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
        <dl className="grid text-base">
          {TOKENS.map((t) => (
            <div
              key={t.name}
              className="grid gap-1 border-b border-edge py-2.5 @xl:grid-cols-[11rem_minmax(0,1fr)] @xl:gap-4"
            >
              <dt>
                <code className="text-sm text-ink-secondary">--{t.name}</code>
              </dt>
              <dd className="text-ink-secondary">{t.role}</dd>
            </div>
          ))}
        </dl>
      </Sub>

      <Sub title="Do and don’t" note="colour.md lists every place amber is allowed.">
        <Rules>
          <Rule kind="do" title="Use one amber button per screen.">
            <Button variant="primary">Review 11 due</Button>
            <Button>Add a card</Button>
          </Rule>
          <Rule
            kind="dont"
            title="Use two amber buttons."
            note="People can’t tell which one matters. Make the second one a normal button."
          >
            <Button variant="primary">Review 11 due</Button>
            <Button variant="primary">Add a card</Button>
          </Rule>
          <Rule kind="do" title="Show a selected chip in dark ink.">
            <ChipLike selected>Learning</ChipLike>
            <ChipLike>Known</ChipLike>
            <ChipLike>New</ChipLike>
          </Rule>
          <Rule
            kind="dont"
            title="Make a selected chip amber."
            note="Amber means act. Selected is not an action."
          >
            <ChipLike amber>Learning</ChipLike>
            <ChipLike>Known</ChipLike>
            <ChipLike>New</ChipLike>
          </Rule>
          <Rule kind="do" title="Show a card state with an icon and a word.">
            <StateChip state={0} />
            <StateChip state={1} />
            <StateChip state={2} />
          </Rule>
          <Rule
            kind="dont"
            title="Show a card state with colour only."
            note="Some people can’t see the difference, and screen readers can’t read a colour."
          >
            {["bg-state-new", "bg-state-learning", "bg-state-known"].map((c) => (
              <span key={c} className={`size-3 rounded-full ${c}`} />
            ))}
          </Rule>
          <Rule kind="do" title="Use a colour token." className="justify-start">
            <Snippet>{'<p className="text-ink-muted">'}</Snippet>
          </Rule>
          <Rule
            kind="dont"
            title="Use a hex value or a Tailwind colour."
            note="It breaks in dark mode. pnpm check:styling catches it."
            className="justify-start"
          >
            {/* check-styling: allow: the mistake this don't shows, as text. */}
            <Snippet>{'<p className="text-[#72665f]">'}</Snippet>
          </Rule>
        </Rules>
      </Sub>
    </Doc>
  );
}
