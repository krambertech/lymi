import { clsx } from "clsx";

/**
 * The learner, as one letter on a plate. No photo: the app has one person in it and a
 * face would be the second illustration.
 */
export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string | undefined;
  size?: number | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={clsx(
        "edge grid shrink-0 place-items-center rounded-full bg-plate-2 font-semibold text-text-2",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {(name?.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
