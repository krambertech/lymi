import { Trans, useLingui } from "@lingui/react/macro";
import { Volume2 } from "lucide-react";
import { Furigana } from "../landing/Furigana";
import { noun } from "../landing/hand-cards";

/** A New Japanese card turned over, as the landing hand draws it: the reading over the kanji, then the meaning. */
export function JapaneseCardFigure() {
  const { t, i18n } = useLingui();
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex h-[264px] w-[300px] flex-col rounded-xl bg-plate p-5 edge"
    >
      <p className="flex items-center justify-between gap-2 text-xs font-medium tracking-[0.06em] text-muted uppercase">
        <span>N5 · {i18n._(noun)}</span>
        <span className="inline-flex items-center gap-1.5 tracking-normal normal-case">
          <span className="size-1.5 rounded-full bg-state-new" />
          {t`New`}
        </span>
      </p>
      <p
        lang="ja"
        className="mt-3.5 text-[46px] leading-[1.02] font-medium tracking-[-0.03em] text-text"
      >
        <Furigana term="電車" reading="でんしゃ" lang="ja" />
      </p>
      <p className="mt-2.5 flex items-center">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-plate text-text-2 edge">
          <Volume2 className="size-4" />
        </span>
      </p>
      <p className="mt-auto border-t border-edge-2 pt-3.5 text-xl text-text">
        <Trans>Train</Trans>
      </p>
    </div>
  );
}
