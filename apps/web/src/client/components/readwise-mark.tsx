import { clsx } from "clsx";

// Readwise's R from readwise.io, used only to name the app. Its counter is cut in the plate.
const R =
  "M357.879 353.562C368.295 370.889 376.79 376.649 394.166 378.713V396.04H308.441L228.139 262.029H208.076V349.866C208.076 373.385 213.884 376.649 238.603 378.713V396.04H109.199V378.713C133.918 376.649 139.726 373.337 139.726 349.866V153.6C139.726 129.697 134.686 126.817 109.199 124.753V107.426H242.395C322.696 107.426 364.647 124.321 364.647 183.695C364.647 228.622 342.808 250.077 298.793 257.469L357.879 353.562ZM219.644 135.505C212.684 135.505 208.076 140.449 208.076 147.888V234.046H241.291C275.658 234.046 296.105 221.662 296.105 183.743C296.105 145.393 275.658 135.505 242.443 135.505H219.644Z";
const BLOCK = "M309.691 117.748H184.799V236.976H309.691V117.748Z";
const COUNTER =
  "M293.999 138.338C287.183 150.865 297.694 209.904 297.694 209.904C297.838 213.023 295.727 215.759 292.655 216.431C292.655 216.431 228.289 216.719 207.025 234.383";

/** Readwise's mark on a plate tile, in the room's ink so it reads by day and at night. */
export function ReadwiseMark({ className }: { className?: string | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "edge grid shrink-0 place-items-center rounded-lg bg-plate text-text",
        className,
      )}
    >
      <svg viewBox="100 100 300 300" className="size-3/5">
        <path d={R} fill="currentColor" />
        <path d={BLOCK} fill="currentColor" />
        <path d={COUNTER} fill="var(--plate)" />
      </svg>
    </span>
  );
}
