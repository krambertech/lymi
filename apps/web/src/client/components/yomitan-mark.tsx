import { clsx } from "clsx";
import { BookA } from "lucide-react";

/**
 * Yomitan's icon is GPL-3.0 artwork with no separate licence, so a dictionary stands in for it on
 * a plate tile. `bare` drops the tile, for a mark inside a chip.
 */
export function YomitanMark({
  className,
  bare = false,
}: {
  className?: string | undefined;
  bare?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "grid shrink-0 place-items-center text-ink",
        !bare && "edge rounded-lg bg-plate",
        className,
      )}
    >
      <BookA className={bare ? "size-full" : "size-1/2"} strokeWidth={1.75} />
    </span>
  );
}
