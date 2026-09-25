import { clsx } from "clsx";
import type { ComponentProps } from "react";

interface Props extends ComponentProps<"kbd"> {
  tone?: "default" | "on-primary" | "on-ink" | undefined;
}

/** A key hint. Sits inside buttons on desktop and in the shortcuts list. */
export function Kbd({ className, tone = "default", ...rest }: Props) {
  return (
    <kbd
      className={clsx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs px-1.5 font-sans text-2xs font-semibold leading-none tabular-nums",
        tone === "default" && "edge bg-plate-2 text-muted",
        tone === "on-primary" && "bg-amber-ink/15 text-amber-ink",
        tone === "on-ink" && "bg-canvas/20 text-canvas",
        className,
      )}
      {...rest}
    />
  );
}
