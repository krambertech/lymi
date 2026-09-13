import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * A form sheet drawn in place for the design page, in one of its two shapes. The live component
 * portals into the body, so a picture of it on a page has to be drawn with the same classes.
 */
export function SheetPreview({
  shape,
  title,
  className,
  children,
}: {
  shape: "drawer" | "dialog";
  title: string;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "edge-2 bg-plate text-text",
        shape === "drawer" ? "mx-auto w-full max-w-md rounded-t-xl" : "rounded-xl",
        className,
      )}
    >
      {shape === "drawer" && (
        <div className="flex h-4 items-end justify-center" aria-hidden="true">
          <i className="h-1 w-9 rounded-full bg-edge-2" />
        </div>
      )}
      <div className={clsx("grid gap-4", shape === "drawer" ? "px-4 pt-2 pb-5" : "p-5")}>
        <h2 className="text-lg font-medium text-text">{title}</h2>
        {children}
      </div>
    </div>
  );
}
