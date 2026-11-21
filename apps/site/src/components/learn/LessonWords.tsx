import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { ArrowRight, ChevronDown } from "lucide-react";
import { localizedPath } from "../../lib/routes";
import { Lantern } from "../Lantern";
import { useLesson } from "./lesson-context";
import { WordList } from "./WordList";

/**
 * The end of a lesson: its words in a card that opens to the list, and under it, on the same
 * tray, the way on to Lymi's free Estonian decks.
 */
export function LessonWords({ words }: { words: readonly string[] }) {
  const { i18n } = useLingui();
  const { glossary } = useLesson();
  const shown = words.map((word) => glossary[word]?.show ?? word);
  return (
    <div className="mt-2 grid gap-1 rounded-xl bg-(--tray) p-1.5 max-sm:-mx-1">
      <details className="group overflow-hidden rounded-lg bg-plate ring-1 ring-edge">
        <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4 transition-colors duration-150 hoverable:hover:bg-plate-hover [&::-webkit-details-marker]:hidden">
          <span className="grid min-w-0 gap-1">
            <span className="text-xl font-semibold tracking-tight">
              <Trans>Words from this lesson</Trans>
            </span>
            <Preview words={shown} />
          </span>
          <span className="ms-auto grid size-9 shrink-0 place-items-center rounded-full bg-plate-nested text-ink-secondary transition-transform duration-200 group-open:rotate-180">
            <ChevronDown aria-hidden="true" className="size-5" />
          </span>
        </summary>
        <div className="border-t border-edge">
          <WordList words={words} bare />
        </div>
      </details>
      <a
        href={localizedPath("estonian", i18n.locale)}
        className="group/link flex items-center gap-3 rounded-lg px-3.5 py-3 text-ink no-underline transition-colors duration-150 hoverable:hover:bg-[color-mix(in_oklab,var(--plate)_45%,transparent)]"
      >
        <Lantern className="size-8 shrink-0" />
        <span className="grid min-w-0">
          <span className="font-medium">
            <Trans>Free Estonian decks in Lymi</Trans>
          </span>
          <span className="text-sm text-ink-secondary">
            <Trans>The most common words, each brought back on the day you’d forget it.</Trans>
          </span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="ms-auto size-5 shrink-0 text-ink-secondary transition-transform duration-200 group-hover/link:translate-x-0.5 rtl:-scale-x-100"
        />
      </a>
    </div>
  );
}

/** The first words as chips, and how many more the card holds. */
function Preview({ words }: { words: readonly string[] }) {
  const first = words.slice(0, 5);
  const more = words.length - first.length;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {first.map((word) => (
        <span
          key={word}
          lang="et"
          className="rounded-full bg-(--tray) px-2.5 py-0.5 text-sm font-medium text-(--form)"
        >
          {word}
        </span>
      ))}
      {more > 0 && (
        <span className="text-sm text-ink-muted">
          <Plural value={more} one="and # more" other="and # more" />
        </span>
      )}
    </span>
  );
}
