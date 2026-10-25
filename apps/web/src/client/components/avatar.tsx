import { clsx } from "clsx";
import { UserX } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { PRIVATE_BOX } from "@/lib/telemetry";

interface Props extends Omit<ComponentProps<"span">, "children"> {
  name: string | undefined;
  src?: string | undefined;
  pending?: boolean | undefined;
  size?: number | undefined;
}

/**
 * The learner, as their photo or one letter on a plate. The photo is quiet: no ring, no glow,
 * only the edge every photo has. A photo that fails to load falls back to the letter, and
 * `pending` keeps the plate blank while a photo is on its way so the letter never flashes.
 */
export function Avatar({ name, src, pending, size = 32, className, style, ...rest }: Props) {
  const [failed, setFailed] = useState<string>();
  const photo = src && failed !== src ? src : undefined;
  return (
    <span
      // Beside the learner's name by default, so a screen reader skips it.
      aria-hidden="true"
      className={clsx(
        PRIVATE_BOX,
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-plate-2 font-semibold text-text-2",
        !photo && "edge",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...style }}
      {...rest}
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

/** Where an owner's photo would be, on a deck kept for its members after the owner left Lymi. */
export function FormerOwnerMark({ size = 32 }: { size?: number | undefined }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-plate-2 text-muted edge"
      style={{ width: size, height: size }}
    >
      <UserX style={{ width: Math.round(size * 0.55), height: Math.round(size * 0.55) }} />
    </span>
  );
}
