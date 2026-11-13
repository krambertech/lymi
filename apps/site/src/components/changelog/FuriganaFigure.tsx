import { Trans } from "@lingui/react/macro";
import { BookOpen } from "lucide-react";

/** A run of kanji with its reading over it; a known word keeps the reading's room but hides it. */
function Ruby({ text, reading, known }: { text: string; reading: string; known?: boolean }) {
  return (
    <ruby className="[ruby-align:center]">
      {text}
      <rt
        className={
          known
            ? "invisible text-[max(0.5em,0.625rem)] font-normal tracking-normal"
            : "text-[max(0.5em,0.625rem)] font-normal tracking-normal text-ink-secondary"
        }
      >
        {reading}
      </rt>
    </ruby>
  );
}

/** A Japanese card with the answer shown: furigana over the term, and over the example's words not yet known. */
export function FuriganaFigure() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px] rounded-xl bg-plate p-5 edge">
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <BookOpen className="size-3.5" />
        Japanese N5
      </p>
      <p lang="ja" className="mt-6 text-5xl font-medium text-ink">
        <Ruby text="食" reading="た" />
        べる
      </p>
      <div className="my-4 h-px bg-edge" />
      <p className="text-xl text-ink">
        <Trans>to eat</Trans>
      </p>
      <p lang="ja" className="mt-3 text-xl leading-loose text-ink-secondary">
        <Ruby text="毎朝" reading="まいあさ" known />
        パンを
        <Ruby text="食" reading="た" />
        べます。
      </p>
    </div>
  );
}
