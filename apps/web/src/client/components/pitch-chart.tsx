import { useLingui } from "@lingui/react/macro";
import { isolate, PITCH_DOT, type PitchPattern, pitchLayout, pitchPattern } from "@lymi/core";
import { clsx } from "clsx";
import { useMemo } from "react";

interface PitchChartProps {
  card: {
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
  };
  /** Sets the kana's size, which the chart scales with. */
  className?: string | undefined;
}

/** Where a card's voice rises and falls: a joined dot over each mora, with a tail for a particle after the word. */
export function PitchChart({ card, className }: PitchChartProps) {
  const { t } = useLingui();
  const { language, pronunciation } = card;
  const pattern = useMemo(
    () => pitchPattern({ language, pronunciation }),
    [language, pronunciation],
  );
  if (!pattern) return null;
  const reading = isolate(pattern.morae.map((mora) => mora.text).join(""));
  const position = pattern.position;
  return (
    <span
      role="img"
      aria-label={
        position === 0
          ? t`${reading}, flat pitch`
          : t`${reading}, pitch falls after sound ${position}`
      }
      lang={language ?? undefined}
      className={clsx("flex max-w-full text-ink-secondary", className)}
    >
      <PitchLine pattern={pattern} />
    </span>
  );
}

function PitchLine({ pattern }: { pattern: PitchPattern }) {
  const { width, morae, segments } = pitchLayout(pattern);
  return (
    <span className="inline-grid justify-items-start gap-[0.1em]">
      <svg
        viewBox={`0 0 ${width} 10`}
        style={{ width: `${width / 10}em`, height: "1em" }}
        aria-hidden="true"
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
      <span
        aria-hidden="true"
        className="relative block whitespace-nowrap"
        style={{ width: `${width / 10}em` }}
      >
        {morae.map((mora) => (
          <span
            key={mora.start}
            className="absolute top-0 text-center"
            style={{ insetInlineStart: `${mora.start / 10}em`, width: `${mora.width / 10}em` }}
          >
            {mora.text}
          </span>
        ))}
        {/* Holds the line's height for the placed kana. */}
        <span className="invisible">あ</span>
      </span>
    </span>
  );
}
