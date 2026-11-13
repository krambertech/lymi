import { clsx } from "clsx";
import { Hash, Moon, Rabbit, Sun, Turtle } from "lucide-react";
import { MotionConfig } from "motion/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { IconButton } from "../components/button";
import { Segmented } from "../components/segmented";
import { PortalContainer } from "../components/ui/portal-container";
import { EditLink, GuideLink } from "./edit-link";
import { useSystemReducedMotion } from "./forced-states";
import type { IconOption } from "./icon-toggle";

export type FrameTheme = "light" | "dark";

/** Theme toggle for one frame. Small, sits above the frame’s caption. */
export function useFrameTheme(initial: FrameTheme) {
  const [theme, setTheme] = useState<FrameTheme>(initial);
  const toggle = (
    <Segmented
      size="sm"
      label="Frame theme"
      value={theme}
      onValueChange={setTheme}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
  return { theme, toggle };
}

/** A phone. 390 wide, its own container so the views lay out for a phone regardless of the page. */
export function Phone({
  theme,
  children,
  bottom,
  className,
}: {
  theme: FrameTheme;
  children: ReactNode;
  /** Pinned to the bottom edge, e.g. the tab bar or a grade bar. */
  bottom?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      data-theme={theme}
      className={clsx(
        // Paint containment holds fixed children too, so the end of a review lights this screen, not the page.
        "@container/shell edge-strong relative mx-auto flex h-[800px] w-full max-w-[390px] flex-col overflow-hidden rounded-[44px] bg-canvas text-ink contain-paint",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-end justify-between px-8 pb-1 text-xs font-semibold tabular-nums">
        <span>21:14</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <i className="block h-2.5 w-4 rounded-[2px] bg-current opacity-80" />
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {bottom}
      <div className="flex h-6 shrink-0 items-center justify-center">
        <i className="block h-[5px] w-[120px] rounded-full bg-edge-strong" aria-hidden="true" />
      </div>
    </div>
  );
}

/** A desktop window, laid out at 1100 px and scaled to fit its column. */
export function Desktop({
  theme,
  children,
  className,
  height = 640,
}: {
  theme: FrameTheme;
  children: ReactNode;
  className?: string | undefined;
  height?: number | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const W = 1100;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setScale(Math.min(1, e.contentRect.width / W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={clsx("relative w-full overflow-hidden", className)}
      style={{ height: height * scale }}
    >
      <div
        data-theme={theme}
        // check-styling: allow: scaled from the top-left corner, as the measured width is.
        className="@container/shell edge-strong absolute left-0 top-0 flex origin-top-left overflow-hidden rounded-xl bg-canvas text-ink"
        style={{ width: W, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** The file behind the page being rendered, for its edit link. Set by the page, read by `Doc`. */
export const DocSource = createContext<string | undefined>(undefined);

/** The design guide that owns a page's rules, under `docs/design/system`. Set by the page, read by `Doc`. */
export const DocGuide = createContext<string | undefined>(undefined);

/** A section's address, from its title: "Card and grades" is `card-and-grades`. */
export function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

/** One page of the design system: its title, what it is for, and its parts. */
export function Doc({
  title,
  lede,
  crumb,
  children,
}: {
  title: string;
  lede?: ReactNode | undefined;
  /** The part of the system the page belongs to. */
  crumb?: ReactNode | undefined;
  children: ReactNode;
}) {
  const source = useContext(DocSource);
  const guide = useContext(DocGuide);
  return (
    <article>
      <header className="pb-12">
        {crumb && <div className="mb-2 text-sm text-ink-muted">{crumb}</div>}
        <h1 className="text-3xl font-medium tracking-[-0.02em] text-balance">{title}</h1>
        {lede && <p className="mt-3 max-w-[64ch] text-md text-pretty text-ink-secondary">{lede}</p>}
        {(guide || source) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            {guide && <GuideLink path={guide} />}
            {source && <EditLink path={source} label="Code" />}
          </div>
        )}
      </header>
      <div className="grid">{children}</div>
    </article>
  );
}

export function Sub({
  id,
  title,
  note,
  source,
  children,
}: {
  /** The section's address; a string title gives one of its own. */
  id?: string | undefined;
  title?: ReactNode | undefined;
  note?: ReactNode | undefined;
  /** The component's file, for its edit link. */
  source?: string | undefined;
  /** Left out for a rule that needs no picture. */
  children?: ReactNode | undefined;
}) {
  const anchor = id ?? (typeof title === "string" ? slug(title) : undefined);
  return (
    <section id={anchor} className="grid scroll-mt-8 gap-5 pt-14 first:pt-0">
      {(title || note) && (
        <div className="grid gap-1.5">
          {title && (
            <div className="group/heading flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-medium">
                {title}
                {anchor && (
                  <a
                    href={`#${anchor}`}
                    aria-label={
                      typeof title === "string" ? `Link to ${title}` : "Link to this section"
                    }
                    className="grid size-7 place-items-center rounded-sm text-ink-muted opacity-0 transition-opacity duration-150 hoverable:group-hover/heading:opacity-100 focus-visible:opacity-100 hoverable:hover:text-ink"
                  >
                    <Hash aria-hidden="true" className="size-4" />
                  </a>
                )}
              </h2>
              {source && <EditLink path={source} />}
            </div>
          )}
          {note && <p className="max-w-[68ch] text-base text-pretty text-ink-muted">{note}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A plate to show a component on. */
export function Specimen({
  children,
  className,
  label,
  layout = "row",
}: {
  children: ReactNode;
  className?: string | undefined;
  label?: string | undefined;
  layout?: "row" | "grid" | "block" | undefined;
}) {
  return (
    <div className="grid gap-2">
      <div
        className={clsx(
          "edge rounded-lg bg-plate p-5",
          layout === "row" && "flex flex-wrap items-center gap-3",
          layout === "grid" && "grid gap-4",
          className,
        )}
      >
        {children}
      </div>
      {label && <p className="px-1 text-xs text-ink-muted">{label}</p>}
    </div>
  );
}

/** The same thing in both rooms, side by side. */
export function Pair({
  children,
  stack,
}: {
  children: (theme: FrameTheme) => ReactNode;
  stack?: boolean | undefined;
}) {
  return (
    <div className={clsx("grid gap-3", !stack && "@3xl:grid-cols-2")}>
      {(["light", "dark"] as const).map((t) => (
        <div
          key={t}
          data-theme={t}
          className="@container edge min-w-0 rounded-lg bg-canvas p-5 text-ink"
        >
          {children(t)}
        </div>
      ))}
    </div>
  );
}

export interface Variant {
  label: string;
  /** What this state is for, in one sentence. */
  note?: ReactNode | undefined;
  render: (theme: FrameTheme) => ReactNode;
}

function subscribeRoot(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The room the page is in right now. */
export function usePageTheme(): FrameTheme {
  return useSyncExternalStore(
    subscribeRoot,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}

/**
 * A component's states, one labelled row each, on one canvas. The canvas follows the page's
 * room until its own switch picks one. `stack` puts each state under its label, for things too
 * wide to share a row with it.
 */
export function Variants({ items, stack }: { items: Variant[]; stack?: boolean | undefined }) {
  const page = usePageTheme();
  const [picked, setPicked] = useState<FrameTheme | null>(null);
  const theme = picked ?? page;
  const systemReduced = useSystemReducedMotion();
  const [pickedReduced, setPickedReduced] = useState<boolean | null>(null);
  const reduced = pickedReduced ?? systemReduced;
  // Overlays render into this layer, so an opened menu or drawer keeps the canvas's theme and motion.
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div
        data-theme={theme}
        data-motion={reduced ? "reduce" : undefined}
        className="edge relative overflow-hidden rounded-lg bg-canvas text-ink"
      >
        <PortalContainer.Provider value={layer}>
          <MotionConfig reducedMotion={reduced ? "always" : "user"}>
            {/* Reduced motion reaches what renders inside the canvas and its frames, and the layer carries it to overlays. */}
            <div className="absolute end-3 top-3 z-10 flex gap-1">
              <CanvasSwitch
                label="Reduce motion"
                pressed={reduced}
                onPressedChange={(next) => setPickedReduced(next === systemReduced ? null : next)}
              >
                {reduced ? <Turtle /> : <Rabbit />}
              </CanvasSwitch>
              <CanvasSwitch
                label="Dark theme"
                pressed={theme === "dark"}
                onPressedChange={(dark) => {
                  const next = dark ? "dark" : "light";
                  setPicked(next === page ? null : next);
                }}
              >
                {theme === "dark" ? <Moon /> : <Sun />}
              </CanvasSwitch>
            </div>
            {items.map((v, i) => (
              <div
                key={v.label}
                className={clsx(
                  "grid",
                  i > 0 && "border-t border-edge",
                  !stack && "@3xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]",
                )}
              >
                <div
                  className={clsx(
                    // Annotations are set in mono so a note about a component never reads as part of it.
                    "grid content-start gap-1.5 px-5 pt-4 font-mono text-xs",
                    stack ? "pb-1" : "pb-1 @3xl:border-e @3xl:border-edge @3xl:py-5",
                    // The first label shares its corner with the canvas switches.
                    i === 0 && (stack ? "pe-24" : "pe-24 @3xl:pe-5"),
                  )}
                >
                  <p className="font-semibold text-ink">{v.label}</p>
                  {v.note && (
                    <p className="max-w-[80ch] leading-relaxed text-pretty text-ink-muted">
                      {v.note}
                    </p>
                  )}
                </div>
                <div
                  className={clsx(
                    "@container flex min-w-0 flex-wrap items-center gap-3 p-5",
                    !stack && "@3xl:pe-24",
                  )}
                >
                  {v.render(theme)}
                </div>
              </div>
            ))}
          </MotionConfig>
        </PortalContainer.Provider>
      </div>
      {/* Outside the canvas, whose overflow would clip an anchored popup. */}
      <div
        ref={setLayer}
        data-theme={theme}
        data-motion={reduced ? "reduce" : undefined}
        className="contents"
      />
    </>
  );
}

/** An on or off setting for one canvas. The icon shows the state it is in; the label names the setting. */
function CanvasSwitch({
  label,
  pressed,
  onPressedChange,
  children,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      label={label}
      size="sm"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
    >
      {children}
    </IconButton>
  );
}

export const ROOM_THEMES: IconOption<FrameTheme>[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];
