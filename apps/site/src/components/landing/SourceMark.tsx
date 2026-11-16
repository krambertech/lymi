import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { BookOpen, PencilLine, Sparkle } from "lucide-react";

/** Where a field's text came from, as the product's `SourceChip size="xs"` marks it. */
export type Source = "lesson" | "ai" | "manual";

const SOURCES = {
  lesson: { icon: BookOpen, mark: msg`Lesson`, label: msg`From the lesson`, ai: false },
  ai: { icon: Sparkle, mark: msg`AI`, label: msg`AI wrote this`, ai: true },
  manual: { icon: PencilLine, mark: msg`You`, label: msg`You wrote this`, ai: false },
} as const;

interface Props {
  source: Source;
  /** Lands with a small scale and a turn of the sparkle, as a field fills in a demo. */
  arriving?: boolean | undefined;
}

/**
 * The badge beside a field naming where its text came from. AI's is the one violet mark on the
 * site; the others are neutral. A screen reader hears the whole sentence, not the short word.
 */
export function SourceMark({ source, arriving }: Props) {
  const { i18n } = useLingui();
  const { icon: Icon, mark, label, ai } = SOURCES[source];
  return (
    <span
      className={clsx(
        "inline-flex h-[17px] shrink-0 items-center gap-1 rounded-full px-1.5 text-2xs font-medium whitespace-nowrap",
        ai ? "bg-ai-soft text-ai" : "bg-plate-nested text-ink-secondary",
        arriving && "ai-badge-in",
      )}
    >
      <Icon aria-hidden="true" className="size-2.5" />
      <span aria-hidden="true">{i18n._(mark)}</span>
      <span className="sr-only">{i18n._(label)}</span>
    </span>
  );
}
