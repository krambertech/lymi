import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ImageOff } from "lucide-react";
import type { CSSProperties } from "react";
import type { CardImage } from "../lib/api";
import { useCardPicture } from "../lib/card-images";

export interface CardPictureProps {
  image: CardImage;
  /**
   * The tallest the picture may be, as a CSS length. The box keeps the picture's own shape
   * inside it, so nothing is cropped and nothing moves when the bytes land.
   */
  maxHeight: string;
  /** What to show when the picture cannot load: its description, or a quiet placeholder. */
  fallback?: "description" | "placeholder" | undefined;
  className?: string | undefined;
}

/**
 * A card's picture. It holds its final size from the first frame, fades in over the well when
 * it arrives, and when it cannot load it says so, with the description standing in for it so a
 * review can carry on.
 */
export function CardPicture({
  image,
  maxHeight,
  fallback = "description",
  className,
}: CardPictureProps) {
  const { src, status } = useCardPicture(image);
  const ratio = image.width / image.height;
  const box: CSSProperties = {
    aspectRatio: `${image.width} / ${image.height}`,
    width: `min(100%, calc(${maxHeight} * ${ratio.toFixed(4)}))`,
  };

  if (status === "failed") {
    return (
      <div
        role="img"
        aria-label={image.description ?? undefined}
        className={clsx(
          "grid min-h-24 content-center justify-items-start gap-2 rounded-lg bg-plate-2 p-4",
          className,
        )}
      >
        <span className="flex items-center gap-2 text-sm text-muted">
          <ImageOff className="size-4 shrink-0" aria-hidden="true" />
          <Trans>Couldn’t load the picture</Trans>
        </span>
        {fallback === "description" && image.description && (
          <p aria-hidden="true" className="text-xl leading-snug text-text [overflow-wrap:anywhere]">
            {image.description}
          </p>
        )}
      </div>
    );
  }

  // The well and its hairline hold the place only while loading: a sign drawn on transparency would
  // otherwise sit in a grey box.
  return (
    <div
      style={box}
      className={clsx("relative overflow-hidden rounded-lg", !src && "bg-plate-2", className)}
    >
      {src ? (
        <img
          src={src}
          alt={image.description ?? ""}
          width={image.width}
          height={image.height}
          draggable={false}
          className="picture-in size-full object-contain"
        />
      ) : (
        <div className="skeleton absolute inset-0 rounded-[inherit]" aria-hidden="true" />
      )}
    </div>
  );
}
