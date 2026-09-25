import { clsx } from "clsx";
import { useState } from "react";

/**
 * The learner, as their photo or one letter on a plate. The photo is quiet: no ring, no glow,
 * only the edge every photo has. A photo that fails to load falls back to the letter, and
 * `pending` keeps the plate blank while a photo is on its way so the letter never flashes.
 */
export function Avatar({
  name,
  src,
  pending,
  size = 32,
  className,
}: {
  name: string | undefined;
  src?: string | undefined;
  pending?: boolean | undefined;
  size?: number | undefined;
  className?: string | undefined;
}) {
  const [failed, setFailed] = useState<string>();
  const photo = src && failed !== src ? src : undefined;
  return (
    <span
      className={clsx(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-plate-2 font-semibold text-text-2",
        !photo && "edge",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          width={size}
          height={size}
          draggable={false}
          onError={() => setFailed(photo)}
          className="image-edge size-full rounded-full object-cover"
        />
      ) : pending ? null : (
        (name?.trim()[0] ?? "?").toUpperCase()
      )}
    </span>
  );
}
