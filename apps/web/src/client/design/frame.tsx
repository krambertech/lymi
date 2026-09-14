import { clsx } from "clsx";
import { Moon, Sun } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Segmented } from "../components/segmented";
import { EditLink } from "./edit-link";
import { type IconOption, IconToggle } from "./icon-toggle";

export type FrameTheme = "light" | "dark";

/** Theme toggle for one frame. Small, sits above the frame’s caption. */
export function useFrameTheme(initial: FrameTheme) {
  const [theme, setTheme] = useState<FrameTheme>(initial);
  const toggle = (
    <Segmented
      size="sm"
      label="Frame theme"
      value={theme}
      onChange={setTheme}
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
        "@container edge-2 relative mx-auto flex h-[800px] w-full max-w-[390px] flex-col overflow-hidden rounded-[44px] bg-canvas text-text",
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
        <i className="block h-[5px] w-[120px] rounded-full bg-edge-2" aria-hidden="true" />
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
        className="@container/shell edge-2 absolute left-0 top-0 flex origin-top-left overflow-hidden rounded-xl bg-canvas text-text"
        style={{ width: W, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** The file behind the page being rendered, for its edit link. Set by the page, read by `Doc`. */
export const DocSource = createContext<string | undefined>(undefined);

/** One page of the design system: its title, what it is for, and its parts. */
export function Doc({
  title,
  lede,
  crumb,
  children,
}: {
  title: string;
  lede?: ReactNode | undefined;
  /** A link back to the page this one belongs to. */
  crumb?: ReactNode | undefined;
  children: ReactNode;
}) {
  const source = useContext(DocSource);
  return (
    <article>
      <header className="pb-12">
        {crumb && <div className="mb-2 text-sm text-muted">{crumb}</div>}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-medium text-balance">{title}</h1>
          {source && <EditLink path={source} />}
        </div>
        {lede && <p className="mt-3 max-w-[64ch] text-md text-pretty text-text-2">{lede}</p>}
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
  id?: string | undefined;
  title?: ReactNode | undefined;
  note?: ReactNode | undefined;
  /** The component's file, for its edit link. */
  source?: string | undefined;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid scroll-mt-20 gap-5 border-t border-edge py-10 first:border-t-0 first:pt-0"
    >
      {(title || note) && (
        <div className="grid gap-1.5">
          {title && (
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium">{title}</h2>
              {source && <EditLink path={source} />}
            </div>
          )}
          {note && <p className="max-w-[68ch] text-base text-pretty text-muted">{note}</p>}
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
      {label && <p className="px-1 text-xs text-muted">{label}</p>}
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
          className="@container edge min-w-0 rounded-lg bg-canvas p-5 text-text"
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
  return (
    <div
      data-theme={theme}
      className="edge relative overflow-hidden rounded-lg bg-canvas text-text"
    >
      <div className="absolute end-3 top-3 z-10">
        <IconToggle
          label="Canvas theme"
          value={theme}
          onChange={(t) => setPicked(t === page ? null : t)}
          options={ROOM_THEMES}
        />
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
              // The first label shares its corner with the theme switch.
              i === 0 && (stack ? "pe-20" : "pe-20 @3xl:pe-5"),
            )}
          >
            <p className="font-semibold text-text">{v.label}</p>
            {v.note && <p className="leading-relaxed text-pretty text-muted">{v.note}</p>}
          </div>
          <div
            className={clsx(
              "@container flex min-w-0 flex-wrap items-center gap-3 p-5",
              !stack && "@3xl:pe-20",
            )}
          >
            {v.render(theme)}
          </div>
        </div>
      ))}
    </div>
  );
}

export const ROOM_THEMES: IconOption<FrameTheme>[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];
