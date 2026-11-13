import { Trans } from "@lingui/react/macro";
import { PITCH_DOT, pitchLayout, pitchPattern } from "@lymi/core";
import { clsx } from "clsx";
import { Wide } from "./FeatureSection";

/** Three words read はし, told apart only by where the voice falls. */
const HASHI = [
  { term: "箸", pronunciation: "はし [1]", meaning: <Trans>chopsticks</Trans> },
  { term: "橋", pronunciation: "はし [2]", meaning: <Trans>bridge</Trans> },
  { term: "端", pronunciation: "はし [0]", meaning: <Trans>edge</Trans> },
];

/** The product's chart: a dot over each mora, and a tail where a particle would stand. */
function Chart({ pronunciation, className }: { pronunciation: string; className?: string }) {
  const pattern = pitchPattern({ language: "ja", pronunciation });
  if (!pattern) return null;
  const { width, morae, segments } = pitchLayout(pattern);
  return (
    <span lang="ja" className={clsx("inline-grid justify-items-start gap-[0.1em]", className)}>
      <svg
        viewBox={`0 0 ${width} 10`}
        style={{ width: `${width / 10}em`, height: "1em" }}
        aria-hidden="true"
        className="overflow-visible"
      >
        {segments.map((segment) => (
          <line
            key={segment.x1 + segment.x2}
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

/** The three はし side by side, each with the chart a card draws under its term. */
export function PitchSection() {
  return (
    <Wide
      title={<Trans>Same sound, different word.</Trans>}
      body={
        <Trans>
          <span lang="ja">はし</span> can mean chopsticks, a bridge or an edge. Only the pitch tells
          them apart. Lymi charts it under the word, so you learn how it’s said as well as how it’s
          read.
        </Trans>
      }
    >
      <div className="mt-12 grid rounded-xl bg-plate edge @2xl:grid-cols-3">
        {HASHI.map((word, at) => (
          <div
            key={word.term}
            className={clsx(
              "grid justify-items-start gap-5 p-7 @2xl:p-9",
              at > 0 && "border-t border-edge @2xl:border-s @2xl:border-t-0",
            )}
          >
            <span lang="ja" className="text-6xl font-medium text-ink">
              {word.term}
            </span>
            <Chart pronunciation={word.pronunciation} className="text-3xl text-ink-secondary" />
            <span className="text-md text-ink-secondary">{word.meaning}</span>
          </div>
        ))}
      </div>
    </Wide>
  );
}
