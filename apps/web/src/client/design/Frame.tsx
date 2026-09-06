import { clsx } from "clsx";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Segmented } from "../components/Segmented";

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

/** Section wrapper on the design page. */
export function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-edge py-14 first:border-t-0 first:pt-4"
    >
      <h2 className="text-2xl font-medium">{title}</h2>
      {lede && <p className="mt-2 max-w-[62ch] text-md text-muted">{lede}</p>}
      <div className="mt-8 grid gap-10">{children}</div>
    </section>
  );
}

export function Sub({
  id,
  title,
  note,
  children,
}: {
  id?: string | undefined;
  title: string;
  note?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <div id={id} className="grid scroll-mt-6 gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-md font-medium">{title}</h3>
        {note && <p className="max-w-[56ch] text-sm text-muted">{note}</p>}
      </div>
      {children}
    </div>
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
        <div key={t} data-theme={t} className="@container edge rounded-lg bg-canvas p-5 text-text">
          {children(t)}
        </div>
      ))}
    </div>
  );
}
