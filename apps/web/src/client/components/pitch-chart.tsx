import { useLingui } from "@lingui/react/macro";
import { isolate, PITCH_DOT, type PitchPattern, pitchLayout, pitchPatterns } from "@lymi/core";
import { clsx } from "clsx";
import { Fragment, useMemo } from "react";

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
  const patterns = useMemo(
    () => pitchPatterns({ language, pronunciation }),
    [language, pronunciation],
  );
  if (patterns.length === 0) return null;
  const label = patterns
    .map(({ position, morae }) => {
      const reading = isolate(morae.map((mora) => mora.text).join(""));
      return position === 0
        ? t`${reading}, flat pitch`
        : t`${reading}, pitch falls after sound ${position}`;
    })
    .join(", ");
  return (
    <span
      role="img"
      aria-label={label}
      lang={language ?? undefined}
      className={clsx(
        "flex max-w-full flex-wrap items-end gap-x-3 gap-y-1 text-ink-secondary",
        className,
      )}
    >
      {patterns.map((pattern, at) => (
        <Fragment key={pattern.position}>
          {at > 0 && <span className="pb-[0.15em] text-sm text-ink-muted">{t`or`}</span>}
          <PitchLine pattern={pattern} />
        </Fragment>
      ))}
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
