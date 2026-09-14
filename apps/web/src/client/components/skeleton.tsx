import { clsx } from "clsx";

/** Holds the shape of what is loading. Give it the loaded size. */
export function Skeleton({ className }: { className?: string | undefined }) {
  return <div aria-hidden="true" className={clsx("skeleton", className)} />;
}
