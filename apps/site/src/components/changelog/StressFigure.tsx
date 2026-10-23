import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Volume2 } from "lucide-react";

const CARDS: { marked: string; meaning: MessageDescriptor }[] = [
  { marked: "за́мок", meaning: msg`castle` },
  { marked: "замо́к", meaning: msg`lock` },
];

/** Two Learning Ukrainian cards: the same letters, each with its stress mark on the cue. */
export function StressFigure() {
  const { t, i18n } = useLingui();
  return (
    <div aria-hidden="true" className="mx-auto flex w-[424px] gap-4">
      {CARDS.map(({ marked, meaning }) => (
        <div
          key={marked}
          className="flex h-[232px] w-[204px] flex-col rounded-xl bg-plate p-5 edge"
        >
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="size-1.5 rounded-full bg-state-learning" />
            {t({ message: "Learning", context: "cards in this state" })}
          </p>
          <p
            lang="uk"
            className="mt-4 text-[40px] leading-[1.05] font-medium tracking-[-0.02em] text-text"
          >
            {marked}
          </p>
          <p className="mt-2.5 flex items-center">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-plate text-text-2 edge">
              <Volume2 className="size-4" />
            </span>
          </p>
          <p className="mt-auto border-t border-edge-2 pt-3.5 text-xl text-text">
            {i18n._(meaning)}
          </p>
        </div>
      ))}
    </div>
  );
}
