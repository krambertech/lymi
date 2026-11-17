import { clsx } from "clsx";

interface IconProps {
  src: string;
  className?: string | undefined;
}

function AppIcon({ src, className }: IconProps) {
  return (
    <img
      src={src}
      alt=""
      width={176}
      height={176}
      draggable={false}
      className={clsx(
        "absolute block aspect-square w-32 rounded-[22.5%] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_12px_32px_-8px_rgb(0_0_0/0.22)] @2xl:w-44",
        className,
      )}
    />
  );
}

interface Props {
  /** The other app's icon. */
  icon: string;
  /** Names the picture, such as "The Lymi and Anki app icons". */
  label: string;
}

/**
 * The comparison page's picture: the other app's icon leaning behind Lymi's. It says whose page
 * this is and nothing more; the page itself does the comparing.
 */
export function CompareMark({ icon, label }: Props) {
  return (
    <figure role="img" aria-label={label} className="grid place-items-center py-8">
      <div className="relative h-44 w-64 @2xl:h-56 @2xl:w-80">
        <AppIcon src={icon} className="top-2 start-4 -rotate-[8deg] @2xl:start-6" />
        <AppIcon src="/brand/app-icon.svg" className="end-4 bottom-0 rotate-[6deg] @2xl:end-6" />
      </div>
    </figure>
  );
}
