import { Trans } from "@lingui/react/macro";
import { PITCH_DOT, pitchLayout, pitchPattern } from "@lymi/core";
import { BookOpen } from "lucide-react";

/** A word's pitch as the product charts it: a dot over each mora, with a tail for a particle after it. */
function PitchLine({ pronunciation }: { pronunciation: string }) {
  const pattern = pitchPattern({ language: "ja", pronunciation });
  if (!pattern) return null;
  const { width, morae, segments } = pitchLayout(pattern);
  return (
    <span className="inline-grid justify-items-start gap-[0.1em] text-ink-secondary">
      <svg
        viewBox={`0 0 ${width} 10`}
        style={{ width: `${width / 10}em`, height: "1em" }}
        className="overflow-visible"
      >
        {segments.map((segment) => (
          <line
            key={segment.x1}
            {...segment}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {morae.map((mora) => (
          <circle
            key={mora.start}
            cx={mora.x}
            cy={mora.y}
            r={PITCH_DOT}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span className="relative block" style={{ width: `${width / 10}em` }}>
        {morae.map((mora) => (
          <span
            key={mora.start}
            className="absolute top-0 text-center"
            style={{ insetInlineStart: `${mora.start / 10}em`, width: `${mora.width / 10}em` }}
          >
            {mora.text}
          </span>
        ))}
        <span className="invisible">あ</span>
      </span>
    </span>
  );
}

/** A Japanese card with the answer shown: furigana over the term and its pitch chart under it. */
export function PitchAccentFigure() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px] rounded-xl bg-plate p-5 edge">
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <BookOpen className="size-3.5" />
        Japanese N5
      </p>
      <p lang="ja" className="mt-6 text-5xl font-medium text-ink">
        <ruby className="[ruby-align:center]">
          図書館
          <rt className="text-[max(0.5em,0.625rem)] font-normal tracking-normal text-ink-secondary">
            としょかん
          </rt>
        </ruby>
      </p>
      <p lang="ja" className="mt-3 text-2xl">
        <PitchLine pronunciation="としょかん [2]" />
      </p>
      <div className="my-4 h-px bg-edge" />
      <p className="text-xl text-ink">
        <Trans>library</Trans>
      </p>
    </div>
  );
}
