import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface TrayProps {
  hue: number;
  title: ReactNode;
  body: ReactNode;
  after?: ReactNode;
  children: ReactNode;
  /** Copy beside the demo on a wide screen, rather than above it. */
  side?: boolean;
  className?: string;
}

/** A use-case tray at the size of what it shows: copy, then the one demo that proves it. */
export function Tray({ hue, title, body, after, children, side, className }: TrayProps) {
  return (
    <div
      style={{ "--tray-h": hue } as CSSProperties}
      className={clsx(
        "use-case-tile flex flex-col gap-6 rounded-[24px] p-6 @2xl:p-8",
        side &&
          "@4xl:grid @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @4xl:items-center @4xl:gap-8",
        className,
      )}
    >
      <div>
        <h3 className="max-w-[18ch] text-2xl leading-tight font-medium tracking-[-0.025em] text-balance text-text @2xl:text-[28px]">
          {title}
        </h3>
        <p className="mt-3 max-w-[42ch] text-md text-pretty text-text-2">{body}</p>
        {after && <div className="mt-5">{after}</div>}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center">{children}</div>
    </div>
  );
}
