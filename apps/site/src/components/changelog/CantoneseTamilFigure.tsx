import { Trans } from "@lingui/react/macro";

interface Reading {
  text: string;
  reading: string;
}

function Ruby({ parts, lang }: { parts: Reading[]; lang: string }) {
  return (
    <p lang={lang} className="text-4xl leading-tight font-medium text-ink">
      {parts.map((part) => (
        <ruby key={part.text} className="mx-0.5 [ruby-align:center]">
          {part.text}
          <rt className="pb-1 text-[0.8125rem] font-normal tracking-normal text-ink-secondary">
            {part.reading}
          </rt>
        </ruby>
      ))}
    </p>
  );
}

const CANTONESE = [
  { text: "廣", reading: "gwong²" },
  { text: "東", reading: "dung¹" },
  { text: "話", reading: "waa²" },
];

const TAMIL = [{ text: "தமிழ்", reading: "tamizh" }];

/** The two new languages' cards with their readings over the term. */
export function CantoneseTamilFigure() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-64 w-[26rem]">
      <div className="absolute start-0 top-2 grid h-48 w-56 -rotate-3 content-center gap-4 rounded-xl bg-plate p-5 edge shadow-[0_12px_32px_-16px_oklch(0.2_0.03_60/0.35)]">
        <Ruby parts={CANTONESE} lang="yue" />
        <p className="text-lg text-ink-secondary">
          <Trans>Cantonese</Trans>
        </p>
      </div>
      <div className="absolute end-0 bottom-0 grid h-48 w-56 rotate-2 content-center gap-4 rounded-xl bg-plate p-5 edge-strong shadow-[0_12px_32px_-12px_oklch(0.2_0.03_60/0.35)]">
        <Ruby parts={TAMIL} lang="ta" />
        <p className="text-lg text-ink-secondary">
          <Trans>Tamil</Trans>
        </p>
      </div>
    </div>
  );
}
