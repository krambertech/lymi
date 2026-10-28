import { Trans } from "@lingui/react/macro";
import { BookOpen } from "lucide-react";

/** One character with its syllable over it; a known pair keeps the syllable's room but hides it. */
function Hanzi({ text, pinyin, known }: { text: string; pinyin: string; known?: boolean }) {
  return (
    <ruby className="[ruby-align:center]">
      {text}
      <rt
        className={
          known
            ? "invisible px-[0.2em] text-[max(0.5em,0.625rem)] font-normal tracking-normal"
            : "px-[0.2em] text-[max(0.5em,0.625rem)] font-normal tracking-normal text-ink-secondary"
        }
      >
        {pinyin}
      </rt>
    </ruby>
  );
}

/** A Chinese card with the answer shown: pinyin over the term, and a Known 银行 fading 行 háng but not 行 xíng in the example. */
export function PinyinFigure() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px] rounded-xl bg-plate p-5 edge">
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <BookOpen className="size-3.5" />
        HSK 1
      </p>
      <p lang="zh-Hans" className="mt-6 text-5xl font-medium text-ink">
        <Hanzi text="不" pinyin="bù" />
        <Hanzi text="行" pinyin="xíng" />
      </p>
      <div className="my-4 h-px bg-edge" />
      <p className="text-xl text-ink">
        <Trans>won’t do, no</Trans>
      </p>
      <p lang="zh-Hans" className="mt-3 text-xl leading-loose text-ink-secondary">
        <Hanzi text="行" pinyin="háng" known />
        <Hanzi text="长" pinyin="zhǎng" />
        <Hanzi text="说" pinyin="shuō" />
        <Hanzi text="不" pinyin="bù" />
        <Hanzi text="行" pinyin="xíng" />。
      </p>
    </div>
  );
}
