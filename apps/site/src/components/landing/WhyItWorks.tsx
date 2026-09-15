/**
 * A quiet explanation of the scheduling idea. The figure stays deliberately lighter than a
 * product dashboard: two fine curves, three review moments, and the prose below rather than
 * connector lines drawn through the page.
 */

const FADED = "M34 14 C48 42 64 60 90 66 C136 73 222 75 306 76";
const REVIEWED =
  "M34 14 C46 29 58 40 70 45 L70 14 C88 27 108 35 130 38 L130 14 C160 24 194 30 228 33 L228 14 C254 20 281 23 306 25";

export function WhyItWorks() {
  const { t } = useLingui();
  return (
    <figure className="m-0">
      <ul className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs">
        <li className="flex items-center gap-2 text-text-2">
          <span className="h-px w-7 bg-amber" aria-hidden="true" />
          <Trans>Reviewed with Lymi</Trans>
        </li>
        <li className="flex items-center gap-2 text-muted">
          <span className="h-px w-7 bg-muted" aria-hidden="true" />
          <Trans>Learned once, never revisited</Trans>
        </li>
      </ul>

      <svg
        viewBox="0 0 320 104"
        className="mx-auto mt-8 w-full max-w-[920px]"
        role="img"
        aria-label={t`Illustration of recall over thirty days. One line fades after a card is learned once. Another rises at reviews on days 3, 8, and 19, then fades more slowly as the gaps grow.`}
      >
        <title>{t`How well-timed reviews change recall`}</title>

        <g stroke="var(--edge)" strokeWidth="0.55">
          <line x1="34" y1="14" x2="306" y2="14" />
          <line x1="34" y1="46" x2="306" y2="46" />
          <line x1="34" y1="78" x2="306" y2="78" />
        </g>

        <g fill="var(--muted)" fontSize="4.2" textAnchor="end">
          <text x="29" y="16">
            100%
          </text>
          <text x="29" y="48">
            50%
          </text>
          <text x="29" y="80">
            0%
          </text>
        </g>

        <path d={FADED} fill="none" stroke="var(--muted)" strokeWidth="0.9" strokeLinecap="round" />
        <path
          d={REVIEWED}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {[70, 130, 228].map((x) => (
          <circle
            key={x}
            cx={x}
            cy={14}
            r="1.65"
            fill="var(--flame-core)"
            stroke="var(--amber)"
            strokeWidth="0.45"
          />
        ))}

        <g fill="var(--muted)" fontSize="4.2">
          <text x="34" y="92">
            {t`DAY 0`}
          </text>
          <text x="306" y="92" textAnchor="end">
            {t`DAY 30`}
          </text>
        </g>
      </svg>

      <figcaption className="mx-auto mt-3 max-w-[680px] text-center text-xs text-muted">
        <Trans>Illustration only. Your review timing adapts to what you remember.</Trans>
      </figcaption>

      <div className="mx-auto mt-8 grid max-w-[860px] gap-8 @2xl:grid-cols-2 @2xl:gap-12">
        <div className="border-t border-edge pt-5">
          <p className="text-xs text-amber-text">
            <Trans>Recall</Trans>
          </p>
          <h3 className="mt-2 text-lg font-medium text-text">
            <Trans>Recalling beats rereading</Trans>
          </h3>
          <p className="mt-2 text-base text-text-2">
            <Trans>
              Lymi asks before it shows the answer. Trying to remember something makes it stick
              better than reading it again, as{" "}
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/16507066/"
                className="underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-current"
              >
                Roediger and Karpicke found in 2006
              </a>
              .
            </Trans>
          </p>
        </div>
        <div className="border-t border-edge pt-5">
          <p className="text-xs text-amber-text">
            <Trans>Spacing</Trans>
          </p>
          <h3 className="mt-2 text-lg font-medium text-text">
            <Trans>Longer gaps, longer memory</Trans>
          </h3>
          <p className="mt-2 text-base text-text-2">
            <Trans>
              Spreading reviews out helps you remember for longer. In 2013,{" "}
              <a
                href="https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html"
                className="underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-current"
              >
                Dunlosky and colleagues rated testing yourself and spacing out practice as highly
                effective
              </a>
              .
            </Trans>
          </p>
        </div>
      </div>
    </figure>
  );
}

import { Trans, useLingui } from "@lingui/react/macro";
