import { modeOf, type ReviewModeKey } from "@lymi/core";
import type { CSSProperties } from "react";
import { publicMediaUrl } from "../../lib/origins";

interface Props {
  /** The class family the face is drawn with: the deck page's spread or an Explore tray. */
  kind: "deck-spread" | "deck-tray";
  term: string;
  meaning: string;
  section: string | null;
  mode: ReviewModeKey;
  image?: { cardId: string; description: string; width: number; height: number } | undefined;
  language: string | null;
  meaningLanguage: string;
}

/** A long word would break mid-letter at the full size, and a long cue would run past three lines. */
export function cueStep(text: string): number {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  const step = longest >= 13 ? 0.105 : longest >= 10 ? 0.12 : 0.14;
  return text.length > 28 ? Math.min(step, 0.1) : step;
}

/**
 * One card turned over, as review shows it: what its mode asks from above the rule, a picture,
 * the meaning or the term, and what the learner recalls under it.
 */
export function PreviewFace({
  kind,
  term,
  meaning,
  section,
  mode,
  image,
  language,
  meaningLanguage,
}: Props) {
  const { cue, target } = modeOf(mode);
  const picture = cue === "image" ? image : undefined;
  const cueText = cue === "meaning" ? meaning : term;
  const cueLanguage = cue === "meaning" ? meaningLanguage : (language ?? undefined);
  return (
    <>
      {section && (
        <p lang={meaningLanguage} className={`${kind}-section`}>
          {section}
        </p>
      )}
      {picture ? (
        <span
          className="preview-picture"
          style={{ "--ratio": picture.width / picture.height } as CSSProperties}
        >
          <img
            src={publicMediaUrl(picture.cardId, "image")}
            alt={picture.description}
            width={picture.width}
            height={picture.height}
            loading="lazy"
            decoding="async"
          />
        </span>
      ) : (
        <p
          lang={cueLanguage}
          className={`${kind}-term`}
          style={{ "--t": cueStep(cueText) } as CSSProperties}
        >
          {cueText}
        </p>
      )}
      <p
        lang={target === "term" ? (language ?? undefined) : meaningLanguage}
        className={`${kind}-meaning`}
        data-target={target}
      >
        {target === "term" ? term : meaning}
      </p>
    </>
  );
}
